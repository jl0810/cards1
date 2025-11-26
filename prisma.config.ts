import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
    // @ts-expect-error - directUrl is supported in Prisma 7 CLI but types might be missing
    directUrl: env("DIRECT_URL"),
  },
});
