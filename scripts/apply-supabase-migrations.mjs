/**
 * Applies all SQL files in supabase/migrations/ to a remote Postgres database in filename order.
 *
 * Option A — URI (password must be URL-encoded if it contains @ # : / ? etc.):
 *   SUPABASE_DB_URL=postgresql://postgres:ENCODED_PASSWORD@db.<ref>.supabase.co:5432/postgres
 *
 * Option B — parts (no encoding hassle):
 *   Copy host, port, and user from Supabase Dashboard → Connect → Postgres.
 *
 * Direct (IPv4-only networks may need pooler instead):
 *   SUPABASE_DB_HOST=db.<ref>.supabase.co
 *   SUPABASE_DB_USER=postgres
 *   SUPABASE_DB_PORT=5432
 *
 * Pooler — hostname MUST match your project region (e.g. aws-0-eu-west-1.pooler.supabase.com).
 * Transaction mode (typical for port 6543):
 *   SUPABASE_DB_HOST=aws-0-<REGION>.pooler.supabase.com
 *   SUPABASE_DB_USER=postgres.<ref>    ← note: postgres dot project ref, not just "postgres"
 *   SUPABASE_DB_PORT=6543
 *
 * If you see "Tenant or user not found", the pooler region host or postgres.<ref> username is wrong —
 * paste values exactly from the dashboard connection string, do not guess the region.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const migrationsDir = path.join(root, "supabase", "migrations");

/** Load .env; when override=true, file wins over existing process.env (fixes empty/wrong preset vars). */
function loadDotEnv(override = false) {
  try {
    const raw = readFileSync(path.join(root, ".env"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (override || !(key in process.env) || process.env[key] === "") {
        process.env[key] = val;
      }
    }
  } catch {
    // no .env
  }
}

loadDotEnv(true);

function stripQuotes(s) {
  const t = String(s).trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1).trim();
  }
  return t;
}

function buildClientConfig() {
  const host = stripQuotes(process.env.SUPABASE_DB_HOST ?? "");
  const password = process.env.SUPABASE_DB_PASSWORD ?? "";
  const user = stripQuotes(process.env.SUPABASE_DB_USER || "postgres");
  const port = Number(process.env.SUPABASE_DB_PORT || "5432");
  const database = stripQuotes(process.env.SUPABASE_DB_NAME || "postgres");

  if (host && password) {
    return {
      host,
      port: Number.isFinite(port) ? port : 5432,
      user,
      password,
      database,
      ssl: { rejectUnauthorized: false },
    };
  }

  let connectionString = stripQuotes(
    process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || ""
  );
  if (!connectionString) {
    console.error(
      "Set database connection via either:\n\n" +
        "  SUPABASE_DB_HOST, SUPABASE_DB_PASSWORD (and optional SUPABASE_DB_USER, PORT, NAME)\n\n" +
        "or a single URI:\n\n" +
        "  SUPABASE_DB_URL=postgresql://postgres:PASSWORD@db.<ref>.supabase.co:5432/postgres\n\n" +
        "If the password contains @ # : / ? or spaces, use the HOST+PASSWORD variables, or run encodeURIComponent on the password inside the URI.\n" +
        "Password: Supabase → Project Settings → Database."
    );
    process.exit(1);
  }

  // Normalize scheme for parsers that expect postgres:
  if (connectionString.startsWith("postgresql://")) {
    connectionString = "postgres://" + connectionString.slice("postgresql://".length);
  }

  try {
    new URL(connectionString);
  } catch {
    console.error(
      "SUPABASE_DB_URL is not a valid URL. Common fixes:\n" +
        "  • Remove extra quotes/spaces around the whole value.\n" +
        "  • Replace [YOUR-PASSWORD] with your real database password.\n" +
        "  • URL-encode special characters in the password, or use SUPABASE_DB_HOST + SUPABASE_DB_PASSWORD instead."
    );
    process.exit(1);
  }

  return {
    connectionString,
    ssl: { rejectUnauthorized: false },
  };
}

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const client = new pg.Client(buildClientConfig());

try {
  await client.connect();
} catch (err) {
  const msg = err?.message ?? String(err);
  console.error("Could not connect to Postgres:", msg);
  if (/tenant or user not found/i.test(msg)) {
    console.error(
      "\nThis usually means the Supabase pooler hostname does not match your project region,\n" +
        "or SUPABASE_DB_USER is wrong. For transaction pooler (port 6543) use:\n" +
        "  user = postgres.<your-project-ref>   (e.g. postgres.abcdefghijklmnop)\n" +
        "  host = exactly as shown under Project Settings → Database → Connection string (Pooler).\n" +
        "Do not reuse a pooler host from another region or another project."
    );
  }
  process.exit(1);
}

console.log(`Applying ${files.length} migration(s)…`);

try {
  for (const file of files) {
    const sql = readFileSync(path.join(migrationsDir, file), "utf8");
    process.stdout.write(`  → ${file} … `);
    await client.query(sql);
    console.log("ok");
  }
  console.log("All migrations applied.");
} catch (err) {
  console.error("\nMigration failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
