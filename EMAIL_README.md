# Email System Setup

This boilerplate includes a complete email system using React Email for beautiful, responsive transactional emails.

## Features

- ✅ **React Email** - Build emails with React components
- ✅ **TypeScript** - Full type safety
- ✅ **Responsive Design** - Emails that look great everywhere
- ✅ **Template System** - Reusable email components
- ✅ **Webhook Integration** - Automatic emails on user events

## Email Templates Included

### 1. Welcome Email
Sent when users sign up for the first time.

```typescript
import { WelcomeEmail } from '@/emails';

<WelcomeEmail userName="John" loginUrl="https://app.com/dashboard" />
```

### 2. Billing Notification
Sent when subscriptions are created, updated, or cancelled.

```typescript
import { BillingNotification } from '@/emails';

<BillingNotification
  userName="John"
  planName="Pro Plan"
  amount="$29/month"
  billingUrl="https://app.com/billing"
  isUpgrade={true}
/>
```

## Setup Email Service Provider

### Option 1: Resend (Recommended)
```bash
npm install resend
```

Add to `.env.local`:
```bash
RESEND_API_KEY=your_resend_api_key
```

### Option 2: SendGrid
```bash
npm install @sendgrid/mail
```

### Option 3: Custom SMTP
Implement your own email sending logic.

## Integration with Webhooks

The email system automatically integrates with Clerk webhooks:

- **User Created** → Welcome email sent
- **Subscription Created** → Billing confirmation (ready for implementation)
- **Subscription Updated** → Billing change notification
- **Subscription Cancelled** → Cancellation confirmation

## Creating New Email Templates

1. Create template in `emails/templates/YourTemplate.tsx`
2. Export from `emails/index.ts`
3. Add to `EmailService` in `utils/email.ts`
4. Integrate with webhooks if needed

## Email Development

### Preview Emails
```bash
npx react-email dev
```

This starts a development server to preview your emails at `http://localhost:3001`.

### Build Emails
```bash
npx react-email build
```

## Best Practices

- **Keep emails simple** - Not all email clients support complex CSS
- **Test thoroughly** - Use services like MailHog for local testing
- **Include unsubscribe links** - Required by law in many jurisdictions
- **Use absolute URLs** - Email clients may not resolve relative links
- **Optimize images** - Keep file sizes small for faster loading

## Security

- ✅ **No sensitive data** in emails (use links to dashboard instead)
- ✅ **Signed links** for password resets and sensitive actions
- ✅ **Rate limiting** on email sending endpoints
- ✅ **Proper error handling** - Don't expose internal errors to users
