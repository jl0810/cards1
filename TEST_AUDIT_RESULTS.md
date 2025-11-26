# Test Audit Results - Over-Mocking Analysis

## CRITICAL ISSUES FOUND

### ❌ Tests That Mock Critical Vault Operations

**These tests mock Vault access, which is a CRITICAL security path:**

1. **`__tests__/api/plaid/exchange-public-token.test.ts`**
   - Line 75: `(prisma.$queryRaw as jest.Mock).mockResolvedValue([{ id: mockSecretId }])`
   - **Issue:** Mocks Vault secret creation
   - **Risk:** Won't catch if Vault storage fails in production
   - **Fix Needed:** Use real Vault integration test

2. **`__tests__/api/plaid/sync-transactions.test.ts`**
   - Line 69: `(prisma.$queryRaw as jest.Mock).mockResolvedValue([{ decrypted_secret: mockAccessToken }])`
   - **Issue:** Mocks Vault token retrieval
   - **Risk:** Won't catch if Vault decryption fails
   - **Fix Needed:** Use real Vault integration test

3. **`__tests__/api/plaid/items/status.test.ts`**
   - Line 94: `(prisma.$queryRaw as jest.Mock).mockResolvedValue([{ decrypted_secret: mockAccessToken }])`
   - **Issue:** Mocks Vault token retrieval
   - **Risk:** ALREADY CAUSED PRODUCTION BUG (used wrong RPC endpoint)
   - **Fix Needed:** Use real Vault integration test

---

## ACCEPTABLE MOCKS

### ✅ Tests That Mock External Services (OK)

1. **Clerk Auth** - External service, OK to mock
2. **Plaid API** - External service, OK to mock  
3. **Rate Limiting (Upstash)** - External service, OK to mock

### ✅ Tests That Mock Database Queries (OK for unit tests)

- Family member CRUD operations
- User profile lookups
- Account queries

**These are OK because:**
- They test business logic, not infrastructure
- Database operations are well-tested by Prisma
- We have integration tests for end-to-end flows

---

## TESTS THAT ARE GOOD (No Over-Mocking)

1. ✅ `__tests__/lib/validations.test.ts` - Pure logic, no mocks
2. ✅ `__tests__/lib/api-errors.test.ts` - Pure logic, no mocks
3. ✅ `__tests__/lib/benefit-matcher.test.ts` - Pure logic, no mocks
4. ✅ `__tests__/lib/logger.test.ts` - Mocks console (acceptable)
5. ✅ `__tests__/integration/supabase-vault.test.ts` - REAL Vault calls ✅
6. ✅ `__tests__/integration/plaid-sandbox.test.ts` - REAL Plaid calls ✅

---

## RECOMMENDATION

### Immediate Action Required:

**Option 1: Delete the 3 bad tests**
- They provide false confidence
- They already missed a production bug
- Better to have no test than a lying test

**Option 2: Rewrite with real Vault**
- Make them integration tests
- Use real DIRECT_URL connection
- Actually test Vault encryption/decryption

### Long-term Fix:

1. **Add to test guidelines:** "Never mock critical security paths (Vault, Auth verification)"
2. **Code review checklist:** Check for `prisma.$queryRaw` mocks in tests
3. **Integration test requirement:** All Vault operations must have integration tests

---

## PRODUCTION BUG CAUSED BY OVER-MOCKING

**Bug:** `status.test.ts` mocked `global.fetch` for a Supabase RPC call that never existed
**Impact:** Production code tried to call non-existent RPC endpoint, returned 404
**Root Cause:** Test mocked the wrong thing, never executed real code path
**Lesson:** Mocking critical paths creates false confidence

---

## VERDICT

**3 out of 18 test files (17%) have critical over-mocking issues**
**All 3 are API tests that mock Vault operations**
**This is a SYSTEMIC problem in API testing approach**
