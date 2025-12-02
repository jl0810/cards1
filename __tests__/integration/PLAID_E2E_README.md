# Plaid Sandbox E2E Tests

## Overview

This test suite validates our Plaid integration against **real Plaid sandbox API responses**. This ensures our schemas, validation, and logic match what Plaid actually sends.

## Why This Matters

The `institution_id` bug we just fixed was caused by our tests using mocked data that didn't match Plaid's actual response structure. These E2E tests prevent that from happening again.

## Prerequisites

1. **Plaid Sandbox Credentials**
   - Add to `.env.test.local`:
     ```bash
     PLAID_CLIENT_ID=your_client_id
     PLAID_SECRET=your_sandbox_secret
     PLAID_ENV=sandbox
     ```

2. **Database Connection**
   - Tests need a database to create/cleanup test users
   - Uses your existing `DATABASE_URL` from `.env.test.local`

## Running the Tests

```bash
# Run all E2E tests
npm test -- __tests__/integration/plaid-e2e-sandbox.test.ts

# Run with verbose output
npm test -- __tests__/integration/plaid-e2e-sandbox.test.ts --verbose
```

## What Gets Tested

### 1. Link Token Creation

- ✅ Validates link token structure
- ✅ Checks expiration field

### 2. Public Token Exchange (Full Flow)

- ✅ Creates sandbox public token
- ✅ Exchanges for access token
- ✅ **Validates metadata structure matches our schema** (prevents `institution_id` bugs!)
- ✅ Fetches accounts
- ✅ Fetches liabilities

### 3. Transactions Sync

- ✅ Syncs transactions
- ✅ Fetches account balances

### 4. Item Management

- ✅ Gets item status
- ✅ Handles item removal

### 5. Error Handling

- ✅ Invalid public token
- ✅ Invalid access token

## Data Cleanup

**All test data is automatically cleaned up** in `afterAll()`:

1. Removes Plaid items from sandbox via `itemRemove()`
2. Deletes `PlaidAccount` records from database
3. Deletes `PlaidItem` records from database
4. Deletes `FamilyMember` records from database
5. Deletes `UserProfile` records from database

**No test data is left behind!**

## Test Isolation

- Each test run creates unique users with timestamps
- Test data is tracked in `testResources` object
- Cleanup runs even if tests fail

## Skipping Tests

Tests automatically skip if:

- Plaid credentials are not configured
- `PLAID_ENV` is not set to `sandbox`
- Database is not available

## Best Practices

1. **Run before major releases** to validate against real Plaid API
2. **Run after Plaid SDK updates** to catch breaking changes
3. **Add new tests** when implementing new Plaid endpoints
4. **Never use production credentials** - sandbox only!

## Troubleshooting

### Tests are skipped

- Check `.env.test.local` has all required variables
- Ensure `PLAID_ENV=sandbox`
- Verify database connection

### Cleanup fails

- Check database permissions
- Ensure foreign key constraints are properly configured
- Review `afterAll()` logs for specific errors

### Plaid API errors

- Verify sandbox credentials are valid
- Check Plaid dashboard for API status
- Review Plaid error codes in test output

## Related Documentation

- [Plaid Sandbox Documentation](https://plaid.com/docs/sandbox/)
- [Plaid Troubleshooting](https://plaid.com/docs/link/troubleshooting/)
- `docs/BUSINESS_RULES.md` - BR-009A (Token Exchange Retry Logic)
