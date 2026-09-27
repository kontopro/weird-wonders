import type { ArticleRepository } from "@/data/articles/article-repository";
import type { AuthorRepository } from "@/data/authors/author-repository";
import { createDemoStore } from "@/data/mock/demo-seed";
import { MockArticleRepository } from "@/data/mock/mock-article-repository";
import { MockAuthorRepository } from "@/data/mock/mock-author-repository";
import type { MockStore } from "@/data/mock/mock-store";
import { MockTaxonomyRepository } from "@/data/mock/mock-taxonomy-repository";
import { SupabaseArticleRepository } from "@/data/supabase/supabase-article-repository";
import { SupabaseAuthorRepository } from "@/data/supabase/supabase-author-repository";
import { SupabaseTaxonomyRepository } from "@/data/supabase/supabase-taxonomy-repository";
import type { TaxonomyRepository } from "@/data/taxonomy/taxonomy-repository";
import { getDataSource } from "@/lib/data-source";
import { createSupabaseServerClient } from "@/server/supabase";

export type Repositories = {
  articles: ArticleRepository;
  taxonomy: TaxonomyRepository;
  authors: AuthorRepository;
};

// Mock data lives in server memory and resets on restart.
let mockStore: MockStore | undefined;

/**
 * The single place that picks a data adapter. Everything else depends only on
 * the repository interfaces, so the app does not know which database it uses.
 * Supabase repositories are created per request with the visitor's session.
 */
export function getRepositories(): Repositories {
  if (getDataSource() === "mock") {
    mockStore ??= createDemoStore();
    return {
      articles: new MockArticleRepository(mockStore),
      taxonomy: new MockTaxonomyRepository(mockStore),
      authors: new MockAuthorRepository(mockStore),
    };
  }

  const client = createSupabaseServerClient();
  return {
    articles: new SupabaseArticleRepository(client),
    taxonomy: new SupabaseTaxonomyRepository(client),
    authors: new SupabaseAuthorRepository(client),
  };
}
