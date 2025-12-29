import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema, eq, ilike, and } from "@/db";

// Debug endpoint to test card matching algorithm
export async function POST(req: Request) {
    const session = await auth();
    const user = session?.user;
    if (!user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { accountName, institutionName, issuer } = await req.json();

    console.log("🎯 [Match Debug] Input:", { accountName, institutionName, issuer });

    // Fetch products using Drizzle
    const products = await db.query.cardProducts.findMany({
        where: and(
            eq(schema.cardProducts.active, true),
            issuer ? ilike(schema.cardProducts.issuer, `%${issuer}%`) : undefined
        ),
        columns: {
            id: true,
            issuer: true,
            productName: true
        }
    });

    console.log(`📦 [Match Debug] Fetched ${products.length} products`);

    // Calculate scores
    const normalize = (str: string) =>
        str.toLowerCase()
            .replace(/[®©™]/g, "")
            .replace(/[-_]/g, " ")
            .replace(/\s+/g, " ")
            .trim();

    const normalizedAccountName = normalize(accountName as string);
    const normalizedInstitution = institutionName ? normalize(institutionName as string) : "";

    const results = products.map(product => {
        const normalizedProductName = normalize(product.productName);
        const normalizedIssuer = normalize(product.issuer);

        let score = 0;
        const reasons: string[] = [];

        // Check issuer match
        const isIssuerMatch = (issuer: string, institution: string) => {
            if (issuer === institution) return true;

            const bankVariants: Record<string, string[]> = {
                "citi": ["citibank", "citi", "citigroup"],
                "amex": ["american express", "amex", "americanexpress"],
                "bofa": ["bank of america", "bofa", "bankofamerica"],
                "chase": ["chase", "jpmorgan chase", "jp morgan"],
                "wells": ["wells fargo", "wellsfargo", "wells"],
                "capital one": ["capitalone", "capital one"],
                "discover": ["discover", "discover bank"],
                "barclays": ["barclays", "barclaycard"]
            };

            for (const variants of Object.values(bankVariants)) {
                const issuerMatches = variants.some(v => issuer.includes(v) || v.includes(issuer));
                const institutionMatches = variants.some(v => institution.includes(v) || v.includes(institution));

                if (issuerMatches && institutionMatches) {
                    return true;
                }
            }

            return issuer.includes(institution) || institution.includes(issuer);
        };

        if (normalizedInstitution && isIssuerMatch(normalizedIssuer, normalizedInstitution)) {
            score += 50;
            reasons.push("Issuer match");
        }

        // Word matching
        const productWords = normalizedProductName.split(/\s+/).filter(w => w.length > 2);
        const accountWords = normalizedAccountName.split(/\s+/).filter(w => w.length > 2);

        let wordMatches = 0;
        for (const productWord of productWords) {
            if (accountWords.some(aw =>
                aw === productWord ||
                aw.includes(productWord) ||
                productWord.includes(aw)
            )) {
                wordMatches++;
            }
        }

        if (wordMatches > 0 && productWords.length > 0) {
            const wordScore = Math.min(30, (wordMatches / productWords.length) * 30);
            score += wordScore;
            reasons.push(`Word match: ${wordMatches}/${productWords.length} words`);
        }

        // Substring matching
        if (normalizedAccountName.includes(normalizedProductName)) {
            score += 20;
            reasons.push("Exact substring");
        }

        // Keywords
        const specialKeywords = ["platinum", "preferred", "reserve", "sapphire", "premier", "freedom", "venture", "executive", "signature", "world elite", "elite", "aadvantage"];
        for (const keyword of specialKeywords) {
            if (normalizedAccountName.includes(keyword) && normalizedProductName.includes(keyword)) {
                score += 5;
                reasons.push(`Keyword: ${keyword}`);
                break;
            }
        }

        return {
            product: `${product.issuer} - ${product.productName}`,
            score: Math.min(100, score),
            reasons,
            normalized: {
                productName: normalizedProductName,
                issuer: normalizedIssuer
            }
        };
    }).sort((a, b) => b.score - a.score);

    return NextResponse.json({
        input: {
            accountName,
            institutionName,
            normalized: {
                accountName: normalizedAccountName,
                institution: normalizedInstitution
            }
        },
        results: results.slice(0, 10) // Return top 10
    });
}
