# NextAuth.js Migration Progress - Cards Gone Crazy

**Date:** 2025-12-29  
**Status:** ✅ Phase 1 In Progress - NextAuth.js Setup Complete, Migration Pending

---

## ✅ Completed Steps

### 1. NextAuth.js Installation
- ✅ Installed `next-auth@beta`, `@auth/core`, and `@auth/drizzle-adapter`
- ✅ Packages installed successfully

### 2. Database Schema Updates
- ✅ Added NextAuth.js tables to `db/schema.ts` in `cardsgonecrazy` schema:
  - `users` - NextAuth user table
  - `accounts` - OAuth provider accounts
  - `sessions` - User sessions
  - `verification_tokens` - Email verification tokens
- ✅ Generated migration file: `db/migrations/0001_conscious_genesis.sql`

### 3. NextAuth.js Configuration
- ✅ Created `/lib/auth.ts` with:
  - DrizzleAdapter configured for `cardsgonecrazy` schema
  - Google OAuth provider
  - GitHub OAuth provider
  - Database session strategy (not JWT)
  - User profile sync to `user_profiles` table
- ✅ Created API route: `app/api/auth/[...nextauth]/route.ts`
- ✅ Updated `middleware.ts` to use NextAuth.js auth()

### 4. Environment Variables
- ✅ Generated `NEXTAUTH_SECRET` using `openssl rand -base64 32`
- ✅ Added NextAuth variables to `.env.local`:
  - `NEXTAUTH_URL=http://localhost:3000`
  - `NEXTAUTH_SECRET` (generated)
  - Placeholders for `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - Placeholders for `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- ✅ Updated `.env.example` with NextAuth section

---

## ⏳ Pending Steps

### 1. Apply Database Migration
**Status:** Migration file generated, needs to be applied

**Options:**
- **Option A (Recommended):** Apply via SSH tunnel when dev server is running
  ```bash
  # Start dev server (which starts SSH tunnel)
  npm run dev
  
  # In another terminal, apply migration
  psql "$DATABASE_URL" < db/migrations/0001_conscious_genesis.sql
  ```

- **Option B:** Use Drizzle Kit push (interactive)
  ```bash
  npm run db:push
  # Select "create enum" for each prompt
  ```

- **Option C:** Apply directly on Hetzner server
  ```bash
  ssh root@88.198.211.26
  docker exec -i supabase-db psql -U postgres -d postgres < migration.sql
  ```

### 2. Create Google OAuth Application
**Where:** https://console.cloud.google.com/apis/credentials  
**Project:** `retirement-481104` (or create new project for Cards)

**Steps:**
1. Go to Google Cloud Console
2. Create OAuth 2.0 Client ID
3. Application type: Web application
4. Name: "Cards Gone Crazy"
5. Authorized JavaScript origins:
   - `http://localhost:3000` (development)
   - `https://cardsgonecrazy.com` (production)
6. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://cardsgonecrazy.com/api/auth/callback/google`
7. Copy Client ID and Client Secret to `.env.local`

**OAuth Consent Screen:**
- App name: "Cards Gone Crazy"
- User support email: your email
- App logo: Cards Gone Crazy logo
- App domain: `cardsgonecrazy.com`
- Authorized domains: `cardsgonecrazy.com`

### 3. Create GitHub OAuth Application
**Where:** https://github.com/settings/developers

**Steps:**
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Application name: "Cards Gone Crazy"
4. Homepage URL: `https://cardsgonecrazy.com`
5. Authorization callback URL:
   - Development: `http://localhost:3000/api/auth/callback/github`
   - Production: `https://cardsgonecrazy.com/api/auth/callback/github`
6. Copy Client ID and generate Client Secret
7. Add to `.env.local`

### 4. Update Auth UI Components
**Files to update:**
- `components/auth/supabase-auth-form.tsx` → Replace with NextAuth signIn()
- `app/(auth)/login/page.tsx` → Update to use NextAuth
- `app/(auth)/signup/page.tsx` → Update to use NextAuth
- `app/auth/callback/route.ts` → Remove (NextAuth handles this)

