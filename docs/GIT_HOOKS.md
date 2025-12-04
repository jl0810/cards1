# 🛡️ Git Hooks & Quality Automation

This project uses **Husky** for automated quality checks during `git commit` and `git push`.

## 🎯 Quick Reference

| Command                 | Description                  | When It Runs                  |
| ----------------------- | ---------------------------- | ----------------------------- |
| `git commit`            | Triggers **pre-commit** hook | Automatically on every commit |
| `git push`              | Triggers **pre-push** hook   | Automatically on every push   |
| `npm run quality:check` | Manual quality check         | Run anytime                   |
| `npm run quality:scan`  | Full codebase scan           | Run anytime                   |
| `npm run lint:fix`      | Auto-fix lint issues         | Run when lint fails           |
| `npm run docs:validate` | Validate traceability        | Run anytime                   |
| `npm run docs:coverage` | Generate coverage report     | Run anytime                   |
| `npm run docs:scan`     | Validate + coverage report   | Run anytime                   |

---

## 🔒 Pre-Commit Hook (Fast - Staged Files Only)

Runs **automatically** on `git commit` and checks **only staged files**:

### Checks Performed:

1. ✅ **TypeScript Type Check** - Production code only (excludes tests)
2. ✅ **ESLint + Prettier** - Auto-fixes formatting, catches issues including:
   - 🔴 **Explicit `any` types** (BLOCKED)
   - Unsafe type usage
   - Unused variables
   - Code quality issues
3. ✅ **Unit Tests** - Runs affected tests
4. ✅ **Documentation Validation** - Ensures docs are up-to-date
5. ✅ **Leaf Pattern Check** - No `'use client'` in `page.tsx`/`layout.tsx`
6. ✅ **Belt-and-Suspenders `any` Check** - Double-checks for explicit `any`

### What Gets Blocked:

- ❌ Explicit `any` types in production code
- ❌ TypeScript errors
- ❌ ESLint errors
- ❌ Failing tests
- ❌ `'use client'` in page/layout files
- ❌ Outdated documentation references

### Performance:

⚡ **Fast** - Only checks staged files (~5-15 seconds)

---

## 🚀 Pre-Push Hook (Comprehensive - FULL Codebase)

Runs **automatically** on `git push` and checks **entire codebase**:

### Checks Performed:

1. ✅ **Full TypeScript Type Check** - All production code
2. ✅ **Full ESLint Scan (Strict)** - Zero warnings allowed
3. ✅ **All Unit Tests** - Complete test suite
4. ✅ **Documentation & Traceability** - BR/US references validated
5. ✅ **Security Scan** - Checks for:
   - Hardcoded API keys
   - `console.log` in production
   - Other security issues

### What Gets Blocked:

- ❌ ANY type errors in codebase
- ❌ ANY lint errors or warnings
- ❌ ANY failing tests
- ❌ Documentation/traceability issues

### Performance:

🐢 **Slower** - Full codebase scan (~30-60 seconds)

**Why?** Catches issues in **old code** that might have slipped through commits.

---

## 📝 Manual Quality Checks

Run these commands **anytime** for quality assurance:

### Quick Check (What Pre-Commit Runs)

```bash
npm run lint
npm run type-check:production
npm test
```

### Full Quality Check

```bash
npm run quality:check
# Runs: type-check + lint:strict + tests
```

### Complete Codebase Scan

```bash
npm run quality:scan
# Runs: type-check + lint:strict + tests + docs validation
# This is essentially pre-push but manual
```

### Auto-Fix Lint Issues

```bash
npm run lint:fix
# Automatically fixes formatting and some lint issues
```

---

## 🔧 ESLint Configuration

### Critical Rules (Block Commits)

| Rule                                         | Severity  | Description                 |
| -------------------------------------------- | --------- | --------------------------- |
| `@typescript-eslint/no-explicit-any`         | **ERROR** | Blocks explicit `any` types |
| `@typescript-eslint/no-unused-vars`          | **ERROR** | Catches unused variables    |
| `@typescript-eslint/consistent-type-imports` | **ERROR** | Enforces `import type`      |

### Warning Rules (Don't Block)

| Rule                                         | Severity | Description                |
| -------------------------------------------- | -------- | -------------------------- |
| `@typescript-eslint/no-unsafe-assignment`    | WARN     | Unsafe `any` assignments   |
| `@typescript-eslint/no-unsafe-member-access` | WARN     | Unsafe property access     |
| `@typescript-eslint/no-non-null-assertion`   | WARN     | `!` operator usage         |
| `no-console`                                 | WARN     | `console.log` (use logger) |

