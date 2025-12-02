# Plaid Item Error Detection & Update Mode Flow

## Overview

When a Plaid Item stops working (e.g., user changed password, OAuth expired), we need to:

1. **Detect** the error via `/item/get` status checks
2. **Notify** the user with clear, actionable feedback
3. **Fix** it by launching Plaid Link in "update mode"

## Key Plaid Concepts

### Item Errors

Per https://plaid.com/docs/link/update-mode/:

**Common Error States:**

- `ITEM_LOGIN_REQUIRED` - Credentials need updating (password changed, OAuth expired)
- `PENDING_EXPIRATION` - Item will expire soon (webhook)
- `PENDING_DISCONNECT` - Item will disconnect soon (webhook)

**How We Detect:**

1. Call `/item/get` endpoint (we already do this in `status/route.ts`)
2. Check `item.error.error_code`
3. Check `item.update_type`:
   - `background` = OK, updates automatically
   - `user_present_required` = User needs to re-auth

### Link Update Mode

When an Item has errors, we launch Plaid Link in "update mode":

- Pass the existing `access_token` (not a new public_token)
- Plaid shows streamlined re-auth flow
- User fixes credentials/permissions
- Item starts working again

## Current Implementation

### ✅ What We Have

1. **Status Check Endpoint** (`/api/plaid/items/[itemId]/status`)
   - Calls Plaid `/item/get`
   - Detects `ITEM_LOGIN_REQUIRED`
   - Updates DB status to `needs_reauth`

2. **UI Status Badges** (`bank-accounts-view.tsx`)
   - Shows colored badges (green/yellow/red/gray)
   - "Check Status" button to manually refresh

### ❌ What We're Missing

1. **Link Update Mode** - No way for user to fix broken items
2. **Proactive Monitoring** - Only checks when user clicks button
3. **Clear Error Messages** - Generic "needs reauth" badge
4. **Webhook Handling** - Not listening for `ITEM: ERROR` webhooks

## Proposed Implementation

### 1. Create Link Update Token Endpoint

**File:** `app/api/plaid/link-token/update/route.ts`

```typescript
/**
 * Create Link token for update mode
 * Used to fix Items with ITEM_LOGIN_REQUIRED or other errors
 */
export async function POST(req: Request) {
  const { itemId } = await req.json();

  // Get access token from Vault
  const accessToken = await getAccessToken(itemId);

  // Create link token in UPDATE mode
  const response = await plaidClient.linkTokenCreate({
    user: { client_user_id: userId },
    client_name: "Your App",
    access_token: accessToken, // KEY: Pass existing token for update mode
    language: "en",
    country_codes: [CountryCode.Us],
  });

  return NextResponse.json({ link_token: response.data.link_token });
}
```

### 2. Update PlaidLink Component for Update Mode

**File:** `components/shared/plaid-link-update.tsx`

```typescript
interface PlaidLinkUpdateProps {
  itemId: string;
  institutionName: string;
  onSuccess: () => void;
}

export function PlaidLinkUpdate({ itemId, institutionName, onSuccess }: PlaidLinkUpdateProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);

  // Fetch update mode link token
  useEffect(() => {
    fetch('/api/plaid/link-token/update', {
      method: 'POST',
      body: JSON.stringify({ itemId }),
    })
      .then(res => res.json())
      .then(data => setLinkToken(data.link_token));
  }, [itemId]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: () => {
      // Item is fixed! Refresh status
      onSuccess();
    },
  });

  return (
    <Button onClick={() => open()} disabled={!ready}>
      Fix Connection to {institutionName}
    </Button>
  );
}
```

### 3. Enhanced UI Feedback

**Update:** `components/velocity/bank-accounts-view.tsx`

```typescript
// Show different UI based on item status
{item.status === 'needs_reauth' && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Action Required</AlertTitle>
    <AlertDescription>
      Your connection to {item.institutionName} needs to be updated.
      This usually happens when you change your password.
      <PlaidLinkUpdate
        itemId={item.id}
        institutionName={item.institutionName}
        onSuccess={() => refreshItems()}
      />
    </AlertDescription>
  </Alert>
)}
```

### 4. Automatic Status Checks

**Option A: Poll on page load**

