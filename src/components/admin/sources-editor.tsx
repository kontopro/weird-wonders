import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ArticleSource } from "@/lib/article-content";

const emptySource = (): ArticleSource => ({ title: "", url: "", publisher: "", date: "" });

/** Structured references, shown under the article as "Πηγές & βιβλιογραφία". */
export function SourcesEditor({
  sources,
  onChange,
}: {
  sources: ArticleSource[];
  onChange: (sources: ArticleSource[]) => void;
}) {
  const update = (index: number, patch: Partial<ArticleSource>) =>
    onChange(
      sources.map((source, current) => (current === index ? { ...source, ...patch } : source)),
    );

  return (
    <div className="sources-editor">
      {sources.length === 0 && (
        <p className="admin-empty-note">
          Καμία πηγή ακόμη. Κάθε ισχυρισμός αξίζει μια επαληθεύσιμη αναφορά.
        </p>
      )}
      {sources.map((source, index) => (
        <fieldset key={index}>
          <legend>Πηγή {index + 1}</legend>
          <input
            className="full"
            value={source.title}
            maxLength={300}
            placeholder="Τίτλος (π.χ. άρθρο, μελέτη, βιβλίο)"
            onChange={(event) => update(index, { title: event.target.value })}
          />
          <input
            className="full"
            value={source.url ?? ""}
            maxLength={2048}
            placeholder="https://… (προαιρετικό)"
            onChange={(event) => update(index, { url: event.target.value })}
          />
          <input
            value={source.publisher ?? ""}
            maxLength={500}
            placeholder="Εκδότης / περιοδικό"
            onChange={(event) => update(index, { publisher: event.target.value })}
          />
          <div className="block-field-row">
            <input
              value={source.date ?? ""}
              maxLength={40}
              placeholder="Έτος ή ημερομηνία"
              onChange={(event) => update(index, { date: event.target.value })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onChange(sources.filter((_, current) => current !== index))}
              aria-label={`Αφαίρεση πηγής ${index + 1}`}
            >
              <Trash2 />
            </Button>
          </div>
        </fieldset>
      ))}
      <Button type="button" variant="outline" onClick={() => onChange([...sources, emptySource()])}>
        <Plus /> Προσθήκη πηγής
      </Button>
    </div>
  );
}
