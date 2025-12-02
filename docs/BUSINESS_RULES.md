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
**Description:** When a new user registers via Clerk, a UserProfile must be automatically created in the database with their Clerk ID, name, and avatar. A primary family member must also be created. **CRITICAL:** All users MUST be created through Clerk webhooks in production - direct database creation bypasses authentication and is prohibited.

**User Stories:** [US-001], [US-002]  
**Code:** `lib/webhooks/handlers/user.ts::handleUserCreated` (lines 66-96)  
**Tests:**

- Integration tests (Jest): `__tests__/lib/test-user-helper.ts::createTestUserViaClerk` simulates webhook behavior by creating database records directly
- E2E tests (Playwright): Use `@clerk/testing` to create real Clerk users
- Example: `__tests__/api/plaid/exchange-public-token.integration.test.ts` (lines 105-111)

---

### **[BR-001A]** Clerk Sync (Self-Healing)

**Category:** Authentication  
**Description:** Clerk is the source of truth for user authentication. If a Clerk webhook fails to fire (network issues, downtime, etc.), the system must have a mechanism to sync Clerk users to the database. This ensures data consistency and prevents orphaned Clerk accounts. The sync process creates UserProfile and primary FamilyMember for any Clerk user missing from the database.

**Trigger Options:**

1. **Manual:** Admin can trigger via API endpoint `/api/admin/sync-clerk`
2. **Automated:** Cron job runs daily to catch any missed webhooks
3. **On-Demand:** User login triggers sync check for their account

**User Stories:** [US-001]  
**Code:**

- Sync function: `lib/clerk-sync.ts::syncClerkUser` (lines 32-122)
- API endpoint: `app/api/admin/sync-clerk/route.ts::POST` (lines 27-48)
- CLI script: `scripts/sync-missing-clerk-users.ts`

**Tests:**

- Unit tests: `__tests__/lib/clerk-sync.test.ts` (to be created)
- Integration test: Verify sync creates missing UserProfile and FamilyMember

**Related:** [BR-001] - User Profile Creation

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
**Description:** The primary family member (marked with `isPrimary: true`) represents the account owner and cannot be deleted by the user. This member is automatically created during user registration and is tied to the UserProfile. Only account deletion (via Clerk) can remove the primary member.

**Rationale:**

- Primary member = account owner
- Deleting would orphan the account
- User must delete entire account via Clerk if they want to remove themselves

**Error Message:** "Cannot delete the primary family member"

**User Stories:** [US-005]  
**Code:** `app/api/user/family/[memberId]/route.ts` (lines 125-128)  
**Tests:** `__tests__/api/user/family-delete.test.ts:46-101` ✅ Tested (2 tests)

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

**User Flow:**

1. User attempts to delete family member with banks
2. System shows error with count of connections
3. User must go to Banks Tab
4. User either disconnects banks or reassigns to different family member
5. User can then delete the family member

**User Stories:** [US-005]  
**Code:** `app/api/user/family/[memberId]/route.ts` (lines 130-136)  
**Tests:** `__tests__/api/user/family-delete.test.ts:103-183` ✅ Tested (4 tests)

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

**Category:** Security & Compliance  
**Description:** Plaid access tokens must be encrypted and stored in Supabase Vault, never in plain text in the database. Only the vault secret ID is stored in the database.

**CRITICAL COMPLIANCE REQUIREMENT:** Per Plaid's Terms of Service, access tokens MUST be retained permanently for audit and compliance purposes. Tokens cannot be deleted, even if the associated PlaidItem is deleted or fails to create. Orphaned vault secrets are acceptable and required by Plaid policy.

**Technical Implementation:**

- Supabase Vault is append-only by design (cannot delete secrets)
- If PlaidItem creation fails after Vault secret is created, the secret remains in Vault
- This is intentional and compliant behavior

**User Stories:** [US-006]  
**Code:** `app/api/plaid/exchange-public-token/route.ts` (lines 132-197)  
**Tests:** `__tests__/COMPREHENSIVE_SUITE.test.ts` (lines 157-217)

---

### **[BR-009A]** Token Exchange Retry Logic

**Category:** Reliability & Error Handling  
**Description:** The public token exchange process implements automatic retry logic to handle transient network errors while preventing retries on invalid token errors.

