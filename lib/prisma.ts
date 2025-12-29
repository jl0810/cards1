import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

// Try pooled connection first, fallback to direct if it fails
const connectionString = process.env.DATABASE_URL;
const directConnectionString = process.env.DIRECT_URL;

// Create or reuse PostgreSQL connection pool
const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false, // Required for Supabase connection pooler
    },
    max: 10, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 5000, // Timeout after 5 seconds if can't connect
  });

// Handle pool errors and attempt reconnection
pool.on("error", (error: unknown) => {
  console.error("Unexpected pool error:", error);
  // Pool will automatically try to reconnect
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.pool = pool;
}

// Create the Prisma adapter
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Helper function to execute queries with fallback
export async function executeWithFallback<T>(
  operation: (client: PrismaClient) => Promise<T>,
): Promise<T> {
  try {
    return await operation(prisma);
  } catch (error: unknown) {
    // If connection timeout or refused, try direct connection
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT")
    ) {
      console.warn("Pooled connection failed, trying direct connection...");

      // Create a temporary direct connection client
      const originalEnv = process.env.DATABASE_URL;
      process.env.DATABASE_URL = directConnectionString;
      const directPrisma = new PrismaClient();

      try {
        const result = await operation(directPrisma);
        await directPrisma.$disconnect();
        process.env.DATABASE_URL = originalEnv;
        return result;
      } catch (directError) {
        await directPrisma.$disconnect();
        process.env.DATABASE_URL = originalEnv;
        throw directError;
      }
    }
    throw error;
  }
}
