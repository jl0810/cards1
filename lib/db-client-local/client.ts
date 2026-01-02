import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getConnectionConfig } from "./config";

export type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

/**
 * Creates a Drizzle database client with automatic SSL/localhost detection.
 */
export function createDb<
  TSchema extends Record<string, unknown> = Record<string, never>,
>(connectionString?: string, schema?: TSchema) {
  const url = connectionString || process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      "DATABASE_URL is required. Set it in your environment or pass it to createDb().",
    );
  }

  const urlObj = new URL(url);
  const schemaParam = urlObj.searchParams.get("schema");
  urlObj.searchParams.delete("schema");
  const cleanUrl = urlObj.toString();

  const config = getConnectionConfig(cleanUrl);

  const client = postgres(cleanUrl, {
    ssl: config.ssl,
    max: config.maxConnections,
    idle_timeout: 30,
    connect_timeout: 10,
    ...(schemaParam && {
      onnotice: () => {},
      connection: {
        search_path: schemaParam,
      },
    }),
  });

  return drizzle(client, { schema: schema as TSchema });
}

let _db: ReturnType<typeof createDb> | null = null;

export function initDb<
  TSchema extends Record<string, unknown> = Record<string, never>,
>(connectionString?: string, schema?: TSchema) {
  if (!_db) {
    _db = createDb(connectionString, schema);
  }
  return _db as ReturnType<typeof createDb<TSchema>>;
}

export function getDb() {
  if (!_db) {
    throw new Error("Database not initialized. Call initDb() first.");
  }
  return _db;
}
