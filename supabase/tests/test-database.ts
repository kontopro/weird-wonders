import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";
import { readdir } from "node:fs/promises";

const supabaseDir = new URL("../", import.meta.url);
const read = (relative: string) => Bun.file(new URL(relative, supabaseDir)).text();

/** API roles; `service_role` is the server with the secret key. */
export type Role = "anon" | "authenticated" | "service_role";

/**
 * A throwaway Postgres (PGlite, in-process) with the Supabase stand-ins, every
 * migration and the seed applied — no Supabase project or Docker needed.
 */
export async function createTestDatabase(options: { seed?: boolean } = {}) {
  const db = new PGlite({ extensions: { pgcrypto, unaccent } });
  await db.exec(await read("tests/supabase-shim.sql"));

  const migrations = (await readdir(new URL("migrations/", supabaseDir)))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const file of migrations) {
    try {
      await db.exec(await read(`migrations/${file}`));
    } catch (error) {
      throw new Error(`Migration ${file} failed: ${(error as Error).message}`);
    }
  }
  if (options.seed !== false) await db.exec(await read("seed.sql"));

  /** Runs `sql` as an API role, optionally as a signed-in user, then resets. */
  async function as<T>(role: Role, userId: string | null, sql: string, params: unknown[] = []) {
    await db.exec(`set role ${role}`);
    await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId ?? ""]);
    try {
      return (await db.query<T>(sql, params)).rows;
    } finally {
      await db.exec("reset role");
      await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
    }
  }

  /** Creates an Auth user (the profile is created by the trigger). */
  async function createUser(email: string) {
    const { rows } = await db.query<{ id: string }>(
      "insert into auth.users (email) values ($1) returning id",
      [email],
    );
    return rows[0]!.id;
  }

  return { db, as, createUser, migrations };
}
