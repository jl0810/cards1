import { NextResponse } from 'next/server';
import { withAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

interface BenefitData {
    benefit: string;
    description?: string;
    type?: 'STATEMENT_CREDIT' | 'EXTERNAL_CREDIT' | 'INSURANCE' | 'PERK';
    timing: string;
    max_amount: number | null;
    keywords: string[];
    ai_reasoning?: string;
}

// POST /api/admin/card-catalog/[cardId]/ai-import
export async function POST(
    req: Request,
    { params }: { params: Promise<{ cardId: string }> }
) {
    return withAdmin(async () => {
        const { cardId } = await params;
        const { sourceUrls } = await req.json();

        if (!cardId) {
            return NextResponse.json({ error: 'Card ID is required' }, { status: 400 });
        }

        // Get the card details first
        const card = await prisma.cardProduct.findUnique({
            where: { id: cardId }
        });

        if (!card) {
            return NextResponse.json({ error: 'Card not found' }, { status: 404 });
        }

        console.log('[AI Import] Starting benefits import for card:', card.productName);

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('[AI Import] GEMINI_API_KEY not configured');
            return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
        }

        try {
            // Default URLs if not provided
            const urls = sourceUrls || [
                'https://frequentmiler.com/best-credit-card-offers/',
                'https://www.cardratings.com/best-rewards-credit-cards.html'
            ];

            // Fetch content from URLs
            let combinedText = '';
            for (const url of urls) {
                try {
                    const response = await fetch(url);
                    const html = await response.text();
                    // Simple HTML to text conversion
                    const text = html
                        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
                        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
                        .replace(/<[^>]+>/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();
                    combinedText += text + '\n\n';
                } catch (error) {
                    console.error(`Failed to fetch ${url}:`, error);
                }
            }

            if (!combinedText) {
                console.error('[AI Import] Failed to fetch any content from sources');
                return NextResponse.json({ error: 'Failed to fetch source content' }, { status: 500 });
            }

            console.log(`[AI Import] Fetched ${combinedText.length} characters from sources`);

            // Truncate if too long
            const maxChars = 50000;
            if (combinedText.length > maxChars) {
                combinedText = combinedText.substring(0, maxChars);
            }

            // Get existing benefits for this card
        const existingBenefits = await prisma.cardBenefit.findMany({
            where: { cardProductId: cardId },
            orderBy: { benefitName: 'asc' }
        });

        console.log('[AI Import] Found existing benefits:', existingBenefits.length);

        // Extract benefits for this specific card
        console.log('[AI Import] Extracting benefits for:', card.productName);
        const benefitsPrompt = `
            Extract detailed benefits information for the credit card "${card.productName}" issued by "${card.issuer}".
            Focus ONLY on this specific card. Do not include benefits from other cards.
            
            Here are the CURRENT benefits we have on file for this card:
            ${existingBenefits.map(b => `- ${b.benefitName}: ${b.description || 'No description'} (${b.type}, ${b.timing}, $${b.maxAmount || 'unlimited'})`).join('\n')}
            
            Please analyze the source text and:
            1. CONFIRM which existing benefits are still accurate and current
            2. UPDATE any benefits with new details (amount changes, timing updates, etc.)
            3. ADD any new benefits that are missing
            4. REMOVE any benefits that are no longer offered
            
            CRITICAL: Return ONLY a valid JSON object. No explanations, no markdown formatting, no code blocks.
            The response must start with { and end with }.
            
            {
                "benefits": [{
                    "benefit": string (exact name of the benefit),
                    "description": string (detailed description),
                    "type": "STATEMENT_CREDIT" | "EXTERNAL_CREDIT" | "INSURANCE" | "PERK",
                    "timing": "Monthly" | "Annually" | "SemiAnnually" | "Quarterly" | "OneTime",
                    "max_amount": number | null (dollar amount, null if unlimited),
                    "keywords": string[] (3-5 keywords for transaction matching),
                    "ai_reasoning": string (brief explanation of why this benefit was included/updated based on the source text)
                }]
            }

            IMPORTANT CLASSIFICATION RULES:
            - STATEMENT_CREDIT: A credit that appears on the card statement after a purchase (e.g., "Airline Fee Credit", "Saks Credit", "Dining Credit").
            - EXTERNAL_CREDIT: Money given to you in an external account, NOT on the statement (e.g., "Uber Cash" deposited to Uber app, "Lyft Pink").
            - INSURANCE: Purchase protection, travel insurance, etc.
            - PERK: Lounge access, status, concierge, etc.

            CRITICAL CALCULATION RULES:
            - For benefits paid at intervals (monthly, quarterly, semi-annually), the max_amount should be the PER INTERVAL amount, not annual total
            - Example: "$400 annual credit, paid quarterly" = $100 max_amount with "Quarterly" timing
            - Example: "$240 annual credit, paid monthly" = $20 max_amount with "Monthly" timing
            - Example: "$200 annual credit" = $200 max_amount with "Annually" timing
            - Always calculate the actual per-interval amount for max_amount

            Source Text:
            ${combinedText}
            `;

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: benefitsPrompt }] }],
                        generationConfig: {
                            responseMimeType: "application/json",
                            maxOutputTokens: 8192
                        }
                    })
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[AI Import] Gemini API error:', errorText);
                return NextResponse.json({ 
                    error: 'AI benefit extraction failed',
                    details: errorText 
                }, { status: 500 });
            }

            const data = await response.json();
            const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{"benefits": []}';
            
            console.log('[AI Import] Raw Gemini response:', JSON.stringify(data, null, 2));
            console.log('[AI Import] Extracted text:', responseText);

            let benefitsData: { benefits: BenefitData[] };
            try {
                // Sometimes Gemini wraps the JSON in code blocks, try to extract it
                let cleanText = responseText;
                if (responseText.includes('```')) {
                    cleanText = responseText.replace(/```json\s*/, '').replace(/```\s*$/, '');
                }
                
                benefitsData = JSON.parse(cleanText);
                console.log(`[AI Import] Extracted ${benefitsData.benefits.length} benefits for ${card.productName}`);
            } catch (e) {
                console.error('[AI Import] Failed to parse benefits:', responseText);
                console.error('[AI Import] Parse error:', e);
                return NextResponse.json({ 
                    error: 'Failed to parse AI response', 
                    details: responseText.substring(0, 500) 
                }, { status: 500 });
            }

            // Import benefits (Smart Sync: Update existing, Add new, Remove obsolete)
            let importedCount = 0;
            let updatedCount = 0;
            let draftCount = 0; // Benefits marked as draft due to changes
            let removedCount = 0;
            let errors: any[] = [];

            // Get all existing benefits for comparison
            const existingBenefitsMap = new Map(
                existingBenefits.map(b => [b.benefitName.toLowerCase(), b])
            );

            // Process AI results
            for (const benefitData of benefitsData.benefits) {
                try {
                    if (benefitData.benefit) {
                        const benefitNameLower = benefitData.benefit.toLowerCase();
                        const existingBenefit = existingBenefitsMap.get(benefitNameLower);
                        
                        if (existingBenefit) {
                            // Check what changed
                            const changes = [];
                            
                            // Compare amount
                            const oldAmount = existingBenefit.maxAmount;
                            const newAmount = benefitData.max_amount;
                            if (oldAmount !== newAmount) {
                                if (oldAmount === null && newAmount !== null) {
                                    changes.push(`amount set to $${newAmount}`);
                                } else if (oldAmount !== null && newAmount === null) {
                                    changes.push(`amount changed from $${oldAmount} to unlimited`);
                                } else if (oldAmount !== null && newAmount !== null && oldAmount !== newAmount) {
                                    const change = newAmount > oldAmount ? 'increased' : 'decreased';
                                    changes.push(`amount ${change} from $${oldAmount} to $${newAmount}`);
                                }
                            }
                            
                            // Compare timing
                            if (existingBenefit.timing !== (benefitData.timing || 'Annually')) {
                                changes.push(`timing changed from ${existingBenefit.timing} to ${benefitData.timing || 'Annually'}`);
                            }
                            
                            // Compare type
                            if (existingBenefit.type !== (benefitData.type || 'STATEMENT_CREDIT')) {
                                changes.push(`type changed from ${existingBenefit.type} to ${benefitData.type || 'STATEMENT_CREDIT'}`);
                            }
                            
                            // Compare description (significant changes only)
                            const oldDesc = (existingBenefit.description || '').trim();
                            const newDesc = (benefitData.description || benefitData.benefit).trim();
                            if (oldDesc !== newDesc && Math.abs(oldDesc.length - newDesc.length) > 10) {
                                changes.push('description updated');
                            }
                            
                            if (changes.length > 0) {
                                // Mark as draft with change notes
                                const aiReasoning = benefitData.ai_reasoning ? `\nAI Reasoning: ${benefitData.ai_reasoning}` : '';
                                const changeNote = `🔄 CHANGES DETECTED:\n${changes.join('\n')}${aiReasoning}\n\n⚠️ This benefit requires re-approval due to the changes above.`;
                                
                                await prisma.cardBenefit.update({
                                    where: { id: existingBenefit.id },
                                    data: {
                                        description: benefitData.description || benefitData.benefit,
                                        type: benefitData.type || 'STATEMENT_CREDIT',
                                        timing: benefitData.timing || 'Annually',
                                        maxAmount: benefitData.max_amount,
                                        keywords: benefitData.keywords || [],
                                        isApproved: false, // Mark as draft due to changes
                                        changeNotes: changeNote // Store in separate field
                                    }
                                });
                                draftCount++;
                            } else {
                                // No meaningful changes, keep approval status
                                await prisma.cardBenefit.update({
                                    where: { id: existingBenefit.id },
                                    data: {
                                        description: benefitData.description || benefitData.benefit,
                                        type: benefitData.type || 'STATEMENT_CREDIT',
                                        timing: benefitData.timing || 'Annually',
                                        maxAmount: benefitData.max_amount,
                                        keywords: benefitData.keywords || [],
                                        // Keep existing isApproved status
                                    }
                                });
                                updatedCount++;
                            }
                            
                            // Remove from map so we can track what to delete later
                            existingBenefitsMap.delete(benefitNameLower);
                        } else {
                            // Create new benefit (always draft)
                            const aiReasoning = benefitData.ai_reasoning ? `🤖 AI Reasoning: ${benefitData.ai_reasoning}` : '';
                            
                            await prisma.cardBenefit.create({
                                data: {
                                    cardProductId: cardId,
                                    benefitName: benefitData.benefit,
                                    description: benefitData.description || benefitData.benefit,
                                    type: benefitData.type || 'STATEMENT_CREDIT',
                                    timing: benefitData.timing || 'Annually',
                                    maxAmount: benefitData.max_amount,
                                    keywords: benefitData.keywords || [],
                                    isApproved: false, // New benefits are always draft
                                    changeNotes: aiReasoning || null // Store AI reasoning in separate field
                                }
                            });
                            importedCount++;
                        }
                    }
                } catch (error: any) {
                    errors.push({
                        benefit: benefitData.benefit,
                        error: error.message
                    });
                }
            }

            // Remove benefits that no longer exist (were not in AI response)
            for (const [name, benefit] of existingBenefitsMap) {
                try {
                    await prisma.cardBenefit.delete({
                        where: { id: benefit.id }
                    });
                    removedCount++;
                } catch (error: any) {
                    errors.push({
                        benefit: benefit.benefitName,
                        error: `Failed to remove obsolete benefit: ${error.message}`
                    });
                }
            }

            return NextResponse.json({
                success: true,
                cardName: card.productName,
                imported: importedCount,
                updated: updatedCount,
                draft: draftCount,
                removed: removedCount,
                existingCount: existingBenefits.length,
                errors: errors.length,
                errorDetails: errors
            });
        } catch (error: any) {
            console.error('AI import error:', error);
            return NextResponse.json(
                { error: error.message || 'Import failed' },
                { status: 500 }
            );
        }
    });
}