### 5. Update Authentication Hooks
**Files to update:**
- `hooks/use-user-preferences.ts` → Replace Supabase auth with NextAuth `useSession()`
- `lib/rate-limit.ts` → Replace Supabase auth with NextAuth `auth()`
- Any other files using `createClient().auth.getUser()`

### 6. Remove Supabase Auth Dependencies
**After NextAuth is working:**
- Remove `lib/supabase/client.ts` (or keep for database queries only)
- Remove `lib/supabase/server.ts` (or keep for database queries only)
- Remove `lib/supabase/middleware.ts`
- Remove `lib/supabase/user-sync.ts`
- Update `lib/supabase/` to only handle database operations, not auth

---

## 🎯 Per-Tenant OAuth Branding Strategy

### Architecture
Each tenant (Cards Gone Crazy, FakeSharp, RetirementPlanner) will have:
- **Separate Coolify deployment**
- **Own domain** (cardsgonecrazy.com, fakesharp.com, retirement.com)
- **Own Google OAuth app** (branded consent screen)
- **Own GitHub OAuth app** (branded consent screen)
- **Shared Supabase database** with schema isolation

### Environment Variables Per Tenant

**Cards Gone Crazy (.env.production):**
```bash
NEXTAUTH_URL=https://cardsgonecrazy.com
NEXTAUTH_SECRET=<unique-secret-per-tenant>
GOOGLE_CLIENT_ID=<cards-specific-google-client-id>
GOOGLE_CLIENT_SECRET=<cards-specific-google-secret>
GITHUB_CLIENT_ID=<cards-specific-github-client-id>
GITHUB_CLIENT_SECRET=<cards-specific-github-secret>
```

**FakeSharp (.env.production):**
```bash
NEXTAUTH_URL=https://fakesharp.com
NEXTAUTH_SECRET=<unique-secret-per-tenant>
GOOGLE_CLIENT_ID=<fakesharp-specific-google-client-id>
GOOGLE_CLIENT_SECRET=<fakesharp-specific-google-secret>
GITHUB_CLIENT_ID=<fakesharp-specific-github-client-id>
GITHUB_CLIENT_SECRET=<fakesharp-specific-github-secret>
```

### Benefits
✅ Each tenant has branded OAuth consent screens  
✅ Users see "Sign in to **Cards Gone Crazy**" not "Sign in to Supabase"  
✅ Full control over auth flow and session management  
✅ Database sessions stored in tenant-specific schema  
✅ Easy to add custom auth logic per tenant  

---

## 📋 Testing Checklist

After completing migration:

- [ ] User can sign up with email/password (if keeping credentials provider)
- [ ] User can sign in with Google OAuth
- [ ] User can sign in with GitHub OAuth
- [ ] User session persists across page refreshes
- [ ] User profile is created in `user_profiles` table
- [ ] User can sign out
- [ ] Protected routes redirect to login
- [ ] Middleware correctly identifies authenticated users
- [ ] Rate limiting works with NextAuth user IDs
- [ ] User preferences are loaded correctly

---

## 🚀 Next Phase: Refine.dev Admin Panel

After NextAuth.js is working in Cards:

1. Create new Next.js project for admin panel
2. Install Refine.dev with Supabase data provider
3. Configure NextAuth.js for admin panel authentication
4. Deploy to Coolify at `auth.raydoug.com`
5. Implement user management across all tenants
6. Add authentication observability dashboard

---

## 📝 Notes

- **Database Sessions:** Using database sessions (not JWT) for better security and easier session management
- **Schema Isolation:** All NextAuth tables are in `cardsgonecrazy` schema
- **User Sync:** NextAuth `users` table syncs to existing `user_profiles` table via `supabaseId` field
- **Migration Path:** Can run both Supabase Auth and NextAuth in parallel during migration
- **Rollback:** Keep Supabase Auth code until NextAuth is fully tested

---

## 🔗 Useful Links

- [NextAuth.js Docs](https://next-auth.js.org/)
- [Drizzle Adapter Docs](https://authjs.dev/reference/adapter/drizzle)
- [Google OAuth Setup](https://console.cloud.google.com/apis/credentials)
- [GitHub OAuth Setup](https://github.com/settings/developers)
- [Refine.dev Docs](https://refine.dev/docs/)
