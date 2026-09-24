import {
  Calendar,
  ChevronDown,
  Eye,
  Image,
  Save,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/admin/admin-ui";
import { BlockEditor } from "@/components/admin/block-editor";
import { categories } from "@/lib/articles";
import { articleStatuses, type ArticleStatus } from "@/lib/admin-data";
import { siteConfig } from "@/config/site";
import {
  createEmptyArticleContent,
  safeParseArticleContent,
  type ArticleContentDocument,
} from "@/lib/article-content";
import { articleRepository, type EditableArticle } from "@/data/articles";

const slugify = (value: string) =>
  value
    .toLocaleLowerCase("el")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ς/g, "σ")
    .replace(/[^a-zα-ω0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function ImageUploadPlaceholder({
  image,
  alt,
  onImage,
  onAlt,
  onRemove,
}: {
  image: string | undefined;
  alt: string;
  onImage: (url: string) => void;
  onAlt: (value: string) => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const pick = (file?: File) => {
    if (file?.type.startsWith("image/")) onImage(URL.createObjectURL(file));
  };
  return (
    <div className="image-upload">
      <input
        ref={fileRef}
        className="sr-only"
        type="file"
        accept="image/*"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {image ? (
        <>
          <div className="image-preview">
            <img src={image} alt={alt || "Προεπισκόπηση κεντρικής εικόνας"} />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onRemove}
              aria-label="Αφαίρεση εικόνας"
            >
              <Trash2 />
            </Button>
          </div>
          <label>
            <span>Alt text</span>
            <input
              value={alt}
              onChange={(e) => onAlt(e.target.value)}
              placeholder="Περιέγραψε την εικόνα"
            />
          </label>
        </>
      ) : (
        <button
          type="button"
          className="drop-zone"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pick(e.dataTransfer.files[0]);
          }}
        >
          <UploadCloud />
          <strong>Σύρε μια εικόνα εδώ</strong>
          <span>ή επίλεξε αρχείο από τη συσκευή</span>
          <small>JPG, PNG ή WebP · μόνο προσωρινή προεπισκόπηση</small>
        </button>
      )}
    </div>
  );
}

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
}: {
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
            {articleStatuses.map((articleStatus) => (
              <option key={articleStatus}>{articleStatus}</option>
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
            Δημοσίευση
          </Button>
        </div>
      </div>
    </section>
  );
}

export function ArticleEditor({ article }: { article?: EditableArticle }) {
  const [savedId, setSavedId] = useState(article?.id);
  const [title, setTitle] = useState(article?.title ?? "");
  const [description, setDescription] = useState(article?.excerpt ?? "");
  const [contentDocument, setContentDocument] = useState<ArticleContentDocument>(
    article?.content ?? createEmptyArticleContent(),
  );
  const [image, setImage] = useState<string | undefined>(article?.image);
  const [alt, setAlt] = useState(article?.imageAlt ?? "");
  const [status, setStatus] = useState<ArticleStatus>(article?.status ?? "Πρόχειρο");
  const [date, setDate] = useState(article?.dateValue ?? new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState(article?.category ?? "Επιστήμη");
  const [tags, setTags] = useState(article?.tags.join(", ") ?? "");
  const [featured, setFeatured] = useState(article?.isFeatured ?? false);
  const [popular, setPopular] = useState(article?.isTrending ?? false);
  const [daily, setDaily] = useState(article?.isFactOfDay ?? false);
  const [seoTitle, setSeoTitle] = useState(article?.seoTitle ?? article?.title ?? "");
  const [seoDescription, setSeoDescription] = useState(
    article?.seoDescription ?? article?.excerpt ?? "",
  );
  const [publishOpen, setPublishOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const slug = useMemo(() => slugify(title) || "titlos-arthrou", [title]);
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
    try {
      const saved = await articleRepository.save({
        ...(savedId ? { id: savedId } : {}),
        ...(article?.authorId ? { authorId: article.authorId } : {}),
        slug,
        title,
        excerpt: description,
        category,
        status: nextStatus,
        dateValue: date,
        ...(image ? { image } : {}),
        imageAlt: alt,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        content: contentDocument,
        seoTitle,
        seoDescription,
        isFeatured: featured,
        isTrending: popular,
        isFactOfDay: daily,
      });
      setSavedId(saved.id);
      setStatus(nextStatus);
      setDirty(false);
      return true;
    } catch (error) {
      console.error(error);
      toast.error("Η αποθήκευση απέτυχε. Δοκίμασε ξανά.");
      return false;
    }
  };
  const save = async () => {
    if (await persist("Πρόχειρο"))
      toast.success("Το άρθρο αποθηκεύτηκε μέσω του article repository.");
  };
  return (
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
                    setSeoTitle(e.target.value);
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
                    setSeoDescription(e.target.value);
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
              status={status}
              date={date}
              onStatus={(value) => {
                setStatus(value);
                if (value !== "Δημοσιευμένο") setDaily(false);
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
                <ImageUploadPlaceholder
                  image={image}
                  alt={alt}
                  onImage={(url) => {
                    setImage(url);
                    setDirty(true);
                  }}
                  onAlt={(value) => {
                    setAlt(value);
                    setDirty(true);
                  }}
                  onRemove={() => {
                    setImage(undefined);
                    setDirty(true);
                  }}
                />
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
                      setCategory(e.target.value as typeof category);
                      setDirty(true);
                    }}
                  >
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Tags</span>
                  <input
                    value={tags}
                    onChange={(e) => {
                      setTags(e.target.value);
                      setDirty(true);
                    }}
                    placeholder="π.χ. φύση, δάσος"
                  />
                </label>
                <label>
                  <span>Συντάκτης</span>
                  <input value={article?.author ?? "Τρέχων χρήστης"} readOnly />
                </label>
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
                    <span>{siteConfig.contentLabels.singular} της ημέρας</span>
                    <Switch
                      checked={daily}
                      disabled={status !== "Δημοσιευμένο"}
                      onCheckedChange={(value) => {
                        setDaily(value);
                        setDirty(true);
                      }}
                    />
                  </label>
                </div>
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
          title="Έτοιμο για δημοσίευση;"
          description="Το block content είναι έγκυρο και θα αποθηκευτεί μέσω του ενεργού article repository."
          confirmLabel="Δημοσίευση"
          onConfirm={async () => {
            if (await persist("Δημοσιευμένο")) {
              setPublishOpen(false);
              toast.success("Το άρθρο δημοσιεύτηκε στο prototype.");
            }
          }}
        />
      </div>
    </TooltipProvider>
  );
}