---

## 🎨 lint-staged Configuration

**Staged files** are automatically:

1. ✅ Linted with ESLint (`--fix`)
2. ✅ Formatted with Prettier
3. ✅ Re-staged after fixes

Configuration in `package.json`:

```json
"lint-staged": {
  "*.{js,jsx,ts,tsx}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{json,md}": [
    "prettier --write"
  ]
}
```

---

## 🚨 Common Issues & Solutions

### Issue: "Unexpected any. Specify a different type"

**Problem:** ESLint detected explicit `any` type usage.

**Solution:**

```typescript
// ❌ BAD - Will be blocked
const updates: any = {};
interface Props { data: any }

// ✅ GOOD - Use proper types
const updates: Record<string, unknown> = {};
interface Props { data: UserProfile }

// ✅ GOOD - Use generics
interface Props<T> { data: T }

// ✅ GOOD - Use Framer Motion types
import type { Variant } from 'framer-motion';
initial?: Variant;
```

### Issue: "All imports are only used as types"

**Problem:** Regular imports used only for types.

**Solution:**

```typescript
// ❌ BAD
import { ReactNode } from "react";

// ✅ GOOD
import type { ReactNode } from "react";
```

ESLint can auto-fix this: `npm run lint:fix`

### Issue: Pre-commit is slow

**Cause:** Running tests on large test suite.

**Solution:** Pre-commit only runs affected tests. If still slow:

- Skip with `git commit --no-verify` (use sparingly!)
- Rely on pre-push for comprehensive checks

### Issue: Pre-push failed but I need to push urgently

**Emergency bypass** (use only when absolutely necessary):

```bash
git push --no-verify
```

⚠️ **WARNING:** This skips ALL quality checks. Only use in emergencies!

---

## 🔄 Skipping Hooks (When Appropriate)

### When to skip:

- ✅ WIP commits on feature branch
- ✅ Emergency hotfixes (review immediately after)
- ✅ Merge commits (auto-skipped)
- ✅ Reverting broken commits

### How to skip:

```bash
# Skip pre-commit
git commit --no-verify -m "WIP: feature in progress"

# Skip pre-push
git push --no-verify
```

### When NOT to skip:

- ❌ Regular feature commits
- ❌ Pushing to main/production
- ❌ Pull request commits
- ❌ "I'll fix it later" (you won't!)

---

## 📊 Hook Performance

| Hook       | Files Checked | Typical Time | Max Time |
| ---------- | ------------- | ------------ | -------- |
| Pre-commit | Staged only   | 5-15s        | 30s      |
| Pre-push   | All files     | 30-60s       | 2min     |

**Tips for faster hooks:**

- Keep commits focused (fewer files = faster)
- Run `npm run lint:fix` before committing
- Fix type errors as you code

---

## 🎓 Best Practices

### ✅ DO:

- Run `npm run quality:check` before opening PRs
- Fix lint warnings proactively
- Use `npm run lint:fix` to auto-fix issues
- Keep commits small and focused
- Run tests locally before committing

### ❌ DON'T:

- Skip hooks routinely with `--no-verify`
- Commit broken code "to fix later"
- Use `any` types (ESLint will catch it anyway)
- Ignore warnings (they become errors eventually)

---

## 🔍 Debugging Hooks

Enable verbose output:

```bash
# See what's happening in hooks
GIT_TRACE=1 git commit -m "test"

# Test pre-commit manually
.husky/pre-commit

# Test pre-push manually
.husky/pre-push
```

Check hook status:

```bash
# Verify hooks are installed
ls -la .husky/

# Check hook executable permissions
ls -l .husky/pre-commit .husky/pre-push
```

---

## 📚 Related Documentation

- [ESLint Config](./eslint.config.js) - Full ESLint rules
- [TypeScript Config](./tsconfig.json) - Compiler options
- [Global Rules](/.gemini/memory/user_global.md) - Engineering standards
- [Documentation Validator](./scripts/validate-docs.mjs) - Traceability checks

---

## 🎯 Summary

**Pre-Commit:** ⚡ Fast staged-file check with `any` type blocking  
**Pre-Push:** 🔒 Comprehensive full-codebase quality gate  
**Manual Scans:** 🛠️ Run anytime with `npm run quality:*`

This setup ensures **zero** `any` types and maintains **high code quality** automatically! 🎉
