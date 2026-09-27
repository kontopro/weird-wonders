import { deleteCookie, getCookie, getRequestUrl, setCookie } from "@tanstack/react-start/server";
import type { ArticleRepository } from "@/data/articles/article-repository";
import type { AuthProvider, SessionCookie } from "@/data/auth/auth-provider";
import type { AuthorRepository } from "@/data/authors/author-repository";
import type { TeamRepository } from "@/data/team/team-repository";
import type { MediaRepository } from "@/data/media/media-repository";
import { MockMediaRepository } from "@/data/mock/mock-media-repository";
import { SupabaseMediaRepository } from "@/data/supabase/supabase-media-repository";
import { MockTeamRepository } from "@/data/mock/mock-team-repository";
import { SupabaseTeamRepository } from "@/data/supabase/supabase-team-repository";
import { createSupabaseAdminClient } from "@/server/supabase-admin";
import { createDemoStore } from "@/data/mock/demo-seed";
import { MockArticleRepository } from "@/data/mock/mock-article-repository";
import { MockAuthProvider } from "@/data/mock/mock-auth-provider";
import { MockAuthorRepository } from "@/data/mock/mock-author-repository";
import type { MockStore } from "@/data/mock/mock-store";
import { MockTaxonomyRepository } from "@/data/mock/mock-taxonomy-repository";
import { SupabaseArticleRepository } from "@/data/supabase/supabase-article-repository";
import { SupabaseAuthProvider } from "@/data/supabase/supabase-auth-provider";
import { SupabaseAuthorRepository } from "@/data/supabase/supabase-author-repository";
import { SupabaseTaxonomyRepository } from "@/data/supabase/supabase-taxonomy-repository";
import type { TaxonomyRepository } from "@/data/taxonomy/taxonomy-repository";
import { getDataSource, isDemoAdminEnabled } from "@/lib/data-source";
import { createSupabaseServerClient } from "@/server/supabase";

export type Repositories = {
  articles: ArticleRepository;
  taxonomy: TaxonomyRepository;
  authors: AuthorRepository;
  team: TeamRepository;
  media: MediaRepository;
};

// Mock data lives in server memory and resets on restart.
let mockStore: MockStore | undefined;
const getMockStore = () => (mockStore ??= createDemoStore());

const DEMO_SESSION_COOKIE = "demo_session";

const demoSessionCookie: SessionCookie = {
  get: () => getCookie(DEMO_SESSION_COOKIE),
  set: (value) =>
    setCookie(DEMO_SESSION_COOKIE, value, {
      httpOnly: true,
      sameSite: "lax",
      secure: import.meta.env.PROD,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    }),
  clear: () => deleteCookie(DEMO_SESSION_COOKIE, { path: "/" }),
};

/**
 * The single place that picks a data adapter. Everything else depends only on
 * the repository interfaces, so the app does not know which database it uses.
 * Supabase repositories are created per request with the visitor's session.
 */
export function getRepositories(): Repositories {
  if (getDataSource() === "mock") {
    const store = getMockStore();
    return {
      articles: new MockArticleRepository(store),
      taxonomy: new MockTaxonomyRepository(store),
      authors: new MockAuthorRepository(store),
      team: new MockTeamRepository(store),
      media: new MockMediaRepository(store),
    };
  }

  const client = createSupabaseServerClient();
  return {
    articles: new SupabaseArticleRepository(client),
    taxonomy: new SupabaseTaxonomyRepository(client),
    authors: new SupabaseAuthorRepository(client),
    media: new SupabaseMediaRepository(client),
    team: new SupabaseTeamRepository(
      client,
      createSupabaseAdminClient(),
      // Invited people set their password right after accepting.
      new URL("/admin/password", getRequestUrl()).toString(),
    ),
  };
}

/** Picks the authentication adapter, alongside the data adapters above. */
export function getAuthProvider(): AuthProvider {
  if (getDataSource() === "mock") {
    return new MockAuthProvider(getMockStore(), demoSessionCookie, isDemoAdminEnabled());
  }
  return new SupabaseAuthProvider(createSupabaseServerClient());
}

/** Uploaded bytes in mock mode, served by `/media/demo/$id`; null otherwise. */
export function getDemoMediaFile(id: string) {
  if (getDataSource() !== "mock") return null;
  return new MockMediaRepository(getMockStore()).file(id);
}