**Retry Behavior:**

1. **Token Exchange Retries:**
   - Maximum 3 attempts for `itemPublicTokenExchange`
   - 1-second delay between retry attempts
   - Retries on network errors or server errors (5xx)
   - **No retry** on `INVALID_PUBLIC_TOKEN` error (indicates token already used or expired)

2. **Account Fetching Retries:**
   - Maximum 3 attempts for `liabilitiesGet` / `accountsGet`
   - 1-second delay between retry attempts
   - Automatic fallback to `accountsGet` if `liabilitiesGet` fails on final attempt

3. **Logging:**
   - All retry attempts are logged with `logger.warn`
   - Error logs include: `link_session_id`, `request_id`, `error_code`, `error_message`, `userId`, `institutionId`
   - Follows Plaid troubleshooting best practices: https://plaid.com/docs/link/troubleshooting/

**Rationale:** Public tokens are single-use and expire quickly. Retrying on network errors improves reliability without risking token invalidation. The `INVALID_PUBLIC_TOKEN` check prevents wasted retry attempts when the token is already consumed.

**User Stories:** [US-006]  
**Code:** `app/api/plaid/exchange-public-token/route.ts` (lines 146-176, 188-227)  
**Tests:** `__tests__/api/plaid/exchange-public-token.integration.test.ts` (lines 594-741)

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
**Description:** Benefit usage is calculated as (usedAmount / maxAmount) \* 100. Remaining amount is max - used, clamped to 0.

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
- Location: Banks Tab > [Bank Card]
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

### **[BR-034]** Proper Item Disconnection

**Category:** Compliance / Billing  
**Description:** When a user disconnects a bank connection, the system MUST call Plaid's `/item/remove` API to invalidate the access token and stop subscription billing. Per Plaid's documentation, calling `/item/remove` is **required** for subscription products (Transactions, Liabilities, Investments) to end billing. The system retrieves the access token from Vault, calls Plaid's API, then marks the item as disconnected in the database.

**Reference:** https://plaid.com/docs/api/items/#itemremove

**Triggered By:**

- User clicks "Disconnect" button
- Location: Banks Tab > [Bank Card] > Actions
- Component: `bank-accounts-view.tsx`

**Process:**

1. Retrieve access token from Supabase Vault
2. Call `plaidClient.itemRemove({ access_token })`
3. Update PlaidItem.status = 'disconnected' in database
4. Access token is now invalid (cannot be reused)
5. Subscription billing stops immediately

**User Feedback:**

- Confirmation: Modal "Disconnect [Bank Name]? This will permanently remove the connection."
- Actions: "Disconnect" button (red) / "Cancel" button
- Success: Toast "[Bank Name] disconnected" + card removed from view
- Result: Item removed from Plaid, status = 'disconnected', billing stopped

**User Stories:** [US-006, US-020]  
**Code:** `app/api/plaid/items/[itemId]/disconnect/route.ts` (lines 81-94)  
**Tests:** `__tests__/api/plaid/items/disconnect.test.ts` ✅ **100% PASSING (12/12 tests)**

- ✅ Verifies Plaid `/item/remove` API called
- ✅ Verifies access token retrieved from Vault
- ✅ Verifies billing stops (Plaid compliance)
- ✅ Verifies graceful handling if Plaid call fails
- ✅ E2E test validates token invalidation in sandbox

---

### **[BR-035]** Item Error Detection & Recovery

**Category:** Reliability / UX  
**Description:** System must detect when Plaid Items stop working and provide users with a clear path to fix them via Link update mode. When an Item has `ITEM_LOGIN_REQUIRED` or other errors (detected via `/item/get`), the system shows an alert with a "Fix Connection" button that launches Plaid Link in update mode for re-authentication.

**Reference:** https://plaid.com/docs/link/update-mode/

**Error Detection:**

- Call `/item/get` endpoint to check Item status
- Detect `item.error.error_code === 'ITEM_LOGIN_REQUIRED'`
- Update PlaidItem.status = 'needs_reauth'
- Can also be triggered by `PENDING_EXPIRATION` or `PENDING_DISCONNECT` webhooks (future)

