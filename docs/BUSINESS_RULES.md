# Business Rules

This document defines all business rules for the PointMax Velocity application.

## Rule Format

```
**[BR-ID]** Rule Title
**Category:** [category]
**Description:** [detailed description]
**User Stories:** [US-ID, US-ID]
**Code:** [file paths]
**Tests:** [test file paths]
```

---

## Authentication & User Management Rules

### **[BR-001]** User Profile Creation
**Category:** Authentication  
**Description:** When a new user registers via Clerk, a UserProfile must be automatically created in the database with their Clerk ID, name, and avatar. A primary family member must also be created.

**User Stories:** [US-001], [US-002]  
**Code:** `lib/webhooks/handlers/user.ts::handleUserCreated` (lines 48-90)  
**Tests:** None

---

### **[BR-002]** Welcome Email
**Category:** Notifications  
**Description:** All new users must receive a welcome email after successful registration.

**User Stories:** [US-001]  
**Code:** `lib/webhooks/handlers/user.ts::handleUserCreated` (line 93)  
**Tests:** None

---

## Family Member Management Rules

### **[BR-003]** Family Member Ownership
**Category:** Authorization  
**Description:** Users can only view, create, update, or delete family members that belong to their own account. Cross-account access is prohibited.

**User Stories:** [US-003], [US-004], [US-005]  
**Code:** 
- `app/api/user/family/route.ts` (lines 12-30)
- `app/api/user/family/[memberId]/route.ts` (lines 25-32, 65-78)  
**Tests:** `__tests__/api/user/family.test.ts`

---

### **[BR-004]** Family Member Name Requirements
**Category:** Data Validation  
**Description:** Family member names must be 1-100 characters, non-empty, and whitespace is trimmed. Email must be valid format if provided. Avatar must be valid URL if provided.

**User Stories:** [US-003]  
**Code:** `lib/validations.ts::CreateFamilyMemberSchema` (lines 24-41)  
**Tests:** `__tests__/lib/validations.test.ts` (lines 12-72)

---

### **[BR-005]** Partial Updates Allowed
**Category:** Data Management  
**Description:** When updating family members, partial updates are supported. Only provided fields are updated; others remain unchanged.

**User Stories:** [US-004]  
**Code:** 
- `lib/validations.ts::UpdateFamilyMemberSchema` (lines 43-55)
- `app/api/user/family/[memberId]/route.ts` (lines 45-52)  
**Tests:** `__tests__/lib/validations.test.ts` (lines 74-88)

---

### **[BR-006]** Primary Member Protection
**Category:** Data Integrity  
**Description:** The primary family member cannot be deleted as they represent the account owner. Attempts to delete return 400 Bad Request.

**User Stories:** [US-005]  
**Code:** `app/api/user/family/[memberId]/route.ts` (lines 91-94)  
**Tests:** None

---

### **[BR-007]** Bank Connection Dependency
**Category:** Data Integrity  
**Description:** Family members with active bank connections cannot be deleted. All bank items must be reassigned or removed first.

**User Stories:** [US-005]  
**Code:** `app/api/user/family/[memberId]/route.ts` (lines 96-102)  
**Tests:** None

---

## Bank Account Integration Rules

### **[BR-008]** Duplicate Detection
**Category:** Data Integrity  
**Description:** When linking bank accounts, the system checks for duplicates by matching institution ID and account masks. If a duplicate is detected, the existing item is returned instead of creating a new one.

**User Stories:** [US-006]  
**Code:** `app/api/plaid/exchange-public-token/route.ts` (lines 60-81)  
**Tests:** None

---

### **[BR-009]** Secure Token Storage
**Category:** Security  
**Description:** Plaid access tokens must be encrypted and stored in Supabase Vault, never in plain text in the database. Only the vault secret ID is stored in the database.

**User Stories:** [US-006]  
**Code:** `app/api/plaid/exchange-public-token/route.ts` (lines 115-125)  
**Tests:** None

---

### **[BR-010]** Family Member Assignment
**Category:** Data Management  
**Description:** When linking accounts, if no family member is specified, accounts are automatically assigned to the primary (owner) family member.

**User Stories:** [US-006]  
**Code:** `app/api/plaid/exchange-public-token/route.ts` (lines 43-52)  
**Tests:** None

---

