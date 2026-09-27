import { Calendar, ChevronDown, Eye, Image, Save, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/admin/admin-ui";
import { BlockEditor } from "@/components/admin/block-editor";
import { ImageField, MediaLibraryProvider } from "@/components/admin/media-library";
import { articleStatusLabels, articleStatuses, type ArticleStatus } from "@/lib/admin-data";
import { authorEditableStatuses, isEditorRole } from "@/domain/permissions";
import type { CategoryRef, TagRef } from "@/domain/taxonomy";
import type { SessionUser } from "@/lib/auth-types";
import { errorMessage } from "@/lib/error-message";
import { slugify } from "@/lib/slug";
import { siteConfig } from "@/config/site";
import {
  createEmptyArticleContent,
  safeParseArticleContent,
  type ArticleContentDocument,
} from "@/lib/article-content";
import { articleApi, type EditableArticle } from "@/data/articles";

export function SeoPanel({
  title,
  description,
  onTitle,
  onDescription,
}: {
  title: string;
  description: string;
  onTitle: (v: string) => void;
  onDescription: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="editor-panel seo-panel">
      <button
        type="button"
        className="panel-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>
          <Sparkles /> SEO & κοινωνικά δίκτυα
        </span>
        <ChevronDown className={open ? "rotated" : ""} />
      </button>
      {open && (
        <div className="panel-body">
          <label>
            <span>
              SEO title <small>{title.length}/60</small>
            </span>
            <input value={title} maxLength={60} onChange={(e) => onTitle(e.target.value)} />
          </label>
          <label>
            <span>
              Meta description <small>{description.length}/160</small>
            </span>
            <textarea
              value={description}
              maxLength={160}
              onChange={(e) => onDescription(e.target.value)}
            />
          </label>
          <div className="social-placeholder">
            <Image />
            <span>Social image placeholder</span>
          </div>
          <div className="google-preview">
            <small>{siteConfig.domain} › arthro</small>
            <strong>{title || `Τίτλος άρθρου — ${siteConfig.name}`}</strong>
            <p>{description || "Η περιγραφή του άρθρου θα εμφανιστεί εδώ."}</p>
          </div>
        </div>
      )}
    </section>
  );
}

export function PublishPanel({
  status,
  date,
  onStatus,
  onDate,
  onDraft,
  onPreview,
  onPublish,
  canPublish,
}: {
  canPublish: boolean;
  status: ArticleStatus;
  date: string;
  onStatus: (v: ArticleStatus) => void;
  onDate: (v: string) => void;
  onDraft: () => void;
  onPreview: () => void;
  onPublish: () => void;
}) {
  return (
    <section className="editor-panel">
      <header>
        <h2>Δημοσίευση</h2>
      </header>
      <div className="panel-body">
        <label>
          <span>Κατάσταση</span>
          <select value={status} onChange={(e) => onStatus(e.target.value as ArticleStatus)}>
            {(canPublish ? articleStatuses : authorEditableStatuses).map((articleStatus) => (
              <option key={articleStatus} value={articleStatus}>
                {articleStatusLabels[articleStatus]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>
            <Calendar /> Ημερομηνία δημοσίευσης
          </span>
          <input type="date" value={date} onChange={(e) => onDate(e.target.value)} />
        </label>
        <Button type="button" variant="outline" onClick={onDraft}>
          <Save /> Αποθήκευση ως πρόχειρο
        </Button>
        <div className="publish-actions">
          <Button type="button" variant="outline" onClick={onPreview}>
            <Eye /> Προεπισκόπηση
          </Button>
          <Button type="button" onClick={onPublish}>
            {canPublish ? "Δημοσίευση" : "Υποβολή για έλεγχο"}
          </Button>
        </div>
      </div>
    </section>
  );
}

export function ArticleEditor({
  article,
  categories,
  tagSuggestions,
  user,
}: {
  article?: EditableArticle;
  categories: CategoryRef[];
  tagSuggestions: TagRef[];
  user: SessionUser;
}) {
  const canPublish = isEditorRole(user.role);
  const [savedId, setSavedId] = useState(article?.id);
  // The URL is fixed once an article has been saved; until then it follows the title.
  const [savedSlug, setSavedSlug] = useState(article?.slug);
  const [title, setTitle] = useState(article?.title ?? "");
  const [description, setDescription] = useState(article?.excerpt ?? "");
  const [contentDocument, setContentDocument] = useState<ArticleContentDocument>(
    article?.content ?? createEmptyArticleContent(),
  );
  const [coverAssetId, setCoverAssetId] = useState<string | null>(article?.coverAssetId ?? null);
  const [alt, setAlt] = useState(article?.imageAlt ?? "");
  const [status, setStatus] = useState<ArticleStatus>(article?.status ?? "draft");
  const [date, setDate] = useState(article?.dateValue ?? new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState(article?.category.slug ?? categories[0]?.slug ?? "");
  const [tags, setTags] = useState(article?.tags.map((tag) => tag.name).join(", ") ?? "");
  const [featured, setFeatured] = useState(article?.isFeatured ?? false);
  const [popular, setPopular] = useState(article?.isTrending ?? false);
  const [daily, setDaily] = useState(article?.isHighlighted ?? false);
  const [seoTitle, setSeoTitle] = useState(
    (article?.seoTitle || article?.title || "").slice(0, 60),
  );
  const [seoDescription, setSeoDescription] = useState(
    (article?.seoDescription || article?.excerpt || "").slice(0, 160),
  );
  const [publishOpen, setPublishOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const slug = useMemo(() => savedSlug ?? (slugify(title) || "neo-arthro"), [savedSlug, title]);
  const contentIsValid = () => {
    const result = safeParseArticleContent(contentDocument);
    if (result.success) return true;
    toast.error(result.error.issues[0]?.message ?? "Το περιεχόμενο χρειάζεται διόρθωση.");
    return false;
  };
  const persist = async (nextStatus: ArticleStatus) => {
    if (!title.trim()) {
      toast.error("Ο τίτλος είναι υποχρεωτικός.");
      return false;
    }
    if (!contentIsValid()) return false;
    if (!category) {
      toast.error("Δημιούργησε πρώτα μια κατηγορία.");
      return false;
    }
    try {
      const saved = await articleApi.save({
        ...(savedId ? { id: savedId } : {}),
        slug,
        title,
        excerpt: description,
        categorySlug: category,
        status: nextStatus,
        dateValue: date,
        coverAssetId,
        imageAlt: coverAssetId ? alt : "",
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        content: contentDocument,
        seoTitle: seoTitle.slice(0, 60),
        seoDescription: seoDescription.slice(0, 160),
        isFeatured: canPublish && featured,
        isTrending: canPublish && popular,
        isHighlighted: canPublish && daily,
      });
      setSavedId(saved.id);
      setSavedSlug(saved.slug);
      setStatus(nextStatus);
      setDirty(false);
      return true;
    } catch (error) {
      toast.error(errorMessage(error, "Η αποθήκευση απέτυχε. Δοκίμασε ξανά."));
      return false;
    }
  };
  const save = async () => {
    if (await persist("draft")) toast.success("Το άρθρο αποθηκεύτηκε ως πρόχειρο.");
  };
  return (
    <MediaLibraryProvider>
      <TooltipProvider>
        <div className="editor-page">
          <header className="editor-topbar">
            <div>
              <p className="admin-overline">{article ? "Επεξεργασία άρθρου" : "Νέο άρθρο"}</p>
              <h1>{article ? "Επεξεργασία" : "Δημιούργησε κάτι που αξίζει να μάθουμε"}</h1>
            </div>
            <span className={dirty ? "unsaved active" : "unsaved"}>
              <i />
              {dirty ? "Μη αποθηκευμένες αλλαγές" : "Όλες οι αλλαγές αποθηκεύτηκαν"}
            </span>
          </header>
          <div className="editor-layout">
            <div className="editor-main">
              <section className="editor-canvas">
                <label className="title-field">
                  <span className="sr-only">Τίτλος άρθρου</span>
                  <textarea
                    rows={2}
                    maxLength={120}
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setSeoTitle(e.target.value.slice(0, 60));
                      setDirty(true);
                    }}
                    placeholder="Γράψε έναν τίτλο που γεννά περιέργεια…"
                  />
                  <small>{title.length}/120</small>
                </label>
                <p className="slug-preview">
                  {siteConfig.domain}/arthro/<strong>{slug}</strong>
                </p>
                <label className="description-field">
                  <span>Σύντομη περιγραφή</span>
                  <textarea
                    maxLength={220}
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      setSeoDescription(e.target.value.slice(0, 160));
                      setDirty(true);
                    }}
                    placeholder="Μια σύντομη εισαγωγή για τον αναγνώστη…"
                  />
                  <small>{description.length}/220</small>
                </label>
                <BlockEditor
                  document={contentDocument}
                  onChange={setContentDocument}
                  onDirty={() => setDirty(true)}
                />
              </section>
            </div>
            <aside className="editor-aside">
              <PublishPanel
                canPublish={canPublish}
                status={status}
                date={date}
                onStatus={(value) => {
                  setStatus(value);
                  if (value !== "published") setDaily(false);
                  setDirty(true);
                }}
                onDate={(value) => {
                  setDate(value);
                  setDirty(true);
                }}
                onDraft={save}
                onPreview={() => toast.info("Άνοιξε την προεπισκόπηση μέσα σε κάθε block.")}
                onPublish={() => {
                  if (contentIsValid()) setPublishOpen(true);
                }}
              />
              <section className="editor-panel">
                <header>
                  <h2>Κεντρική εικόνα</h2>
                </header>
                <div className="panel-body">
                  <ImageField
                    assetId={coverAssetId}
                    label="Επιλογή κεντρικής εικόνας"
                    onSelect={(asset) => {
                      setCoverAssetId(asset.id);
                      if (!alt.trim()) setAlt(asset.alt);
                      setDirty(true);
                    }}
                    onRemove={() => {
                      setCoverAssetId(null);
                      setDirty(true);
                    }}
                  />
                  {coverAssetId && (
                    <label className="cover-alt">
                      <span>Alt text κεντρικής εικόνας</span>
                      <input
                        value={alt}
                        maxLength={500}
                        onChange={(e) => {
                          setAlt(e.target.value);
                          setDirty(true);
                        }}
                        placeholder="Περιέγραψε την εικόνα"
                      />
                    </label>
                  )}
                </div>
              </section>
              <section className="editor-panel">
                <header>
                  <h2>Οργάνωση</h2>
                </header>
                <div className="panel-body">
                  <label>
                    <span>Κατηγορία</span>
                    <select
                      value={category}
                      onChange={(e) => {
                        setCategory(e.target.value);
                        setDirty(true);
                      }}
                    >
                      {categories.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Ετικέτες</span>
                    <input
                      list="tag-suggestions"
                      value={tags}
                      onChange={(e) => {
                        setTags(e.target.value);
                        setDirty(true);
                      }}
                      placeholder="π.χ. φύση, δάσος"
                    />
                    <datalist id="tag-suggestions">
                      {tagSuggestions.map((tag) => (
                        <option key={tag.slug} value={tag.name} />
                      ))}
                    </datalist>
                    {!canPublish && <small>Νέες ετικέτες δημιουργούν μόνο οι επιμελητές.</small>}
                  </label>
                  <label>
                    <span>Συντάκτης</span>
                    <input value={article?.author.name ?? user.displayName} readOnly />
                  </label>
                  {canPublish && (
                    <div className="switch-list">
                      <label>
                        <span>Featured άρθρο</span>
                        <Switch
                          checked={featured}
                          onCheckedChange={(value) => {
                            setFeatured(value);
                            setDirty(true);
                          }}
                        />
                      </label>
                      <label>
                        <span>Δημοφιλές</span>
                        <Switch
                          checked={popular}
                          onCheckedChange={(value) => {
                            setPopular(value);
                            setDirty(true);
                          }}
                        />
                      </label>
                      <label>
                        <span>{siteConfig.contentLabels.highlight}</span>
                        <Switch
                          checked={daily}
                          disabled={status !== "published"}
                          onCheckedChange={(value) => {
                            setDaily(value);
                            setDirty(true);
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </section>
              <SeoPanel
                title={seoTitle}
                description={seoDescription}
                onTitle={(value) => {
                  setSeoTitle(value);
                  setDirty(true);
                }}
                onDescription={(value) => {
                  setSeoDescription(value);
                  setDirty(true);
                }}
              />
            </aside>
          </div>
          <ConfirmDialog
            open={publishOpen}
            onOpenChange={setPublishOpen}
            title={canPublish ? "Έτοιμο για δημοσίευση;" : "Υποβολή για έλεγχο;"}
            description={
              canPublish
                ? "Το άρθρο θα γίνει ορατό στους αναγνώστες."
                : "Ένας επιμελητής θα ελέγξει και θα δημοσιεύσει το άρθρο."
            }
            confirmLabel={canPublish ? "Δημοσίευση" : "Υποβολή"}
            onConfirm={async () => {
              const nextStatus = canPublish ? "published" : "in_review";
              if (await persist(nextStatus)) {
                setPublishOpen(false);
                toast.success(
                  canPublish ? "Το άρθρο δημοσιεύτηκε." : "Το άρθρο στάλθηκε για έλεγχο.",
                );
              }
            }}
          />
        </div>
      </TooltipProvider>
    </MediaLibraryProvider>
  );
}
