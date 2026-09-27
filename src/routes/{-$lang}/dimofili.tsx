import { createFileRoute, Link } from "@tanstack/react-router";
import { articleApi } from "@/data/articles";
import { brandedTitle } from "@/config/site";
import { messagesFor, useT } from "@/i18n";
import { langOf, ogLocale, sitewideAlternates } from "@/i18n/head";
import { useLocalized } from "@/i18n/links";

export const Route = createFileRoute("/{-$lang}/dimofili")({
  loader: ({ params }) => articleApi.listPublished({ language: langOf(params) }),
  head: ({ params }) => {
    const language = langOf(params);
    const t = messagesFor(language).popularPage;
    return {
      meta: [
        { title: brandedTitle(t.title) },
        { name: "description", content: t.description },
        { property: "og:title", content: brandedTitle(t.title) },
        { property: "og:description", content: t.socialDescription },
        { property: "og:type", content: "website" },
        ogLocale(language),
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: sitewideAlternates(language, "/dimofili"),
    };
  },
  component: PopularPage,
});

function PopularPage() {
  const articles = Route.useLoaderData();
  const t = useT();
  const { lp } = useLocalized();
  return (
    <div className="section-shell page-top">
      <p className="eyebrow">{t.popularPage.eyebrow}</p>
      <h1 className="page-title">{t.popularPage.title}</h1>
      <ol className="ranking-page">
        {[...articles]
          .sort((a, b) => b.popularity - a.popularity)
          .slice(0, 5)
          .map((article, index) => (
            <li key={article.slug}>
              <span>0{index + 1}</span>
              <img src={article.image} alt="" />
              <div>
                <small>
                  {article.category.name} · {t.common.readingTime(article.minutes)}
                </small>
                <Link to="/{-$lang}/arthro/$slug" params={{ lang: lp, slug: article.slug }}>
                  {article.title}
                </Link>
                <p>{article.excerpt}</p>
              </div>
            </li>
          ))}
      </ol>
    </div>
  );
}
