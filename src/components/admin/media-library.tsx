import { ImagePlus, Trash2, UploadCloud } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mediaApi } from "@/data/media";
import {
  MediaLibraryContext,
  useMediaLibrary,
  type MediaLibraryContextValue,
} from "@/components/admin/media-library-context";
import { allowedImageTypes, type MediaAsset } from "@/domain/media";
import { errorMessage } from "@/lib/error-message";
import { prepareImage } from "@/lib/prepare-image";

/** Loads the media library once for an editor screen and shares it with every picker. */
export function MediaLibraryProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setAssets(await mediaApi.list());
    } catch (error) {
      toast.error(errorMessage(error, "Η βιβλιοθήκη εικόνων δεν φόρτωσε."));
    } finally {
      setLoading(false);
    }
  }, []);

  // First load; state changes only after the request answers.
  useEffect(() => {
    let active = true;
    mediaApi
      .list()
      .then((list) => active && setAssets(list))
      .catch((error: unknown) =>
        toast.error(errorMessage(error, "Η βιβλιοθήκη εικόνων δεν φόρτωσε.")),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<MediaLibraryContextValue>(
    () => ({
      assets,
      loading,
      find: (id) => (id ? assets.find((asset) => asset.id === id) : undefined),
      add: (asset) => setAssets((current) => [asset, ...current]),
      refresh,
    }),
    [assets, loading, refresh],
  );
  return <MediaLibraryContext.Provider value={value}>{children}</MediaLibraryContext.Provider>;
}

function UploadPanel({ onUploaded }: { onUploaded: (asset: MediaAsset) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const choose = (next: File | undefined) => {
    if (!next) return;
    setFile(next);
    setPreview(URL.createObjectURL(next));
    if (!alt) setAlt(next.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "));
  };

  const upload = async () => {
    if (!file) return;
    if (!alt.trim()) {
      toast.error("Γράψε alt text: τι δείχνει η εικόνα;");
      return;
    }
    setBusy(true);
    try {
      const prepared = await prepareImage(file);
      const form = new FormData();
      form.set("file", prepared.file);
      form.set("alt", alt.trim());
      form.set("width", String(prepared.width));
      form.set("height", String(prepared.height));
      for (const variant of prepared.variants) {
        form.set(`variant:${variant.width}`, variant.file);
      }
      onUploaded(await mediaApi.upload(form));
      toast.success("Η εικόνα ανέβηκε.");
    } catch (error) {
      toast.error(errorMessage(error, "Το ανέβασμα απέτυχε."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="media-upload">
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={allowedImageTypes.join(",")}
        onChange={(event) => choose(event.target.files?.[0])}
      />
      {preview ? (
        <img src={preview} alt="" className="media-upload-preview" />
      ) : (
        <button
          type="button"
          className="drop-zone"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            choose(event.dataTransfer.files[0]);
          }}
        >
          <UploadCloud />
          <strong>Σύρε μια εικόνα εδώ</strong>
          <span>ή επίλεξε αρχείο από τη συσκευή</span>
          <small>JPG, PNG, WebP, AVIF ή GIF · έως 10 MB · μετατρέπεται αυτόματα σε WebP</small>
        </button>
      )}
      <label>
        <span>Alt text (τι δείχνει η εικόνα)</span>
        <input value={alt} maxLength={500} onChange={(event) => setAlt(event.target.value)} />
      </label>
      <div className="form-actions">
        {preview && (
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
            Άλλο αρχείο
          </Button>
        )}
        <Button type="button" disabled={!file || busy} onClick={() => void upload()}>
          {busy ? "Ανέβασμα…" : "Ανέβασμα και επιλογή"}
        </Button>
      </div>
    </div>
  );
}

/** Dialog to choose an image from the library or upload a new one. */
export function MediaPicker({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (asset: MediaAsset) => void;
}) {
  const { assets, loading, add } = useMediaLibrary();
  const [tab, setTab] = useState(assets.length ? "library" : "upload");
  const select = (asset: MediaAsset) => {
    onSelect(asset);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="media-picker">
        <DialogHeader>
          <DialogTitle>Επιλογή εικόνας</DialogTitle>
          <DialogDescription>Διάλεξε από τη βιβλιοθήκη ή ανέβασε νέα εικόνα.</DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="library">Βιβλιοθήκη ({assets.length})</TabsTrigger>
            <TabsTrigger value="upload">Ανέβασμα</TabsTrigger>
          </TabsList>
          <TabsContent value="library">
            {loading ? (
              <p className="admin-empty-note">Φόρτωση…</p>
            ) : assets.length === 0 ? (
              <p className="admin-empty-note">
                Η βιβλιοθήκη είναι άδεια. Ανέβασε την πρώτη εικόνα.
              </p>
            ) : (
              <div className="media-grid">
                {assets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    className="media-tile"
                    onClick={() => select(asset)}
                    title={asset.alt}
                  >
                    <img src={asset.src} alt={asset.alt} loading="lazy" />
                    <span>{asset.alt}</span>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="upload">
            <UploadPanel
              onUploaded={(asset) => {
                add(asset);
                select(asset);
              }}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/** A chosen image with change/remove actions, or a button that opens the picker. */
export function ImageField({
  assetId,
  onSelect,
  onRemove,
  label = "Επιλογή εικόνας",
}: {
  assetId: string | null | undefined;
  onSelect: (asset: MediaAsset) => void;
  onRemove?: () => void;
  label?: string;
}) {
  const { find } = useMediaLibrary();
  const [open, setOpen] = useState(false);
  const asset = find(assetId);

  return (
    <div className="image-field">
      {asset ? (
        <div className="image-preview">
          <img src={asset.src} alt={asset.alt} />
          <div className="image-field-actions">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
              Αλλαγή
            </Button>
            {onRemove && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onRemove}
                aria-label="Αφαίρεση εικόνας"
              >
                <Trash2 />
              </Button>
            )}
          </div>
        </div>
      ) : (
        <button type="button" className="drop-zone compact" onClick={() => setOpen(true)}>
          <ImagePlus />
          <strong>{assetId ? "Η εικόνα δεν βρέθηκε — διάλεξε άλλη" : label}</strong>
        </button>
      )}
      <MediaPicker open={open} onOpenChange={setOpen} onSelect={onSelect} />
    </div>
  );
}
