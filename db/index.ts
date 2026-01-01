/**
 * Drizzle Database Client for Cards
 * Uses centralized @jl0810/db-client for connection management
 * Schema: cards1 (multi-tenant isolation)
 */

import { createDb, publicSchema } from "@jl0810/db-client";
import * as schema from "./schema";

const fullSchema = { ...schema, ...publicSchema };

// Create singleton DB instance
export const db = createDb(undefined, fullSchema) as any;

// Re-export schema for convenience
export { schema };

// Re-export Drizzle utilities
export * from "drizzle-orm";
