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
    language: "el",
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
      `insert into public.articles (title, slug, language, author_id, category_id)
       values ('Mine', 'mine', 'el', $1, $2)`,
      [author, categoryId],
    );
    await expect(
      t.as(
        "authenticated",
        author,
        `insert into public.articles (title, slug, language, author_id, status)
         values ('Live', 'live', 'el', $1, 'published')`,
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

describe("team management", () => {
  let admin: string;

  beforeEach(async () => {
    admin = await t.createUser("admin@example.com");
    await t.db.query(`insert into public.members (user_id, role) values ($1, 'admin')`, [admin]);
  });

  test("owners and admins see suspended members; others see active ones only", async () => {
    await t.db.query("update public.members set status = 'suspended' where user_id = $1", [author]);
    const visibleTo = async (userId: string) =>
      (
        await t.as<{ user_id: string }>(
          "authenticated",
          userId,
          "select user_id from public.members",
        )
      ).map((row) => row.user_id);
    expect(await visibleTo(admin)).toContain(author);
    expect(await visibleTo(editor)).not.toContain(author);
    const profiles = await t.as<{ id: string }>(
      "authenticated",
      admin,
      "select id from public.profiles where id = $1",
      [author],
    );
    expect(profiles).toHaveLength(1);
  });

  test("admins add and change members but never touch owners", async () => {
    const newcomer = await t.createUser("new@example.com");
    await t.as(
      "authenticated",
      admin,
      "insert into public.members (user_id, role, invited_by) values ($1, 'author', $2)",
      [newcomer, admin],
    );
    await t.as(
      "authenticated",
      admin,
      "update public.members set role = 'editor' where user_id = $1",
      [newcomer],
    );
    await expect(
      t.as("authenticated", admin, "update public.members set role = 'owner' where user_id = $1", [
        newcomer,
      ]),
    ).rejects.toThrow(/row-level security/);

    const ownerRows = await t.as(
      "authenticated",
      admin,
      "update public.members set status = 'suspended' where user_id = $1 returning user_id",
      [owner],
    );
    expect(ownerRows).toHaveLength(0);
  });

  test("editors cannot manage the team", async () => {
    const newcomer = await t.createUser("new@example.com");
    await expect(
      t.as(
        "authenticated",
        editor,
        "insert into public.members (user_id, role) values ($1, 'author')",
        [newcomer],
      ),
    ).rejects.toThrow(/row-level security/);
  });

  test("members with articles cannot be removed, only suspended", async () => {
    await article("Byline", { status: "published" });
    await expect(
      t.as("authenticated", admin, "delete from public.members where user_id = $1", [author]),
    ).rejects.toThrow(/foreign key/);
  });
});

describe("languages and translations", () => {
  test("slugs are unique per language, and each language appears once per group", async () => {
    const greek = await article("Trees", { slug: "dentra" });
    const { rows } = await t.db.query<{ translation_group_id: string }>(
      "select translation_group_id from public.articles where id = $1",
      [greek],
    );
    const group = rows[0]!.translation_group_id;

    await article("Trees EN", { slug: "dentra", language: "en", translation_group_id: group });
    await expect(article("Again", { slug: "dentra" })).rejects.toThrow(/unique/);
    await expect(
      article("Second EN", { slug: "other", language: "en", translation_group_id: group }),
    ).rejects.toThrow(/unique/);
  });

  test("category translations are public to read and editor-only to write", async () => {
    await t.as(
      "authenticated",
      editor,
      `insert into public.category_translations (category_id, language, name, slug)
       values ($1, 'en', 'Science', 'science')`,
      [categoryId],
    );
    const rows = await t.as<{ name: string }>(
      "anon",
      null,
      "select name from public.category_translations where language = 'en'",
    );
    expect(rows.map((row) => row.name)).toEqual(["Science"]);
    const tag = await t.db.query<{ id: string }>(
      "insert into public.tags (slug, name) values ('zoa', 'Ζώα') returning id",
    );
    await expect(
      t.as(
        "authenticated",
        author,
        `insert into public.tag_translations (tag_id, language, name, slug)
         values ($1, 'en', 'Animals', 'animals')`,
        [tag.rows[0]!.id],
      ),
    ).rejects.toThrow(/row-level security/);
  });
});

describe("media uploads", () => {
  const upload = (userId: string, path: string) =>
    t.as(
      "authenticated",
      userId,
      `insert into storage.objects (bucket_id, name, owner_id) values ('blog-public', $1, $2)`,
      [path, userId],
    );
  const addAsset = (userId: string, path: string) =>
    t.as<{ id: string }>(
      "authenticated",
      userId,
      `insert into public.media_assets
         (uploaded_by, storage_bucket, storage_path, visibility, mime_type, alt_text)
       values ($1, 'blog-public', $2, 'public', 'image/webp', 'Alt') returning id`,
      [userId, path],
    );

  test("authors upload into their own folder only", async () => {
    await upload(author, `media/${author}/a.webp`);
    await addAsset(author, `media/${author}/a.webp`);
    await expect(upload(author, `media/${editor}/b.webp`)).rejects.toThrow(/row-level security/);
    await expect(upload(author, "branding/logo.webp")).rejects.toThrow(/row-level security/);
    await upload(editor, "branding/logo.webp");
  });

  test("members change their own assets; editors change any", async () => {
    const [asset] = await addAsset(author, `media/${author}/a.webp`);
    const [other] = await addAsset(editor, `media/${editor}/e.webp`);
    const rename = (userId: string, id: string) =>
      t.as(
        "authenticated",
        userId,
        "update public.media_assets set alt_text = 'New' where id = $1 returning id",
        [id],
      );
    expect(await rename(author, asset!.id)).toHaveLength(1);
    expect(await rename(author, other!.id)).toHaveLength(0);
    expect(await rename(editor, asset!.id)).toHaveLength(1);
  });

  test("smaller copies must be well-formed paths in the media folders", async () => {
    const [asset] = await addAsset(author, `media/${author}/v.webp`);
    const setVariants = (value: unknown) =>
      t.as(
        "authenticated",
        author,
        "update public.media_assets set variants = $2::jsonb where id = $1 returning id",
        [asset!.id, JSON.stringify(value)],
      );
    expect(
      await setVariants([
        { width: 480, path: `media/${author}/v-w480.webp` },
        { width: 960, path: `media/${author}/v-w960.webp` },
      ]),
    ).toHaveLength(1);
    await expect(setVariants([{ width: 480, path: "../secret" }])).rejects.toThrow(/check/);
    await expect(setVariants([{ width: 480, path: `media/${author}/..` }])).rejects.toThrow(
      /check/,
    );
    await expect(setVariants([{ width: -1, path: `media/${author}/x.webp` }])).rejects.toThrow(
      /check/,
    );
    await expect(setVariants({ width: 480 })).rejects.toThrow(/check/);
  });
});

describe("search", () => {
  const search = (
    query: string,
    role: "anon" | "authenticated" = "anon",
    userId: string | null = null,
  ) =>
    t.as<{ article_id: string; total: string }>(
      role,
      userId,
      "select * from public.search_articles($1, 'el')",
      [query],
    );

  test("finds public articles ignoring accents, case and word endings", async () => {
    const id = await article("Δέντρα", {
      slug: "dentra",
      status: "published",
      excerpt: "Το κρυφό δίκτυο",
      content_blocks: {
        version: 1,
        blocks: [
          {
            id: "2c1d8a23-7060-46e5-a50b-cf703c1e57f3",
            type: "paragraph",
            data: { text: "Η Μυκόρριζα είναι συμβίωση." },
          },
        ],
      },
    });
    await article("Άλλο", { slug: "allo", status: "published" });
    for (const query of ["δεντρα", "ΔΙΚΤΥΟ", "μυκορ", "κρυφο δικτ"]) {
      const rows = await search(query);
      expect(rows.map((row) => row.article_id)).toEqual([id]);
      expect(Number(rows[0]!.total)).toBe(1);
    }
    expect(await search("ανύπαρκτο")).toEqual([]);
    expect(await search("   ")).toEqual([]);
  });

  test("never returns drafts, even to members", async () => {
    await article("Μυστικό", { slug: "mystiko" });
    expect(await search("μυστικο")).toEqual([]);
    expect(await search("μυστικο", "authenticated", editor)).toEqual([]);
  });
});

describe("old URLs", () => {
  test("keeps the old slug of a public article and resolves it to the new one", async () => {
    const id = await article("Old", { slug: "palio", status: "published" });
    await t.db.query("update public.articles set slug = 'neo' where id = $1", [id]);
    const [row] = await t.as<{ slug: string }>(
      "anon",
      null,
      "select public.resolve_article_slug('palio', 'el') as slug",
    );
    expect(row?.slug).toBe("neo");
  });

  test("ignores drafts and frees a slug that is reused", async () => {
    const draft = await article("Draft", { slug: "proxeiro" });
    await t.db.query("update public.articles set slug = 'proxeiro-2' where id = $1", [draft]);
    const history = await t.db.query("select 1 from public.article_slug_history");
    expect(history.rows).toHaveLength(0);

    const published = await article("Pub", { slug: "a", status: "published" });
    await t.db.query("update public.articles set slug = 'b' where id = $1", [published]);
    await article("Reuse", { slug: "a" });
    const left = await t.db.query("select 1 from public.article_slug_history where slug = 'a'");
    expect(left.rows).toHaveLength(0);
  });
});

describe("views", () => {
  test("anyone records views of public articles only; counts are readable", async () => {
    const live = await article("Live", { slug: "live", status: "published" });
    const draft = await article("Draft", { slug: "draft" });
    for (const id of [live, live, draft]) {
      await t.as("anon", null, "select public.record_article_view($1)", [id]);
    }
    const counts = await t.as<{ article_id: string; views: string }>(
      "anon",
      null,
      "select * from public.article_view_counts(7)",
    );
    expect(counts.map((row) => [row.article_id, Number(row.views)])).toEqual([[live, 2]]);
    await expect(
      t.as("anon", null, "insert into public.article_views (article_id) values ($1)", [live]),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("newsletter", () => {
  const subscribe = (email: string) =>
    t.as("anon", null, "select public.subscribe_newsletter($1, 'el')", [email]);

  test("sign-ups are idempotent and only owners/admins can read them", async () => {
    await subscribe("Reader@Example.com");
    await subscribe("reader@example.com ");
    const all = await t.db.query<{ email: string; status: string }>(
      "select email, status from public.newsletter_subscribers",
    );
    expect(all.rows).toEqual([{ email: "reader@example.com", status: "pending" }]);

    await expect(t.as("anon", null, "select * from public.newsletter_subscribers")).rejects.toThrow(
      /permission denied/,
    );
    expect(
      await t.as("authenticated", editor, "select * from public.newsletter_subscribers"),
    ).toHaveLength(0);
    expect(
      await t.as("authenticated", owner, "select * from public.newsletter_subscribers"),
    ).toHaveLength(1);
  });

  test("confirm and unsubscribe work by token; re-subscribing reopens", async () => {
    await subscribe("a@example.com");
    const { rows } = await t.db.query<{ token: string }>(
      "select token from public.newsletter_subscribers",
    );
    const token = rows[0]!.token;
    await t.as("anon", null, "select public.confirm_newsletter($1)", [token]);
    await t.as("anon", null, "select public.unsubscribe_newsletter($1)", [token]);
    const status = async () =>
      (await t.db.query<{ status: string }>("select status from public.newsletter_subscribers"))
        .rows[0]!.status;
    expect(await status()).toBe("unsubscribed");
    await subscribe("a@example.com");
    expect(await status()).toBe("pending");
  });
});
