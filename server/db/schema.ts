import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const usersTable = sqliteTable("users", {
    id: integer().primaryKey(),
    name: text().notNull(),
});

export const transactionsTable = sqliteTable("transactions", {
    id: integer().primaryKey(),
    userId: integer().notNull(),
    amount: integer().notNull(),
    amount_currency: text().notNull(),
    card_name: text().notNull(),
    created_at: integer().notNull(),
    purchased_at: integer().notNull(),
    dest: text().notNull()
});