import type { ArticleSource } from "@/lib/article-content";

/** The article's references; renders nothing when there are none. */
export function ArticleSources({ sources }: { sources: ArticleSource[] | undefined }) {
  if (!sources?.length) return null;
  return (
    <section className="sources">
      <h2>Πηγές & βιβλιογραφία</h2>
      <ol>
        {sources.map((source, index) => {
          const details = [source.publisher, source.date].filter(Boolean).join(", ");
          return (
            <li key={index}>
              {source.url ? (
                <a href={source.url} rel="noopener noreferrer">
                  {source.title}
                </a>
              ) : (
                source.title
              )}
              {details && <span> — {details}</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
