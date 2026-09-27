import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/admin-ui";
import { categoryClass } from "@/lib/category-class";
import { Button } from "@/components/ui/button";
import { brandedTitle, mainLanguage, siteConfig } from "@/config/site";
import { messagesFor } from "@/i18n";
import { taxonomyApi } from "@/data/taxonomy";
import { canManageTaxonomy } from "@/domain/permissions";
import {
  categoryIconKeys,
  categoryIconLabels,
  toCategoryIconKey,
  type Category,
  type CategoryInput,
  type TaxonomyTranslation,
} from "@/domain/taxonomy";
import { errorMessage } from "@/lib/error-message";
import { slugify } from "@/lib/slug";

export const Route = createFileRoute("/admin/categories")({
  loader: () => taxonomyApi.listCategories(),
  component: CategoriesAdmin,
  head: () => ({ meta: [{ title: brandedTitle("Κατηγορίες") }] }),
});

/** Languages other than the main one, which get translation fields. */
const otherLanguages = siteConfig.languages.filter((language) => language !== mainLanguage);

const emptyDraft = (sortOrder: number): CategoryInput => ({
  name: "",
  slug: "",
  description: "",
  iconKey: null,
  sortOrder,
  translations: [],
});

/** One translation row per other language, filled from the saved ones. */
const translationFields = (saved: TaxonomyTranslation[] = []): TaxonomyTranslation[] =>
  otherLanguages.map(
    (language) =>
      saved.find((item) => item.language === language) ?? {
        language,
        name: "",
        slug: "",
        description: "",
      },
  );

/** Keeps only filled-in translations; an empty slug is derived from the name. */
const cleanTranslations = (items: TaxonomyTranslation[] = []) =>
  items
    .filter((item) => item.name.trim())
    .map((item) => ({ ...item, slug: item.slug || slugify(item.name) }));

