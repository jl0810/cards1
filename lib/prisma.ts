import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const url = process.env.DATABASE_URL

// In development, ensure prepared statements are disabled (pgbouncer=true)
// and connections are limited to avoid exhaustion/conflicts during HMR.
let devUrl = url
if (process.env.NODE_ENV === 'development' && devUrl) {
  if (!devUrl.includes('pgbouncer=true')) {
    devUrl += `${devUrl.includes('?') ? '&' : '?'}pgbouncer=true`
  }
  if (!devUrl.includes('connection_limit=')) {
    devUrl += `${devUrl.includes('?') ? '&' : '?'}connection_limit=1`
  }
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: process.env.NODE_ENV === 'development' ? devUrl : url,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