**User Experience:**

1. **Detection:** Item status check reveals error
2. **Notification:** Red alert banner appears on bank card
3. **Message:** "Action Required: Your connection to [Bank] needs to be updated"
4. **Action:** "Fix Connection" button launches Link update mode
5. **Resolution:** User re-authenticates, Item status returns to 'active'

**Link Update Mode:**

- Create link token with existing `access_token` (not new public_token)
- Plaid shows streamlined re-auth flow
- User enters new credentials or re-authorizes
- Item automatically resumes working

**User Feedback:**

- Alert: Red banner with AlertCircle icon
- Title: "Action Required"
- Description: Clear explanation of why connection needs updating
- Button: "Fix Connection" (red, destructive variant)
- Success: Toast "[Bank] connection updated!" + alert disappears

**User Stories:** [US-020]  
**Code:**

- `app/api/plaid/link-token/update/route.ts` - Creates update mode link token
- `components/shared/plaid-link-update.tsx` - Update mode component
- `components/velocity/bank-accounts-view.tsx` - Shows alert UI
- `app/api/plaid/items/[itemId]/status/route.ts` - Detects errors

**Tests:** Manual testing with Plaid sandbox

- ✅ Detects `ITEM_LOGIN_REQUIRED` errors
- ✅ Creates update mode link token
- ✅ Launches Link in update mode
- ✅ Updates Item status after successful re-auth

---

### **[BR-036]** Account Deletion & Data Privacy

**Category:** Privacy / Compliance  
**Description:** When a user requests account deletion (not just payment cancellation), ALL personal data must be deleted from the database to comply with GDPR/privacy regulations, EXCEPT Plaid access tokens which must be retained in Vault per Plaid's Terms of Service. This creates a dual-compliance scenario.

**Data Deletion Scope:**

- ✅ DELETE: UserProfile record
- ✅ DELETE: All FamilyMember records (cascade)
- ✅ DELETE: All PlaidItem records (cascade)
- ✅ DELETE: All PlaidAccount records (cascade)
- ✅ DELETE: All PlaidTransaction records (cascade)
- ✅ DELETE: All TransactionExtended records (cascade)
- ✅ DELETE: All BenefitUsage records (cascade)
- ❌ RETAIN: Plaid access tokens in Supabase Vault (Plaid compliance - cannot delete)

**Important Distinctions:**

1. **Lame Duck Account** (payment ended, subscription inactive):
   - User data: RETAINED
   - Access tokens: RETAINED
   - Account status: Inactive but recoverable
   - User can reactivate by resuming payment

2. **Deleted Account** (user-requested deletion via Clerk):
   - User data: DELETED (GDPR compliance)
   - Access tokens: RETAINED (Plaid compliance)
   - Account status: Permanently deleted
   - Cannot be recovered

**Triggered By:**

- Clerk `user.deleted` webhook event
- User deletes account from Clerk dashboard
- Component: Webhook handler

**Technical Implementation:**

- Prisma cascade deletes configured in schema
- All relations use `onDelete: Cascade` from UserProfile
- Vault tokens remain (append-only, Plaid requirement)
- Detailed logging of deleted data counts

**User Stories:** [US-021]  
**Code:** `lib/webhooks/handlers/user.ts::handleUserDeleted` (lines 189-250)  
**Tests:** None (webhook handlers need integration tests)

---

### **[BR-036]** Full Transaction Reload & Data Loss Warning

**Category:** Data Management / User Safety  
**Description:** Users can request a full transaction reload (dump and reload) to recover from cursor corruption or start fresh. This operation deletes ALL existing transactions and benefit tracking for the bank account, resets the Plaid cursor to null, and fetches the complete transaction history. Due to the destructive nature, users must see explicit warnings and confirm the action.

**Data Deletion Scope (Per Bank Account):**

- ✅ DELETE: All PlaidTransaction records for the item
- ✅ DELETE: All TransactionExtended records (cascades)
- ✅ DELETE: All BenefitUsage records linked to those transactions
- ✅ RESET: PlaidItem.nextCursor = null
- ✅ RESET: PlaidItem.lastSyncedAt = null

**Required User Warnings:**

