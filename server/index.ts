import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import {
    NotificationObject,
    PushSubscription,
} from '@remix-pwa/push';
import { emailsTable, pushSubscriptionsTable, usersTable } from "./db/schema";
import { zValidator } from "@hono/zod-validator";
import { z } from 'zod/v4';
import PostalMime from 'postal-mime';
import { sendNotification } from "./push";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const pushSubscriptionSchema = z.object({
    endpoint: z.string().url(),
    keys: z.object({
        p256dh: z.string(),
        auth: z.string(),
    }),
    expirationTime: z.number().nullish(),
});

const apiRoute = new Hono<{ Bindings: Env }>().basePath("/api")
    .get("/health", async (c) => {
        const db = drizzle(c.env.DB);
        const result = await db.select().from(usersTable).all();
        return c.json({ status: JSON.stringify(result) });
    })
    .get("/notification", (c) => c.json({ publicKey: c.env.WEB_PUSH_PUBLIC_KEY }))
    .post(
        "/notification",
        zValidator('json', pushSubscriptionSchema),
        async (c) => {
            const body = c.req.valid('json');

            const db = drizzle(c.env.DB);
            await db.insert(pushSubscriptionsTable).values({
                userId: 1,
                endpoint: body.endpoint,
                key_p256dh: body.keys.p256dh,
                key_auth: body.keys.auth,
                expirationTime: body.expirationTime ?? 0,
            }).run();

            const subscriptions: PushSubscription[] = [body];
            const notification: NotificationObject = {
                title: 'Hello, World!',
                options: {
                    body: 'This is a test notification from the server.',
                },
            };

            await sendNotification(c.env, {
                subscriptions,
                notification,
            });
            return c.json({ status: 'OK' });
        },
    )
    .delete(
        "/notification",
        zValidator('json', z.object({ endpoint: pushSubscriptionSchema.shape.endpoint })),
        async (c) => {
            const body = c.req.valid('json');
            const db = drizzle(c.env.DB);
            await db.delete(pushSubscriptionsTable)
                .where(and(
                    eq(pushSubscriptionsTable.userId, 1),
                    eq(pushSubscriptionsTable.endpoint, body.endpoint),
                ))
                .run();

            return c.json({ status: 'OK' });
        },
    );

const app = new Hono()
    .route("/", apiRoute)
    // Workaround for Chrome DevTools
    .get("/.well-known/appspecific/com.chrome.devtools.json", (c) => c.newResponse(null, 404));

const transactionSchema = z.union([
    z.object({
        success: z.literal(true),
        amount: z.number(),
        amount_currency: z.string(),
        card_name: z.string(),
        purchased_at: z.string().meta({ format: 'date-time' }),
        dest: z.string().meta({ description: 'Merchant name' }),
    }),
    z.object({
        success: z.literal(false),
    }),
]);

export default {
    ...app,
    async email(message, env) {
        const rawText = await new Response(message.raw).text();
        const parsedMessage = await PostalMime.parse(rawText);
        const entity = {
            userId: 1,
            from: parsedMessage.from.address || '',
            to: parsedMessage.to?.map((to) => to.address).filter((to) => !!to).join(', ') || '',
            date: parsedMessage.date ? new Date(parsedMessage.date).getTime() : Date.now(),
            subject: parsedMessage.subject || '',
            bodyText: parsedMessage.text || '',
            bodyHtml: parsedMessage.html || '',
            rawText: rawText,
        };
        const db = drizzle(env.DB);
        await db.insert(emailsTable).values(entity).run();

        const answer = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
            prompt: `Parse below email. Set minus amount for refund.\n\n${JSON.stringify({ subject: entity.subject, body: parsedMessage.text || parsedMessage.html })}`,
            response_format: {
                type: 'json_schema',
                json_schema: z.toJSONSchema(transactionSchema),
            },
            stream: false,
        }) as Exclude<AiTextGenerationOutput, ReadableStream>;
        const response = transactionSchema.safeParse(answer.response);
        let notification: NotificationObject;
        if (!response.success || !response.data.success || response.data.amount === 0) {
            // not a transaction or amount is zero
            notification = {
                title: 'New Email Received',
                options: {
                    body: `parse: ${response.success}, dataSuccess: ${response.data?.success}, amount: ${response.data?.amount}\nFrom: ${entity.from}\nTo: ${entity.to}\nSubject: ${entity.subject}`,
                },
            };
        } else {
            const transaction = response.data;
            console.log('Parsed transaction:', transaction);
            notification = {
                title: 'New Transaction Received',
                options: {
                    body: `${transaction.card_name}/${transaction.dest}\n${transaction.amount} ${transaction.amount_currency}`,
                },
            };
        }

        const subscriptions = await db.select().from(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.userId, entity.userId));
        if (subscriptions.length > 0) {
            console.log('Sending notification: ', notification);
            await sendNotification(env, {
                subscriptions: subscriptions.map(sub => ({
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.key_p256dh,
                        auth: sub.key_auth,
                    },
                })),
                notification,
            });
        }
    },
} as ExportedHandler<Env>;
export type AppType = typeof app;