```typescript
useEffect(() => {
  // Check all items on mount
  items.forEach((item) => {
    if (item.status === "active") {
      checkItemStatus(item.id);
    }
  });
}, []);
```

**Option B: Webhook-driven (better)**

- Set up webhook endpoint
- Listen for `ITEM: ERROR` webhook
- Update DB status
- Show notification to user

### 5. Webhook Handler (Future Enhancement)

**File:** `app/api/webhooks/plaid/route.ts`

```typescript
export async function POST(req: Request) {
  const webhook = await req.json();

  if (webhook.webhook_type === "ITEM" && webhook.webhook_code === "ERROR") {
    const { item_id, error } = webhook;

    // Update item status in DB
    await prisma.plaidItem.update({
      where: { itemId: item_id },
      data: {
        status:
          error.error_code === "ITEM_LOGIN_REQUIRED" ? "needs_reauth" : "error",
        errorCode: error.error_code,
        errorMessage: error.error_message,
      },
    });

    // Optionally: Send push notification to user
    // "Your connection to Chase needs attention"
  }

  return NextResponse.json({ received: true });
}
```

## User Flow

### Scenario: User Changes Bank Password

1. **Detection:**
   - Plaid sends `ITEM: ERROR` webhook with `ITEM_LOGIN_REQUIRED`
   - OR user clicks "Check Status" and we detect error via `/item/get`

2. **Notification:**
   - UI shows red alert badge on bank card
   - Alert message: "Action Required: Connection needs updating"
   - "Fix Connection" button appears

3. **Resolution:**
   - User clicks "Fix Connection"
   - Plaid Link opens in update mode
   - User enters new password
   - Link closes, item status updates to 'active'
   - UI refreshes, alert disappears

## Implementation Priority

### Phase 1 (MVP) - Manual Fix

- [x] Status check endpoint (already have)
- [ ] Create update mode link token endpoint
- [ ] Add PlaidLinkUpdate component
- [ ] Show "Fix Connection" button for `needs_reauth` items
- [ ] Test with sandbox (change credentials scenario)

### Phase 2 - Proactive Monitoring

- [ ] Poll item status on dashboard load
- [ ] Show count of items needing attention
- [ ] Email notification for broken connections

### Phase 3 - Real-time (Webhooks)

- [ ] Set up webhook endpoint
- [ ] Handle `ITEM: ERROR` webhook
- [ ] Push notifications
- [ ] Auto-refresh UI when webhook received

## Testing Strategy

### Sandbox Testing

Plaid sandbox supports simulating errors:

```typescript
// In sandbox, use special credentials to trigger errors
// Username: "user_bad"
// Password: "pass_bad"
// This will create an item with ITEM_LOGIN_REQUIRED error
```

### E2E Test

```typescript
describe("Item Update Mode", () => {
  it("should fix broken item via update mode", async () => {
    // 1. Create item in sandbox
    // 2. Simulate error (change credentials)
    // 3. Detect error via /item/get
    // 4. Create update mode link token
    // 5. "Fix" item (re-auth)
    // 6. Verify status is 'active' again
  });
});
```

## Business Rules

### BR-035: Item Error Detection & Recovery

- **Category:** Reliability / UX
- **Description:** System must detect when Plaid Items stop working and provide users with a clear path to fix them via Link update mode
- **Triggers:**
  - `ITEM_LOGIN_REQUIRED` error from `/item/get`
  - `PENDING_EXPIRATION` or `PENDING_DISCONNECT` webhook
  - `item.update_type === 'user_present_required'`
- **User Feedback:**
  - Red alert badge on affected bank card
  - Clear message: "Action Required: Connection needs updating"
  - "Fix Connection" button launches Link update mode
- **Resolution:**
  - User re-authenticates via Plaid Link
  - Item status updates to 'active'
  - Alert disappears
- **User Stories:** US-020 (Monitor Bank Connection Health)
- **Code:**
  - `app/api/plaid/link-token/update/route.ts` (new)
  - `components/shared/plaid-link-update.tsx` (new)
  - `app/api/plaid/items/[itemId]/status/route.ts` (existing)

## References

- [Plaid Link Update Mode](https://plaid.com/docs/link/update-mode/)
- [Plaid Item Errors](https://plaid.com/docs/errors/item/)
- [Plaid Webhooks](https://plaid.com/docs/api/webhooks/)