1. **Primary Warning:** "This will delete ALL existing transactions and benefit tracking history"
2. **Irreversible:** "This action cannot be undone"
3. **Confirmation Required:** User must type "RELOAD" to proceed
4. **Rate Limit Warning:** "May hit Plaid API limits for large histories"

**User Safety Measures:**

- Modal confirmation dialog (not just a button click)
- Explicit text input required ("RELOAD")
- Clear explanation of consequences
- Success message with transaction count

**Technical Flow:**

1. Validate user owns the PlaidItem
2. Show warning modal (frontend)
3. User confirms by typing "RELOAD"
4. Backend: Delete transactions in database transaction
5. Backend: Reset cursor to null
6. Backend: Call Plaid sync with cursor=null (fetches all history)
7. Backend: Re-run benefit matching
8. Return success with count

**Error Handling:**

- If Plaid sync fails mid-reload, cursor remains null (can retry)
- If database delete fails, transaction rolls back (no data loss)
- Rate limit errors should be surfaced to user

**User Stories:** [US-022]  
**Code:** `app/api/plaid/items/[itemId]/reload-transactions/route.ts` (needs implementation)  
**Tests:** None (needs implementation)

---

### **[BR-037]** Payment Cycle Status Calculation

**Category:** Data Management / User Experience  
**Description:** Credit card accounts are automatically categorized into 4 payment cycle statuses based on Plaid liability data and user actions. Status updates automatically when new data syncs from Plaid. **Enhanced with automatic payment detection** using `last_payment_amount` and `last_payment_date` from Plaid to intelligently detect paid statements even when new charges exist.

**The 4 Payment Cycle Statuses:**

1.  **STATEMENT_GENERATED** (Payment Needed 🔴)
    - Recent statement issued (< 30 days since `last_statement_issue_date`)
    - `last_statement_balance` > 0 (You owe money on this statement)
    - Action: User needs to pay this bill.

2.  **PAYMENT_SCHEDULED** (Payment Made ⏳)
    - User manually marked payment as paid (`paymentMarkedPaidDate` is set)
    - Note: This is an interim status until the payment clears and balance updates.

3.  **PAID_AWAITING_STATEMENT** (Paid, New Cycle 🟢)
    - Current balance ≤ 0 (Paid off or Credit Balance)
    - OR: **NEW** Recent payment (< 30 days) that covers the statement balance
    - OR: Statement was $0 (no payment due) but new charges have accrued (`current_balance` > 0)
    - Action: No payment due right now. Wait for next statement.

4.  **DORMANT** (Inactive 💤)
    - `last_statement_balance` = $0 AND `current_balance` = $0
    - OR: Statement > 90 days old AND `current_balance` = 0
    - OR: Statement > 30 days old AND `current_balance` = 0 (no activity for 30+ days)
    - Card is effectively inactive.

**Calculation Logic** (Enhanced with Payment Detection):

```javascript
// 1. Check Dormant
if (
  (statementBalance === 0 && balance === 0) ||
  (daysSinceIssue > 90 && balance === 0) ||
  (daysSinceIssue > 30 && balance === 0)
) {
  return "DORMANT";
}

// 2. Check Paid/Scheduled (ENHANCED)
const paymentCoversStatement =
  paymentAmount > 0 && Math.abs(paymentAmount - statementBalance) < 1.0;
const isRecentPayment = daysSincePayment < 30;

if (
  paymentMarkedPaidDate ||
  balance <= 0 ||
  (isRecentPayment && paymentCoversStatement)
) {
  if (balance <= 0) return "PAID_AWAITING_STATEMENT"; // Cleared
  if (isRecentPayment && paymentCoversStatement)
    return "PAID_AWAITING_STATEMENT"; // Auto-detected payment
  return "PAYMENT_SCHEDULED"; // User marked, but balance still shows
}

// 3. Check Statement Liability
if (statementBalance > 0) {
  // You owe money on the statement.
  // Regardless of age, if it's unpaid (balance > 0), it's a liability.
  return "STATEMENT_GENERATED";
}

// 4. Fallback (Statement was $0)
return "PAID_AWAITING_STATEMENT"; // New spend, no bill due
```

**Data Requirements:**

