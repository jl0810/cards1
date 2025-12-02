# UI Element to Business Rule Mapping

**Complete cross-reference of UI buttons, actions, and visual elements to business requirements.**

**Purpose:** This document helps business users, QA testers, and product managers quickly find which UI elements enforce which business rules.

---

## Quick Reference Table

| UI Element                        | Page/Location                                           | Action                    | Business Rule          | User Story     | Backend Code                                           | Frontend Code                                                        |
| --------------------------------- | ------------------------------------------------------- | ------------------------- | ---------------------- | -------------- | ------------------------------------------------------ | -------------------------------------------------------------------- |
| **"+ Add Member" button**         | Settings > Family Members                               | Click → Opens form        | BR-003, BR-004         | US-003         | `api/user/family/route.ts::POST`                       | `components/velocity/settings-view.tsx::handleAddMember`             |
| **"Update" button**               | Settings > Family Member Card                           | Click → Edit form         | BR-003, BR-005         | US-004         | `api/user/family/[memberId]/route.ts::PATCH`           | `components/velocity/settings-view.tsx::updateMember`                |
| **"Delete" button**               | Settings > Family Member Card                           | Click → Confirm modal     | BR-003, BR-006, BR-007 | US-005         | `api/user/family/[memberId]/route.ts::DELETE`          | `components/velocity/settings-view.tsx::deleteMember`                |
| **"Connect Bank Account" button** | Banks Tab                                               | Click → Plaid popup       | BR-008, BR-009, BR-010 | US-006         | `api/plaid/exchange-public-token/route.ts`             | `components/shared/plaid-link.tsx`                                   |
| **"Sync All" button**             | Banks Tab                                               | Click → Sync transactions | BR-011, BR-012, BR-013 | US-007         | `api/plaid/sync-transactions/route.ts`                 | `components/velocity/bank-accounts-view.tsx::syncTransactions`       |
| **"Disconnect" button**           | Banks Tab > Bank Card                                   | Click → Confirm modal     | BR-034                 | US-006, US-020 | `api/plaid/items/[itemId]/disconnect/route.ts`         | `components/velocity/bank-accounts-view.tsx::disconnectItem`         |
| **"Reassign" button**             | Banks Tab > Bank Card                                   | Click → Family dropdown   | BR-003                 | US-006         | `api/plaid/items/[itemId]/route.ts`                    | `components/velocity/bank-accounts-view.tsx::updateItemFamilyMember` |
| **Status Badge**                  | Banks Tab > Bank Card                                   | Visual indicator          | BR-033                 | US-020         | `PlaidItem.status` field                               | `bank-accounts-view.tsx`                                             |
| **"Link Card" button**            | Banks Tab > Bank Card > Account                         | Click → Card matcher      | BR-032                 | US-019         | `api/plaid/accounts/[accountId]/link-product/route.ts` | `components/velocity/card-product-matcher.tsx`                       |
| **"Mark Paid" button**            | Dashboard > Wallet > Credit Card Back (Magnetic Stripe) | Click → Records payment   | BR-035                 | US-021         | `api/account/[accountId]/mark-paid/route.ts`           | `components/velocity/credit-card.tsx::handleMarkAsPaid`              |
| **"Refresh All" button**          | Dashboard > Top bar                                     | Click → Sync all          | BR-011, BR-012, BR-013 | US-007         | `api/plaid/sync-transactions/route.ts`                 | `dashboard/page.tsx::refreshAll`                                     |

---

## Detailed UI Element Documentation

### **Family Member Management**

#### 1. "+ Add Member" Button

- **Location:** Dashboard > Family Members section (top right)
- **Visual:** Purple/pink gradient button with + icon
- **Click Action:** Opens modal with form fields
- **Form Fields:**
  - Name (required, 1-100 chars) → validates via BR-004
  - Email (optional, valid email) → validates via BR-004
  - Role (dropdown, defaults to "Member")
