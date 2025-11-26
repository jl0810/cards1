# Security Guidelines

## ⚠️ Sensitive Information

### **Never Commit:**
- ❌ API keys, secrets, or tokens
- ❌ Database passwords
- ❌ `.env.local` or `.env.test.local` files
- ❌ Private keys or certificates

### **Always Gitignored:**
✅ `.env.local`
✅ `.env.test.local`
✅ `.env.production.local`
✅ Any file matching `.env*.local`

## 🔒 Plaid Security

### **Sandbox vs Production:**
- **Sandbox Secret**: Safe to use for testing, but still keep private
- **Production Secret**: NEVER commit or share
- Always verify `PLAID_ENV=sandbox` for tests

### **If You Accidentally Shared a Secret:**

#### For Sandbox:
1. Log into Plaid Dashboard
2. Rotate your sandbox API keys
3. Update `.env.local` and `.env.test.local`
4. No major security risk (sandbox is isolated)

#### For Production:
1. **Immediately** rotate keys in Plaid Dashboard
2. Check for any unauthorized API usage
3. Update production environment variables
4. Review access logs

## 🛡️ Best Practices

### **Development:**
```bash
# Copy template
cp .env.example .env.local

# Add your secrets (never commit .env.local)
# File is automatically in .gitignore
```

### **Testing:**
```bash
# Copy template
cp .env.test .env.test.local

# Add test credentials (never commit .env.test.local)
# File is automatically in .gitignore
```

### **Production:**
```bash
# Use environment variables in Vercel/hosting platform
# Never store production secrets in files
```

## ✅ Security Checklist

Before committing:
- [ ] No API keys in code
- [ ] No secrets in `.env` files that aren't `.local`
- [ ] All `.env*.local` files in `.gitignore`
- [ ] No database URLs or passwords
- [ ] No hardcoded tokens

## 📝 What's Safe to Commit

✅ `.env.example` - Template with placeholder values
✅ `.env.test` - Template without real credentials
✅ `SECURITY.md` - This file
✅ Public API endpoints
✅ Public configuration

## 🚨 If You Find a Security Issue

1. **Do not** create a public GitHub issue
2. Email: [your-security-email]
3. Include: Description, steps to reproduce, potential impact
4. We'll respond within 24 hours

## 🔐 Current Setup

### Gitignored Files (Safe):
- `.env.local` - Development secrets
- `.env.test.local` - Test secrets (including Plaid sandbox)
- `.env.production.local` - Production secrets (if any)

### Tracked Files (Public):
- `.env.example` - Template only
- `.env.test` - Template only

---

**Remember**: Even sandbox secrets should be treated as sensitive. They can't access production, but keeping them private is still best practice.
