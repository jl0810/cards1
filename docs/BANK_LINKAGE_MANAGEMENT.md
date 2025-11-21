## Bank Linkage Management - UX Design

### Settings Tab: "Connected Banks" Section

This should be a dedicated section in your Settings view where users can manage all their Plaid connections.

#### Features to Implement:

1. **List All Connected Banks**
   - Show each PlaidItem with:
     - Institution name + logo (using Logo.dev)
     - Family member assignment
     - Connection status (Active, Needs Reauth, Error)
     - Last synced date
     - Number of accounts
     - Consent expiration date (if applicable)

2. **Status Indicators**
   - ✅ Green: Active and syncing
   - ⚠️ Yellow: Consent expiring soon (< 30 days)
   - ❌ Red: Needs re-authentication (ITEM_LOGIN_REQUIRED)
   - 🔒 Gray: Manually disconnected (but access_token preserved)

3. **Actions Per Bank Connection**
   - **Re-assign to Family Member**: Dropdown to change ownership
   - **Re-authenticate**: Button to trigger Plaid Link update mode
   - **Refresh Status**: Check current item status from Plaid
   - **Disconnect**: Mark as inactive (but preserve access_token per Plaid requirement)
   - **View Accounts**: Expand to show all linked accounts

4. **Add New Bank Connection**
   - Prominent "+ Link Bank Account" button
   - Opens Plaid Link
   - Prompts for family member assignment during or after linking

#### Data Flow:

```
User clicks "Link Bank Account"
  ↓
Select Family Member (or default to Primary)
  ↓
Create link_token via /api/plaid/create-link-token
  ↓
Open Plaid Link UI
  ↓
User completes authentication
  ↓
Exchange public_token for access_token
  ↓
Store in Supabase Vault
  ↓
Create PlaidItem record with familyMemberId
  ↓
Fetch accounts via /accounts/get
  ↓
Store PlaidAccount records
  ↓
Show success toast
  ↓
Redirect to Banks tab to view accounts
```

#### API Endpoints Needed:

1. `GET /api/plaid/items` - List all items (already exists)
2. `GET /api/plaid/items/[itemId]/status` - Get current status from Plaid
3. `POST /api/plaid/items/[itemId]/disconnect` - Mark as inactive
4. `POST /api/plaid/items/[itemId]/reauth` - Create update_mode link_token
5. `PATCH /api/plaid/items/[itemId]` - Update family member (already exists)

#### Important: Access Token Preservation

Per Plaid's requirements:
- **Never delete access_tokens** even when user "disconnects"
- Instead, add a `status` field to PlaidItem: 'active' | 'disconnected' | 'error'
- Filter out 'disconnected' items from UI by default
- Keep them in database for compliance

#### UI Component Structure:

```
SettingsView
  └── ConnectedBanksSection
      ├── AddBankButton (opens PlaidLink)
      └── BankConnectionList
          └── BankConnectionCard (for each PlaidItem)
              ├── BankHeader (logo, name, status badge)
              ├── BankDetails (family member, last sync, accounts count)
              └── BankActions (reassign, reauth, disconnect)
```

### Next Steps:

1. Create `ConnectedBanksSection` component
2. Add item status checking endpoint
3. Implement disconnect functionality (status update, not deletion)
4. Add re-authentication flow (Plaid Link update mode)
5. Show consent expiration warnings
6. Add "Link Bank" button with family member selection