- **Submit Button:** "Add Member"
- **Success:** Toast "Member added" + new card appears
- **Error:** Toast with validation message
- **Business Rules:** BR-003 (ownership), BR-004 (validation)
- **User Story:** US-003

#### 2. "Delete" Button

- **Location:** Dashboard > Family Member Card > Actions menu
- **Visual:** Red text/icon, destructive action
- **Click Action:**
  1. Checks if primary member (BR-006) → shows error
  2. Checks if has bank connections (BR-007) → shows error
  3. Shows confirmation modal
- **Confirmation Modal:**
  - Title: "Delete [Member Name]?"
  - Warning: "This action cannot be undone"
  - Actions: "Delete" (red) / "Cancel"
- **Success:** Toast "Member deleted" + card removed
- **Error:** Toast with reason (primary member / has connections)
- **Business Rules:** BR-003, BR-006, BR-007
- **User Story:** US-005

---

### **Bank Connection Management**

#### 3. "Connect Bank Account" Button

- **Location:** Banks Tab (top right, next to "Sync All")
- **Visual:** Purple/gradient button with prominent placement
- **Click Action:**
  1. Creates Plaid Link token (BR-008)
  2. Opens Plaid popup modal
- **Plaid Flow:**
  1.User selects bank 2. Authenticates with credentials 3. Selects accounts to link 4. System exchanges token (BR-009) 5. Encrypts and stores in Vault (BR-009) 6. Detects duplicates (BR-008)
- **Loading States:**
  - "Connecting..." (Plaid initializing)
  - "Importing accounts..." (after auth)
- **Success:** Toast "Bank account linked successfully!" + new bank card appears
- **Error States:**
  - "This bank account is already linked" (duplicate)
  - "Failed to link bank account" (Plaid error)
- **Business Rules:** BR-008, BR-009, BR-010
- **User Story:** US-006

#### 4. "Check Status" Button

- **Location:** Banks Tab > Each bank card
- **Visual:** White/5 background, RefreshCw icon, neutral styling
- **Click Action:**
  1. Calls `/api/plaid/items/[itemId]/status`
  2. Retrieves encrypted token from Vault
  3. Calls Plaid `/item/get` endpoint
  4. Detects ITEM_LOGIN_REQUIRED or other errors
  5. Updates database status
  6. Updates UI badge color
- **Loading:** Toast "Checking status..."
- **Success:** Toast "Status updated" + badge updates + timestamp refreshes
- **Error:** Toast "Failed to refresh status"
- **Badge Updates:**
  - Green "Active" → Connection healthy
  - Yellow "Needs Re-auth" → ITEM_LOGIN_REQUIRED detected
  - Red "Error" → Other Plaid errors
  - Gray "Disconnected" → User disconnected (unchanged)
- **Business Rules:** BR-033
- **User Story:** US-020

#### 5. "Disconnect" Button

- **Location:** Banks Tab > Each bank card > Actions (trash icon)
- **Visual:** Red text/icon on hover, destructive styling
- **Click Action:** Shows confirmation dialog
- **Confirmation Dialog:**
  - Message: "Disconnect [Bank Name]? This will permanently remove the connection."
  - Actions: "Disconnect" (red) / "Cancel"
- **On Confirm:**
  1. Retrieves access token from Vault
  2. Calls Plaid's `/item/remove` API to invalidate token
  3. Stops subscription billing (BR-034)
  4. Updates PlaidItem.status = 'disconnected'
  5. Removes card from UI
- **Success:** Toast "[Bank Name] disconnected"
- **Business Rules:** BR-034 (proper disconnection, stops billing)
- **User Story:** US-006, US-020
- **Note:** This is a permanent disconnect - access token is invalidated and cannot be reused

---

### **Status Badges (Visual Indicators)**

#### 6. Green "Active" Status Badge

- **Location:** Settings > Bank Card (top right)
- **Visual:**
  - Color: emerald-400 text
  - Background: emerald-500/10
  - Icon: CheckCircle
  - Label: "Active"
