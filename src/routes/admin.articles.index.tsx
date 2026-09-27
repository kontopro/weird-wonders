import { createFileRoute, Link } from "@tanstack/react-router";
import { FileQuestion, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArticlesTable, ConfirmDialog } from "@/components/admin/admin-ui";
import { articleStatuses, type AdminArticle } from "@/lib/admin-data";
import { articleApi } from "@/data/articles";
import { taxonomyApi } from "@/data/taxonomy";
import { errorMessage } from "@/lib/error-message";
import { brandedTitle, siteConfig } from "@/config/site";

export const Route = createFileRoute("/admin/articles/")({
  loader: async () => {
    const [articles, categories] = await Promise.all([
      articleApi.listAdmin(),
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
  const { articles: loadedRows, categories } = Route.useLoaderData();
  const [rows, setRows] = useState<AdminArticle[]>(() => loadedRows);
  const [query, setQuery] = useState("");
  // Category filter holds a slug; "" means all categories.
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("Όλες");
  const [sort, setSort] = useState("newest");
  const [target, setTarget] = useState<AdminArticle>();
  const filtered = useMemo(
    () =>
      rows
        .filter(
          (a) =>
            (!query || a.title.toLocaleLowerCase("el").includes(query.toLocaleLowerCase("el"))) &&
            (category === "" || a.category.slug === category) &&
            (status === "Όλες" || a.status === status),
        )
        .sort((a, b) =>
          sort === "newest"
            ? b.dateValue.localeCompare(a.dateValue)
            : a.dateValue.localeCompare(b.dateValue),
        ),
    [rows, query, category, status, sort],
  );
  const duplicate = async (article: AdminArticle) => {
    try {
      const copy = await articleApi.duplicate(article.id);
      setRows((current) => [copy, ...current]);
      toast.success("Το αντίγραφο αποθηκεύτηκε ως πρόχειρο.");
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
            {rows.length} άρθρα συνολικά · {rows.filter((a) => a.status === "Πρόχειρο").length}{" "}
            πρόχειρα
          </p>
        </div>
        <Link to="/admin/articles/new" className="btn btn-primary">
          <Plus /> Νέο άρθρο
        </Link>
      </header>
      <section className="article-filters">
        <label className="admin-search">
          <Search />
          <span className="sr-only">Αναζήτηση άρθρων</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Αναζήτηση τίτλου…"
          />
        </label>
        <label>
          <span>Κατηγορία</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
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
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>Όλες</option>
            {articleStatuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Ταξινόμηση</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">Νεότερα πρώτα</option>
            <option value="oldest">Παλαιότερα πρώτα</option>
          </select>
        </label>
      </section>
      {filtered.length ? (
        <ArticlesTable articles={filtered} onDelete={setTarget} onDuplicate={duplicate} />
      ) : (
        <section className="admin-empty">
          <FileQuestion />
          <h2>Δεν βρέθηκαν άρθρα</h2>
          <p>Δοκίμασε διαφορετική αναζήτηση ή καθάρισε τα φίλτρα.</p>
          <button
            className="btn btn-outline"
            onClick={() => {
              setQuery("");
              setCategory("");
              setStatus("Όλες");
            }}
          >
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
            setRows((current) => current.filter((row) => row.id !== target.id));
            toast.success("Το άρθρο αφαιρέθηκε.");
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
