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
