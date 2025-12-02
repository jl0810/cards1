# CRITICAL FINDING: Plaid /item/remove Implementation

## Issue Discovered

After reading Plaid's official documentation at https://plaid.com/docs/api/items/#itemremove, we discovered a **critical billing issue** in our disconnect implementation.

## The Problem

### What We Were Doing (WRONG):

```typescript
// OLD CODE - INCORRECT
await prisma.plaidItem.update({
  where: { id: itemId },
  data: { status: "disconnected" },
});
// ❌ Only marked as disconnected in DB
// ❌ Did NOT call Plaid's /item/remove
// ❌ STILL BEING BILLED for "disconnected" items!
```

### What Plaid Requires:

Per Plaid's documentation:

> "For subscription products, such as Transactions, Liabilities, and Investments, calling /item/remove is **required to end subscription billing** for the Item"

> "Calling /item/remove is a **recommended best practice** when offboarding users or if a user chooses to disconnect an account"

## The Fix

### What We're Doing Now (CORRECT):

```typescript
// NEW CODE - CORRECT
// 1. Get access token from Vault
const accessToken = await getAccessTokenFromVault(plaidItem.accessTokenId);

// 2. Call Plaid's /item/remove API
await plaidClient.itemRemove({
  access_token: accessToken,
});

// 3. Mark as disconnected in DB
await prisma.plaidItem.update({
  where: { id: itemId },
  data: { status: "disconnected" },
});
```

## Impact

### Before Fix:

- ❌ Disconnected items still incurred subscription fees
- ❌ Access tokens remained valid indefinitely
- ❌ Not following Plaid best practices
- ❌ Potential compliance issues

### After Fix:

- ✅ Subscription billing stops immediately
- ✅ Access tokens are invalidated
- ✅ Follows Plaid best practices
- ✅ Proper user offboarding

## What Needs to Be Updated

### 1. Code ✅

- [x] `app/api/plaid/items/[itemId]/disconnect/route.ts` - FIXED
  - Added `plaidClient.itemRemove()` call
  - Retrieves access token from Vault
  - Properly handles errors

### 2. Tests ⏳

- [ ] `__tests__/api/plaid/items/disconnect.test.ts` - NEEDS UPDATE
  - Currently tests OLD behavior (token preservation)
  - Needs to mock `plaidClient.itemRemove()`
  - Needs to mock Vault query
  - Update assertions to expect Plaid API call

### 3. E2E Tests ⏳

- [ ] `__tests__/integration/plaid-e2e-sandbox.test.ts` - NEEDS UPDATE
  - Add test for `/item/remove` endpoint
  - Validate it actually stops billing in sandbox

### 4. Documentation ⏳

- [ ] `docs/BUSINESS_RULES.md` - NEEDS UPDATE
  - Remove/update BR-034 (was about token preservation)
  - Add new rule about proper disconnect procedure
  - Reference Plaid documentation

- [ ] `docs/UI_MAPPING.md` - NEEDS UPDATE
  - Update disconnect button documentation
  - Clarify what happens when user disconnects

### 5. UI/UX ⏳

- [ ] Review disconnect confirmation dialog
  - Should clearly state account will be fully disconnected
  - Cannot be reconnected without re-linking
  - All data access will stop

## Business Rule Changes

### OLD (INCORRECT):

**BR-034: Access Token Preservation**

- Preserve access tokens when disconnecting
- Allow reconnection without re-auth
- ❌ This was WRONG - caused billing issues!

### NEW (CORRECT):

**BR-XXX: Proper Item Disconnection**

- Call `plaidClient.itemRemove()` when user disconnects
- Invalidates access token
- Stops subscription billing
- Follows Plaid best practices
- See: https://plaid.com/docs/api/items/#itemremove

## Testing Strategy

1. **Unit Tests**: Mock Plaid API, verify call is made
2. **E2E Tests**: Use sandbox to verify actual removal
3. **Manual Testing**: Disconnect in dev, verify billing stops

## References

- [Plaid /item/remove Documentation](https://plaid.com/docs/api/items/#itemremove)
- [Plaid Subscription Billing](https://plaid.com/docs/account/billing/#subscription-fee)
- Commit: "CRITICAL FIX: Call Plaid /item/remove on disconnect to stop billing"
