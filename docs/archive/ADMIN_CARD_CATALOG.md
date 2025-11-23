# Admin Card Catalog - AI Import Setup

## Environment Variables

Add to your `.env` file:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

## Getting a Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the key and add to `.env`

## How It Works

The AI Import feature uses Gemini 1.5 Flash to:

1. **Scrape** card offer websites (FrequentMiler, CardRatings)
2. **Extract** product information and benefits
3. **Normalize** data into structured format
4. **Import** into database

## Usage

1. **Mark yourself as admin** in Clerk:
   ```bash
   # Via Clerk Dashboard
   Go to Users → Your User → Public Metadata
   Add: { "role": "admin" }
   
   # Or via script
   npx tsx scripts/make-admin.ts <your_clerk_user_id>
   ```

2. **Navigate to** `/admin/card-catalog`

3. **Click "AI Import"** button

4. **Enter issuer name** (e.g., "American Express", "Chase", "Citi")

5. **Wait for AI** to scrape and import

## Data Flow

```
User clicks "AI Import"
    ↓
Enter issuer name
    ↓
Fetch content from FrequentMiler & CardRatings
    ↓
Send to Gemini AI with structured prompt
    ↓
AI extracts JSON:
{
  issuer: "Chase",
  product_name: "Sapphire Reserve",
  signup_bonus: "75,000 points",
  card_type: "Points",
  cash_benefits: [
    {
      benefit: "Travel Credit",
      timing: "Annually",
      max_amount: 300,
      keywords: ["travel", "airline"]
    }
  ]
}
    ↓
Upsert CardProduct & CardBenefit records
    ↓
Display summary toast
```

## Manual Entry

You can also manually add products via the "Add Product" button:

1. Fill in issuer, product name, card type
2. Add annual fee, signup bonus, image URL
3. Click "Create Product"
4. Expand product → "Add Benefit" to add individual benefits

## API Endpoints

- `POST /api/admin/card-catalog/ai-import` - AI import (admin only)
- `GET /api/admin/card-products` - List all products
- `POST /api/admin/card-products` - Create product
- `PATCH /api/admin/card-products/[id]` - Update product
- `DELETE /api/admin/card-products/[id]` - Delete product
- `POST /api/admin/card-products/[id]/benefits` - Add benefit
- `PATCH /api/admin/card-benefits/[id]` - Update benefit
- `DELETE /api/admin/card-benefits/[id]` - Delete benefit

All endpoints require admin role via Clerk `publicMetadata.role = "admin"`.

## Example Import Result

```
✅ Imported 3 products with 8 benefits

Products:
- Chase Sapphire Reserve (3 benefits)
- Chase Sapphire Preferred (2 benefits)
- Chase Freedom Unlimited (3 benefits)
```

## Troubleshooting

**"GEMINI_API_KEY not configured"**
- Add `GEMINI_API_KEY` to `.env`
- Restart dev server

**"Forbidden: Admin access required"**
- Ensure you're logged in
- Check Clerk publicMetadata has `role: "admin"`

**"AI extraction failed"**
- Gemini API might be down
- Check API key is valid
- Try a different issuer

**"No data extracted from AI"**
- Website might have changed structure

- AI might need prompt adjustment
- Try manual entry instead
