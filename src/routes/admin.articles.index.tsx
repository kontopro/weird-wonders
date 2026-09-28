import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { FileQuestion, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { ArticlesTable, ConfirmDialog } from "@/components/admin/admin-ui";
import { Pager } from "@/components/pager";
import { articleStatusLabels, articleStatuses, type AdminArticle } from "@/lib/admin-data";
import { articleApi } from "@/data/articles";
import { taxonomyApi } from "@/data/taxonomy";
import { errorMessage } from "@/lib/error-message";
import { brandedTitle, siteConfig } from "@/config/site";

// Filters live in the URL (?q=&category=&status=&sort=&page=), so they survive
// reloads and the back button, and each page loads only its own rows.
const searchSchema = z.object({
  q: z.string().max(200).optional().catch(undefined),
  category: z.string().max(200).optional().catch(undefined),
  status: z.enum(articleStatuses).optional().catch(undefined),
  sort: z.enum(["newest", "oldest"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
});

export const Route = createFileRoute("/admin/articles/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [articles, categories] = await Promise.all([
      articleApi.pageAdmin(
        {
          ...(deps.q ? { query: deps.q } : {}),
          ...(deps.category ? { categorySlug: deps.category } : {}),
          ...(deps.status ? { status: deps.status } : {}),
          ...(deps.sort === "oldest" ? { oldestFirst: true } : {}),
        },
        deps.page ?? 1,
      ),
      taxonomyApi.listCategories(),
    ]);
    return { articles, categories };
  },
  component: ArticlesPage,
  head: () => ({
    meta: [
      { title: brandedTitle("Άρθρα") },
      {
        name: "description",
        content: `Αναζήτηση, φίλτρα και οργάνωση άρθρων του ${siteConfig.name}.`,
      },
      { property: "og:title", content: brandedTitle("Άρθρα") },
      {
        property: "og:description",
        content: `Αναζήτηση, φίλτρα και οργάνωση άρθρων του ${siteConfig.name}.`,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ArticlesPage() {
  const { articles, categories } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const router = useRouter();
  const [query, setQuery] = useState(search.q ?? "");
  const [target, setTarget] = useState<AdminArticle>();
  // When ?q= changes (back button, "clear filters"), show it in the box.
  const [shownQ, setShownQ] = useState(search.q);
  if (shownQ !== search.q) {
    setShownQ(search.q);
    setQuery(search.q ?? "");
  }
  // Any filter change starts again from the first page.
  const setFilter = (next: Partial<z.infer<typeof searchSchema>>) =>
    navigate({
      search: (previous) => {
        const merged = { ...previous, ...next, page: undefined };
        return Object.fromEntries(
          Object.entries(merged).filter(([, value]) => value !== undefined && value !== ""),
        );
      },
    });
  const filtered = Boolean(search.q || search.category || search.status);
  const duplicate = async (article: AdminArticle) => {
    try {
      await articleApi.duplicate(article.id);
      toast.success("Το αντίγραφο αποθηκεύτηκε ως πρόχειρο.");
      await router.invalidate();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };
  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-overline">Περιεχόμενο</p>
          <h1>Άρθρα</h1>
          <p>
            {articles.total === 1 ? "1 άρθρο" : `${articles.total} άρθρα`}
            {filtered ? " με αυτά τα φίλτρα" : " συνολικά"}
          </p>
        </div>
        <Link to="/admin/articles/new" className="btn btn-primary">
          <Plus /> Νέο άρθρο
        </Link>
      </header>
      <section className="article-filters">
        <form
          className="admin-search"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            void setFilter({ q: query.trim() || undefined });
          }}
        >
          <Search />
          <label>
            <span className="sr-only">Αναζήτηση άρθρων</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onBlur={() => {
                if ((search.q ?? "") !== query.trim())
                  void setFilter({ q: query.trim() || undefined });
              }}
              placeholder="Αναζήτηση τίτλου… (Enter)"
            />
          </label>
        </form>
        <label>
          <span>Κατηγορία</span>
          <select
            value={search.category ?? ""}
            onChange={(e) => void setFilter({ category: e.target.value || undefined })}
          >
            <option value="">Όλες</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Κατάσταση</span>
          <select
            value={search.status ?? ""}
            onChange={(e) =>
              void setFilter({
                status: (e.target.value || undefined) as
                  (typeof articleStatuses)[number] | undefined,
              })
            }
          >
            <option value="">Όλες</option>
            {articleStatuses.map((s) => (
              <option key={s} value={s}>
                {articleStatusLabels[s]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Ταξινόμηση</span>
          <select
            value={search.sort ?? "newest"}
            onChange={(e) =>
              void setFilter({ sort: e.target.value === "oldest" ? "oldest" : undefined })
            }
          >
            <option value="newest">Νεότερα πρώτα</option>
            <option value="oldest">Παλαιότερα πρώτα</option>
          </select>
        </label>
      </section>
      {articles.items.length ? (
        <>
          <ArticlesTable articles={articles.items} onDelete={setTarget} onDuplicate={duplicate} />
          <Pager page={articles} />
        </>
      ) : (
        <section className="admin-empty">
          <FileQuestion />
          <h2>Δεν βρέθηκαν άρθρα</h2>
          <p>Δοκίμασε διαφορετική αναζήτηση ή καθάρισε τα φίλτρα.</p>
          <button className="btn btn-outline" onClick={() => void navigate({ search: {} })}>
            Καθαρισμός φίλτρων
          </button>
        </section>
      )}
      <ConfirmDialog
        open={!!target}
        onOpenChange={(open) => !open && setTarget(undefined)}
        title="Να αφαιρεθεί το άρθρο;"
        description="Η διαγραφή είναι οριστική."
        confirmLabel="Διαγραφή"
        onConfirm={async () => {
          if (!target) return;
          try {
            await articleApi.delete(target.id);
            toast.success("Το άρθρο αφαιρέθηκε.");
            await router.invalidate();
          } catch (error) {
            toast.error(errorMessage(error));
          } finally {
            setTarget(undefined);
          }
        }}
      />
    </div>
  );
}
