/**
 * Drizzle Database Client for Cards
 * Uses centralized @jl0810/db-client for connection management
 * Schema: cards1 (multi-tenant isolation)
 */

import { publicSchema } from "@jl0810/db-client";
import { createDb } from "@jl0810/db-client/client";
import * as schema from "./schema";

const fullSchema = { ...schema, ...publicSchema };

// Create singleton DB instance
export const db = createDb(undefined, fullSchema);

// Re-export schema for convenience
export { schema };

// Re-export Drizzle utilities
export * from "drizzle-orm";
