# PointMax Velocity - Credit Card Benefits Optimizer

A Next.js application for tracking and maximizing credit card rewards and benefits through intelligent transaction matching and AI-powered recommendations.

## 🎯 Overview

PointMax Velocity helps users:
- **Track Credit Cards**: Connect credit cards via Plaid integration
- **Monitor Transactions**: Automatic transaction sync and categorization  
- **Match Benefits**: AI-powered matching of transactions to card benefits
- **Optimize Rewards**: Recommendations for maximizing credit card benefits
- **Family Support**: Multi-user family member management
- **Admin Tools**: Card catalog management and benefit tracking

## 🚀 Tech Stack

### Core Technologies
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Authentication**: Clerk
- **Database**: PostgreSQL + Prisma ORM
- **Financial API**: Plaid
- **UI Components**: Radix UI + Framer Motion

### Integrations
- **Notifications**: Novu
- **Email**: Resend + React Email
- **Analytics**: PostHog, Sentry
- **Secrets Management**: Supabase Vault
- **Rate Limiting**: Upstash Redis (optional)

## 📋 Features

### ✅ Current Features
- Plaid account linking and automatic transaction sync
- Multi-user family member support with primary member concept
- Credit card product catalog with benefit tracking
- Custom account nicknames and metadata (Extended Tables Pattern)
- Real-time transaction syncing with webhook support
- Admin role system with server-side validation
- Comprehensive error handling and rate limiting
- Performance-optimized database indexes

### 🚧 In Development
- AI-powered benefit matching using Gemini
- Transaction-to-benefit mapping
- Benefit usage tracking and notifications
- Recommendation engine for card optimization

## 🏗️ Architecture

### Key Design Patterns

#### Extended Tables Pattern
Separates raw Plaid data from user enrichments to ensure data persistence during re-syncs:
- `PlaidAccount` + `AccountExtended` (nicknames, card mappings)
- `PlaidTransaction` + `TransactionExtended` (benefit matches, notes)

See [docs/EXTENDED_TABLES_ARCHITECTURE.md](./docs/EXTENDED_TABLES_ARCHITECTURE.md) for details.

#### Card Catalog System
AI-powered credit card data management with Google Sheets integration:
- `CardProduct`: Credit card details and issuer info
- `CardBenefit`: Individual benefits per card
- `BenefitUsage`: Track user's benefit redemptions

See [docs/CARD_CATALOG_SYSTEM.md](./docs/CARD_CATALOG_SYSTEM.md) for details.

### Recent Architecture Improvements

**All major architecture improvements completed (November 2025):**
- ✅ Database performance indexes (10-100x faster queries)
- ✅ Secure admin roles (private metadata)
- ✅ Custom React hooks for data management
- ✅ API rate limiting (prevent abuse)
- ✅ Transaction sync protection (atomic operations)
- ✅ TypeScript type safety throughout
- ✅ Standardized error handling

See [docs/ARCHITECTURE_IMPROVEMENTS.md](./docs/ARCHITECTURE_IMPROVEMENTS.md) for full details.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- Clerk account
- Plaid account (sandbox mode for development)

### Environment Variables

Create `.env.local` with:

```bash
# Authentication (Clerk)
CLERK_SECRET_KEY=sk_test_***
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_***
CLERK_WEBHOOK_SECRET=whsec_***

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/cards

# Plaid
PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_secret
PLAID_ENV=sandbox

# Email (Resend)
RESEND_API_KEY=re_***

# Notifications (Novu)
NOVU_API_KEY=***
NEXT_PUBLIC_NOVU_APPLICATION_ID=***

# Supabase (for secrets vault)
SUPABASE_SERVICE_ROLE_KEY=***

# Optional: Rate Limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL=https://***
UPSTASH_REDIS_REST_TOKEN=***
```

### Installation

```bash
# Install dependencies
npm install

# Set up database
npx prisma db push

# Add database indexes (recommended)
npx tsx scripts/add-indexes.ts

# Run development server
npm run dev
```

Visit `http://localhost:3000`

### Making Your First Admin User

```bash
# List all users
npx tsx scripts/make-admin.ts

# Promote a user to admin
npx tsx scripts/make-admin.ts <clerk_user_id>
```

## 📂 Project Structure

