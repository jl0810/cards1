# User Stories

This document contains all user stories for the PointMax Velocity application, organized by feature area.

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
- Welcome email is sent

**Business Rules:** [BR-001, BR-002]  
**Code:** `lib/webhooks/handlers/user.ts::handleUserCreated`  
**Tests:** None (webhook handlers don't have tests yet)

---

### **[US-002]** User Profile Management
**As a** registered user  
**I want** to update my profile information  
**So that** my account details stay current

**Acceptance Criteria:**
- User can update name
- User can update avatar
- Changes sync with Clerk
- Profile updates persist to database

**Business Rules:** [BR-001]  
**Code:** `lib/webhooks/handlers/user.ts::handleUserUpdated`  
**Tests:** None (webhook handlers)

---

## Family Member Management

### **[US-003]** Add Family Members
**As a** account owner  
**I want** to add family members to my account  
**So that** I can track credit cards for my entire household

**User Flow:**
1. Navigate to Dashboard
2. Click "+ Add Member" button in Family Members section
3. Enter name (required), email (optional), role
4. Click "Add Member" to save
5. New member appears in family list with avatar color

**UI Elements:**
- **Location:** Dashboard > Family Members section (left sidebar)
- **Primary Button:** "+ Add Member" (gradient purple/pink, top of section)
- **Form Fields:** Name (text), Email (text), Role (dropdown)
- **Visual Feedback:** Loading spinner → Success toast "Member added"
- **Result:** New member card appears with avatar and name

**Acceptance Criteria:**
- ✅ "+ Add Member" button visible to account owner
- ✅ Owner can add unlimited family members (no limit enforced)
- ✅ Each member requires a name (validated client & server-side)
- ✅ Email and avatar are optional (can be empty)
- ✅ Members default to "Member" role (dropdown pre-selected)
- ✅ Input is validated (name 1-100 chars, valid email format)
- ✅ Error toast shown for validation failures

**Business Rules:** [BR-003, BR-004]  
**Code:** 
- Backend: `app/api/user/family/route.ts::POST`
- Frontend: `app/dashboard/page.tsx::addMember`
- Component: Family member form modal
**Tests:** 
- `__tests__/api/user/family.test.ts` - "should create family member with valid data"
- `__tests__/lib/validations.test.ts` - CreateFamilyMemberSchema tests

---

### **[US-004]** Update Family Member
**As a** account owner  
**I want** to update family member details  
**So that** I can keep information accurate

**Acceptance Criteria:**
- Can update name, email, avatar
- Partial updates supported
- Only owner can update their members
- Input validation applies

**Business Rules:** [BR-003, BR-005]  
**Code:** `app/api/user/family/[memberId]/route.ts::PATCH`  
**Tests:**
- `__tests__/api/user/family.test.ts` - "should sanitize input data"
- `__tests__/lib/validations.test.ts` - UpdateFamilyMemberSchema tests

---

### **[US-005]** Delete Family Member
**As a** account owner  
**I want** to remove family members  
**So that** I can manage who has access

**Acceptance Criteria:**
- Cannot delete primary member
- Cannot delete member with bank connections
- Deletion is permanent
- Only owner can delete

**Business Rules:** [BR-003, BR-006, BR-007]  
**Code:** `app/api/user/family/[memberId]/route.ts::DELETE`  
**Tests:** `__tests__/api/user/family.test.ts` - DELETE tests

---

## Bank Account Integration

### **[US-006]** Link Bank Account
**As a** user  
**I want** to connect my bank accounts via Plaid  
**So that** the system can automatically track my credit cards

**User Flow:**
1. Navigate to Settings > Connected Banks section
2. Click "Link Bank Account" button
3. (Optional) Select family member from dropdown
4. Plaid Link popup opens
5. Select your bank from list
6. Authenticate with bank credentials
7. Select accounts to link
8. Confirm and close Plaid popup
9. See new bank connection card with accounts

**UI Elements:**
- **Location:** Settings > Connected Banks section
- **Primary Button:** "Link Bank Account" (purple gradient, prominent)
- **Component:** Plaid Link modal integration
- **Loading States:** 
  - "Opening bank connection..." (Plaid loading)
  - "Importing accounts..." (after auth)
  - "Encrypting access token..." (vault storage)
- **Success State:** Toast "Bank connected successfully" + new bank card appears
- **Error States:**
  - "Bank already connected" (duplicate detection)
  - "Connection failed" (Plaid error)
  - "Failed to store credentials" (vault error)

**Acceptance Criteria:**
- ✅ "Link Bank Account" button visible in Settings
- ✅ User authenticates with their bank (via Plaid secure popup)
- ✅ All accounts are imported (displayed in Connected Banks list)
- ✅ Credit card liabilities are captured (balance, APR, limit shown)
- ✅ Accounts are assigned to family members (dropdown or default to primary)
- ✅ Duplicate detection prevents re-linking same account (error toast shown)
- ✅ Access token encrypted in Supabase Vault (never plain text in DB)
- ✅ New bank card shows with "Active" green status badge

**Business Rules:** [BR-008, BR-009, BR-010]  
**Code:** 
- Backend: `app/api/plaid/create-link-token/route.ts`
- Backend: `app/api/plaid/exchange-public-token/route.ts`
- Frontend: `components/plaid-link.tsx`
- UI: `components/velocity/connected-banks-section.tsx`
**Tests:** None (HIGH PRIORITY - needs integration tests)

---

### **[US-007]** Sync Transactions
**As a** user  
**I want** transactions to sync automatically  
**So that** my spending data is always current

**Acceptance Criteria:**
- Transactions sync on-demand
- Added/modified/removed transactions handled
- Sync is rate-limited (10 per hour)
- Account balances update
- Benefit matching triggers after sync

**Business Rules:** [BR-011, BR-012, BR-013]  
**Code:** `app/api/plaid/sync-transactions/route.ts`  
**Tests:** None yet (complex integration)

---

### **[US-008]** View Connected Accounts
**As a** user  
**I want** to see all my connected bank accounts  
**So that** I know what's being tracked

**Acceptance Criteria:**
- Displays institution name
- Shows account names/nicknames
- Shows current balances
- Shows due dates
- Displays credit card details (APR, limit, etc)

**Business Rules:** [BR-014, BR-015]  
**Code:** 
- `app/api/plaid/items/route.ts`
- `hooks/use-accounts.ts`  
**Tests:** `__tests__/hooks/use-accounts.test.ts` - comprehensive hook tests

---

### **[US-009]** Nickname Accounts
**As a** user  
**I want** to give custom nicknames to my accounts  
**So that** I can easily identify them

**Acceptance Criteria:**
- Nickname max 50 characters
- Nickname persists across syncs
- Can clear nickname (set to null)
- Only account owner can set nickname

**Business Rules:** [BR-016]  
**Code:** `app/api/account/[accountId]/nickname/route.ts`  
**Tests:** `__tests__/lib/validations.test.ts` - UpdateAccountNicknameSchema

---

### **[US-020]** Monitor Bank Connection Health
**As a** user  
**I want** to see the health status of my bank connections with visual indicators  
**So that** I know when connections need attention or re-authentication

**User Flow:**
1. Navigate to Settings > Connected Banks section
2. View status badge on each bank connection card
3. Click "Check Status" button to manually verify connection
4. Wait for status check (~1-2 seconds)
5. Review updated status badge and timestamp

**UI Elements:**
- **Location:** Settings > Connected Banks > Each bank card
- **Status Badges:**
  - 🟢 Green "Active" (CheckCircle icon, emerald-400)
  - 🟡 Yellow "Needs Re-auth" (AlertCircle icon, amber-400)
  - 🔴 Red "Error" (AlertCircle icon, red-400)
  - ⚪ Gray "Disconnected" (Unplug icon, slate-400)
- **Action Button:** "Check Status" (white/5 bg, RefreshCw icon)
- **Loading State:** Toast "Checking status..."
- **Success State:** Toast "Status updated" + badge updates + timestamp refreshes
- **Error State:** Toast "Failed to refresh status"
- **Last Sync Display:** "Last synced: [date]" with Clock icon

**Acceptance Criteria:**
- ✅ Status badge visible on every bank connection card
- ✅ "Check Status" button visible (not "Refresh")
- ✅ Button triggers Plaid /item/get health check
- ✅ Visual feedback during check (loading toast)
- ✅ ITEM_LOGIN_REQUIRED detected → shows "Needs Re-auth" yellow badge
- ✅ Other errors → shows "Error" red badge
- ✅ Successful check → shows "Active" green badge
- ✅ Disconnected items → shows "Disconnected" gray badge
- ✅ Status persisted to database for display
- ✅ Last sync timestamp updates on check
- ✅ Color-coded for quick scanning (green/yellow/red/gray)

**Business Rules:** [BR-033, BR-034]  
**Code:** 
- Backend: `app/api/plaid/items/[itemId]/status/route.ts`
- Backend: `app/api/plaid/items/[itemId]/disconnect/route.ts`
- Frontend: `components/velocity/connected-banks-section.tsx` (lines 68-76, 220-226)
**Tests:** 
- `__tests__/api/plaid/items/status.test.ts` - Status check tests (13 tests, 23% passing)
- `__tests__/api/plaid/items/disconnect.test.ts` - Disconnect tests (14 tests, 93% passing)
- **Critical BR-034 Token Preservation: ✅ 100% verified (13/13 tests passing)**

---

## Credit Card Benefits Tracking

### **[US-010]** Match Transactions to Benefits
**As a** user  
**I want** transactions automatically matched to card benefits  
**So that** I know which credits I've earned

**Acceptance Criteria:**
- Matches based on merchant patterns
- Matches based on transaction category
- Applies min/max amount rules
- Respects monthly/annual limits
- Only active benefits are matched

**Business Rules:** [BR-017, BR-018, BR-019, BR-020]  
**Code:** `lib/benefit-matcher.ts`  
**Tests:** `__tests__/lib/benefit-matcher.test.ts` - 40+ tests for all benefit rules

---

### **[US-011]** View Benefit Usage
**As a** user  
**I want** to see how much of each benefit I've used  
**So that** I can maximize my rewards before they reset

**Acceptance Criteria:**
- Shows used vs max amount
- Shows percentage used
- Shows days remaining in period
- Shows all matching transactions
- Sorts by urgency (days remaining)
- Supports monthly/quarterly/annual periods

**Business Rules:** [BR-021, BR-022, BR-023]  
**Code:** `app/api/benefits/usage/route.ts`  
**Tests:** `__tests__/api/benefits/usage.test.ts` - usage calculation tests

---

### **[US-012]** Manual Benefit Matching
**As a** user  
**I want** to manually trigger benefit matching  
**So that** I can update my benefit status on-demand

**Acceptance Criteria:**
- Scans all unmatched transactions
- Uses cursor-based tracking
- Avoids re-processing
- Returns match count
- Rate limited

**Business Rules:** [BR-024]  
**Code:** `app/api/benefits/match/route.ts`  
**Tests:** `__tests__/api/benefits/match.test.ts`

---

## Dashboard & Visualization

### **[US-013]** View Dashboard
**As a** user  
**I want** to see an overview of my accounts and benefits  
**So that** I can quickly understand my financial status

**Acceptance Criteria:**
- Shows all family members
- Shows all connected accounts
- Shows account balances
- Shows upcoming payments
- Auto-refreshes data
- Handles loading and error states

**Business Rules:** [BR-025]  
**Code:** `app/dashboard/page.tsx`  
**Tests:** None yet (React component)

---

### **[US-014]** Refresh Data
**As a** user  
**I want** to manually refresh my data  
**So that** I can get the latest information

**Acceptance Criteria:**
- Syncs all Plaid items
- Shows progress indication
- Handles rate limits gracefully
- Shows error messages
- Updates UI after completion

**Business Rules:** [BR-012, BR-013]  
**Code:** `app/dashboard/page.tsx::refreshAll`  
**Tests:** None yet

---

## Data Validation & Security

### **[US-015]** Input Validation
**As a** system  
**I want** all user inputs validated  
**So that** data integrity is maintained

**Acceptance Criteria:**
- All API endpoints validate inputs
- Validation uses Zod schemas
- Clear error messages returned
- Invalid data rejected before processing

**Business Rules:** [BR-026, BR-027]  
**Code:** `lib/validations.ts`  
**Tests:** `__tests__/lib/validations.test.ts` - 50+ validation tests

---

### **[US-016]** Error Handling
**As a** system  
**I want** consistent error handling  
**So that** users get clear feedback

**Acceptance Criteria:**
- All HTTP error codes standardized
- Error messages user-friendly
- Sensitive data not exposed
- Errors logged for debugging

**Business Rules:** [BR-028]  
**Code:** `lib/api-errors.ts`  
**Tests:** `__tests__/lib/api-errors.test.ts` - 25+ error handling tests

---

### **[US-017]** Structured Logging
**As a** developer  
**I want** all events logged with context  
**So that** I can debug issues in production

**Acceptance Criteria:**
- All log levels supported (debug, info, warn, error)
- Logs include metadata
- Timestamps included
- Context loggers for modules
- Production vs development modes

**Business Rules:** [BR-029]  
**Code:** `lib/logger.ts`  
**Tests:** `__tests__/lib/logger.test.ts` - logging functionality tests

---

## Rate Limiting & Performance

### **[US-018]** API Rate Limiting
**As a** system  
**I want** API requests rate limited  
**So that** the system remains stable under load

**Acceptance Criteria:**
- Different limits for different endpoints
- Write operations: 20/minute
- Plaid sync: 10/hour
- Default: 60/minute
- Clear error messages when limited

**Business Rules:** [BR-030]  
**Code:** `lib/rate-limit.ts`  
**Tests:** None yet

---

## Admin Functions

### **[US-019]** Card Catalog Management
**As an** admin  
**I want** to manage the card product catalog  
**So that** benefit matching rules stay current

**Acceptance Criteria:**
- Add/edit card products
- Add/edit benefits per card
- Set matching rules
- Activate/deactivate benefits

**Business Rules:** [BR-031, BR-032]  
**Code:** `app/admin/card-catalog/`  
**Tests:** None yet

---

## Summary Statistics

**Total User Stories:** 19  
**Stories with Tests:** 8 (42%)  
**Stories without Tests:** 11 (58%)

### Coverage by Feature Area

| Feature Area | Stories | With Tests | % |
|--------------|---------|------------|---|
| Auth & User Management | 2 | 0 | 0% |
| Family Management | 3 | 3 | 100% |
| Bank Integration | 4 | 1 | 25% |
| Benefits Tracking | 3 | 3 | 100% |
| Dashboard | 2 | 0 | 0% |
| Validation & Security | 3 | 3 | 100% |
| Rate Limiting | 1 | 0 | 0% |
| Admin | 1 | 0 | 0% |

---

**Last Updated:** November 26, 2025  
**Version:** 1.0
