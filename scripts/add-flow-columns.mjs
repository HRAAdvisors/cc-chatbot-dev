// One-off migration: adds the columns needed to persist the household-size,
// usage-profile, and service-type selections made in the guided chat flows.
// Run once: node --env-file=.env.local scripts/add-flow-columns.mjs
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

await sql`ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS household_size text`;
await sql`ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS usage_profile text`;
await sql`ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS service_type_selected text`;

console.log('chat_logs columns added');