- Plaid Fields: `last_statement_balance`, `last_statement_issue_date`, `current_balance`, **`last_payment_amount`**, **`last_payment_date`**
- User Fields: `paymentMarkedPaidDate`, `paymentMarkedPaidAmount` (in `AccountExtended`)
- Calculated: Days since statement issue, **days since last payment**

**User Stories:** [US-023]  
**Code:**

- `lib/payment-cycle.ts::calculatePaymentCycleStatus` (lines 39-141)
- `lib/payment-cycle.ts::sortAccountsByPaymentPriority` (lines 234-270)
- `app/api/plaid/exchange-public-token/route.ts` (lines 183-184)
- `app/dashboard/page.tsx` (lines 275-282)
- `hooks/use-accounts.ts` (lines 74-81)

**Tests:**

- Unit tests: `__tests__/lib/payment-cycle.test.ts` (25+ tests)
- Integration tests: `__tests__/app/dashboard/page.integration.test.tsx` (7 tests)

---

### **[BR-041]** Accessibility Standards

**Category:** User Experience / Compliance  
**Description:** All UI components must meet WCAG 2.1 Level AA accessibility standards, including proper ARIA labels, keyboard navigation, focus management, and screen reader support.

**User Stories:** [US-024]  
**Code:** `lib/accessibility-utils.ts`  
**Tests:** None

---

### **[BR-042]** XSS Prevention

**Category:** Security  
**Description:** All user-generated content and dynamic SVG rendering must be sanitized to prevent Cross-Site Scripting (XSS) attacks. This includes sanitizing SVG paths, text content, and any user input before rendering.

**User Stories:** [US-015]  
**Code:**

- `lib/sanitize.ts`
- `components/velocity/credit-card.tsx` (SVG sanitization)

**Tests:** None

---

### **[BR-045]** Security Testing

**Category:** Security / Operations  
**Description:** Security testing utilities and helpers must be provided to facilitate testing of authentication, authorization, and security-related features.

**User Stories:** [US-025]  
**Code:** `lib/security-test.ts`  
**Tests:** None

---

### **[BR-046]** Animation Standards

**Category:** User Experience  
**Description:** UI animations must follow consistent timing, easing, and motion design principles. Animations should enhance user experience without causing distraction or accessibility issues (respect prefers-reduced-motion).

**User Stories:** [US-026]  
**Code:**

- `components/marketing/animated-hero.tsx`
- `components/marketing/animated-features.tsx`

**Tests:** None

---

### **[BR-047]** Marketing Content Display

**Category:** User Experience  
**Description:** Marketing pages must present content in an engaging, visually appealing manner with proper typography, spacing, and responsive design.

**User Stories:** [US-027]  
**Code:**

- `components/marketing/animated-hero.tsx`
- `components/marketing/animated-features.tsx`

**Tests:** None

---

### **[BR-048]** Documentation Standards

**Category:** Operations / Quality  
**Description:** All code must maintain comprehensive documentation including JSDoc comments, traceability tags (@implements BR-XXX), and up-to-date documentation files. Documentation audits verify completeness and accuracy.

**User Stories:** [US-028]  
**Code:** `scripts/documentation-audit.ts`  
**Tests:** None

---

## Summary Statistics

**Total Business Rules:** 43  
**Rules with Tests:** 15 (35%)  
**Rules without Tests:** 28 (65%)  
**NEW Rules:**

- BR-041 (Accessibility Standards)
- BR-042 (XSS Prevention)
- BR-045 (Security Testing)
- BR-046 (Animation Standards)
- BR-047 (Marketing Content Display)
- BR-048 (Documentation Standards)

### Rules by Category

| Category        | Count | With Tests |
| --------------- | ----- | ---------- |
| Authentication  | 2     | 0          |
| Authorization   | 2     | 1          |
| Data Validation | 5     | 5          |
| Data Integrity  | 4     | 0          |
| Data Management | 3     | 2          |
| Business Logic  | 8     | 5          |
| Security        | 5     | 2          |
| Performance     | 3     | 1          |
| User Interface  | 1     | 0          |
| User Experience | 5     | 1          |
| Operations      | 3     | 1          |
| Compliance      | 2     | 1          |

---

**Last Updated:** December 1, 2025  
**Version:** 1.1
