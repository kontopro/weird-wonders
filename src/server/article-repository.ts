import type { ArticleRepository } from "@/data/articles/article-repository";
import { MockArticleRepository } from "@/data/articles/mock-article-repository";
import { SupabaseArticleRepository } from "@/data/articles/supabase-article-repository";
import { getDataSource } from "@/lib/data-source";
import { createSupabaseServerClient } from "@/server/supabase";

// Demo data lives in server memory and resets on restart. Supabase clients are
// created per request so each query runs with the visitor's own session.
let mockRepository: MockArticleRepository | undefined;

export function getArticleRepository(): ArticleRepository {
  if (getDataSource() === "mock") {
    mockRepository ??= new MockArticleRepository();
    return mockRepository;
  }
  return new SupabaseArticleRepository(createSupabaseServerClient());
}
