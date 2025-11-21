# Card Catalog System - AI-Powered Card Product Matching

## Overview
The system uses AI (Gemini) to build a comprehensive card product catalog by scraping credit card websites and extracting structured data about card products and benefits.

## Data Flow

```
Web Sources (FrequentMiler, CardRatings, Issuer Sites)
    ↓ (AI Scraping)
Card Universe (Google Sheets) - Staging Area
    ↓ (User Review & Apply)
Card Benefits (Google Sheets) - Production Catalog
    ↓ (Manual Matching in UI)
PlaidAccount.cardProductId → Links to card product
```

## Key Components

### 1. **Card Universe Sheet** (Staging)
**Columns:**
- Issuer
- Product Name
- Signup Bonus
- Benefit
- Timing (Monthly/Quarterly/Annually/etc.)
- Max Amount
- Keywords (for transaction matching)
- Active? (Y/N)
- Apply? (Checkbox - user marks for approval)
- Applied? (Auto-set after applying)
- Last Updated

**Purpose:** AI dumps scraped data here for human review before it goes into production

### 2. **Card Benefits Sheet** (Production Catalog)
**Columns:**
- Issuer
- Product Name
- Benefit
- Timing
- Max Amount  
- Keywords
- Active?

**Purpose:** Clean, approved catalog of card products and their benefits

### 3. **AI Scraping Functions**

#### `buildCardCatalogAI_Run(issuerName)`
- Scrapes FrequentMiler & CardRatings for specific issuer
- Uses Gemini to extract: issuer, product_name, signup_bonus, card_type
- Writes to **Card Universe** (minimal schema)
- Allows human review before applying

#### `buildBenefitsFromUniverseAI_Run(issuerName)`
- Takes approved products from Card Universe
- Uses AI to extract detailed benefits
- Writes to **Card Universe** with full benefit details
- User reviews and marks "Apply?" to push to Card Benefits

#### Gemini Prompt Schema:
```json
[{
  "issuer": "string",
  "product_name": "string",
  "signup_bonus": "string",
  "card_type": "Points|Co-brand",
  "cash_benefits": [{
    "benefit": "string",
    "timing": "Monthly|Quarterly|SemiAnnually|Annually",
    "max_amount": number | null,
    "keywords": ["string"]  // e.g., ["resy", "restaurant"]
  }]
}]
```

### 4. **User Matching Flow (To Implement)**

#### Current State:
- Plaid gives us: "Chase Visa ending in 1234"
- We don't know if it's Sapphire Reserve, Freedom, etc.

#### Needed:
1. **CardProduct Model** (database table)
   ```prisma
   model CardProduct {
     id              String @id @default(cuid())
     issuer          String  // "Chase"
     productName     String  // "Sapphire Reserve"
     cardType        String  // "Points" | "Co-brand"
     annualFee       Float?
     signupBonus     String?
     imageUrl        String? // Card image
     benefits        Json    // Array of benefit objects
     active          Boolean @default(true)
     createdAt       DateTime @default(now())
     updatedAt       DateTime @updatedAt
     
     // Relations
     plaidAccounts   PlaidAccount[]
   }
   
   model PlaidAccount {
     // ... existing fields
     cardProductId   String?
     cardProduct     CardProduct? @relation(fields: [cardProductId], references: [id])
   }
   ```

2. **Import Flow**
   - Fetch Card Benefits sheet via Google Sheets API
   - Parse into CardProduct records
   - Store in database
   - Update periodically (weekly/monthly)

3. **Matching UI** (in Settings → Connected Banks or Dashboard)
   - When user expands a PlaidAccount
   - Show dropdown: "Which card is this?"
   - Filter by institution from Plaid
   - User selects "Chase Sapphire Reserve"
   - Save `cardProductId` to PlaidAccount

4. **Benefits Display** (Dashboard)
   - With `cardProductId` linked
   - Show proper card image
   - Display benefits (Airline credit, Dining credit, etc.)
   - Track benefit usage against transactions

## Implementation Steps

### Phase 1: Data Import
1. ☐ Create `CardProduct` model in schema
2. ☐ Build API endpoint to import from Google Sheets
3. ☐ Create seed script to populate initial catalog

### Phase 2: Matching UI
1. ☐ Add "Link to Product" button in Connected Banks
2. ☐ Build modal with searchable dropdown
3. ☐ Filter products by institution
4. ☐ Save `cardProductId` to PlaidAccount

### Phase 3: Benefits Display
1. ☐ Update Dashboard to show card images
2. ☐ Display benefits list for each card
3. ☐ Add benefit tracking (usage vs max_amount)
4. ☐ Calculate optimal card for each transaction

### Phase 4: Automation
1. ☐ Auto-suggest card product based on:
   - Institution name matching
   - Account mask matching
   - Product name heuristics
2. ☐ Periodic catalog updates from Google Sheets
3. ☐ AI-powered benefit matching to transactions

## API Endpoints Needed

```typescript
// Import card catalog from Google Sheets
POST /api/admin/import-card-catalog
Body: { sheetId: string, sheetName: string }

// Get all card products (for matching dropdown)
GET /api/card-products?institutionName=Chase

// Link PlaidAccount to CardProduct
PATCH /api/plaid/accounts/[accountId]
Body: { cardProductId: string }

// Get benefit tracking for a card
GET /api/benefits/[cardProductId]/tracking?startDate=2024-01&endDate=2024-12
```

## Google Sheets API Integration

```typescript
// Read Card Benefits sheet
const SHEET_ID = process.env.GOOGLE_SHEETS_CARD_CATALOG_ID;
const RANGE = 'Card Benefits!A2:G'; // All data rows

async function importCardCatalog() {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: RANGE,
  });
  
  const rows = response.data.values;
  const products = groupByProduct(rows); // Group benefits by product
  
  // Upsert to database
  for (const product of products) {
    await prisma.cardProduct.upsert({
      where: { 
        issuer_productName: {
          issuer: product.issuer,
          productName: product.productName
        }
      },
      create: product,
      update: product
    });
  }
}
```

## Next Steps

**Priority 1:** Do we want to build the CardProduct model and matching UI?

**Priority 2:** Should we import the existing Google Sheets data or start fresh with an AI scrape?

**Priority 3:** Where should the user match their PlaidAccount to a CardProduct?
  - Option A: In Settings → Connected Banks (when expanding account)
  - Option B: In Dashboard (when viewing a card)
  - Option C: Onboarding wizard after linking bank
