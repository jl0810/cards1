# Integration Tests

## What are Integration Tests?

Integration tests use **real external services** (with sandbox/test credentials) instead of mocks.

## Current Integration Tests

### **Plaid Sandbox Integration** (`plaid-sandbox.test.ts`)
- Tests against **real Plaid sandbox API**
- Uses your actual sandbox credentials
- **Optional** - only runs when enabled

---

## Setup

### 1. Copy Environment Template
```bash
cp .env.test .env.test.local
```

### 2. Add Your Sandbox Credentials
Edit `.env.test.local`:
```bash
# Use same credentials as .env.local (sandbox mode)
PLAID_CLIENT_ID=your_client_id_here
PLAID_SECRET=your_sandbox_secret_here
PLAID_ENV=sandbox

# Enable integration tests
ENABLE_REAL_PLAID_TESTS=true
```

### 3. Run Integration Tests
```bash
npm run test:integration
```

---

## Why Optional?

### **Pros of Integration Tests:**
✅ Tests real API behavior
✅ Catches API changes
✅ Validates credentials
✅ Tests actual network calls

### **Cons:**
❌ Slower (network calls)
❌ Requires credentials
❌ Can hit rate limits
❌ External dependency

---

## Recommended Usage

### **During Development:**
```bash
npm test                    # Fast unit tests only
```

### **Before Deploying:**
```bash
ENABLE_REAL_PLAID_TESTS=true npm test    # Include integration tests
```

### **CI/CD:**
```yaml
# Only on main branch
- name: Integration Tests
  if: github.ref == 'refs/heads/main'
  env:
    ENABLE_REAL_PLAID_TESTS: true
  run: npm run test:integration
```

---

## Safety Features

1. **Must explicitly enable** - Won't run by accident
2. **Sandbox only** - Checks `PLAID_ENV=sandbox`
3. **No production data** - Sandbox is isolated
4. **Skips gracefully** - Shows message if disabled

---

## What Gets Tested

### **With Mocks (Unit Tests):**
- Business logic
- Error handling
- Data transformations
- **Fast, always reliable**

### **With Real API (Integration Tests):**
- API contract compliance
- Network error handling
- Actual Plaid behavior
- **Slow, requires setup**

---

## Best Practice

**Use both!**
- **90% mocked unit tests** - Fast feedback
- **10% integration tests** - Confidence in real API

Your current setup:
- ✅ 27 mocked Plaid tests (fast, reliable)
- ✅ 5 integration tests (optional, thorough)