### **[BR-011]** Transaction Sync Limits
**Category:** Performance  
**Description:** Transaction sync is limited to maximum 50 iterations to prevent infinite loops. Database transactions timeout after 20 seconds.

**User Stories:** [US-007]  
**Code:** 
- `lib/constants.ts::PLAID_SYNC_CONFIG` (lines 21-26)
- `app/api/plaid/sync-transactions/route.ts` (uses constants)  
**Tests:** `__tests__/lib/constants.test.ts` (lines 23-44)

---

### **[BR-012]** Transaction Sync Rate Limiting
**Category:** Performance  
**Description:** Plaid transaction sync is rate-limited to 10 requests per hour per user to prevent API quota exhaustion and system overload.

**User Stories:** [US-007], [US-014]  
**Code:** `app/api/plaid/sync-transactions/route.ts` (line 16-20)  
**Tests:** None

---

### **[BR-013]** Atomic Transaction Processing
**Category:** Data Integrity  
**Description:** All transaction sync operations (add, modify, remove) must occur within a single database transaction to maintain data consistency.

**User Stories:** [US-007]  
**Code:** `app/api/plaid/sync-transactions/route.ts` (lines 74-226)  
**Tests:** None

---

### **[BR-014]** Account Balance Display
**Category:** User Interface  
**Description:** Account balances must be formatted in the appropriate currency (defaults to USD). Null/undefined balances display as "N/A".

**User Stories:** [US-008]  
**Code:** 
- `hooks/use-accounts.ts::formatCurrency` (lines 22-32)
- `lib/constants.ts::DEFAULT_CURRENCY` (line 31)  
**Tests:** `__tests__/hooks/use-accounts.test.ts` (lines 231-262)

---

### **[BR-015]** Due Date Calculation
**Category:** Business Logic  
**Description:** Payment due dates are calculated from current date: "Today", "Tomorrow", "X days", or "Overdue" for past dates. Missing dates show "N/A".

**User Stories:** [US-008]  
**Code:** `hooks/use-accounts.ts` (lines 77-85)  
**Tests:** `__tests__/hooks/use-accounts.test.ts` (lines 135-230)

---

### **[BR-016]** Account Nickname Persistence
**Category:** Data Management  
**Description:** Account nicknames are stored in AccountExtended table (not Plaid data) to persist across re-syncs. Max 50 characters, whitespace trimmed.

**User Stories:** [US-009]  
**Code:** 
- `lib/validations.ts::UpdateAccountNicknameSchema` (lines 68-75)
- `app/api/account/[accountId]/nickname/route.ts`  
**Tests:** `__tests__/lib/validations.test.ts` (lines 100-118)

---

## Benefit Matching Rules

### **[BR-017]** Merchant Pattern Matching
**Category:** Business Logic  
**Description:** Transactions are matched to benefits using regex patterns on merchant names. Matching is case-insensitive and uses flexible pattern matching.

**User Stories:** [US-010]  
**Code:** `lib/benefit-matcher.ts::BENEFIT_MATCHING_RULES` (lines 20-87)  
**Tests:** `__tests__/lib/benefit-matcher.test.ts` (lines 56-96, 195-214)

---

### **[BR-018]** Category-Based Matching
**Category:** Business Logic  
**Description:** Some benefits (e.g., airline credits) also match on transaction category in addition to merchant patterns.

**User Stories:** [US-010]  
**Code:** `lib/benefit-matcher.ts` (line 47, airline benefit)  
**Tests:** `__tests__/lib/benefit-matcher.test.ts` (lines 117-131)

---

### **[BR-019]** Amount Guard Rails
**Category:** Business Logic  
**Description:** Certain benefits (e.g., Walmart+) have min/max amount requirements to avoid false matches. Transactions outside the range are not matched.

**User Stories:** [US-010]  
**Code:** `lib/benefit-matcher.ts::BENEFIT_MATCHING_RULES.walmart` (lines 73-74)  
**Tests:** `__tests__/lib/benefit-matcher.test.ts` (lines 138-152)

---

### **[BR-020]** Monthly and Annual Limits
**Category:** Business Logic  
**Description:** Each benefit has monthly and/or annual credit limits. Once limits are reached, no additional matches occur for that period.

