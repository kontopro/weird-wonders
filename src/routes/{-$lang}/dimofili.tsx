import { createFileRoute, Link } from "@tanstack/react-router";
import { articleApi } from "@/data/articles";
import { brandedTitle } from "@/config/site";
import { localizedPath, messagesFor, useT } from "@/i18n";
import { langOf, sitewideAlternates } from "@/i18n/head";
import { socialMeta } from "@/i18n/seo";
import { useLocalized } from "@/i18n/links";
import { imageSizes } from "@/lib/image-sizes";

export const Route = createFileRoute("/{-$lang}/dimofili")({
  loader: ({ params }) => articleApi.listPopular(langOf(params), 10),
  head: ({ params }) => {
    const language = langOf(params);
    const t = messagesFor(language).popularPage;
    return {
      meta: [
        { title: brandedTitle(t.title) },
        ...socialMeta({
          language,
          title: brandedTitle(t.title),
          description: t.socialDescription,
          path: localizedPath(language, "/dimofili"),
        }),
        { name: "description", content: t.description },
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
        {articles.map((article, index) => (
          <li key={article.slug}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <img
              src={article.image || undefined}
              srcSet={article.imageSrcSet || undefined}
              sizes={article.imageSrcSet ? imageSizes.thumb : undefined}
              alt=""
              loading="lazy"
            />
            <div>
              <small>
                {article.category.name} · {t.common.readingTime(article.minutes)} ·{" "}
                {t.popularPage.views(article.popularity)}
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
