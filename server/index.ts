import { eq, and, gte, lte, between, desc, SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import type { Context, OidcAuthClaims } from 'hono';
import {
    NotificationObject,
    PushSubscription,
} from '@remix-pwa/push';
import { EmailEntity, emailRoutingRulesTable, emailsTable, pushSubscriptionsTable, TransactionEntity, transactionsTable, usersTable } from "./db/schema";
import { zValidator } from "@hono/zod-validator";
import { z } from 'zod/v4';
import PostalMime from 'postal-mime';
import { getAuth, oidcAuthMiddleware, processOAuthCallback, revokeSession } from "@hono/oidc-auth";
import type { IDToken, OidcAuth } from '@hono/oidc-auth';
import { verify } from "hono/jwt";
import { HTTPException } from "hono/http-exception";
import { convert as convertHtmlToText } from "html-to-text";
import { v7 as uuidv7 } from 'uuid';
import { sendNotification } from "./push";

const pushSubscriptionSchema = z.object({
    endpoint: z.string().url(),
    keys: z.object({
        p256dh: z.string(),
        auth: z.string(),
    }),
    expirationTime: z.number().nullish(),
});

const getAuthUserId = async (c: Context<{ Bindings: Env }>): Promise<number> => {
    const auth = await getAuth(c);
    if (!auth || !auth.sub) {
        throw new HTTPException(401, { message: "Unauthorized" });
    }
    const claims = claimsSchema.safeParse(auth);
    if (!claims.success) {
        throw new HTTPException(500, {
            message: `Invalid OIDC claims\n${z.prettifyError(claims.error)}`,
        });
    }
    const db = drizzle(c.env.DB);
    const user = await db.select().from(usersTable)
        .where(eq(usersTable.sub, claims.data.sub))
        .limit(1)
        .then(rows => rows[0]);
    if (!user) {
        throw new HTTPException(401, { message: "User not found" });
    }
    return user.id;
};

const apiRoute = new Hono<{ Bindings: Env }>().basePath("/api")
    .use("*", oidcAuthMiddleware())
    .get("/notification", (c) => c.json({ publicKey: c.env.WEB_PUSH_PUBLIC_KEY }))
    .post(
        "/notification",
        zValidator('json', pushSubscriptionSchema),
        async (c) => {
            const userId = await getAuthUserId(c);
            const body = c.req.valid('json');

            const db = drizzle(c.env.DB);
            await db.insert(pushSubscriptionsTable).values({
                userId,
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
            const userId = await getAuthUserId(c);
            const body = c.req.valid('json');
            const db = drizzle(c.env.DB);
            await db.delete(pushSubscriptionsTable)
                .where(and(
                    eq(pushSubscriptionsTable.userId, userId),
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
            const userId = await getAuthUserId(c);
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
                .where(and(eq(transactionsTable.userId, userId), purchasedAtFilter))
                .limit(100)
                .orderBy(desc(transactionsTable.purchasedAt));
            return c.json(response);
        },
    )
    .get("/user", async (c) => {
        const auth = await getAuth(c);
        const claims = claimsSchema.safeParse(auth);
        let json;
        if (claims.success) {
            json = {
                status: "authenticated",
                name: claims.data.name,
            } as const;
        } else {
            json = { status: "unauthenticated" } as const;
        }
        return c.json(json);
    })
    .get("/email/address", async (c) => {
        const userId = await getAuthUserId(c);
        const db = drizzle(c.env.DB);
        const rules = await db.select().from(emailRoutingRulesTable)
            .where(eq(emailRoutingRulesTable.userId, userId));
        return c.json({
            status: "OK",
            emailAddresses: rules.map(rule => ({
                id: rule.id,
                emailAddress: rule.emailAddress,
            })),
        });
    })
    .post("/email/address", async (c) => {
        const userId = await getAuthUserId(c);
        const emailAddress = c.env.CF_EMAIL_TEMPLATE.replace("$email", uuidv7());
        const rulesResponse = await fetch(
            `https://api.cloudflare.com/client/v4/zones/${c.env.CF_ZONE_ID}/email/routing/rules`,
            {
                headers: {
                    Authorization: `Bearer ${c.env.CF_ACCOUNT_TOKEN}`,
                    "Content-Type": "application/json",
                },
                method: "POST",
                body: JSON.stringify({
                    actions: [
                        {
                            type: "worker",
                            value: [c.env.CF_WORKER_NAME],
                        },
                    ],
                    matchers: [
                        {
                            type: "literal",
                            field: "to",
                            value: emailAddress,
                        }
                    ],
                }),
            }
        ).then((res) => res.json());
        const rulesPostSchema = z.object({
            result: z.object({
                id: z.string(),
            }),
            success: z.boolean(),
            errors: z.array(z.any()),
            messages: z.array(z.any()),
        });
        
        const parsedRules = rulesPostSchema.safeParse(rulesResponse);
        if (!parsedRules.success) {
            throw new HTTPException(500, {
                message: `Failed to create email routing rule: ${z.prettifyError(parsedRules.error)}`,
            });
        }
        if (!parsedRules.data.success) {
            throw new HTTPException(500, {
                message: `Failed to create email routing rule: ${JSON.stringify(parsedRules.data.errors)}`,
            });
        }
        const db = drizzle(c.env.DB);
        await db.insert(emailRoutingRulesTable).values({
            userId,
            emailAddress,
            cfRuleId: parsedRules.data.result.id,
        });
        return c.json({ status: "OK" });
    })
    .delete(
        "/email/address/:id",
        zValidator('param', z.object({ id: z.string().pipe(z.coerce.number()) })),
        async (c) => {
            const { id } = c.req.valid('param');
            const userId = await getAuthUserId(c);
            const db = drizzle(c.env.DB);
            const email = await db.select().from(emailRoutingRulesTable)
                .where(and(
                    eq(emailRoutingRulesTable.userId, userId),
                    eq(emailRoutingRulesTable.id, id),
                ))
                .limit(1)
                .then(rows => rows[0]);
            if (!email) {
                throw new HTTPException(404, { message: "Email routing rule not found" });
            }
            const rulesResponse = await fetch(
                `https://api.cloudflare.com/client/v4/zones/${c.env.CF_ZONE_ID}/email/routing/rules/${email.cfRuleId}`,
                {
                    headers: {
                        Authorization: `Bearer ${c.env.CF_ACCOUNT_TOKEN}`,
                        "Content-Type": "application/json",
                    },
                    method: "DELETE",
                }
            );
            const rulesDeleteSchema = z.object({
                success: z.boolean(),
                errors: z.array(z.any()),
                messages: z.array(z.any()),
            });
            const parsedRules = rulesDeleteSchema.safeParse(await rulesResponse.json());
            if (!parsedRules.success) {
                throw new HTTPException(500, {
                    message: `Failed to delete email routing rule: ${z.prettifyError(parsedRules.error)}`,
                });
            }
            if (!parsedRules.data.success) {
                throw new HTTPException(500, {
                    message: `Failed to delete email routing rule: ${JSON.stringify(parsedRules.data.errors)}`,
                });
            }
            await db.delete(emailRoutingRulesTable)
                .where(and(
                    eq(emailRoutingRulesTable.userId, userId),
                    eq(emailRoutingRulesTable.id, id),
                ));
            return c.json({ status: "OK" });
        },
    );

const claimsSchema = z.object({
    name: z.string().check(z.minLength(1)),
    email: z.email(),
    sub: z.string().check(z.minLength(1)),
});

const oidcClaimsHook = async (orig: OidcAuth | undefined, claims: IDToken | undefined): Promise<OidcAuthClaims> => {
    const claim = claimsSchema.safeParse({
        name: claims?.preferred_username ?? claims?.name ?? orig?.preferred_username ?? orig?.name,
        email: claims?.email ?? orig?.email,
        sub: claims?.sub ?? orig?.sub,
    });
    if (!claim.success) {
        throw new HTTPException(500, {
            message: `Invalid OIDC claims\n${z.prettifyError(claim.error)}`,
        });
    }
    return claim.data;
};

const app = new Hono<{ Bindings: Env }>()
    .get("/api/health", (c) => c.json({ status: "OK" }))
    .get("/logout", async (c) => {
        await revokeSession(c);
        return c.redirect("/");
    })
    .get("/callback", async (c) => {
        c.set("oidcClaimsHook", oidcClaimsHook);
        const response = await processOAuthCallback(c);
        if (response.status === 302) {
            const auth = await verify(c.get("oidcAuthJwt"), c.env.OIDC_AUTH_SECRET);
            const claims = claimsSchema.parse(auth);
            const db = drizzle(c.env.DB);
            await db
                .insert(usersTable)
                .values(claims)
                .onConflictDoUpdate({
                    target: usersTable.sub,
                    set: {
                        name: claims.name,
                        email: claims.email,
                    },
                });
        }
        return response;
    })
    .use("/", oidcAuthMiddleware())
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

        const forwardedTo = message.headers.get('X-Forwarded-To')
            || message.headers.get('X-Forwarded-For')?.split(/[, ]+/)?.pop();
        if (!forwardedTo) {
            throw new Error(`X-Forwarded-To and X-Forwarded-For headers are not set (body: ${parsedMessage.text || parsedMessage.html || ''})`);
        }
        const db = drizzle(env.DB);
        const rule = await db.select().from(emailRoutingRulesTable)
            .where(and(
                eq(emailRoutingRulesTable.emailAddress, forwardedTo),
            ))
            .limit(1)
            .then(rows => rows[0]);
        if (!rule) {
            throw new Error(`No routing rule found for email address: ${forwardedTo}`);
        }

        let bodyText = "";
        if (parsedMessage.text) {
            bodyText = parsedMessage.text;
        } else if (parsedMessage.html) {
            bodyText = convertHtmlToText(parsedMessage.html, { wordwrap: null })
                .replace(/\[?http.+/g, "").replace(/^\s*\n/gm, ""); // Remove link and empty lines
        }

        const to = [
            ...(parsedMessage.to || []),
            ...(parsedMessage.cc || []),
            ...(parsedMessage.bcc || []),
        ];
        const entity: EmailEntity = {
            userId: rule.userId,
            from: parsedMessage.from.address || '',
            to: to.map((to) => to.address).filter((to) => !!to).join(', ') || '',
            date: parsedMessage.date ? new Date(parsedMessage.date).getTime() : Date.now(),
            messageId: parsedMessage.messageId,
            subject: parsedMessage.subject || '',
            bodyText,
        };
        await db.insert(emailsTable).values(entity);
        await db.delete(emailsTable).where(lte(emailsTable.date, Date.now() - 7 * 24 * 60 * 60 * 1000)); // Keep emails for 7 days

        const answer = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
            prompt: `
            You are a financial transaction analyzer. Analyze the following email content and extract transaction details if present.
            If the email does not contain a transaction, return {"success": false}.
            ---
            ${JSON.stringify(entity)}
            `.trim(),
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
            messageId: entity.messageId,
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
