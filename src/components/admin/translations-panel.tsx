import { Link, useNavigate } from "@tanstack/react-router";
import { Languages, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ArticleStatusBadge } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { articleApi, type EditableArticle } from "@/data/articles";
import { messagesFor } from "@/i18n";
import { errorMessage } from "@/lib/error-message";

/**
 * Language versions of a saved article. "Create" copies the article into a
 * linked draft in that language, then opens it for translating.
 */
export function TranslationsPanel({
  article,
  hasUnsavedChanges,
}: {
  article: Pick<EditableArticle, "id" | "language" | "translations">;
  hasUnsavedChanges: boolean;
}) {
  const navigate = useNavigate();
  const [creating, setCreating] = useState<string | null>(null);
  const missing = siteConfig.languages.filter(
    (language) =>
      language !== article.language &&
      !article.translations.some((version) => version.language === language),
  );

  const create = async (language: string) => {
    if (hasUnsavedChanges) {
      toast.error("Αποθήκευσε πρώτα τις αλλαγές, ώστε να περάσουν και στη μετάφραση.");
      return;
    }
    setCreating(language);
    try {
      const created = await articleApi.createTranslation(article.id, language);
      toast.success(
        `Δημιουργήθηκε πρόχειρο στα ${messagesFor(language).languageName}. Μετάφρασε το κείμενο και δημοσίευσέ το.`,
      );
      await navigate({ to: "/admin/articles/$id/edit", params: { id: created.id } });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setCreating(null);
    }
  };

  return (
    <section className="editor-panel">
      <header>
        <h2>
          <Languages aria-hidden="true" /> Γλώσσες
        </h2>
      </header>
      <div className="panel-body translations-panel">
        <p>
          Αυτή η εκδοχή: <strong>{messagesFor(article.language).languageName}</strong>
        </p>
        {article.translations.length > 0 && (
          <ul>
            {article.translations.map((version) => (
              <li key={version.id}>
                <Link to="/admin/articles/$id/edit" params={{ id: version.id }}>
                  {messagesFor(version.language).languageName}: {version.title}
                </Link>
                <ArticleStatusBadge status={version.status} />
              </li>
            ))}
          </ul>
        )}
        {missing.map((language) => (
          <Button
            key={language}
            type="button"
            variant="outline"
            disabled={creating !== null}
            onClick={() => void create(language)}
          >
            <Plus />{" "}
            {creating === language
              ? "Δημιουργία…"
              : `Δημιουργία έκδοσης: ${messagesFor(language).languageName}`}
          </Button>
        ))}
      </div>
    </section>
  );
}
