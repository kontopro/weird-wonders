import { createFileRoute, Link } from "@tanstack/react-router";
import { categoryClass } from "@/lib/category-class";
import { taxonomyApi } from "@/data/taxonomy";
import { brandedTitle, siteConfig } from "@/config/site";

export const Route = createFileRoute("/katigories")({
  loader: () => taxonomyApi.listCategories(),
  head: () => ({
    meta: [
      { title: brandedTitle("Κατηγορίες") },
      { name: "description", content: `Όλες οι θεματικές κατηγορίες του ${siteConfig.name}.` },
      { property: "og:title", content: brandedTitle("Κατηγορίες") },
      { property: "og:description", content: "Διάλεξε τη δική σου περιοχή περιέργειας." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const categories = Route.useLoaderData();
  return (
    <div className="section-shell page-top">
      <p className="eyebrow">Διάλεξε τη δική σου περιοχή περιέργειας</p>
      <h1 className="page-title">Κατηγορίες</h1>
      <div className="category-list">
        {categories.map((c) => (
          <Link
            key={c.slug}
            to="/katigoria/$slug"
            params={{ slug: c.slug }}
            className={categoryClass(c)}
          >
            <span>{String(c.publishedCount).padStart(2, "0")}</span>
            <h2>{c.name}</h2>
            {c.description && <p>{c.description}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}
