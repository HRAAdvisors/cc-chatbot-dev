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

// Lets a fresh database (for example, the upstream HR&A deployment) accept reports without a manual migration.
let tableReady: Promise<void> | null = null;
export function ensureIssuesTable() {
  tableReady ??= pool
    .query(`CREATE TABLE IF NOT EXISTS resource_issue_reports (
      id uuid PRIMARY KEY,
      created_at timestamptz NOT NULL DEFAULT now(),
      resource_key varchar(2000) NOT NULL,
      resource_name varchar(500) NOT NULL,
      category varchar(20) NOT NULL,
      reason varchar(40) NOT NULL,
      details varchar(2000) NOT NULL DEFAULT '',
      status varchar(20) NOT NULL DEFAULT 'new'
    )`)
    .then(() => undefined)
    .catch((error) => { tableReady = null; throw error; });
  return tableReady;
}