- **Meaning:** Connection is healthy, token valid, syncing working
- **Set By:** Status API returns no errors
- **Business Rule:** BR-033
- **User Story:** US-020

#### 7. Yellow "Needs Re-auth" Status Badge

- **Location:** Settings > Bank Card (top right)
- **Visual:**
  - Color: amber-400 text
  - Background: amber-500/10
  - Icon: AlertCircle
  - Label: "Needs Re-auth"
- **Meaning:** Plaid returned ITEM_LOGIN_REQUIRED error
- **Action Required:** User must re-authenticate with bank
- **Next Steps:** Click "Re-authenticate" button (if implemented) or re-link
- **Set By:** Status API detects `item.error.error_code === 'ITEM_LOGIN_REQUIRED'`
- **Business Rule:** BR-033
- **User Story:** US-020

#### 8. Red "Error" Status Badge

- **Location:** Settings > Bank Card (top right)
- **Visual:**
  - Color: red-400 text
  - Background: red-500/10
  - Icon: AlertCircle
  - Label: "Error"
- **Meaning:** Plaid returned other errors (not ITEM_LOGIN_REQUIRED)
- **Action Required:** Check error details, may need support
- **Set By:** Status API detects `item.error` but not LOGIN_REQUIRED
- **Business Rule:** BR-033
- **User Story:** US-020

#### 9. Gray "Disconnected" Status Badge

- **Location:** Settings > Bank Card (top right)
- **Visual:**
  - Color: slate-400 text
  - Background: slate-500/10
  - Icon: Unplug
  - Label: "Disconnected"
- **Meaning:** User manually disconnected, token preserved in Vault
- **Action Required:** Can reconnect if desired
- **Set By:** User clicked "Disconnect" button
- **Business Rule:** BR-033, BR-034
- **User Story:** US-020

---

## Testing Guide for Business Users

### How to Verify a Feature Works:

1. **Find the UI Element** in this document
2. **Navigate to the Location** specified
3. **Perform the Action** described
4. **Verify the Expected Result:**
   - Check visual feedback (toasts, badges, etc.)
   - Verify data updates (new cards appear, status changes, etc.)
   - Confirm error handling (try invalid inputs)

### Example Test Case: "Check Status" Feature

**Test:** Verify bank connection health monitoring works

**Steps:**

1. Navigate to: Banks Tab
2. Locate: Any bank connection card
3. Find: "Check Status" button (white background, RefreshCw icon)
4. Click: Button
5. Verify: Toast appears "Checking status..."
6. Wait: 1-2 seconds
7. Verify: Toast changes to "Status updated"
8. Verify: Status badge is one of: Green/Yellow/Red/Gray
9. Verify: "Last synced" timestamp updates to current time

**Business Rule Verified:** BR-033 (Connection Health Monitoring)  
**User Story Verified:** US-020 (Monitor Bank Connection Health)

---

## Visual Feedback Reference

### Toast Notifications

| Message                                      | Type    | Trigger               | Business Rule  |
| -------------------------------------------- | ------- | --------------------- | -------------- |
| "Member added"                               | Success | Add family member     | BR-003         |
| "Member deleted"                             | Success | Delete member         | BR-003         |
| "Cannot delete primary member"               | Error   | Delete primary        | BR-006         |
| "Cannot delete member with bank connections" | Error   | Delete with banks     | BR-007         |
| "Bank connected successfully"                | Success | Link bank account     | BR-008, BR-009 |
| "Bank already connected"                     | Error   | Duplicate bank        | BR-008         |
| "Checking status..."                         | Loading | Check connection      | BR-033         |
| "Status updated"                             | Success | Status check complete | BR-033         |
| "Failed to refresh status"                   | Error   | Status check failed   | BR-033         |
| "[Bank Name] disconnected"                   | Success | Disconnect bank       | BR-034         |

### Loading Indicators

