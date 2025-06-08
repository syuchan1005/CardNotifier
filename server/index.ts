import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import {
    NotificationObject,
    VapidDetails,
    PushSubscription,
    sendNotifications,
} from '@remix-pwa/push';
import { usersTable } from "./db/schema";
import { zValidator } from "@hono/zod-validator";
import { z } from 'zod';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const apiRoute = new Hono<{ Bindings: Env }>().basePath("/api")
    .get("/health", async (c) => {
        const db = drizzle(c.env.DB);
        const result = await db.select().from(usersTable).all();
        return c.json({ status: JSON.stringify(result) });
    })
    .get("/notification", (c) => c.json({ publicKey: c.env.WEB_PUSH_PUBLIC_KEY }))
    .post(
        "/notification",
        zValidator(
            'json',
            z.object({
                endpoint: z.string().url(),
                keys: z.object({
                    p256dh: z.string(),
                    auth: z.string(),
                }),
                expirationTime: z.number().nullish(),
            }),
        ),
        async (c) => {
            const body = c.req.valid('json');
            const subscriptions: PushSubscription[] = [body];

            const vapidDetails: VapidDetails = {
                publicKey: c.env.WEB_PUSH_PUBLIC_KEY,
                privateKey: c.env.WEB_PUSH_PRIVATE_KEY,
            };

            const notification: NotificationObject = {
                title: 'Hello, World!',
                options: {
                    body: 'This is a test notification from the server.',
                },
            };

            (async () => {
                await delay(3000);
                sendNotifications({
                    subscriptions,
                    vapidDetails,
                    notification,
                    options: {},
                });
            })();

            return c.json({ status: 'OK' });
        });

const app = new Hono()
    .route("/", apiRoute)
    // Workaround for Chrome DevTools
    .get("/.well-known/appspecific/com.chrome.devtools.json", (c) => c.newResponse(null, 404));

export default app;
export type AppType = typeof app;
