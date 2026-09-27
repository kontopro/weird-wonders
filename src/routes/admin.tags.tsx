import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { brandedTitle, mainLanguage, siteConfig } from "@/config/site";
import { taxonomyApi } from "@/data/taxonomy";
import { canManageTaxonomy } from "@/domain/permissions";
import type { Tag, TaxonomyTranslation } from "@/domain/taxonomy";
import { messagesFor } from "@/i18n";
import { errorMessage } from "@/lib/error-message";
import { slugify } from "@/lib/slug";

export const Route = createFileRoute("/admin/tags")({
  loader: () => taxonomyApi.listTags(),
  component: TagsAdmin,
  head: () => ({ meta: [{ title: brandedTitle("Ετικέτες") }] }),
});

const otherLanguages = siteConfig.languages.filter((language) => language !== mainLanguage);

function TagRow({ tag, canEdit }: { tag: Tag; canEdit: boolean }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const translations: TaxonomyTranslation[] = otherLanguages.flatMap((language) => {
      const name = String(form.get(`name-${language}`) ?? "").trim();
      const slug = String(form.get(`slug-${language}`) ?? "").trim();
      return name ? [{ language, name, slug: slug || slugify(name), description: "" }] : [];
    });
    setSaving(true);
    try {
      await taxonomyApi.saveTagTranslations({ tagId: tag.id, translations });
      toast.success(`Αποθηκεύτηκαν οι μεταφράσεις του «${tag.name}».`);
      await router.invalidate();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="tag-row" onSubmit={onSubmit}>
      <div>
        <strong>{tag.name}</strong>
        <span>
          /{tag.slug} · {tag.publishedCount}
        </span>
      </div>
      {otherLanguages.map((language) => {
        const saved = tag.translations.find((item) => item.language === language);
        return (
          <fieldset key={language} disabled={!canEdit}>
            <legend>{messagesFor(language).languageName}</legend>
            <input
              name={`name-${language}`}
              defaultValue={saved?.name ?? ""}
              maxLength={100}
              placeholder="Όνομα"
              aria-label={`Όνομα (${language})`}
            />
            <input
              name={`slug-${language}`}
              defaultValue={saved?.slug ?? ""}
              maxLength={120}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              placeholder="slug (auto)"
              aria-label={`Slug (${language})`}
            />
          </fieldset>
        );
      })}
      {canEdit && (
        <Button type="submit" variant="outline" size="sm" disabled={saving}>
          {saving ? "Αποθήκευση…" : "Αποθήκευση"}
        </Button>
      )}
    </form>
  );
}

function TagsAdmin() {
  const tags = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const canEdit = canManageTaxonomy(user.role);
  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-overline">Ταξινόμηση</p>
          <h1>Ετικέτες</h1>
          <p>
            {tags.length} ετικέτες. Νέες ετικέτες προστίθενται από τον editor άρθρου
            {otherLanguages.length > 0 ? "· εδώ ορίζεις τις μεταφράσεις τους." : "."}
          </p>
        </div>
      </header>
      <section className="admin-panel tag-list">
        {tags.length === 0 && <p className="admin-empty-note">Δεν υπάρχουν ετικέτες ακόμα.</p>}
        {tags.map((tag) => (
          <TagRow key={tag.id} tag={tag} canEdit={canEdit} />
        ))}
      </section>
    </div>
  );
}
