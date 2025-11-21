/**
 * Test Gemini API connection
 * Usage: npx tsx scripts/test-gemini.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function testGemini() {
    if (!GEMINI_API_KEY) {
        console.error('❌ GEMINI_API_KEY not found in environment');
        process.exit(1);
    }

    console.log('🔑 API Key found:', GEMINI_API_KEY.substring(0, 10) + '...');
    console.log('');

    // Test 1: Simple text generation
    console.log('📝 Test 1: Simple text generation with Gemini 2.5 Pro...');
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: 'Say hello in JSON format: {"message": "..."}' }] }],
                    generationConfig: {
                        temperature: 0,
                        responseMimeType: 'application/json'
                    }
                })
            }
        );

        if (!response.ok) {
            const error = await response.text();
            console.error('❌ API Error:', error);
            return;
        }

        const data = await response.json();
        console.log('✅ Response received:', JSON.stringify(data, null, 2));
        console.log('');
    } catch (error: any) {
        console.error('❌ Test 1 failed:', error.message);
        return;
    }

    // Test 2: Card data extraction
    console.log('📝 Test 2: Card data extraction...');
    const sampleText = `
    American Express Platinum Card
    - $695 annual fee
    - 80,000 points signup bonus
    - $200 airline fee credit annually
    - $200 Uber credit annually
    - $100 Saks credit semi-annually
  `;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Extract credit card info into JSON: [{
                issuer: string,
                product_name: string,
                signup_bonus: string,
                card_type: "Points" | "Cashback",
                cash_benefits: [{
                  benefit: string,
                  timing: "Monthly" | "Annually" | "SemiAnnually",
                  max_amount: number | null,
                  keywords: string[]
                }]
              }]
              
              Text: ${sampleText}`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0,
                        responseMimeType: 'application/json'
                    }
                })
            }
        );

        if (!response.ok) {
            const error = await response.text();
            console.error('❌ API Error:', error);
            return;
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

        console.log('✅ Extracted data:', text);

        if (text) {
            const parsed = JSON.parse(text);
            console.log('✅ Parsed JSON:', JSON.stringify(parsed, null, 2));
        }

    } catch (error: any) {
        console.error('❌ Test 2 failed:', error.message);
    }
}

testGemini();
