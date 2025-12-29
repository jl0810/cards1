import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getConnectionConfig } from "./config";
import * as schema from "./schema";

export type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

/**
 * Creates a Drizzle database client with automatic SSL/localhost detection.
 */
export function createDb(connectionString?: string) {
    const url =
        connectionString ||
        process.env.DATABASE_URL ||
        process.env.POSTGRES_URL_NON_POOLING; // Next.js often uses this for direct connection

    if (!url) {
        throw new Error(
            "DATABASE_URL is required. Set it in your environment or pass it to createDb().",
        );
    }

    const config = getConnectionConfig(url);

    const client = postgres(url, {
        ssl: config.ssl,
        max: config.maxConnections,
        idle_timeout: 30,
        connect_timeout: 10,
    });

    return drizzle(client, { schema });
}

/**
 * Singleton pattern for the app.
 */
let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
    if (!_db) {
        _db = createDb();
    }
    return _db;
}

// Export the db singleton directly for convenience
export const db = getDb();

// Re-export useful Drizzle utilities
export * from "drizzle-orm";
export { schema };
