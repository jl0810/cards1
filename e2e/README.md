# E2E Testing Guide

## Automated Tests (Run Anytime)
```bash
npm run test:e2e
```

These tests run automatically:
- ✅ Homepage loads
- ✅ API endpoints protected
- ✅ Build artifacts exist

## Manual Plaid Link Test

To test the full Plaid Link flow with sandbox:

1. **Start the test in headed mode:**
   ```bash
   npm run test:e2e:headed -- e2e/plaid-link.spec.ts
   ```

2. **When browser opens:**
   - Sign in to your app manually
   - The test will automatically:
     - Click "Connect Bank"
     - Open Plaid Link
     - Select Chase
     - Enter credentials: `user_good` / `pass_good`
     - Select account
     - Complete linking
     - Verify bank appears on dashboard

3. **What it tests:**
   - ✅ Plaid Link widget opens
   - ✅ Sandbox credentials work
   - ✅ Bank account links successfully
   - ✅ Bank card appears on dashboard
   - ✅ Account mask displays
   - ✅ Balance shows
   - ✅ Duplicate prevention works

## Plaid Sandbox Credentials

**Test Institution:** Chase
**Username:** `user_good`
**Password:** `pass_good`

These credentials will:
- Successfully authenticate
- Return test accounts
- Simulate real bank data
- Not charge or access real accounts

## Troubleshooting

**Test times out waiting for sign-in:**
- Increase timeout in test file
- Or sign in faster (< 60 seconds)

**Plaid Link doesn't open:**
- Check PLAID_CLIENT_ID in .env
- Check PLAID_SECRET in .env
- Verify Plaid sandbox is enabled

**Duplicate test fails:**
- This is expected if you haven't linked Chase yet
- Link Chase once first, then run duplicate test
