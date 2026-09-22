import { createFileRoute, Link } from "@tanstack/react-router";
import { articleRepository } from "@/data/articles";
import { brandedTitle } from "@/config/site";

export const Route = createFileRoute("/dimofili")({
  loader: () => articleRepository.listPublished(),
  head: () => ({
    meta: [
      { title: brandedTitle("Δημοφιλή") },
      { name: "description", content: "Οι δημοφιλέστερες ιστορίες της εβδομάδας." },
      { property: "og:title", content: brandedTitle("Δημοφιλή") },
      {
        property: "og:description",
        content: "Οι ιστορίες που άνοιξαν τις περισσότερες συζητήσεις.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PopularPage,
});

function PopularPage() {
  const articles = Route.useLoaderData();
  return (
    <div className="section-shell page-top">
      <p className="eyebrow">Οι ιστορίες της εβδομάδας</p>
      <h1 className="page-title">Δημοφιλή</h1>
      <ol className="ranking-page">
        {[...articles]
          .sort((a, b) => b.popularity - a.popularity)
          .slice(0, 5)
          .map((a, i) => (
            <li key={a.slug}>
              <span>0{i + 1}</span>
              <img src={a.image} alt="" />
              <div>
                <small>
                  {a.category} · {a.minutes} λεπτά ανάγνωσης
                </small>
                <Link to="/arthro/$slug" params={{ slug: a.slug }}>
                  {a.title}
                </Link>
                <p>{a.excerpt}</p>
              </div>
            </li>
          ))}
      </ol>
    </div>
  );
}
