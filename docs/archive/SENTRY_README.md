# Sentry Error Reporting Setup

This template includes Sentry for comprehensive error monitoring and performance tracking.

## 🚀 Quick Setup

### 1. Create Sentry Account
1. Go to [sentry.io](https://sentry.io)
2. Sign up for a free account
3. Create a new organization and project

### 2. Configure Environment Variables
Update your `.env.local` file with your Sentry credentials:

```env
# Error Reporting (Sentry)
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ORG=your-organization-slug
SENTRY_PROJECT=your-project-slug
```

### 3. Install Sentry CLI (Optional)
For source maps and release tracking:

```bash
npm install -g @sentry/cli
```

Configure Sentry CLI:
```bash
sentry-cli login
```

## 📊 Features Included

### ✅ Error Tracking
- Automatic error capture
- React error boundaries
- Server-side error logging
- Client-side error reporting

### ✅ Performance Monitoring
- Page load metrics
- API response times
- Database query performance
- User journey tracking

### ✅ User Context
- User identification via Clerk
- Session information
- Browser/device details
- Custom tags and context

## 🛠️ Usage Examples

### Manual Error Reporting
```typescript
import * as Sentry from "@sentry/nextjs";

// Capture custom error
Sentry.captureException(new Error("Something went wrong"));

// Capture message
Sentry.captureMessage("User reached important milestone", "info");

// Add context
Sentry.setUser({ id: user.id, email: user.email });
Sentry.setTag("feature", "billing");
```

### Performance Tracking
```typescript
import * as Sentry from "@sentry/nextjs";

// Start transaction
const transaction = Sentry.startTransaction({
  name: "user-signup",
  op: "process",
});

// Add spans for operations
const span = transaction.startChild({
  op: "http",
  description: "POST /api/users",
});

// Finish span and transaction
span.finish();
transaction.finish();
```

## 🔧 Configuration

### Client Configuration (`sentry.client.config.ts`)
```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
  release: process.env.npm_package_version,
});
```

### Server Configuration (`sentry.server.config.ts`)
```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```

## 📈 Production Deployment

### Automatic Source Maps
When you build your application, Sentry automatically uploads source maps:

```bash
npm run build
```

### Release Tracking
```bash
# Create new release
npm run sentry:build

# Upload source maps
npm run sentry:upload

# Finalize release
npm run sentry:finalize
```

## 🎯 Best Practices

1. **Don't track sensitive data** - Sentry automatically filters PII
2. **Use appropriate sampling rates** - Adjust `tracesSampleRate` based on traffic
3. **Set custom contexts** - Add business context to errors
4. **Monitor performance** - Track key user journeys
5. **Set up alerts** - Get notified of critical errors

## 🔍 Debugging

### Development Mode
In development, errors are logged to console and Sentry dashboard:

```typescript
// Shows detailed error information
if (process.env.NODE_ENV === 'development') {
  console.error('Error details:', error);
}
```

### Error Boundary
The template includes a custom error boundary that:
- Shows user-friendly error messages
- Provides recovery options
- Captures error context for debugging

## 📞 Support

- [Sentry Documentation](https://docs.sentry.io/)
- [Next.js Integration Guide](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Error Reporting Best Practices](https://docs.sentry.io/product/error-reporting/best-practices/)

---

**Note**: Sentry is optional. If you don't need error monitoring, you can remove the Sentry-related packages and configurations.
