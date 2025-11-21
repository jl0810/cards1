# Data Architecture - Extended Tables Pattern

## Overview
We use separate "extended" tables to store our enrichments and user data, keeping them isolated from Plaid's raw data. This allows us to safely re-sync or delete Plaid data without losing user customizations.

## Pattern

```
PlaidAccount (raw Plaid data) ←1:1→ AccountExtended (our enrichments)
PlaidTransaction (raw Plaid data) ←1:1→ TransactionExtended (our enrichments)
```

## Benefits

✅ **Data Integrity**: User data survives Plaid re-syncs  
✅ **Clean Separation**: Raw API data vs enrichments  
✅ **Flexibility**: Easy to add custom fields without touching Plaid schema  
✅ **Safety**: Can blow away Plaid data and re-fetch without data loss

---

## Tables

### 1. **PlaidAccount** (Raw Plaid Data)
**Purpose**: Store balance and account data exactly as received from Plaid

**Fields:**
- Institution info (name, ID)
- Account identifiers (accountId, name, mask, type, subtype)
- Balances (current, available, limit)
- Liability data (APR, due dates, payment info) - for credit cards
- Relations: `plaidItem`, `familyMember`, `transactions`

**Updates**: Refreshed from Plaid API periodically

---

### 2. **AccountExtended** (Our Enrichments)
**Purpose**: Store user customizations and card product matching

**Fields:**
```prisma
model AccountExtended {
  plaidAccountId    String @unique    // Links to PlaidAccount
  
  // Card Product Matching
  cardProductId     String?           // Links to CardProduct catalog
  cardProduct       CardProduct?
  
  // User Enrichments
  nickname          String?           // "My Chase Card"
  isFavorite        Boolean
  sortOrder         Int?              // Custom ordering
  color             String?           // UI customization
  notes             String?           // User notes
}
```

**Updates**: Updated by user actions in UI

---

### 3. **PlaidTransaction** (Raw Plaid Data)
**Purpose**: Store transaction data exactly as received from Plaid

**Fields:**
- Transaction identifiers (transactionId)
- Amount, date, name, merchant
- Category (from Plaid)
- Pending status
- Relations: `plaidItem`, `account`

**Updates**: Synced from Plaid `/transactions/sync` endpoint

---

### 4. **TransactionExtended** (Our Enrichments)
**Purpose**: Store benefit matching, user categories, and notes

**Fields:**
```prisma
model TransactionExtended {
  plaidTransactionId  String @unique  // Links to PlaidTransaction
  
  // Benefit Tracking
  matchedBenefitId    String?         // Matched to card benefit
  benefitUsageId      String?         // Which usage period
  coveredAmount       Float?          // How much was reimbursed
  
  // User Enrichments
  customCategory      String?         // User/AI override
  notes               String?         // User notes
  tags                String[]        // User tags
  isExcludedFromBudget Boolean        // Budget tracking
}
```

**Updates**: 
- Auto-matched by benefit tracking algorithm
- Updated by user in UI

---

## Card Catalog System

### **CardProduct**
**Purpose**: Catalog of credit card products

**Fields:**
- Issuer (Chase, Amex, Citi)
- Product Name (Sapphire Reserve, Platinum Card)
- Card Type, Annual Fee, Signup Bonus
- Image URL
- Relations: `benefits`, `accountExtensions`

---

### **CardBenefit**
**Purpose**: Individual benefits for each card product

**Fields:**
```prisma
model CardBenefit {
  cardProductId     String
  benefitName       String       // "Resy Credit"
  timing            String       // "Monthly" | "Quarterly" | "Annually"
  maxAmount         Float?       // 100
  keywords          String[]     // ["resy", "restaurant"]
  active            Boolean
}
```

**Used For**: Matching transactions to benefits

---

### **BenefitUsage**
**Purpose**: Track benefit usage per account per period

**Fields:**
```prisma
model BenefitUsage {
  cardBenefitId     String
  plaidAccountId    String
  periodStart       DateTime     // 2024-01-01
  periodEnd         DateTime     // 2024-03-31
  maxAmount         Float        // 100
  usedAmount        Float        // 75
  remainingAmount   Float        // 25
}
```

**Unique Constraint**: `[cardBenefitId, plaidAccountId, periodStart]`

**Purpose**: One usage record per benefit, per account, per period

---

## Data Flow Examples

### Example 1: Linking Account to Card Product

```typescript
// User selects "Chase Sapphire Reserve" for their "Chase Visa ••1234"
await prisma.accountExtended.upsert({
  where: { plaidAccountId: account.id },
  create: {
    plaidAccountId: account.id,
    cardProductId: 'chase-sapphire-reserve-id'
  },
  update: {
    cardProductId: 'chase-sapphire-reserve-id'
  }
});
```

✅ If we re-sync PlaidAccount, `AccountExtended.cardProductId` persists

---

### Example 2: Matching Transaction to Benefit

```typescript
// Transaction: $150 at "Resy - Carbone NYC"
const transaction = await prisma.plaidTransaction.findUnique({
  where: { id: txId },
  include: { 
    account: { 
      include: { 
        extended: { 
          include: { 
            cardProduct: { 
              include: { benefits: true } 
            } 
          } 
        } 
      } 
    } 
  }
});

const cardProduct = transaction.account.extended?.cardProduct;
const resyBenefit = cardProduct?.benefits.find(b => 
  b.keywords.some(kw => transaction.merchantName.toLowerCase().includes(kw))
);

if (resyBenefit) {
  // Create/update TransactionExtended
  await prisma.transactionExtended.upsert({
    where: { plaidTransactionId: transaction.id },
    create: {
      plaidTransactionId: transaction.id,
      matchedBenefitId: resyBenefit.id,
      coveredAmount: Math.min(150, resyBenefit.maxAmount)
    },
    update: {
      matchedBenefitId: resyBenefit.id,
      coveredAmount: Math.min(150, resyBenefit.maxAmount)
    }
  });
}
```

✅ If we delete and re-sync PlaidTransaction, we can re-match to `TransactionExtended`

---

## Admin Roles

### Clerk Public Metadata

```json
{
  "role": "admin"
}
```

### Helper Functions

```typescript
// Server-side (API routes)
import { requireAdmin } from '@/lib/admin';

export async function GET() {
  const adminUser = await requireAdmin();  // Throws if not admin
  // ... admin logic
}

// Client-side (Components)
import { useIsAdmin } from '@/hooks/use-admin';

function AdminPanel() {
  const isAdmin = useIsAdmin();
  if (!isAdmin) return null;
  return <div>Admin Controls</div>;
}
```

### Making Users Admin

**Option A: Clerk Dashboard**
1. Go to Users → Select user
2. Add to Public Metadata: `{ "role": "admin" }`

**Option B: Script**
```bash
npx tsx scripts/make-admin.ts user_xxx
```

---

## Next Steps

1. ✅ Schema complete
2. ☐ Build card catalog import API
3. ☐ Build account → product matching UI
4. ☐ Build transaction → benefit matching algorithm
5. ☐ Build admin UI for card catalog management
6. ☐ Build benefit usage tracking dashboard
