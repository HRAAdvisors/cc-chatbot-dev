import { drizzle } from "drizzle-orm/node-postgres";
import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { Pool } from "pg";

export const resourceIssueReports = pgTable("resource_issue_reports", {
  id: uuid("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  resourceKey: varchar("resource_key", { length: 2000 }).notNull(),
  resourceName: varchar("resource_name", { length: 500 }).notNull(),
  category: varchar("category", { length: 20 }).notNull(),
  reason: varchar("reason", { length: 40 }).notNull(),
  details: varchar("details", { length: 2000 }).notNull().default(""),
  status: varchar("status", { length: 20 }).notNull().default("new"),
});

const globalForReports = globalThis as unknown as { resourceIssuePool?: Pool };
const pool =
  globalForReports.resourceIssuePool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 20000,
  });
if (process.env.NODE_ENV !== "production")
  globalForReports.resourceIssuePool = pool;
export const issuesDb = drizzle(pool);