| Indicator                    | Location        | Meaning            | Duration |
| ---------------------------- | --------------- | ------------------ | -------- |
| Spinner in modal             | Add Member form | Saving member      | 1-2 sec  |
| "Opening bank connection..." | Plaid Link      | Initializing Plaid | 2-3 sec  |
| "Importing accounts..."      | Plaid Link      | Exchanging token   | 3-5 sec  |
| "Encrypting access token..." | Plaid Link      | Vault storage      | 1-2 sec  |
| "Checking status..."         | Status button   | Plaid API call     | 1-2 sec  |

---

## Component File Reference

### Frontend Components

| Component File                                    | UI Elements                                 | Business Rules                         | User Stories           |
| ------------------------------------------------- | ------------------------------------------- | -------------------------------------- | ---------------------- |
| `app/dashboard/page.tsx`                          | Family member CRUD buttons                  | BR-003, BR-004, BR-005, BR-006, BR-007 | US-003, US-004, US-005 |
| `components/plaid-link.tsx`                       | "Link Bank Account" button                  | BR-008, BR-009, BR-010                 | US-006                 |
| `components/velocity/connected-banks-section.tsx` | Bank card UI, status badges, action buttons | BR-033, BR-034                         | US-006, US-020         |
| `components/velocity/family-member-dropdown.tsx`  | Family member selector                      | BR-003                                 | US-003, US-006         |
| `components/velocity/card-product-matcher.tsx`    | "Link Card" button                          | BR-032                                 | US-019                 |

### Backend API Routes

| API Route                                      | Triggered By UI Element             | Business Rules         | User Stories |
| ---------------------------------------------- | ----------------------------------- | ---------------------- | ------------ |
| `api/user/family/route.ts::POST`               | "+ Add Member" button               | BR-003, BR-004         | US-003       |
| `api/user/family/[memberId]/route.ts::PATCH`   | "Update" button                     | BR-003, BR-005         | US-004       |
| `api/user/family/[memberId]/route.ts::DELETE`  | "Delete" button                     | BR-003, BR-006, BR-007 | US-005       |
| `api/plaid/create-link-token/route.ts`         | "Link Bank Account" button (step 1) | BR-008                 | US-006       |
| `api/plaid/exchange-public-token/route.ts`     | "Link Bank Account" button (step 2) | BR-008, BR-009, BR-010 | US-006       |
| `api/plaid/items/[itemId]/status/route.ts`     | "Check Status" button               | BR-033                 | US-020       |
| `api/plaid/items/[itemId]/disconnect/route.ts` | "Disconnect" button                 | BR-034                 | US-020       |

---

## Quick Lookup: By Page

### Dashboard Page

**Elements:**

- Family member cards → Display data
- "Refresh All" button (top bar) → US-007, BR-011, BR-012, BR-013
- Credit cards in Wallet view → Display with payment status
- "Mark Paid" button (card back, magnetic stripe) → US-021, BR-035

### Banks Tab

**Elements:**

- "Connect Bank Account" button → US-006, BR-008, BR-009, BR-010
- "Sync All" button → US-007, BR-011, BR-012, BR-013
- Bank connection cards → Display connections
- Status indicators (Active/Disconnected) → US-020, BR-033
- "Reassign" button per bank → US-006, BR-003
- "Disconnect" button per bank (trash icon) → US-020, BR-034
- "Link Card" button per account → US-019, BR-032
- Account balances and details → Display data

### Settings Tab

**Elements:**

- "Family Members" section → US-003, BR-003, BR-004
- "+ Add Member" button → US-003, BR-003, BR-004
- Family member cards → Display data
- "Update" button per member → US-004, BR-003, BR-005
- "Delete" button per member → US-005, BR-003, BR-006, BR-007
- Profile information → User account settings
- Sign Out button → Authentication

---

**Last Updated:** December 1, 2025  
**Version:** 1.1  
**Total UI Elements Documented:** 13 primary buttons + status indicators  
**Major Changes:** Consolidated all bank management to Banks tab (removed from Settings)

```

```
