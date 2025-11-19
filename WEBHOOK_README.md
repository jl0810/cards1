# Webhook Setup Instructions

## Clerk Webhook Configuration

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Select your application
3. Go to Webhooks → Add Endpoint
4. Set URL to: `https://yourdomain.com/api/webhooks`
5. Select events to listen for:
   - user.created
   - user.updated  
   - user.deleted
   - subscription.created
   - subscription.updated
   - subscription.deleted
6. Copy the webhook secret to your `.env.local` as `CLERK_WEBHOOK_SECRET`

## Webhook Event Handlers

The webhook system includes handlers for:
- **User Events**: Creation, updates, and deletion
- **Subscription Events**: Billing lifecycle management

All events are logged and can trigger database updates or analytics tracking.
