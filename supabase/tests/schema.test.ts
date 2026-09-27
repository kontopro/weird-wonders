import { beforeEach, describe, expect, test } from "bun:test";
import { createTestDatabase } from "./test-database";

/**
 * Behaviour of the real migrations in Postgres: RLS per role, triggers and
 * functions. These are the rules the mock adapter imitates in mock mode.
 */

type TestDb = Awaited<ReturnType<typeof createTestDatabase>>;
let t: TestDb;
let owner: string;
let editor: string;
let author: string;
let categoryId: string;

const titles = (rows: Array<{ title: string }>) => rows.map((row) => row.title).sort();

async function insertArticle(values: Record<string, unknown>) {
  const columns = Object.keys(values);
  const { rows } = await t.db.query<{ id: string }>(
    `insert into public.articles (${columns.join(", ")})
     values (${columns.map((_, i) => `$${i + 1}`).join(", ")}) returning id`,
    Object.values(values),
  );
  return rows[0]!.id;
}

const article = (title: string, extra: Record<string, unknown> = {}) =>
  insertArticle({
    title,
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    author_id: author,
    category_id: categoryId,
    ...extra,
  });

beforeEach(async () => {
  t = await createTestDatabase();
  owner = await t.createUser("owner@example.com");
  editor = await t.createUser("editor@example.com");
  author = await t.createUser("author@example.com");
  await t.db.query("select private.bootstrap_owner('owner@example.com')");
  await t.db.query(
    `insert into public.members (user_id, role) values ($1, 'editor'), ($2, 'author')`,
    [editor, author],
  );
  categoryId = (await t.db.query<{ id: string }>("select id from public.categories limit 1"))
    .rows[0]!.id;
});

describe("schema baseline", () => {
  test("enables RLS on every public table and seeds categories", async () => {
    const { rows } = await t.db.query<{ relname: string; relrowsecurity: boolean }>(
      `select relname, relrowsecurity from pg_class
       where relnamespace = 'public'::regnamespace and relkind = 'r'`,
    );
    expect(rows.length).toBeGreaterThanOrEqual(7);
    expect(rows.filter((row) => !row.relrowsecurity)).toEqual([]);
    const seeded = await t.db.query("select 1 from public.categories");
    expect(seeded.rows).toHaveLength(8);
  });

  test("creates a profile with a neutral slug for every new Auth user", async () => {
    const { rows } = await t.db.query<{ slug: string; display_name: string }>(
      "select slug, display_name from public.profiles where id = $1",
      [author],
    );
    expect(rows[0]?.slug).toMatch(/^author-[0-9a-f]{12}$/);
    expect(rows[0]?.display_name).toBe("author");
  });

  test("limits both buckets to images of at most 10 MB, without SVG", async () => {
    const { rows } = await t.db.query<{ file_size_limit: number; allowed_mime_types: string[] }>(
      "select file_size_limit, allowed_mime_types from storage.buckets order by id",
    );
    expect(rows).toHaveLength(2);
    for (const bucket of rows) {
      expect(Number(bucket.file_size_limit)).toBe(10485760);
      expect(bucket.allowed_mime_types).not.toContain("image/svg+xml");
    }
  });
});

describe("owner bootstrap", () => {
  test("runs once, only for the database operator", async () => {
    await expect(
      t.db.query("select private.bootstrap_owner('editor@example.com')"),
    ).rejects.toThrow(/already has members/);
    await expect(
      t.as("authenticated", author, "select private.bootstrap_owner('author@example.com')"),
    ).rejects.toThrow(/permission denied/);
  });

  test("never leaves the blog without an active owner", async () => {
    await expect(
      t.db.query("update public.members set role = 'admin' where user_id = $1", [owner]),
    ).rejects.toThrow(/at least one active owner/);
  });
});

