import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ImagePlus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/admin-ui";
import { MediaLibraryProvider, MediaPicker } from "@/components/admin/media-library";
import { Button } from "@/components/ui/button";
import { brandedTitle } from "@/config/site";
import { mediaApi } from "@/data/media";
import type { MediaAsset } from "@/domain/media";
import { isEditorRole } from "@/domain/permissions";
import { errorMessage } from "@/lib/error-message";

export const Route = createFileRoute("/admin/media")({
  loader: () => mediaApi.list(),
  component: MediaAdmin,
  head: () => ({ meta: [{ title: brandedTitle("Εικόνες") }] }),
});

const formatSize = (bytes: number | null) =>
  bytes === null
    ? ""
    : bytes < 1024 * 1024
      ? `${Math.round(bytes / 1024)} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

function MediaAdmin() {
  const assets = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState<MediaAsset>();
  const mayChange = (asset: MediaAsset) => isEditorRole(user.role) || asset.uploadedBy === user.id;

  const save = async (asset: MediaAsset, alt: string, caption: string) => {
    if (alt === asset.alt && caption === asset.caption) return;
    try {
      await mediaApi.update({ id: asset.id, alt, caption });
      toast.success("Αποθηκεύτηκε.");
      await router.invalidate();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <MediaLibraryProvider>
      <div className="admin-page">
        <header className="admin-page-header">
          <div>
            <p className="admin-overline">Βιβλιοθήκη</p>
            <h1>Εικόνες</h1>
            <p>
              {assets.length} εικόνες. Το alt text περιγράφει την εικόνα σε όσους δεν τη βλέπουν και
              στις μηχανές αναζήτησης.
            </p>
          </div>
          <Button onClick={() => setUploading(true)}>
            <ImagePlus /> Ανέβασμα εικόνας
          </Button>
        </header>

        <section className="media-admin-grid">
          {assets.map((asset) => (
            <article key={asset.id} className="admin-panel">
              <img src={asset.src} alt={asset.alt} loading="lazy" />
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  void save(
                    asset,
                    String(form.get("alt") ?? "").trim(),
                    String(form.get("caption") ?? "").trim(),
                  );
                }}
              >
                <label>
                  <span>Alt text</span>
                  <input
                    name="alt"
                    defaultValue={asset.alt}
                    required
                    maxLength={500}
                    disabled={!mayChange(asset)}
                  />
                </label>
                <label>
                  <span>Λεζάντα</span>
                  <input
                    name="caption"
                    defaultValue={asset.caption}
                    maxLength={2000}
                    disabled={!mayChange(asset)}
                  />
                </label>
                <small>
                  {[
                    asset.width && asset.height ? `${asset.width}×${asset.height}` : "",
                    formatSize(asset.sizeBytes),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  {" · "}
                  {asset.usageCount === 0
                    ? "δεν χρησιμοποιείται"
                    : asset.usageCount === 1
                      ? "σε 1 άρθρο"
                      : `σε ${asset.usageCount} άρθρα`}
                </small>
                {mayChange(asset) && (
                  <div className="form-actions">
                    <Button type="submit" variant="outline" size="sm">
                      Αποθήκευση
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={asset.usageCount > 0}
                      title={asset.usageCount > 0 ? "Χρησιμοποιείται σε άρθρα" : undefined}
                      onClick={() => setRemoving(asset)}
                      aria-label={`Διαγραφή: ${asset.alt}`}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                )}
              </form>
            </article>
          ))}
        </section>

        <MediaPicker
          open={uploading}
          onOpenChange={setUploading}
          onSelect={() => void router.invalidate()}
        />
        <ConfirmDialog
          open={!!removing}
          onOpenChange={(open) => !open && setRemoving(undefined)}
          title="Διαγραφή εικόνας;"
          description="Το αρχείο διαγράφεται οριστικά από τη βιβλιοθήκη."
          confirmLabel="Διαγραφή"
          onConfirm={() => {
            const target = removing;
            setRemoving(undefined);
            if (!target) return;
            mediaApi
              .remove(target.id)
              .then(() => {
                toast.success("Η εικόνα διαγράφηκε.");
                return router.invalidate();
              })
              .catch((error: unknown) => toast.error(errorMessage(error)));
          }}
        />
      </div>
    </MediaLibraryProvider>
  );
}
