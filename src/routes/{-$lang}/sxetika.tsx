import { createFileRoute } from "@tanstack/react-router";
import { brandedTitle, siteConfig } from "@/config/site";
import { localizedPath, messagesFor, useT } from "@/i18n";
import { langOf, sitewideAlternates } from "@/i18n/head";
import { socialMeta } from "@/i18n/seo";

export const Route = createFileRoute("/{-$lang}/sxetika")({
  head: ({ params }) => {
    const language = langOf(params);
    const t = messagesFor(language).about;
    return {
      meta: [
        { title: brandedTitle(t.title) },
        ...socialMeta({
          language,
          title: brandedTitle(t.title),
          description: t.socialDescription,
          path: localizedPath(language, "/sxetika"),
        }),
        { name: "description", content: t.description(siteConfig.name) },
      ],
      links: sitewideAlternates(language, "/sxetika"),
    };
  },
  component: AboutPage,
});

function AboutPage() {
  const t = useT().about;
  return (
    <div className="section-shell about-page page-top">
      <p className="eyebrow">{t.eyebrow}</p>
      <h1>{t.heading}</h1>
      <div className="about-grid">
        {t.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <div className="manifesto">
        <span>{t.promiseLabel}</span>
        <h2>{t.promise}</h2>
      </div>
    </div>
  );
}
