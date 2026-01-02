# Business Rules

This document defines all business rules for the CardsGoneCrazy application.

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
**Description:** When a new user registers via Supabase Auth, a UserProfile must be automatically created in the database with their Supabase ID, name, and avatar. A primary family member must also be created. This happens either via a database trigger on `auth.users` or through a dedicated server action/middleware check upon first login. **CRITICAL:** All users MUST be authenticated through Supabase.

**User Stories:** [US-001], [US-002]  
**Code:** `lib/supabase/server.ts`, `app/actions/family.ts`
**Tests:**

- Integration tests (Jest): `__tests__/lib/test-user-helper.ts`
- E2E tests (Playwright): `e2e/auth-and-plaid.spec.ts`

---

### **[BR-002]** Welcome Email

**Category:** Notifications  
**Description:** All new users must receive a welcome email after successful registration.

**User Stories:** [US-001]  
**Code:** `lib/webhooks/handlers/user.ts` (if using Resend/Novu)
**Tests:** None

---

## Family Member Management Rules

### **[BR-003]** Family Member Ownership

**Category:** Authorization  
**Description:** Users can only view, create, update, or delete family members that belong to their own account. Cross-account access is prohibited.

**User Stories:** [US-003], [US-004], [US-005]  
**Code:**

- `app/api/user/family/route.ts`
- `app/api/user/family/[memberId]/route.ts`
- `app/actions/family.ts`
  **Tests:** `__tests__/api/user/family.test.ts`

---

### **[BR-004]** Family Member Name Requirements

**Category:** Data Validation  
**Description:** Family member names must be 1-100 characters, non-empty, and whitespace is trimmed. Email must be valid format if provided. Avatar must be valid URL if provided.

**User Stories:** [US-003]  
**Code:** `lib/validations.ts::CreateFamilyMemberSchema`
**Tests:** `__tests__/lib/validations.test.ts`

---

### **[BR-005]** Partial Updates Allowed

**Category:** Data Management  
**Description:** When updating family members, partial updates are supported. Only provided fields are updated; others remain unchanged.

**User Stories:** [US-004]  
**Code:**

- `lib/validations.ts::UpdateFamilyMemberSchema`
- `app/api/user/family/[memberId]/route.ts`
- `app/actions/family.ts`
  **Tests:** `__tests__/lib/validations.test.ts`

---

### **[BR-006]** Primary Member Protection

**Category:** Data Integrity  
**Description:** The primary family member (marked with `isPrimary: true`) represents the account owner and cannot be deleted by the user. This member is automatically created during user registration and is tied to the UserProfile. Only account deletion can remove the primary member.

**Rationale:**

- Primary member = account owner
- Deleting would orphan the account
- User must delete entire account to remove themselves

**Error Message:** "Cannot delete the primary family member"

**User Stories:** [US-005]  
**Code:** `app/api/user/family/[memberId]/route.ts`, `app/actions/family.ts`
**Tests:** `__tests__/api/user/family-delete.test.ts`

---

### **[BR-007]** Bank Connection Dependency

**Category:** Data Integrity  
**Description:** Family members with active bank connections (PlaidItems) cannot be deleted. User must first either:

1. Reassign the bank connections to another family member, OR
2. Disconnect/remove the bank connections entirely

**Rationale:**

- Prevents orphaned bank accounts
- Forces explicit decision about bank data
- Maintains data integrity

**Error Message:** "Cannot delete [Name] because they have X active bank connection(s). Please reassign or remove the bank connections first."

**User Stories:** [US-005]  
**Code:** `app/api/user/family/[memberId]/route.ts`, `app/actions/family.ts`
**Tests:** `__tests__/api/user/family-delete.test.ts`

---

## Bank Account Integration Rules

### **[BR-008]** Duplicate Detection

**Category:** Data Integrity  
**Description:** When linking bank accounts, the system checks for duplicates by matching institution ID and account masks. If a duplicate is detected, the existing item is updated instead of creating a new one.

**User Stories:** [US-006]  
**Code:** `app/api/plaid/exchange-public-token/route.ts`
**Tests:** `__tests__/api/plaid/exchange-public-token.test.ts`

---

### **[BR-009]** Secure Token Storage

**Category:** Security & Compliance  
**Description:** Plaid access tokens must be encrypted and stored in Supabase Vault, never in plain text in the database. Only the vault secret ID is stored in the database.

**CRITICAL COMPLIANCE REQUIREMENT:** Per Plaid's Terms of Service, access tokens MUST be handled securely. While some tokens are retained for audit and compliance, the application ensures proper lifecycle management.

**Technical Implementation:**

- Supabase Vault used for secret management
- Encrypted storage at rest

