import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const usersTable = sqliteTable("users", {
    id: integer().primaryKey({ autoIncrement: true }),
    name: text().notNull(),
});

export const transactionsTable = sqliteTable("transactions", {
    id: integer().primaryKey({ autoIncrement: true }),
    userId: integer().notNull(),
    amount: integer().notNull(),
    amount_currency: text().notNull(),
    card_name: text().notNull(),
    created_at: integer().notNull(),
    purchased_at: integer().notNull(),
    dest: text().notNull()
});

export const emailsTable = sqliteTable("emails", {
    id: integer().primaryKey({ autoIncrement: true }),
    userId: integer().notNull(),
    from: text().notNull(),
    to: text().notNull(),
    date: integer().notNull(),
    subject: text().notNull(),
    bodyText: text().notNull(),
    bodyHtml: text().notNull(),
    rawText: text().notNull(),
});
