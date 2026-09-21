import type { ArticleRepository } from "@/data/articles/article-repository";

export type { ArticleDetail, ArticleRepository, ArticleWriteInput } from "@/data/articles/article-repository";

const createRepository = async (): Promise<ArticleRepository> => {
  const source = import.meta.env["VITE_DATA_SOURCE"] ?? "mock";
  if (source === "mock") {
    const { MockArticleRepository } = await import("@/data/articles/mock-article-repository");
    return new MockArticleRepository();
  }

  if (source !== "supabase") {
    throw new Error(`Unsupported VITE_DATA_SOURCE: ${source}`);
  }

  const url = import.meta.env["VITE_SUPABASE_URL"];
  const publishableKey = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !publishableKey) {
    throw new Error("Supabase mode requires VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.");
  }

  const [{ createClient }, { SupabaseArticleRepository }] = await Promise.all([
    import("@supabase/supabase-js"),
    import("@/data/articles/supabase-article-repository"),
  ]);
  const client = createClient(url, publishableKey, {
    auth: { persistSession: typeof window !== "undefined" },
  });
  return new SupabaseArticleRepository(client);
};

const repositoryPromise = createRepository();
const repository = () => repositoryPromise;

export const articleRepository: ArticleRepository = {
  listPublished: async () => (await repository()).listPublished(),
  findPublishedBySlug: async (slug) => (await repository()).findPublishedBySlug(slug),
  listAdmin: async () => (await repository()).listAdmin(),
  findAdminBySlug: async (slug) => (await repository()).findAdminBySlug(slug),
  save: async (input) => (await repository()).save(input),
  duplicate: async (id) => (await repository()).duplicate(id),
  delete: async (id) => (await repository()).delete(id),
};
