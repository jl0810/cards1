/**
 * Admin AI Import API
 * Import card products and benefits using AI extraction
 *
 * @module app/api/admin/card-catalog/ai-import
 * @implements BR-031 - Admin Role Required
 */

import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import type { BenefitRuleConfigSchema, PrismaJsonSchema } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import type { z } from "zod";

type BenefitRuleConfig = z.infer<typeof BenefitRuleConfigSchema>;
type PrismaJson = z.infer<typeof PrismaJsonSchema>;

interface CardProductData {
  issuer: string;
  product_name: string;
  signup_bonus?: string;
  card_type?: string;
  cash_benefits?: Array<{
    benefit: string;
    description?: string;
    type?: "STATEMENT_CREDIT" | "EXTERNAL_CREDIT" | "INSURANCE" | "PERK";
    timing: string;
    max_amount: number | null;
    keywords: string[];
    rule_config?: {
      minAmount?: number | null;
      maxAmount?: number | null;
    } | null;
  }>;
}

// POST /api/admin/card-catalog/ai-import
export async function POST(req: Request) {
  const limited = await rateLimit(req, RATE_LIMITS.sensitive);
  if (limited) return new Response("Too many requests", { status: 429 });

  return withAdmin(async () => {
    const body = await req.json();
    const { issuer, sourceUrls } = body;

    if (!issuer) {
      return NextResponse.json(
        { error: "Issuer is required" },
        { status: 400 },
      );
    }

    logger.info("[AI Import] Starting import for issuer:", issuer);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.error("[AI Import] GEMINI_API_KEY not configured");
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 },
      );
    }

    try {
      // Default URLs if not provided
      const urls = sourceUrls || [
        "https://frequentmiler.com/best-credit-card-offers/",
        "https://www.cardratings.com/best-rewards-credit-cards.html",
      ];

      // Fetch content from URLs
      let combinedText = "";
      for (const url of urls) {
        try {
          const response = await fetch(url);
          const html = await response.text();
          // Simple HTML to text conversion
          const text = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          combinedText += text + "\n\n";
        } catch (error) {
          logger.warn(`Failed to fetch ${url}`, { error });
        }
      }

      if (!combinedText) {
        logger.error("[AI Import] Failed to fetch any content from sources");
        return NextResponse.json(
          { error: "Failed to fetch source content" },
          { status: 500 },
        );
      }

      logger.info(
        `[AI Import] Fetched ${combinedText.length} characters from sources`,
      );

      // Truncate if too long (Gemini has token limits)
      const maxChars = 50000;
      if (combinedText.length > maxChars) {
        combinedText = combinedText.substring(0, maxChars);
      }

      // Step 1: Identify Card Names first (Lightweight call)
      logger.info("[AI Import] Step 1: Identifying card products...");
      const identificationPrompt = `
            Analyze the text and identify all credit card products issued by "${issuer}".
            Return ONLY a JSON array of strings with the exact card names.
            Example: ["Platinum Card", "Gold Card", "Blue Cash Preferred"]
            
            Text:
            ${combinedText.substring(0, 50000)} // Send first 50k chars for identification to be safe
            `;

      const idResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: identificationPrompt }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        },
      );

      if (!idResponse.ok) {
        const errorText = await idResponse.text();
        logger.error(
          "[AI Import] Gemini API error during identification:",
          errorText,
        );
        return NextResponse.json(
          { error: "AI card identification failed" },
          { status: 500 },
        );
      }

      const idData = await idResponse.json();
      const idText = idData?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
      let cardNames: string[] = [];

      try {
        cardNames = JSON.parse(idText);
        logger.info(`[AI Import] Identified ${cardNames.length} cards`, {
          cardNames,
        });
      } catch (e) {
        logger.error("[AI Import] Failed to parse card names:", idText);
        return NextResponse.json(
          { error: "Failed to identify cards" },
          { status: 500 },
        );
      }

      // Step 2: Extract Details in Batches (to avoid token limits)
      const BATCH_SIZE = 3;
      let products: CardProductData[] = [];

      for (let i = 0; i < cardNames.length; i += BATCH_SIZE) {
        const batchNames = cardNames.slice(i, i + BATCH_SIZE);
        logger.info(
          `[AI Import] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}`,
          { batchNames },
        );

        const detailPrompt = `
                Extract detailed data for these specific cards: ${JSON.stringify(batchNames)}.
                Use the provided text.
                
                Return a JSON array of objects with this schema:
                [{
                    issuer: "${issuer}",
                    product_name: string (exact match from list),
                    signup_bonus: string,
                    annual_fee: string,
                    card_type: "Points" | "Cashback" | "Miles",
                    credits_value: number (total dollar value of annual credits),
                    benefits_count: number,
                    cash_benefits: [{
                        benefit: string (short title),
                        description: string (details),
                        type: "STATEMENT_CREDIT" | "EXTERNAL_CREDIT" | "INSURANCE" | "PERK",
                        timing: "Monthly" | "Annually" | "SemiAnnually" | "Quarterly" | "OneTime",
                        max_amount: number | null (dollar amount),
                        keywords: string[] (3-5 keywords for transaction matching),
                        rule_config: {
                            minAmount: number | null (minimum transaction amount to match, e.g., 12 for $12.95 Walmart+ credit),
                            maxAmount: number | null (maximum transaction amount to match, e.g., 16 for $12.95 Walmart+ credit with tax)
                        } | null (only include if the benefit has a specific known dollar amount, leave null otherwise)
                    }]
                }]

                IMPORTANT CLASSIFICATION RULES:
                - STATEMENT_CREDIT: A credit that appears on the card statement after a purchase (e.g., "Airline Fee Credit", "Saks Credit", "Dining Credit").
                - EXTERNAL_CREDIT: Money given to you in an external account, NOT on the statement (e.g., "Uber Cash" deposited to Uber app, "Lyft Pink").
                - INSURANCE: Purchase protection, travel insurance, etc.
                - PERK: Lounge access, status, concierge, etc.

                RULE_CONFIG GUIDANCE:
                - For recurring credits with known amounts (like "$12.95/month Walmart+"), set minAmount to ~90% and maxAmount to ~115% of the amount to account for tax.
                - For flexible credits (like "Up to $200 airline fee"), leave rule_config as null.
                - For external credits that don't appear on statements, leave rule_config as null.

                Text:
                ${combinedText}
                `;

        const batchResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: detailPrompt }] }],
              generationConfig: {
                responseMimeType: "application/json",
                maxOutputTokens: 8192,
              },
            }),
          },
        );

        if (!batchResponse.ok) {
          const errorText = await batchResponse.text();
          console.error(
            `[AI Import] Gemini API error during detail extraction for batch ${batchNames.join(", ")}:`,
            errorText,
          );
          // Continue to next batch, but log error
          continue;
        }

        const batchData = await batchResponse.json();
        const batchText =
          batchData?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

        try {
          const batchProducts = JSON.parse(batchText);
          if (Array.isArray(batchProducts)) {
            products = [...products, ...batchProducts];
          } else {
            logger.error(
              "[AI Import] Batch response was not an array:",
              batchText,
            );
          }
        } catch (e) {
          logger.error("[AI Import] Failed to parse batch", {
            batchText,
            error: e,
          });
        }
      }

      if (products.length === 0) {
        return NextResponse.json(
          { error: "Invalid AI response format after batch processing" },
          { status: 500 },
        );
      }

      interface ImportResult {
        success: boolean;
        product?: CardProductData;
        error?: string;
      }

      interface ImportError {
        product: CardProductData;
        error: string;
      }

      // Import products into database
      const imported: ImportResult[] = [];
      const errors: ImportError[] = [];

      for (const productData of products) {
        try {
          // Upsert Product (Update existing, Create new)
          // We use upsert to ensure we don't create duplicates if the name matches
          const product = await prisma.cardProduct.upsert({
            where: {
              issuer_productName: {
                issuer: productData.issuer,
                productName: productData.product_name,
              },
            },
            create: {
              issuer: productData.issuer,
              productName: productData.product_name,
              cardType: productData.card_type || null,
              signupBonus: productData.signup_bonus || null,
            },
            update: {
              cardType: productData.card_type || null,
              signupBonus: productData.signup_bonus || null,
            },
          });

          // Import benefits (Clean Sync: Delete old, Add new)
          if (
            productData.cash_benefits &&
            Array.isArray(productData.cash_benefits)
          ) {
            // 1. Delete existing benefits for this card to avoid duplicates/zombies
            await prisma.cardBenefit.deleteMany({
              where: { cardProductId: product.id },
            });

            // 2. Insert new benefits
            for (const benefitData of productData.cash_benefits) {
              if (benefitData.benefit) {
                await prisma.cardBenefit.create({
                  data: {
                    cardProductId: product.id,
                    benefitName: benefitData.benefit,
                    description: benefitData.description || benefitData.benefit,
                    type: benefitData.type || "STATEMENT_CREDIT", // Default to statement credit if unsure
                    timing: benefitData.timing || "Annually",
                    maxAmount: benefitData.max_amount,
                    keywords: benefitData.keywords || [],
                    ruleConfig: benefitData.rule_config
                      ? JSON.parse(JSON.stringify(benefitData.rule_config))
                      : null, // Deep clone for Prisma JSON
                    isApproved: false, // MARK AS DRAFT (Requires Admin Review)
                    changeNotes: "AI-generated benefit - pending review",
                  },
                });
              }
            }
          }

          imported.push({
            success: true,
            product: productData,
          });
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          errors.push({
            product: productData,
            error: errorMessage,
          });
        }
      }

      return NextResponse.json({
        success: true,
        imported: imported.length,
        errors: errors.length,
        products: imported,
        errorDetails: errors,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Import failed";
      logger.error("AI import error", error);
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  });
}
