# User Stories

This document contains all user stories for the CardsGoneCrazy application, organized by feature area.

## Story Format

Each user story follows this format:

```
**[STORY-ID]** Story Title
**As a** [user type]
**I want** [goal]
**So that** [benefit]

**Acceptance Criteria:**
- Criterion 1
- Criterion 2

**Business Rules:** [BR-ID, BR-ID]
**Code:** [file paths]
**Tests:** [test file paths]
```

---

## Authentication & User Management

### **[US-001]** User Registration

**As a** new user  
**I want** to create an account using my email or social login  
**So that** I can access the credit card benefits tracking system

**Acceptance Criteria:**
- User can sign up with email/password
- User can sign up with Google/OAuth
- User profile is created automatically
- Primary family member is created automatically
- Welcome email is sent (if configured)

**Business Rules:** [BR-001, BR-002]  
**Code:** `lib/supabase/server.ts`, `app/actions/family.ts`
**Tests:** `e2e/auth-and-plaid.spec.ts`

---

### **[US-002]** User Profile Management

**As a** registered user  
**I want** to update my profile information  
**So that** my account details stay current

**Acceptance Criteria:**
- User can update name
- User can update avatar
- Profile updates persist to database

**Business Rules:** [BR-001]  
**Code:** `app/settings/page.tsx`
**Tests:** `__tests__/lib/validations.test.ts`

---

### **[US-021]** Account Deletion

**As a** registered user  
**I want** to permanently delete my account and all personal data  
**So that** I can exercise my right to be forgotten (GDPR/privacy compliance)

**Acceptance Criteria:**
- User can request account deletion from settings
- All personal data is deleted from database
- Plaid access tokens are managed according to security policy
- User is logged out and cannot access the system
- Deletion is irreversible

**Business Rules:** [BR-035, BR-009]  
**Code:** `app/api/user/delete/route.ts`
**Tests:** `__tests__/webhooks/user-deletion.test.ts`

---

## Family Member Management

### **[US-003]** Add Family Members

**As a** account owner  
**I want** to add family members to my account  
**So that** I can track credit cards for my entire household

**Acceptance Criteria:**
- Owner can add family members
- Each member requires a name
- Email and avatar are optional
- Members default to "Member" role
- Input is validated
- Error feedback is provided for failures

**Business Rules:** [BR-003, BR-004]  
**Code:**
- Backend: `app/actions/family.ts`
- UI: `app/dashboard/page.tsx`
**Tests:**
- `__tests__/api/user/family.test.ts`
- `__tests__/lib/validations.test.ts`

---

### **[US-004]** Update Family Member

**As a** account owner  
**I want** to update family member details  
**So that** I can keep information accurate

**Acceptance Criteria:**
- Can update name, email, avatar
- Partial updates supported
- Proper authorization checks enforced
- Input validation applies

**Business Rules:** [BR-003, BR-005]  
**Code:** `app/actions/family.ts`
**Tests:**
- `__tests__/api/user/family.test.ts`
- `__tests__/lib/validations.test.ts`

---

### **[US-005]** Delete Family Member

**As a** account owner  
**I want** to remove family members  
**So that** I can manage who has access

**Acceptance Criteria:**
- Cannot delete primary member
- Cannot delete member with active bank connections
- Deletion is permanent
- Proper authorization checks enforced

**Business Rules:** [BR-003, BR-006, BR-007]  
**Code:** `app/actions/family.ts`
**Tests:** `__tests__/api/user/family.test.ts`

---

## Bank Account Integration

### **[US-006]** Link Bank Account

**As a** user  
**I want** to connect my bank accounts via Plaid  
**So that** the system can automatically track my credit cards

**Acceptance Criteria:**
- User authenticates with their bank via Plaid Link
- All selected accounts are imported
- Credit card liabilities are captured
- Accounts are assigned to family members
- Duplicate detection prevents double-linking
- Access tokens are stored securely in Supabase Vault

**Business Rules:** [BR-008, BR-009, BR-010]  
**Code:**
- Backend: `app/api/plaid/exchange-public-token/route.ts`
- Frontend: `components/shared/plaid-link-update.tsx`
**Tests:** `__tests__/api/plaid/exchange-public-token.test.ts`

---

### **[US-007]** Sync Transactions

**As a** user  
**I want** transactions to sync automatically  
**So that** my spending data is always current

**Acceptance Criteria:**
- Transactions sync on-demand or via background process
- Incremental sync supported via cursors
- Sync is rate-limited
- Account balances update correctly
- Benefit matching triggers after successful sync

**Business Rules:** [BR-011, BR-012, BR-013]  
**Code:** `app/api/plaid/sync-transactions/route.ts`
**Tests:** `__tests__/api/plaid/sync-transactions.test.ts`

---

### **[US-023]** Payment Cycle Status Tracking

**As a** user  
**I want** my credit cards automatically categorized by payment cycle status  
**So that** I know which cards need payment, which are paid, and which are dormancy risky

**Acceptance Criteria:**
- Cards categorized into 4 statuses (Statement Generated, Payment Scheduled, Paid, Dormant)
- Status updates automatically based on Plaid data and manual overrides
- Visual indicators provided for each status
- Payment history displayed on card details

**Business Rules:** [BR-037]  
**Code:** `lib/payment-cycle.ts`, `app/dashboard/page.tsx`
**Tests:** `__tests__/lib/payment-cycle.test.ts`

---

### **[US-020]** Monitor Bank Connection Health

**As a** user  
**I want** to see the health status of my bank connections  
**So that** I know when a connection needs attention

**Acceptance Criteria:**
- Status badges visible on bank cards
- Manual check status capability
- Detection of login required or other connection errors
- Path provided to fix or re-link connections

**Business Rules:** [BR-033, BR-034, BR-035]  
**Code:** `app/api/plaid/items/[itemId]/status/route.ts`, `components/velocity/connected-banks-section.tsx`
**Tests:** `__tests__/api/plaid/items/status.test.ts`

---

## Credit Card Benefits Tracking

### **[US-010]** Match Transactions to Benefits

**As a** user  
**I want** transactions automatically matched to card benefits  
**So that** I know which credits I've earned

**Acceptance Criteria:**
- Matches based on merchant patterns and categories
- Respects monthly and annual limits
- Only active benefits matched
- Avoids double-counting

**Business Rules:** [BR-017, BR-018, BR-019, BR-020]  
**Code:** `lib/benefit-matcher.ts`
**Tests:** `__tests__/lib/benefit-matcher.test.ts`

---

### **[US-011]** View Benefit Usage

**As a** user  
**I want** to see how much of each benefit I've used  
**So that** I can maximize my rewards

**Acceptance Criteria:**
- Shows consumed credits vs totals
- Calculates percentages and time remaining
- Sorts by urgency and expiration
- Displays contributing transactions

**Business Rules:** [BR-021, BR-022, BR-023]  
**Code:** `app/api/benefits/usage/route.ts`
**Tests:** `__tests__/api/benefits/usage.test.ts`

---

## Admin Functions

### **[US-019]** Card Catalog Management

**As an** admin  
**I want** to manage the card product catalog  
**So that** matching rules and benefits stay updated

**Acceptance Criteria:**
- Admin restricted access
- Create/Edit card products and matching rules
- Toggle benefit activation

**Business Rules:** [BR-031, BR-032]  
**Code:** `app/admin/card-catalog/`
**Tests:** `__tests__/lib/admin.test.ts`
