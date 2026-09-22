import { createFileRoute, Link } from "@tanstack/react-router";
import { articleRepository } from "@/data/articles";
import { categories, categoryStyles } from "@/lib/articles";
import { brandedTitle, siteConfig } from "@/config/site";

export const Route = createFileRoute("/katigories")({
  loader: () => articleRepository.listPublished(),
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
  const articles = Route.useLoaderData();
  return (
    <div className="section-shell page-top">
      <p className="eyebrow">Οκτώ δρόμοι προς το απρόσμενο</p>
      <h1 className="page-title">Κατηγορίες</h1>
      <div className="category-list">
        {categories.map((c) => (
          <Link key={c} to="/anakalyψε" search={{ category: c }} className={categoryStyles[c]}>
            <span>{String(articles.filter((a) => a.category === c).length).padStart(2, "0")}</span>
            <h2>{c}</h2>
            <p>Ιστορίες που αλλάζουν τον τρόπο που κοιτάς τον κόσμο.</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
