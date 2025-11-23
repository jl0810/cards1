# Rate Limiting Guide

## Overview

PointMax Velocity uses Upstash Redis-based rate limiting to protect API endpoints from abuse and excessive usage.

## Setup

### 1. Create Upstash Account (Optional but Recommended)

1. Visit [console.upstash.com](https://console.upstash.com)
2. Create a free account
3. Create a new Redis database
4. Copy the REST API credentials

### 2. Add Environment Variables

Add to `.env.local`:

```bash
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

**Note:** Rate limiting works without these variables (fail-open mode), but won't actually limit requests.

## Default Rate Limits

```typescript
export const RATE_LIMITS = {
  default: { max: 60, window: '1 m' },      // 60/minute
  auth: { max: 10, window: '1 m' },         // 10/minute
  write: { max: 20, window: '1 m' },        // 20/minute
  sensitive: { max: 5, window: '1 m' },     // 5/minute
  plaidSync: { max: 10, window: '1 h' },    // 10/hour
};
```

## Usage

### Method 1: Direct Usage

```typescript
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const limited = await rateLimit(req, RATE_LIMITS.write);
  
  if (limited) {
    return new Response('Too many requests', { status: 429 });
  }
  
  // Your handler code...
}
```

### Method 2: Middleware Wrapper

```typescript
import { withRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const POST = withRateLimit(
  async (req: Request) => {
    // Your handler code...
    return NextResponse.json({ success: true });
  },
  RATE_LIMITS.write
);
```

### Method 3: Custom Limits

```typescript
const limited = await rateLimit(req, {
  max: 5,
  window: '10 m',
  prefix: 'api:custom'
});
```

## Protected Endpoints

Current endpoints with rate limiting:

| Endpoint | Limit | Window | Reason |
|----------|-------|--------|--------|
| `/api/plaid/sync-transactions` | 10 | 1 hour | Prevents excessive Plaid API calls |
| `/api/user/family` (POST) | 20 | 1 minute | Prevents spam account creation |

## Rate Limit Algorithm

Uses **Sliding Window** algorithm:
- More accurate than fixed windows
- Prevents burst attacks at window boundaries
- Smooth rate limiting experience

## Identifier Strategy

1. **Authenticated users**: Uses Clerk `userId`
2. **Unauthenticated**: Falls back to IP address from headers:
   - `x-forwarded-for`
   - `x-real-ip`
   - `cf-connecting-ip`

## Response Format

When rate limited, API returns:

```json
{
  "error": "Too many requests",
  "message": "Please slow down and try again later"
}
```

**Status Code:** `429 Too Many Requests`  
**Headers:**
- `Retry-After: 60` (seconds to wait)

## Monitoring

Rate limiting logs warnings when limits are exceeded:

```
Rate limit exceeded for user_xyz. Limit: 10, Remaining: 0, Reset: 2025-11-23T14:30:00Z
```

## Best Practices

### For API Routes:

1. **Choose appropriate limits** based on expected usage:
   ```typescript
   // High-frequency endpoints
   RATE_LIMITS.default  // 60/min
   
   // Write operations
   RATE_LIMITS.write    // 20/min
   
   // Sensitive operations
   RATE_LIMITS.sensitive  // 5/min
   ```

2. **Add informative error messages**:
   ```typescript
   if (limited) {
     return new Response(
       JSON.stringify({
         error: 'Too many sync requests',
         message: 'Limit: 10 syncs/hour. Please wait before trying again.',
         retry_after: 3600
       }),
       { status: 429 }
     );
   }
   ```

3. **Consider endpoint sensitivity**:
   - More restrictive for expensive operations (Plaid API calls)
   - More permissive for read-only endpoints

### For Mobile Apps:

When implementing Capacitor mobile app:

1. **Implement client-side throttling**:
   ```typescript
   // Prevent rapid-fire requests
   const lastSync = localStorage.getItem('last_sync');
   const now = Date.now();
   
   if (lastSync && (now - parseInt(lastSync)) < 60000) {
     toast.error('Please wait before syncing again');
     return;
   }
   ```

2. **Handle 429 responses gracefully**:
   ```typescript
   if (response.status === 429) {
     const retryAfter = response.headers.get('Retry-After');
     toast.error(`Too many requests. Try again in ${retryAfter}s`);
   }
   ```

## Development Mode

**Without Upstash configured:**
- Rate limiting is disabled
- Warning logged to console
- Allows unrestricted development

**With Upstash configured:**
- Full rate limiting active
- Useful for testing rate limit behavior

## Production Deployment

### Vercel

Add environment variables in Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add `UPSTASH_REDIS_REST_URL`
3. Add `UPSTASH_REDIS_REST_TOKEN`
4. Redeploy

### Other Platforms

Ensure environment variables are set before deployment.

## Cost

**Upstash Free Tier:**
- 10,000 requests/day
- 256 MB storage
- More than enough for most applications

**Paid Tiers:** Pay-as-you-go beyond free tier

## Troubleshooting

### Rate Limiting Not Working

1. Check environment variables are set:
   ```bash
   echo $UPSTASH_REDIS_REST_URL
   ```

2. Verify Redis connection in logs:
   ```
   Rate limiting disabled: Upstash Redis not configured
   ```

3. Test with curl:
   ```bash
   # Should return 429 after 10 requests
   for i in {1..15}; do
     curl -X POST http://localhost:3000/api/plaid/sync-transactions
   done
   ```

### False Positives

If legitimate users are being rate limited:

1. Increase limits for that endpoint
2. Check if multiple users share same IP (corporate networks)
3. Consider user-tier-based limits (premium users get higher limits)

## Future Enhancements

- [ ] User-tier-based rate limits (premium vs free)
- [ ] Dashboard for viewing rate limit stats
- [ ] Automatic IP blocking for repeated abuse
- [ ] Webhook notifications for rate limit violations

## References

- [Upstash Documentation](https://docs.upstash.com/redis)
- [Rate Limiting Algorithms](https://en.wikipedia.org/wiki/Rate_limiting)
- Implementation: `/lib/rate-limit.ts`

---

**Last Updated:** November 23, 2025