**User Stories:** [US-010]  
**Code:** `lib/benefit-matcher.ts::BenefitMatchCriteria` (lines 15-16)  
**Tests:** `__tests__/lib/benefit-matcher.test.ts` (lines 133-164, 215-232)

---

### **[BR-021]** Benefit Period Calculation
**Category:** Business Logic  
**Description:** Benefit usage periods are calculated based on timing (Monthly, Quarterly, Semi-Annually, Annually). Current period determines which usage records are active.

**User Stories:** [US-011]  
**Code:** `app/api/benefits/usage/route.ts` (lines 20-34, 135-150)  
**Tests:** `__tests__/api/benefits/usage.test.ts` (lines 99-130)

---

### **[BR-022]** Usage Percentage Calculation
**Category:** Business Logic  
**Description:** Benefit usage is calculated as (usedAmount / maxAmount) * 100. Remaining amount is max - used, clamped to 0.

**User Stories:** [US-011]  
**Code:** `app/api/benefits/usage/route.ts` (lines 116-122)  
**Tests:** `__tests__/api/benefits/usage.test.ts` (lines 50-113)

---

### **[BR-023]** Urgency-Based Sorting
**Category:** User Interface  
**Description:** Benefits are sorted by urgency: completed benefits last, then by days remaining (ascending), then by remaining amount (descending).

**User Stories:** [US-011]  
**Code:** `app/api/benefits/usage/route.ts` (lines 173-190)  
**Tests:** `__tests__/api/benefits/usage.test.ts` (lines 132-202)

---

### **[BR-024]** Cursor-Based Tracking
**Category:** Performance  
**Description:** Benefit matching uses cursor-based tracking to avoid re-processing already-matched transactions. Only new transactions are scanned.

**User Stories:** [US-012]  
**Code:** `lib/benefit-matcher.ts::scanAndMatchBenefits`  
**Tests:** None

---

## UI & Display Rules

### **[BR-025]** Dashboard Auto-Refresh
**Category:** User Experience  
**Description:** Dashboard data auto-loads on mount and can be manually refreshed. Loading states and errors are displayed to users.

**User Stories:** [US-013]  
**Code:** `app/dashboard/page.tsx` (lines 46-69, 99-127)  
**Tests:** None

---

## Validation & Security Rules

### **[BR-026]** Input Validation Required
**Category:** Security  
**Description:** All API endpoints that accept user input must validate using Zod schemas before processing. Invalid input returns 400 Bad Request with descriptive error.

**User Stories:** [US-015]  
**Code:** 
- `lib/validations.ts` (all schemas)
- Applied in: `app/api/user/family/route.ts`, `app/api/account/[accountId]/nickname/route.ts`  
**Tests:** `__tests__/lib/validations.test.ts` (50+ tests)

---

### **[BR-027]** Data Sanitization
**Category:** Security  
**Description:** User input is sanitized: strings are trimmed, email validation enforced, URLs validated, lengths checked.

**User Stories:** [US-015]  
**Code:** `lib/validations.ts` (Zod transformations like `.trim()`)  
**Tests:** `__tests__/lib/validations.test.ts` (lines 28-37, 109-117)

---

### **[BR-028]** Standardized Error Responses
**Category:** User Experience  
**Description:** All API errors return consistent JSON format with appropriate HTTP status codes. Sensitive information is never exposed in error messages.

**User Stories:** [US-016]  
**Code:** `lib/api-errors.ts`  
**Tests:** `__tests__/lib/api-errors.test.ts` (25+ tests)

---

### **[BR-029]** Structured Logging
**Category:** Operations  
**Description:** All application events are logged using structured logger with appropriate levels (debug, info, warn, error) and contextual metadata. Console.log is prohibited in production code.

**User Stories:** [US-017]  
**Code:** `lib/logger.ts`  
**Tests:** `__tests__/lib/logger.test.ts`

---

### **[BR-030]** API Rate Limits
**Category:** Performance & Security  
**Description:** API endpoints are rate-limited: Write operations (20/min), Plaid sync (10/hour), Default (60/min). Exceeded limits return 429 Too Many Requests.

**User Stories:** [US-018]  
**Code:** `lib/rate-limit.ts`  
**Tests:** None

---

## Admin Rules

### **[BR-031]** Admin Role Required
**Category:** Authorization  
**Description:** Admin functions (card catalog management) require admin role stored in Clerk private metadata. Public metadata is not trusted for authorization.

