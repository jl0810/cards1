# E2E Testing Guide

## Current Test Status

✅ **3 Automated Smoke Tests** (passing)
- Homepage loads
- API endpoints protected  
- Build artifacts exist

⏸️ **Manual Plaid Link Test** (requires manual auth)

## Running Tests

### Automated Tests
```bash
npm run test:e2e
```

### Manual Plaid Test
The `e2e/auth-and-plaid.spec.ts` test requires you to sign in manually, then it will automatically test the Plaid Link flow.

**To run:**
```bash
npm run test:e2e:headed -- e2e/auth-and-plaid.spec.ts
```

**What it does:**
1. Opens browser
2. Waits for you to sign in (60 seconds)
3. Automatically clicks "Connect Bank"
4. Fills in Plaid sandbox credentials (`user_good` / `pass_good`)
5. Selects Chase bank
6. Completes linking
7. Verifies bank card appears

## Why Manual Auth?

Clerk's Playwright testing requires complex setup with test tokens. For now, manual sign-in is simpler and actually tests the real user flow.

## Test User Pattern

Use: `jeffllawson+testuser{number}@gmail.com`

Example:
- `jeffllawson+testuser1@gmail.com`
- `jeffllawson+testuser2@gmail.com`

Password: `TestPassword123!`

## Plaid Sandbox Credentials

**Institution:** Chase
**Username:** `user_good`
**Password:** `pass_good`

These will return test data without accessing real accounts.
