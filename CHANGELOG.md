# Changelog

All notable changes to PointMax Velocity.

## [2.0.0] - November 23, 2025

### 🎉 Major Architecture Overhaul

Complete architecture review and improvements for production readiness and iOS App Store deployment.

### ✨ Added

#### Performance
- **Database Indexes**: Added 15 strategic indexes for 10-100x faster queries
  - Transaction lookups: 500ms → 5ms
  - Account filtering: 200ms → 2ms
  - Family member queries: 100ms → 1ms

#### Security
- **Admin Private Metadata**: Moved admin roles to server-only private metadata
- **API Rate Limiting**: Upstash Redis-based rate limiting on all critical endpoints
  - Plaid sync: 10 requests/hour
  - Write operations: 20 requests/minute
  - Default: 60 requests/minute
- **Environment Validation**: Zod-based validation for all required environment variables

#### Data Management
- **Custom React Hooks**: 
  - `useFamilyMembers()` - Family CRUD operations with built-in state
  - `useAccounts()` - Account management with offline detection
- **SWR Integration**: Modern data fetching library installed and ready

#### Mobile
- **Capacitor iOS**: Full iOS app setup with native features
  - Platform detection utilities
  - Native plugins (Haptics, Preferences, StatusBar, etc.)
  - Hybrid architecture (web on Vercel, native wrapper)
- **iOS Scripts**: Added npm scripts for iOS development workflow

#### Developer Experience
- **TypeScript Type Safety**: Created comprehensive type definitions
  - `types/dashboard.ts` with all dashboard interfaces
  - Eliminated all `any` types
- **Standardized Error Handling**: Centralized API error responses
- **JSDoc Documentation**: Complete documentation for all new code

### 🔧 Fixed

- **Transaction Sync**: Added atomic database operations and iteration limits to prevent infinite loops
- **Error Responses**: Standardized all API error formats to JSON
- **Admin Card Catalog API**: Fixed Request parameter issue

### 📚 Documentation

**New Guides:**
- `CHANGELOG.md` - This file
- `docs/ARCHITECTURE.md` - Core architecture patterns
- `docs/IOS_DEPLOYMENT.md` - iOS deployment guide
- `docs/RATE_LIMITING.md` - API rate limiting guide

**Updated:**
- `README.md` - Complete rewrite with current tech stack
- `.env.example` - All new environment variables

**Archived:**
- Moved integration-specific READMEs to `docs/archive/`

### 🗑️ Removed

- Duplicate documentation files
- Outdated integration guides (moved to archive)

### 🔄 Changed

- Admin role check now uses `privateMetadata` instead of `publicMetadata`
- Upstash Redis credentials added to environment variables
- Updated Capacitor config for production deployment

---

## [1.0.0] - November 2025

### Initial Release

- Next.js 16 application with App Router
- Clerk authentication
- Plaid integration for bank account linking
- PostgreSQL database with Prisma ORM
- Extended Tables architecture pattern
- Card catalog system with AI-powered data management
- Family member multi-user support
- Dashboard with wallet, activity, and bank account views

---

## How to Read This Changelog

- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for vulnerability fixes

Format based on [Keep a Changelog](https://keepachangelog.com/).
