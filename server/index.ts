import { eq, and, gte, lte, between, desc, SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import {
    NotificationObject,
    PushSubscription,
} from '@remix-pwa/push';
import { EmailEntity, emailsTable, pushSubscriptionsTable, TransactionEntity, transactionsTable } from "./db/schema";
import { zValidator } from "@hono/zod-validator";
import { z } from 'zod/v4';
import PostalMime from 'postal-mime';
import { sendNotification } from "./push";

const pushSubscriptionSchema = z.object({
    endpoint: z.string().url(),
    keys: z.object({
        p256dh: z.string(),
        auth: z.string(),
    }),
    expirationTime: z.number().nullish(),
});

const apiRoute = new Hono<{ Bindings: Env }>().basePath("/api")
    .get("/health", (c) => c.json({ status: "OK" }))
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
                keyP256dh: body.keys.p256dh,
                keyAuth: body.keys.auth,
                expirationTime: body.expirationTime ?? 0,
            });

            const subscriptions: PushSubscription[] = [body];
            const notification: NotificationObject = {
                title: 'Hello, World!',
                options: {
                    body: 'This is a test notification from the server.',
                },
            };

            await sendNotification(c.env, { subscriptions, notification });
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
                ));

            return c.json({ status: 'OK' });
        },
    )
    .get(
        "/transactions",
        zValidator(
            'query',
            z.object({
                since: z.iso.datetime({ offset: true }).optional(),
                until: z.iso.datetime({ offset: true }).optional(),
            }).optional(),
        ),
        async (c) => {
            const { since, until } = (c.req.valid('query') || {});
            const db = drizzle(c.env.DB);
            let purchasedAtFilter: SQL | undefined = undefined;
            if (since && until) {
                purchasedAtFilter = between(transactionsTable.purchasedAt, new Date(since).getTime(), new Date(until).getTime());
            } else if (since) {
                purchasedAtFilter = gte(transactionsTable.purchasedAt, new Date(since).getTime());
            } else if (until) {
                purchasedAtFilter = lte(transactionsTable.purchasedAt, new Date(until).getTime());
            }
            const response = await db.select().from(transactionsTable)
                .where(and(eq(transactionsTable.userId, 1), purchasedAtFilter))
                .limit(100)
                .orderBy(desc(transactionsTable.purchasedAt));
            return c.json(response);
        },
    );

const app = new Hono()
    .route("/", apiRoute)
    // Workaround for Chrome DevTools
    .get("/.well-known/appspecific/com.chrome.devtools.json", (c) => c.newResponse(null, 404));

const transactionSchema = z.union([
    z.object({
        success: z.literal(true),
        isRefund: z.boolean(),
        amount: z.number(),
        amountCurrency: z.string(),
        cardName: z.string(),
        purchasedAt: z.string().meta({ format: 'date-time' }),
        destination: z.string().meta({ description: 'Merchant name' }),
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
        const entity: EmailEntity = {
            userId: 1,
            from: parsedMessage.from.address || '',
            to: parsedMessage.to?.map((to) => to.address).filter((to) => !!to).join(', ') || '',
            date: parsedMessage.date ? new Date(parsedMessage.date).getTime() : Date.now(),
            subject: parsedMessage.subject || '',
            bodyText: parsedMessage.text || parsedMessage.html || '',
        };
        const db = drizzle(env.DB);
        await db.insert(emailsTable).values(entity);

        const answer = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
            prompt: JSON.stringify(entity),
            response_format: {
                type: 'json_schema',
                json_schema: z.toJSONSchema(transactionSchema),
            },
            stream: false,
        }) as Exclude<AiTextGenerationOutput, ReadableStream>;
        const response = transactionSchema.safeParse(answer.response);
        if (!response.success || !response.data.success || response.data.amount === 0) {
            // not a transaction or amount is zero
            return;
        }

        const transaction: TransactionEntity = {
            userId: entity.userId,
            isRefund: response.data.isRefund,
            amount: response.data.amount,
            amountCurrency: response.data.amountCurrency,
            cardName: response.data.cardName,
            purchasedAt: new Date(response.data.purchasedAt).getTime(),
            destination: response.data.destination,
            createdAt: Date.now(),
        };
        await db.insert(transactionsTable).values(transaction);

        const notification: NotificationObject = {
            title: 'New Transaction Received',
            options: {
                body: `${transaction.cardName}/${transaction.destination}\n${transaction.amount * (transaction.isRefund ? -1 : 1)} ${transaction.amountCurrency}`,
            },
        };
        const subscriptions = await db.select().from(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.userId, entity.userId));
        if (subscriptions.length > 0) {
            console.log('Sending notification: ', notification);
            await sendNotification(env, {
                subscriptions: subscriptions.map(sub => ({
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.keyP256dh,
                        auth: sub.keyAuth,
                    },
                })),
                notification,
            });
        }
    },
} as ExportedHandler<Env>;
export type AppType = typeof app;
