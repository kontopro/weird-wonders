import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "bun:test";
import { createTestDatabase } from "./test-database";

/**
 * PostgREST refuses an embed such as `profile:profiles(...)` when two foreign
 * keys link the tables (error PGRST201). PGlite has no PostgREST, so this test
 * finds those table pairs in the migrations and checks that the Supabase
 * adapters name the foreign key (`profiles!members_user_id_fkey(...)`)
 * whenever they embed a table that is reachable through more than one key.
 */

const adapterDir = join(import.meta.dir, "../../src/data/supabase");

test("adapters name the foreign key when two keys link the same tables", async () => {
  const { db } = await createTestDatabase();
  const { rows } = await db.query<{ target: string }>(
    `select c.confrelid::regclass::text as target
       from pg_constraint c
       join pg_namespace n on n.oid = c.connamespace
      where c.contype = 'f' and n.nspname = 'public'
      group by c.conrelid, c.confrelid
     having count(*) > 1`,
  );
  const ambiguous = new Set(rows.map((row) => row.target.replace(/^public\./, "")));
  expect([...ambiguous].sort()).toEqual(["media_assets", "profiles"]);

  const unnamed: string[] = [];
  for (const file of readdirSync(adapterDir).filter((name) => name.endsWith(".ts"))) {
    const source = readFileSync(join(adapterDir, file), "utf8");
    // An embed is `table(` or `alias:table(` inside a select string; `!fk` names the key.
    for (const match of source.matchAll(/["\s,:(](\w+)(!\w+)?\(/g)) {
      const [, table, fk] = match;
      if (table && ambiguous.has(table) && !fk) unnamed.push(`${file}: ${match[0].trim()}`);
    }
  }
  expect(unnamed).toEqual([]);
});
