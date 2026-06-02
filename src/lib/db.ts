import { neon } from "@neondatabase/serverless";

// Use sql.query() for parameterized queries with $1, $2 placeholders.
// The tagged-template form (sql`...`) doesn't work well with dynamic queries.
export function getDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return sql.query;
}