```
Cards/
├── app/                      # Next.js App Router
│   ├── dashboard/           # Main dashboard
│   ├── api/                 # API routes
│   │   ├── plaid/          # Plaid integration endpoints
│   │   ├── user/           # User and family management
│   │   └── webhooks/       # Webhook handlers
│   └── admin/              # Admin-only pages
├── components/
│   ├── velocity/           # Main UI components
│   ├── layout/             # Layout components
│   └── ui/                 # Reusable UI components
├── lib/                     # Core utilities
│   ├── plaid.ts            # Plaid client
│   ├── prisma.ts           # Database client
│   ├── admin.ts            # Admin utilities
│   ├── rate-limit.ts       # Rate limiting
│   └── api-errors.ts       # Error handling
├── hooks/                   # Custom React hooks
│   ├── use-family-members.tsx
│   └── use-accounts.ts
│   └── use-admin.ts
├── types/                   # TypeScript types
│   └── dashboard.ts
├── prisma/                  # Database schema
│   ├── schema.prisma
│   └── migrations/
├── scripts/                 # Utility scripts
│   ├── add-indexes.ts
│   └── make-admin.ts
└── docs/                    # Documentation
    ├── EXTENDED_TABLES_ARCHITECTURE.md
    ├── CARD_CATALOG_SYSTEM.md
    └── ARCHITECTURE_IMPROVEMENTS.md
```

## 🔒 Security

- **Authentication**: Clerk handles all auth flows
- **Admin Roles**: Stored in server-only private metadata
- **Secrets**: Plaid access tokens encrypted in Supabase Vault
- **Rate Limiting**: Upstash Redis-based protection on all API routes
- **Webhook Verification**: Svix signatures for Clerk webhooks

## 🎨 UI/UX

- Modern glassmorphism design with dark mode
- Framer Motion animations for smooth transitions
- Responsive layout (mobile-ready)
- Custom toast notifications (Sonner)
- Premium card displays with flip animations

## 📊 Performance

### Database
- 15 performance indexes on all foreign keys and common queries
- Connection pooling via Prisma
- Optimized queries with selective `include`

### API
- Rate limiting to prevent abuse
- Atomic transactions for data integrity
- Error handling with graceful fallbacks

### Frontend
- Server-side rendering where beneficial
- SWR-ready for client-side data fetching
- Custom hooks for data management

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

## 📱 Mobile (Coming Soon)

Preparing for iOS App Store distribution via Capacitor:
- Same codebase for web + mobile
- Native iOS features (Face ID, push notifications)
- Offline support with smart caching

## 🤝 Contributing

This is a private project, but contributions are welcome. Please:
1. Follow existing code style and architecture patterns
2. Add JSDoc comments for all public functions
3. Update relevant documentation
4. Test changes locally before committing

## 📄 License

Private/Proprietary

## 🎓 Quick Reference

### Common Commands

```bash
# Development
npm run dev              # Start Next.js dev server
npm run build            # Production build
npm run lint             # Check for errors

# Database
npm run db:studio        # Open Prisma Studio
npm run db:push          # Push schema changes
npx tsx scripts/add-indexes.ts  # Add performance indexes

# iOS (Capacitor)
npm run ios:open         # Open in Xcode
npm run ios:sync         # Sync changes to iOS
npm run ios:dev          # Sync + Open Xcode

# Admin
npx tsx scripts/make-admin.ts          # List users
npx tsx scripts/make-admin.ts <user_id>  # Make user admin
```

### Important Files

| File | Purpose |
|------|---------|
| `docs/ARCHITECTURE.md` | Core design patterns |
| `docs/IOS_DEPLOYMENT.md` | iOS deployment guide |
| `docs/RATE_LIMITING.md` | API protection |
| `CHANGELOG.md` | Recent changes |
| `capacitor.config.ts` | iOS app config |
| `lib/platform.ts` | Platform detection |
| `lib/rate-limit.ts` | Rate limiting |

### Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Plaid sync | 10 | 1 hour |
| Write ops | 20 | 1 minute |
| Default | 60 | 1 minute |

---

## 🔗 Useful Links

- [Next.js Documentation](https://nextjs.org/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Plaid API Reference](https://plaid.com/docs/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Capacitor Documentation](https://capacitorjs.com/docs)

---

**Last Updated:** November 23, 2025  
**Version:** 2.0  
**Status:** 🟢 Production Ready