**User Stories:** [US-006]  
**Code:** `app/api/plaid/exchange-public-token/route.ts`
**Tests:** `__tests__/integration/supabase-vault.test.ts`

---

### **[BR-010]** Family Member Assignment

**Category:** Data Management  
**Description:** When linking accounts, if no family member is specified, accounts are automatically assigned to the primary (owner) family member.

**User Stories:** [US-006]  
**Code:** `app/api/plaid/exchange-public-token/route.ts`
**Tests:** None

---

### **[BR-011]** Transaction Sync Limits

**Category:** Performance  
**Description:** Transaction sync is limited to maximum 50 iterations to prevent infinite loops. Database transactions timeout after 20 seconds.

**User Stories:** [US-007]  
**Code:** `lib/constants.ts::PLAID_SYNC_CONFIG`
**Tests:** `__tests__/lib/constants.test.ts`

---

### **[BR-012]** Transaction Sync Rate Limiting

**Category:** Performance  
**Description:** Plaid transaction sync is rate-limited to 10 requests per hour per user to prevent API quota exhaustion and system overload.

**User Stories:** [US-007], [US-014]  
**Code:** `app/api/plaid/sync-transactions/route.ts`, `lib/rate-limit.ts`
**Tests:** `__tests__/lib/rate-limit.test.ts`

---

### **[BR-013]** Atomic Transaction Processing

**Category:** Data Integrity  
**Description:** All transaction sync operations (add, modify, remove) must occur within a single database transaction to maintain data consistency.

**User Stories:** [US-007]  
**Code:** `app/api/plaid/sync-transactions/route.ts`
**Tests:** `__tests__/api/plaid/sync-transactions.test.ts`

---

### **[BR-014]** Account Balance Display

**Category:** User Interface  
**Description:** Account balances must be formatted in the appropriate currency (defaults to USD). Null/undefined balances display as "N/A".

**User Stories:** [US-008]  
**Code:** `hooks/use-accounts.ts::formatCurrency`
**Tests:** `__tests__/hooks/use-accounts.test.ts`

---

### **[BR-015]** Due Date Calculation

**Category:** Business Logic  
**Description:** Payment due dates are calculated from current date: "Today", "Tomorrow", "X days", or "Overdue" for past dates. Missing dates show "N/A".

**User Stories:** [US-008]  
**Code:** `hooks/use-accounts.ts`
**Tests:** `__tests__/hooks/use-accounts.test.ts`

---

### **[BR-016]** Account Nickname Persistence

**Category:** Data Management  
**Description:** Account nicknames are stored in AccountExtended table (not Plaid data) to persist across re-syncs. Max 100 characters, whitespace trimmed. Display priority: nickname > officialName > name. Users can revert to original name by clearing the nickname.

**User Stories:** [US-031]  
**Code:** `app/actions/accounts.ts::updateAccountNickname`, `lib/utils/account-display.ts`
**Tests:** `__tests__/actions/accounts.test.ts`

---

## Benefit Matching Rules

### **[BR-017]** Merchant Pattern Matching

**Category:** Business Logic  
**Description:** Transactions are matched to benefits using regex patterns on merchant names. Matching is case-insensitive and uses flexible pattern matching.

**User Stories:** [US-010]  
**Code:** `lib/benefit-matcher.ts`
**Tests:** `__tests__/lib/benefit-matcher.test.ts`

---

### **[BR-018]** Category-Based Matching

**Category:** Business Logic  
**Description:** Some benefits (e.g., airline credits) also match on transaction category in addition to merchant patterns.

**User Stories:** [US-010]  
**Code:** `lib/benefit-matcher.ts`
**Tests:** `__tests__/lib/benefit-matcher.test.ts`

---

### **[BR-019]** Amount Guard Rails

**Category:** Business Logic  
**Description:** Certain benefits (e.g., Walmart+) have min/max amount requirements to avoid false matches. Transactions outside the range are not matched.

**User Stories:** [US-010]  
**Code:** `lib/benefit-matcher.ts`
**Tests:** `__tests__/lib/benefit-matcher.test.ts`

---

### **[BR-020]** Monthly and Annual Limits

**Category:** Business Logic  
**Description:** Each benefit has monthly and/or annual credit limits. Once limits are reached, no additional matches occur for that period.

**User Stories:** [US-010]  
**Code:** `lib/benefit-matcher.ts`
**Tests:** `__tests__/lib/benefit-matcher.test.ts`

---

### **[BR-021]** Benefit Period Calculation

**Category:** Business Logic  
**Description:** Benefit usage periods are calculated based on timing (Monthly, Quarterly, Semi-Annually, Annually). Current period determines which usage records are active.

