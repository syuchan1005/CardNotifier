import type { Config } from "drizzle-kit";

export default {
    dialect: "sqlite",
    out: "./migrations",
    schema: "./server/db/schema.ts",
} satisfies Config;