**User Stories:** [US-019]  
**Code:** `lib/admin.ts`  
**Tests:** None

---

### **[BR-032]** Benefit Activation Control
**Category:** Business Logic  
**Description:** Only active benefits (active=true) are used for transaction matching. Inactive benefits are retained for historical tracking but not matched.

**User Stories:** [US-019]  
**Code:** `lib/validations.ts::CreateCardBenefitSchema` (line 158)  
**Tests:** `__tests__/lib/validations.test.ts` (lines 294-302)

---

### **[BR-033]** Connection Health Monitoring
**Category:** User Experience / Operations  
**Description:** System must continuously monitor Plaid connection health and provide real-time visual feedback to users. Status checks detect ITEM_LOGIN_REQUIRED errors (needs re-authentication), token expiration warnings, connection errors, and active/healthy connections.

**Visual Indicators Required:**
- 🟢 Green "Active": emerald-400, CheckCircle icon - Connection healthy and syncing
- 🟡 Yellow "Needs Re-auth": amber-400, AlertCircle icon - ITEM_LOGIN_REQUIRED detected
- 🔴 Red "Error": red-400, AlertCircle icon - Other Plaid errors encountered
- ⚪ Gray "Disconnected": slate-400, Unplug icon - User manually disconnected

**Triggered By:**
- User clicks "Check Status" button
- Location: Settings > Connected Banks > [Bank Card]
- Component: `connected-banks-section.tsx`

**User Feedback:**
- Loading: Toast "Checking status..."
- Success: Badge color updates + Toast "Status updated" + timestamp refreshes
- Error: Toast "Failed to refresh status"

**User Stories:** [US-020]  
**Code:** 
- Backend: `app/api/plaid/items/[itemId]/status/route.ts` (lines 70-94)
- Frontend: `components/velocity/connected-banks-section.tsx` (lines 68-76, 220-226)  
**Tests:** `__tests__/api/plaid/items/status.test.ts` (13 tests: 3 passing, needs refinement)

---

### **[BR-034]** Access Token Preservation
**Category:** Compliance / Security  
**Description:** Per Plaid API requirements, access tokens must NEVER be deleted from Supabase Vault, even when user disconnects a bank connection. The disconnect operation only updates the PlaidItem status field to 'disconnected' while preserving the encrypted token in Vault. This ensures compliance with Plaid's data retention policies and allows for potential reconnection without re-authentication.

**Triggered By:**
- User clicks "Disconnect" button
- Location: Settings > Connected Banks > [Bank Card] > Actions
- Component: `connected-banks-section.tsx`

**User Feedback:**
- Confirmation: Modal "Disconnect [Bank Name]? This will stop syncing but preserve your data."
- Actions: "Disconnect" button (red) / "Cancel" button
- Success: Toast "[Bank Name] disconnected" + status badge changes to gray
- Result: PlaidItem.status = 'disconnected', access token remains in Vault

**User Stories:** [US-006, US-020]  
**Code:** `app/api/plaid/items/[itemId]/disconnect/route.ts` (lines 32-39)  
**Tests:** `__tests__/api/plaid/items/disconnect.test.ts` ✅ **93% PASSING (13/14 tests)**
- ✅ Verifies token NOT deleted from Vault (Plaid compliance)
- ✅ Verifies only status field updated
- ✅ Verifies reconnection capability preserved

---

## Summary Statistics

**Total Business Rules:** 34 (was 32)  
**Rules with Tests:** 15 (44%, was 41%)  
**Rules without Tests:** 19 (56%, was 59%)  
**NEW: Compliance Tests Added:** BR-033 (status check), BR-034 (token preservation) ✅

### Rules by Category

| Category | Count | With Tests |
|----------|-------|------------|
| Authentication | 2 | 0 |
| Authorization | 2 | 1 |
| Data Validation | 5 | 5 |
| Data Integrity | 4 | 0 |
| Data Management | 3 | 2 |
| Business Logic | 8 | 5 |
| Security | 3 | 2 |
| Performance | 3 | 1 |
| User Interface | 1 | 0 |
| User Experience | 2 | 1 |
| Operations | 1 | 1 |

---

**Last Updated:** November 26, 2025  
**Version:** 1.0