**User Stories:** [US-011]  
**Code:** `app/api/benefits/usage/route.ts`
**Tests:** `__tests__/api/benefits/usage.test.ts`

---

### **[BR-022]** Usage Percentage Calculation

**Category:** Business Logic  
**Description:** Benefit usage is calculated as (usedAmount / maxAmount) \* 100. Remaining amount is max - used, clamped to 0.

**User Stories:** [US-011]  
**Code:** `app/api/benefits/usage/route.ts`
**Tests:** `__tests__/api/benefits/usage.test.ts`

---

### **[BR-023]** Urgency-Based Sorting

**Category:** User Interface  
**Description:** Benefits are sorted by urgency: completed benefits last, then by days remaining (ascending), then by remaining amount (descending).

**User Stories:** [US-011]  
**Code:** `app/api/benefits/usage/route.ts`
**Tests:** `__tests__/api/benefits/usage.test.ts`

---

### **[BR-024]** Cursor-Based Tracking

**Category:** Performance  
**Description:** Benefit matching uses cursor-based tracking to avoid re-processing already-matched transactions. Only new transactions are scanned.

**User Stories:** [US-012]  
**Code:** `lib/benefit-matcher.ts::scanAndMatchBenefits`
**Tests:** `__tests__/lib/benefit-matcher-scan.test.ts`

---

## UI & Display Rules

### **[BR-025]** Dashboard Auto-Refresh

**Category:** User Experience  
**Description:** Dashboard data auto-loads on mount and can be manually refreshed. Loading states and errors are displayed to users.

**User Stories:** [US-013]  
**Code:** `app/dashboard/page.tsx`
**Tests:** `__tests__/app/dashboard/page.test.tsx`

---

## Validation & Security Rules

### **[BR-026]** Input Validation Required

**Category:** Security  
**Description:** All API endpoints and Server Actions that accept user input must validate using Zod schemas before processing. Invalid input returns 400 Bad Request or a failure response with descriptive errors.

**User Stories:** [US-015]  
**Code:** `lib/validations.ts`
**Tests:** `__tests__/lib/validations.test.ts`

---

### **[BR-027]** Data Sanitization

**Category:** Security  
**Description:** User input is sanitized: strings are trimmed, email validation enforced, URLs validated, lengths checked.

**User Stories:** [US-015]  
**Code:** `lib/validations.ts`
**Tests:** `__tests__/lib/validations.test.ts`

---

### **[BR-028]** Standardized Error Responses

**Category:** User Experience  
**Description:** All API errors return consistent JSON format with appropriate HTTP status codes. Sensitive information is never exposed in error messages.

**User Stories:** [US-016]  
**Code:** `lib/api-errors.ts`
**Tests:** `__tests__/lib/api-errors.test.ts`

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
**Description:** API endpoints are rate-limited using Upstash Redis. Exceeded limits return 429 Too Many Requests.

**User Stories:** [US-018]  
**Code:** `lib/rate-limit.ts`
**Tests:** `__tests__/lib/rate-limit.test.ts`

---

## Admin Rules

### **[BR-031]** Admin Role Required

**Category:** Authorization  
**Description:** Admin functions (card catalog management) require the `admin` role. Roles are stored in Supabase `app_metadata` or `user_metadata`.

**User Stories:** [US-019]  
**Code:** `lib/admin.ts`
**Tests:** `__tests__/lib/admin.test.ts`

---

### **[BR-032]** Benefit Activation Control

**Category:** Business Logic  
**Description:** Only active benefits (active=true) are used for transaction matching. Inactive benefits are retained for historical tracking but not matched.

**User Stories:** [US-019]  
**Code:** `lib/validations.ts::CreateCardBenefitSchema`
**Tests:** `__tests__/lib/validations.test.ts`

---

### **[BR-033]** Connection Health Monitoring

**Category:** User Experience / Operations  
**Description:** System must continuously monitor Plaid connection health and provide real-time visual feedback to users. Status checks detect ITEM_LOGIN_REQUIRED errors (needs re-authentication), token expiration warnings, connection errors, and active/healthy connections.

**Visual Indicators:**

- 🟢 Green "Active": Connection healthy
- 🟡 Yellow "Needs Re-auth": Re-login required
- 🔴 Red "Error": Connection error
- ⚪ Gray "Disconnected": Manually removed

**User Stories:** [US-020]  
**Code:** `app/api/plaid/items/[itemId]/status/route.ts`, `components/velocity/connected-banks-section.tsx`
**Tests:** `__tests__/api/plaid/items/status.test.ts`

---

### **[BR-034]** Proper Item Disconnection

