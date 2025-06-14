import { InferSelectModel } from "drizzle-orm";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

type Merge<T> = { [K in keyof T]: T[K] };
type WithOptional<T, K extends keyof T> = Merge<Omit<T, K> & Partial<Pick<T, K>>>;

export const usersTable = sqliteTable("users", {
    id: integer().primaryKey({ autoIncrement: true }),
    name: text().notNull(),
    email: text().notNull().unique(),
    sub: text().notNull().unique(),
});

export const pushSubscriptionsTable = sqliteTable("push_subscriptions", {
    id: integer().primaryKey({ autoIncrement: true }),
    userId: integer().notNull(),
    endpoint: text().notNull(),
    keyP256dh: text().notNull(),
    keyAuth: text().notNull(),
    expirationTime: integer().notNull().default(0),
});

export type PushSubscriptionEntity = WithOptional<InferSelectModel<typeof pushSubscriptionsTable>, 'id'>;

export const transactionsTable = sqliteTable("transactions", {
    id: integer().primaryKey({ autoIncrement: true }),
    userId: integer().notNull(),
    messageId: text().notNull(),
    isRefund: integer({ mode: 'boolean' }).notNull(),
    amount: integer().notNull(),
    amountCurrency: text().notNull(),
    cardName: text().notNull(),
    purchasedAt: integer().notNull(),
    destination: text().notNull(),
    createdAt: integer().notNull(),
});

export type TransactionEntity = WithOptional<InferSelectModel<typeof transactionsTable>, 'id'>;

export const emailsTable = sqliteTable("emails", {
    id: integer().primaryKey({ autoIncrement: true }),
    userId: integer().notNull(),
    from: text().notNull(),
    to: text().notNull(),
    date: integer().notNull(),
    messageId: text().notNull(),
    subject: text().notNull(),
    bodyText: text().notNull(),
});

export type EmailEntity = WithOptional<InferSelectModel<typeof emailsTable>, 'id'>;

export const emailRoutingRulesTable = sqliteTable("email_routing_rules", {
    id: integer().primaryKey({ autoIncrement: true }),
    userId: integer().notNull(),
    emailAddress: text().notNull(),
    ruleId: text().notNull(),
});