describe("public visibility", () => {
  test("anonymous visitors see published and due scheduled articles only", async () => {
    await article("Published", { status: "published" });
    await article("Due", { status: "scheduled", scheduled_at: "2020-01-01T00:00:00Z" });
    await article("Future", { status: "scheduled", scheduled_at: "2999-01-01T00:00:00Z" });
    await article("Draft");

    const rows = await t.as<{ title: string }>("anon", null, "select title from public.articles");
    expect(titles(rows)).toEqual(["Due", "Published"]);
  });

  test("publishing a due scheduled article keeps its scheduled time", async () => {
    const id = await article("Due", {
      status: "scheduled",
      scheduled_at: "2020-01-01T00:00:00Z",
    });
    await t.as(
      "authenticated",
      editor,
      "update public.articles set status = 'published' where id = $1",
      [id],
    );
    const { rows } = await t.db.query<{ published_at: Date; public_at: Date }>(
      "select published_at, public_at from public.articles where id = $1",
      [id],
    );
    expect(new Date(rows[0]!.published_at).toISOString()).toBe("2020-01-01T00:00:00.000Z");
    expect(new Date(rows[0]!.public_at).toISOString()).toBe("2020-01-01T00:00:00.000Z");
  });
});

describe("editorial roles", () => {
  test("authors create drafts as themselves but cannot publish", async () => {
    await t.as(
      "authenticated",
      author,
      `insert into public.articles (title, slug, author_id, category_id)
       values ('Mine', 'mine', $1, $2)`,
      [author, categoryId],
    );
    await expect(
      t.as(
        "authenticated",
        author,
        `insert into public.articles (title, slug, author_id, status)
         values ('Live', 'live', $1, 'published')`,
        [author],
      ),
    ).rejects.toThrow(/row-level security/);
  });

  test("nobody writes database-maintained columns through the API", async () => {
    const id = await article("Draft");
    await expect(
      t.as(
        "authenticated",
        editor,
        "update public.articles set published_at = now() where id = $1",
        [id],
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      t.as("authenticated", author, "update public.profiles set created_at = now() where id = $1", [
        author,
      ]),
    ).rejects.toThrow(/permission denied/);
  });

  test("highlighting an article moves the highlight", async () => {
    const first = await article("First", { status: "published" });
    const second = await article("Second", { status: "published" });
    const highlight = (id: string) =>
      t.as(
        "authenticated",
        editor,
        "update public.articles set is_highlighted = true where id = $1",
        [id],
      );
    await highlight(first);
    await highlight(second);
    const { rows } = await t.db.query<{ title: string }>(
      "select title from public.articles where is_highlighted",
    );
    expect(titles(rows)).toEqual(["Second"]);
  });

  test("editors can still edit articles of a suspended author", async () => {
    const id = await article("Old piece", { status: "published" });
    await t.db.query("update public.members set status = 'suspended' where user_id = $1", [author]);
    await t.as(
      "authenticated",
      editor,
      "update public.articles set title = 'Edited' where id = $1",
      [id],
    );
    const { rows } = await t.db.query<{ title: string }>(
      "select title from public.articles where id = $1",
      [id],
    );
    expect(rows[0]?.title).toBe("Edited");
  });
});

describe("set_article_tags", () => {
  const tagsOf = async (id: string) =>
    (
      await t.db.query<{ name: string }>(
        `select tags.name from public.article_tags join public.tags on tags.id = tag_id
         where article_id = $1 order by tags.name`,
        [id],
      )
    ).rows.map((row) => row.name);

  const setTags = (userId: string, id: string, tags: Array<{ slug: string; name: string }>) =>
    t.as("authenticated", userId, "select public.set_article_tags($1, $2)", [
      id,
      JSON.stringify(tags),
    ]);

  test("editors create new tags; authors may only reuse existing ones", async () => {
    const id = await article("Draft");
    await setTags(editor, id, [{ slug: "zoa", name: "Ζώα" }]);
    await expect(setTags(author, id, [{ slug: "nea", name: "Νέα" }])).rejects.toThrow(
      /row-level security/,
    );
    await setTags(author, id, [{ slug: "zoa", name: "Ζώα" }]);
    expect(await tagsOf(id)).toEqual(["Ζώα"]);
  });

  test("matches an existing tag by name when its slug differs", async () => {
    await t.db.query("insert into public.tags (slug, name) values ('custom-slug', 'Θάλασσα')");
    const id = await article("Draft");
    await setTags(author, id, [{ slug: "thalassa", name: "θάλασσα" }]);
    expect(await tagsOf(id)).toEqual(["Θάλασσα"]);
  });
});