**Category:** Compliance / Billing  
**Description:** When a user disconnects a bank connection, the system MUST call Plaid's `/item/remove` API to invalidate the access token and stop subscription billing.

**User Stories:** [US-006, US-020]  
**Code:** `app/api/plaid/items/[itemId]/disconnect/route.ts`
**Tests:** `__tests__/api/plaid/items/disconnect.test.ts`

---

### **[BR-035]** Item Error Detection & Recovery

**Category:** Reliability / UX  
**Description:** System must detect when Plaid Items stop working and provide users with a path to fix them via Link update mode.

**User Stories:** [US-020]  
**Code:** `components/shared/plaid-link-update.tsx`, `components/velocity/bank-accounts-view.tsx`
**Tests:** Manual Testing

---

### **[BR-036]** Account Deletion & Data Privacy

**Category:** Privacy / Compliance  
**Description:** When a user requests account deletion, ALL personal data must be deleted from the database. Plaid access tokens are handled according to privacy and security policies.

**User Stories:** [US-021]  
**Code:** `lib/supabase/server.ts`, `app/actions/user.ts`
**Tests:** `__tests__/webhooks/user-deletion.test.ts` (if applicable)

---

### **[BR-037]** Payment Cycle Status Calculation

**Category:** Data Management / User Experience  
**Description:** Credit card accounts are automatically categorized into statuses (STATEMENT_GENERATED, PAYMENT_SCHEDULED, PAID_AWAITING_STATEMENT, DORMANT) based on Plaid liability data.

**User Stories:** [US-023]  
**Code:** `lib/payment-cycle.ts`
**Tests:** `__tests__/lib/payment-cycle.test.ts`

---

### **[BR-038]** Full Transaction Reload

**Category:** Data Management / User Safety  
**Description:** Users can request a full transaction reload. This operation deletes ALL existing transactions and benefit tracking for the bank account and fetches the history from scratch.

**User Stories:** [US-022]  
**Code:** `app/api/plaid/items/[itemId]/reload-transactions/route.ts`
**Tests:** `__tests__/api/plaid/items/reload-transactions.test.ts`

---

### **[BR-039]** Placeholder Rule 39

**Category:** Miscellaneous
**Description:** Placeholder for BR-039.
**User Stories:** []
**Code:** N/A
**Tests:** N/A

---

### **[BR-040]** Placeholder Rule 40

**Category:** Miscellaneous
**Description:** Placeholder for BR-040.
**User Stories:** []
**Code:** N/A
**Tests:** N/A

---

### **[BR-041]** Placeholder Rule 41

**Category:** Miscellaneous
**Description:** Placeholder for BR-041.
**User Stories:** []
**Code:** N/A
**Tests:** N/A

---

### **[BR-042]** Placeholder Rule 42

**Category:** Miscellaneous
**Description:** Placeholder for BR-042.
**User Stories:** []
**Code:** N/A
**Tests:** N/A

---

### **[BR-045]** Placeholder Rule 45

**Category:** Miscellaneous
**Description:** Placeholder for BR-045.
**User Stories:** []
**Code:** N/A
**Tests:** N/A

---

### **[BR-046]** Placeholder Rule 46

**Category:** Miscellaneous
**Description:** Placeholder for BR-046.
**User Stories:** []
**Code:** N/A
**Tests:** N/A

---

### **[BR-047]** Placeholder Rule 47

**Category:** Miscellaneous
**Description:** Placeholder for BR-047.
**User Stories:** []
**Code:** N/A
**Tests:** N/A

---

### **[BR-048]** Placeholder Rule 48

**Category:** Miscellaneous
**Description:** Placeholder for BR-048.
**User Stories:** []
**Code:** N/A
**Tests:** N/A

---

### **[BR-100]** Placeholder Rule 100

**Category:** Miscellaneous
**Description:** Placeholder for BR-100.
**User Stories:** []
**Code:** N/A
**Tests:** N/A

---

### **[BR-101]** Placeholder Rule 101

**Category:** Miscellaneous
**Description:** Placeholder for BR-101.
**User Stories:** []
**Code:** N/A
**Tests:** N/A

---

### **[BR-102]** Placeholder Rule 102

**Category:** Miscellaneous
**Description:** Placeholder for BR-102.
**User Stories:** []
**Code:** N/A
**Tests:** N/A

### **[BR-301]** NextAuth API Route

**Category:** Authentication
**Description:** This catch-all route handles all NextAuth.js authentication flows and provides standard GET/POST handlers for OAuth and Email sign-ins.
**User Stories:** [US-001]
**Code:** `app/api/auth/[...nextauth]/route.ts`
**Tests:** None
