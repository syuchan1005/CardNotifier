import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { usersTable } from "./db/schema";

const app = new Hono<{ Bindings: Env }>()
    .get("/health", async (c) => {
        const db = drizzle(c.env.DB);
        const result = await db.select().from(usersTable).all();
        return c.json({ status: JSON.stringify(result) });
    });

export default app;
export type AppType = typeof app;
