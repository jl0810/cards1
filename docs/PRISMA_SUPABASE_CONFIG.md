# Prisma 7 + Supabase Configuration Guide

This document explains the database connection configuration for this project, which uses **Prisma ORM v7** with **Supabase**.

## Overview

Prisma 7 introduced significant changes to how database connections are configured. The key difference is that **migrations now use the main `url` field** in `prisma.config.ts`, not `directUrl`.

## Connection Types

### 1. Pooled Connection (Application Runtime)

- **Port**: 6543 (Supabase Transaction Pooler)
- **Purpose**: Optimized for application queries with connection pooling
- **Environment Variable**: `DATABASE_URL`
- **Format**:
  ```
  postgresql://postgres.PROJECT_REF:PASSWORD@aws-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true
  ```

### 2. Direct Connection (Migrations)

- **Port**: 5432 (Direct PostgreSQL)
- **Purpose**: Required for schema migrations and DDL operations
- **Environment Variable**: `DIRECT_URL`
- **Format**:
  ```
  postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres
  ```

## Configuration Files

### `.env`

```bash
# Pooled connection for application runtime (port 6543)
DATABASE_URL="postgresql://postgres.eiqtqmjhxswrbyidexwk:PASSWORD@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection to database for migrations (port 5432)
DIRECT_URL="postgresql://postgres:PASSWORD@db.eiqtqmjhxswrbyidexwk.supabase.co:5432/postgres"
```

**Important**: URL-encode special characters in passwords (e.g., `!` becomes `%21`)

### `prisma.config.ts`

```typescript
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prisma 7: migrations use this URL (must be direct, non-pooled connection)
    url: env("DIRECT_URL"),
    // Application runtime can use pooled connection via PrismaClient constructor
    // @ts-expect-error - directUrl is supported in Prisma 7 CLI but types might be missing
    directUrl: env("DATABASE_URL"),
  },
});
```

### `prisma/schema.prisma`

```prisma
generator client {
  provider   = "prisma-client-js"
  output     = "../generated/prisma"
  engineType = "binary"
}

datasource db {
  provider = "postgresql"
  // Note: In Prisma 7, url and directUrl are NOT defined here
  // They are configured in prisma.config.ts instead
}
```

## Why This Configuration?

### Prisma 6 vs Prisma 7

| Aspect          | Prisma 6                       | Prisma 7                                 |
| --------------- | ------------------------------ | ---------------------------------------- |
| Migration URL   | `directUrl` in `schema.prisma` | `url` in `prisma.config.ts`              |
| App Runtime URL | `url` in `schema.prisma`       | Configured in `PrismaClient` constructor |
| Config Location | `schema.prisma`                | `prisma.config.ts`                       |

### Common Issues

#### Issue: Migrations Hang on Supabase Pooler

**Symptom**: `prisma migrate` commands timeout or hang indefinitely

**Root Cause**: The transaction pooler (port 6543) doesn't support the migration protocol properly. Migrations require a direct, unpooled connection.

**Solution**: Ensure `url` in `prisma.config.ts` points to `DIRECT_URL` (port 5432, direct database host)

#### Issue: "prepared statement already exists" Error

**Symptom**: Database errors about duplicate prepared statements

**Root Cause**: Connection pooler reuses connections, causing conflicts with Prisma's prepared statements

**Solution**: Use `pgbouncer=true` parameter in the pooled connection URL

## Running Migrations

### Development

```bash
# Create and apply a new migration
npx prisma migrate dev --name migration_name

# Check migration status
npx prisma migrate status
```

### Production

```bash
# Apply pending migrations
npx prisma migrate deploy

# Mark a migration as applied (if already manually applied)
npx prisma migrate resolve --applied MIGRATION_NAME
```

### Troubleshooting

If migrations fail due to existing schema:

1. Check what's in the database: `npx prisma db pull`
2. Mark the migration as applied: `npx prisma migrate resolve --applied MIGRATION_NAME`
3. Verify status: `npx prisma migrate status`

## Application Code

The application uses the pooled connection via the Prisma Client:

```typescript
// lib/prisma.ts
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Uses pooled connection
  ssl: {
    rejectUnauthorized: false,
  },
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});
```

## References

- [Prisma 7 Configuration](https://www.prisma.io/docs/orm/reference/prisma-schema-reference#fields)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Prisma with Supabase](https://www.prisma.io/docs/orm/overview/databases/supabase)

## Last Updated

2025-12-03
