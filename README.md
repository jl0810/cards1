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
- **Payment Cycle Status Management** - Track and manage payment states with user-controlled "Mark as Paid/Unpaid" functionality
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

#### Payment Cycle Status System

User-controlled payment tracking with persistent status management:

- `AccountExtended.paymentCycleStatus` - Stores payment state
- `AccountExtended.paymentMarkedPaidDate` - Tracks when user marked as paid
- `AccountExtended.paymentMarkedPaidAmount` - Stores payment amount
- Status Flow: `STATEMENT_GENERATED` → `PAYMENT_SCHEDULED` → `PAID_AWAITING_STATEMENT`

See [lib/payment-cycle.ts](./lib/payment-cycle.ts) for status calculation logic.

#### Card Catalog System

AI-powered credit card data management with Google Sheets integration:

- `CardProduct`: Credit card details and issuer info
- `CardBenefit`: Individual benefits per card
- `BenefitUsage`: Track user's benefit redemptions

See [docs/CARD_CATALOG_SYSTEM.md](./docs/CARD_CATALOG_SYSTEM.md) for details.

## 📋 User Stories & Business Rules

### Payment Cycle Status Tracking (US-023)

**As a** credit card user  
**I want to** see the current payment status of each card  
**So that** I can quickly identify which cards need attention and track my payment progress

### Payment Tracking (US-010)

**As a** credit card user  
**I want to** mark credit card payments as paid or unpaid  
**So that** I can keep track of my payment schedule and avoid late fees

### Mobile-First Payment Controls (US-036)

**As a** mobile user  
**I want to** easily mark payments as paid/unpaid on my phone  
**So that** I can manage payments on the go

### Payment Cycle Status Calculation (BR-037)

**Rule:** The system must automatically calculate payment cycle status based on:

1. User manual payment marking (highest priority)
2. Account activity and balance data
3. Statement issue dates and amounts

### Payment Tracking (BR-017)

**Rule:** Users must be able to manually mark payments and undo them

- Mark as Paid: `STATEMENT_GENERATED` → `PAYMENT_SCHEDULED`
- Mark as Unpaid: `PAYMENT_SCHEDULED` → `STATEMENT_GENERATED`

### UI Interaction Safety (BR-042)

**Rule:** Payment controls must not interfere with other UI interactions

- Payment buttons must not trigger card flip animations
- Click events must be properly isolated
- Visual feedback must be immediate and clear

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

Visit `http://localhost:3001`

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
│   ├── logger.ts           # Structured logging
│   ├── validations.ts      # Zod validation schemas
│   ├── constants.ts        # Application constants
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

## 🧪 Testing & Code Quality

### Running Tests

```bash
# Run all tests
npm test

# Watch mode (auto-rerun on changes)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Coverage

**Current Test Suite:**

- ✅ **Validation Schemas** - 50+ test cases for all Zod schemas
- ✅ **Logger Utility** - Comprehensive logging tests
- ✅ **Constants** - Type safety and value validation
- ✅ **UI Components** - Button component tests

**Test Files:**

- `__tests__/lib/validations.test.ts`
- `__tests__/lib/logger.test.ts`
- `__tests__/lib/constants.test.ts`
- `__tests__/button.test.tsx`

See `__tests__/README.md` for detailed testing documentation.

### Code Quality (ESLint)

```bash
# Linting (with custom rules)
npm run lint
```

**Enforces:**

- ❌ No `console.*` usage (use `logger` instead)
- ❌ No `any` types in TypeScript
- ✅ Next.js best practices

**Coverage Target:** 80%+ for utility functions

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

## ⏰ Automated Jobs (Cron)

### Clerk Sync (BR-001A)

**Purpose:** Automatically sync Clerk users to database daily to catch missed webhooks.

**Schedule:** Daily at 2:00 AM UTC (configured in `vercel.json`)

**Setup:**

1. Add `CRON_SECRET` to Vercel environment variables:

   ```bash
   openssl rand -base64 32  # Generate secret
   vercel env add CRON_SECRET
   ```

2. Deploy to Vercel (cron only works in production)

**Manual Trigger:**

```bash
# CLI
npx tsx scripts/sync-missing-clerk-users.ts

# API (requires auth)
curl -X POST https://your-app.vercel.app/api/admin/sync-clerk
```

**Monitoring:** Check Vercel Dashboard > Logs > Filter by `/api/cron/sync-clerk`

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

### Important Documentation

| File                          | Purpose                           | Audience          |
| ----------------------------- | --------------------------------- | ----------------- |
| **📖 Traceability Docs**      |                                   |                   |
| `docs/USER_STORIES.md`        | 19 user stories with requirements | Business, Product |
| `docs/BUSINESS_RULES.md`      | 32 business rules                 | All               |
| `docs/TRACEABILITY_MATRIX.md` | Requirements → Code → Tests       | All               |
| `docs/DOCUMENTATION_GUIDE.md` | How to navigate docs              | All               |
| **🏗️ Technical Docs**         |                                   |                   |
| `docs/ARCHITECTURE.md`        | Core design patterns              | Developers        |
| `docs/IOS_DEPLOYMENT.md`      | iOS deployment guide              | DevOps            |
| `docs/RATE_LIMITING.md`       | API protection                    | Developers        |
| `CHANGELOG.md`                | Recent changes                    | All               |
| `__tests__/README.md`         | Testing guide                     | QA, Developers    |
| **📁 Key Code Files**         |                                   |                   |
| `.eslintrc.json`              | Code quality rules                | Developers        |
| `lib/logger.ts`               | Structured logging                | Developers        |
| `lib/validations.ts`          | Input validation schemas          | Developers        |
| `lib/constants.ts`            | Application constants             | Developers        |
| `lib/rate-limit.ts`           | Rate limiting                     | Developers        |

### Rate Limits

| Endpoint   | Limit | Window   |
| ---------- | ----- | -------- |
| Plaid sync | 10    | 1 hour   |
| Write ops  | 20    | 1 minute |
| Default    | 60    | 1 minute |

---

## 🔗 Useful Links

- [Next.js Documentation](https://nextjs.org/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Plaid API Reference](https://plaid.com/docs/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Capacitor Documentation](https://capacitorjs.com/docs)

---

**Last Updated:** November 26, 2025  
**Version:** 2.1  
**Status:** 🟢 Production Ready
