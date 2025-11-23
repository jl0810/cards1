# Novu Cloud - User Alert System

This template includes Novu Cloud for enterprise-grade user notifications and alerts.

## 🚀 Quick Setup

### 1. Create Novu Account
1. Go to [Novu Cloud](https://web.novu.co/)
2. Sign up for a free account
3. Create a new application
4. Get your Application ID and API Key

### 2. Configure Environment Variables
Update your `.env.local` file with your Novu credentials:

```env
# Notifications (Novu Cloud)
NEXT_PUBLIC_NOVU_APPLICATION_ID=your-novu-app-id
NOVU_API_KEY=your-novu-api-key
```

### 3. Start Your Application
```bash
npm run dev
```

## 📊 Features Included

### ✅ Real-Time Notifications
- **In-app notifications** - Beautiful notification center UI
- **Real-time updates** - WebSocket-powered instant delivery
- **Unread indicators** - Bell icon with notification count
- **Rich content** - Support for titles, messages, and actions

### ✅ Admin Alert System
- **Targeted alerts** - Send to specific users or all users
- **Alert types** - Info, success, warning, error, maintenance, etc.
- **Priority levels** - Low, medium, high, urgent
- **Action buttons** - Direct users to important pages
- **Expiration** - Set alerts to expire automatically

### ✅ Professional UI
- **Responsive design** - Works on all devices
- **Theme integration** - Matches your app's theme
- **Accessibility** - WCAG compliant components
- **Customizable** - Easy to style and modify

## 🛠️ Usage Examples

### Sending Admin Alerts

#### From the Admin Panel:
1. Go to `/admin` in your application
2. Use the "Send User Alert" form
3. Fill in title, message, and options
4. Click "Send Alert"

#### Via API:
```typescript
const response = await fetch('/api/admin/alerts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'System Maintenance',
    message: 'We will be performing maintenance tonight at 11 PM EST.',
    type: 'maintenance',
    priority: 'high',
    actionUrl: '/status',
    actionText: 'Check Status'
  })
});
```

#### Server-Side:
```typescript
import { Novu } from '@novu/api';

const novu = new Novu(process.env.NOVU_API_KEY);

await novu.trigger('admin-alert', {
  to: { subscriberId: 'user-123' },
  payload: {
    title: 'New Feature Available',
    message: 'Check out our latest dashboard improvements!',
    type: 'feature',
    priority: 'medium'
  }
});
```

### Alert Types and Priorities

#### Alert Types:
- **info** - General information ℹ️
- **success** - Success messages ✅
- **warning** - Warning notices ⚠️
- **error** - Error reports ❌
- **maintenance** - System updates 🔧
- **feature** - New features 🚀
- **billing** - Payment notices 💰
- **security** - Security alerts 🔒

#### Priority Levels:
- **low** - 🟢 Low priority notifications
- **medium** - 🟡 Standard notifications
- **high** - 🟠 Important notifications
- **urgent** - 🔴 Critical notifications

## 🎯 Advanced Features

### Custom Notification Workflows
```typescript
// Create custom notification templates in Novu Cloud
// Then trigger them by name
await novu.trigger('welcome-email', {
  to: { subscriberId: userId },
  payload: {
    userName: 'John Doe',
    features: ['dashboard', 'analytics', 'alerts']
  }
});
```

### Digest Notifications
```typescript
// Batch multiple notifications into daily digests
await novu.trigger('daily-digest', {
  to: { subscriberId: userId },
  payload: {
    updates: [
      { type: 'new_feature', title: 'Analytics Dashboard' },
      { type: 'system_update', title: 'Performance Improvements' }
    ]
  }
});
```

### Multi-Channel Delivery
Novu Cloud supports:
- **In-app** - Real-time notification center
- **Email** - SMTP delivery (configure in Novu)
- **SMS** - Twilio integration
- **Push** - Mobile push notifications
- **Chat** - Slack, Discord, etc.

## 🔧 Configuration

### Notification Center Settings
```typescript
// app/providers/novu.tsx
<NovuProvider
  applicationIdentifier={process.env.NEXT_PUBLIC_NOVU_APPLICATION_ID}
  subscriberId={user.id}
  settings={{
    layout: 'widget',        // or 'popover'
    position: 'bottom-right', // or 'bottom-left', 'top-right', 'top-left'
    theme: 'light'           // or 'dark', 'auto'
  }}
>
```

### Custom Styling
```typescript
// components/notification-center.tsx
<Inbox
  styles={{
    bell: {
      root: { /* custom bell styles */ },
      unreadDot: { backgroundColor: '#ef4444' }
    },
    header: {
      container: { /* custom header styles */ }
    }
  }}
/>
```

## 📈 Analytics and Monitoring

Novu Cloud provides:
- **Delivery rates** - Track successful deliveries
- **Open rates** - Monitor user engagement
- **Click tracking** - Measure action button performance
- **Real-time metrics** - Live notification status
- **Export capabilities** - Download analytics data

## 🎯 Best Practices

1. **Target specific users** - Avoid spamming all users
2. **Use appropriate priorities** - Reserve urgent for critical issues
3. **Provide value** - Make notifications actionable and relevant
4. **Set expiration** - Clean up outdated notifications
5. **Test thoroughly** - Use development environment for testing
6. **Monitor analytics** - Track engagement and optimize

## 📞 Support

- [Novu Documentation](https://docs.novu.co/)
- [Novu Cloud Dashboard](https://web.novu.co/)
- [React Integration Guide](https://docs.novu.co/platform/inbox/react)
- [API Reference](https://docs.novu.co/api/overview)

## 🆓 Free Tier Limits

Novu Cloud free tier includes:
- **5,000 notifications/month**
- **1,000 active subscribers**
- **Basic analytics**
- **Community support**

Upgrade to paid plans for higher limits and advanced features.

---

**Note**: Novu Cloud is optional. If you don't need notifications, you can remove the Novu-related packages and components.
