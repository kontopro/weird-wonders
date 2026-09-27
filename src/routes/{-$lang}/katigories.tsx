import { createFileRoute, Link } from "@tanstack/react-router";
import { brandedTitle, siteConfig } from "@/config/site";
import { taxonomyApi } from "@/data/taxonomy";
import { messagesFor, useT } from "@/i18n";
import { langOf, ogLocale, sitewideAlternates } from "@/i18n/head";
import { useLocalized } from "@/i18n/links";
import { categoryClass } from "@/lib/category-class";

export const Route = createFileRoute("/{-$lang}/katigories")({
  loader: ({ params }) => taxonomyApi.listCategories(langOf(params)),
  head: ({ params }) => {
    const language = langOf(params);
    const t = messagesFor(language).categoriesPage;
    return {
      meta: [
        { title: brandedTitle(t.title) },
        { name: "description", content: t.description(siteConfig.name) },
        { property: "og:title", content: brandedTitle(t.title) },
        { property: "og:description", content: t.socialDescription },
        { property: "og:type", content: "website" },
        ogLocale(language),
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: sitewideAlternates(language, "/katigories"),
    };
  },
  component: CategoriesPage,
});

function CategoriesPage() {
  const categories = Route.useLoaderData();
  const t = useT();
  const { lp } = useLocalized();
  return (
    <div className="section-shell page-top">
      <p className="eyebrow">{t.categoriesPage.eyebrow}</p>
      <h1 className="page-title">{t.categoriesPage.title}</h1>
      <div className="category-list">
        {categories.map((category) => (
          <Link
            key={category.slug}
            to="/{-$lang}/katigoria/$slug"
            params={{ lang: lp, slug: category.slug }}
            className={categoryClass(category)}
          >
            <span>{String(category.publishedCount).padStart(2, "0")}</span>
            <h2>{category.name}</h2>
            {category.description && <p>{category.description}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}