function CategoriesAdmin() {
  const categories = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const canManage = canManageTaxonomy(user.role);
  const nextSortOrder = (categories.at(-1)?.sortOrder ?? 0) + 10;

  const [draft, setDraft] = useState<CategoryInput | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [target, setTarget] = useState<Category>();

  const startCreate = () => {
    setDraft({ ...emptyDraft(nextSortOrder), translations: translationFields() });
    setSlugTouched(false);
  };
  const startEdit = (category: Category) => {
    setDraft({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      iconKey: category.iconKey,
      sortOrder: category.sortOrder,
      translations: translationFields(category.translations),
    });
    setSlugTouched(true);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    try {
      await taxonomyApi.saveCategory({
        ...draft,
        translations: cleanTranslations(draft.translations),
      });
      toast.success(draft.id ? "Η κατηγορία ενημερώθηκε." : "Η κατηγορία δημιουργήθηκε.");
      setDraft(null);
      await router.invalidate();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!target) return;
    try {
      await taxonomyApi.deleteCategory(target.id);
      toast.success("Η κατηγορία διαγράφηκε.");
      await router.invalidate();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setTarget(undefined);
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-overline">Ταξινόμηση</p>
          <h1>Κατηγορίες</h1>
          <p>{categories.length} κατηγορίες. Η σειρά καθορίζει πώς εμφανίζονται στο site.</p>
        </div>
        {canManage && !draft && (
          <Button onClick={startCreate}>
            <Plus /> Νέα κατηγορία
          </Button>
        )}
      </header>

      {draft && (
        <section className="admin-panel category-form">
          <form onSubmit={onSubmit}>
            <h2>{draft.id ? "Επεξεργασία κατηγορίας" : "Νέα κατηγορία"}</h2>
            <div className="admin-form-grid">
              <label>
                <span>Όνομα</span>
                <input
                  required
                  maxLength={100}
                  value={draft.name}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      name: e.target.value,
                      ...(slugTouched ? {} : { slug: slugify(e.target.value) }),
                    })
                  }
                />
              </label>
              <label>
                <span>Slug (διεύθυνση)</span>
                <input
                  required
                  maxLength={120}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  value={draft.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setDraft({ ...draft, slug: e.target.value });
                  }}
                />
              </label>
              <label>
                <span>Χρώμα & εικονίδιο</span>
                <select
                  value={draft.iconKey ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, iconKey: toCategoryIconKey(e.target.value) })
                  }
                >
                  <option value="">Χωρίς</option>
                  {categoryIconKeys.map((key) => (
                    <option key={key} value={key}>
                      {categoryIconLabels[key]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Σειρά εμφάνισης</span>
                <input
                  type="number"
                  min={0}
                  step={10}
                  value={draft.sortOrder}
                  onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) || 0 })}
                />
              </label>
              <label className="full">
                <span>Περιγραφή</span>
                <textarea
                  maxLength={1000}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </label>
              {(draft.translations ?? []).map((translation, index) => {
                const update = (patch: Partial<TaxonomyTranslation>) =>
                  setDraft({
                    ...draft,
                    translations: (draft.translations ?? []).map((item, current) =>
                      current === index ? { ...item, ...patch } : item,
                    ),
                  });
                return (
                  <fieldset key={translation.language} className="full translation-fields">
                    <legend>{messagesFor(translation.language).languageName}</legend>
                    <label>
                      <span>Όνομα</span>
                      <input
                        maxLength={100}
                        value={translation.name}
                        onChange={(e) => update({ name: e.target.value })}
                        placeholder="Αφήστε κενό αν δεν υπάρχει μετάφραση"
                      />
                    </label>
                    <label>
                      <span>Slug</span>
                      <input
                        maxLength={120}
                        pattern="[a-z0-9]+(-[a-z0-9]+)*"
                        value={translation.slug}
                        onChange={(e) => update({ slug: e.target.value })}
                        placeholder={slugify(translation.name) || "auto"}
                      />
                    </label>
                    <label className="full">
                      <span>Περιγραφή</span>
                      <textarea
                        maxLength={1000}
                        value={translation.description}
                        onChange={(e) => update({ description: e.target.value })}
                      />
                    </label>
                  </fieldset>
                );
              })}
            </div>
            <div className="form-actions">
              <Button type="button" variant="outline" onClick={() => setDraft(null)}>
                Ακύρωση
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Αποθήκευση…" : "Αποθήκευση"}
              </Button>
            </div>
          </form>
        </section>
      )}

      <section className="admin-panel category-admin-list">
        {categories.length === 0 && <p className="admin-empty-note">Δεν υπάρχουν κατηγορίες.</p>}
        {categories.map((category) => (
          <article key={category.id}>
            <span aria-hidden="true" />
            <i className={categoryClass(category)} />
            <div>
              <strong>
                {category.name}
                {category.translations.map((item) => (
                  <small key={item.language} className="lang-badge" title={item.slug}>
                    {item.language.toUpperCase()}: {item.name}
                  </small>
                ))}
              </strong>
              <span>
                /{category.slug} ·{" "}
                {category.publishedCount === 1
                  ? "1 δημοσιευμένο άρθρο"
                  : `${category.publishedCount} δημοσιευμένα άρθρα`}
              </span>
            </div>
            {canManage && (
              <div className="row-actions">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => startEdit(category)}
                  aria-label={`Επεξεργασία: ${category.name}`}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTarget(category)}
                  aria-label={`Διαγραφή: ${category.name}`}
                >
                  <Trash2 />
                </Button>
              </div>
            )}
          </article>
        ))}
      </section>

      <ConfirmDialog
        open={!!target}
        onOpenChange={(open) => !open && setTarget(undefined)}
        title={`Διαγραφή της κατηγορίας «${target?.name ?? ""}»;`}
        description="Τα άρθρα της δεν διαγράφονται· θα εμφανίζονται «Χωρίς κατηγορία» μέχρι να τους δώσεις νέα."
        confirmLabel="Διαγραφή"
        onConfirm={onDelete}
      />
    </div>
  );
}
