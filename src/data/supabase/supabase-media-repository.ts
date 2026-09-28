import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { WriteContext } from "@/data/articles/article-repository";
import type { MediaRepository } from "@/data/media/media-repository";
import { toDomainError } from "@/data/supabase/supabase-errors";
import { DomainError } from "@/domain/errors";
import {
  collectAssetIds,
  isAllowedImageType,
  maxImageBytes,
  mediaMessages,
  type MediaAsset,
  type MediaUpdate,
  type MediaUpload,
  type PublicMediaSource,
  srcSetOf,
} from "@/domain/media";

const BUCKET = "blog-public";
const COLUMNS =
  "id, storage_bucket, storage_path, visibility, mime_type, file_size_bytes, width, height, variants, alt_text, caption, uploaded_by, created_at";

/** Smaller copies, stored next to the original (`<name>-w<width>.webp`). */
const variantsSchema = z.array(z.object({ width: z.number(), path: z.string() })).catch([]);

const mediaRowSchema = z.object({
  id: z.string(),
  storage_bucket: z.string(),
  storage_path: z.string(),
  visibility: z.enum(["private", "public"]),
  mime_type: z.string(),
  file_size_bytes: z.number().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  variants: variantsSchema,
  alt_text: z.string().nullable(),
  caption: z.string().nullable(),
  uploaded_by: z.string().nullable(),
  created_at: z.string(),
});
type MediaRow = z.infer<typeof mediaRowSchema>;

const extensionOf: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

/**
 * Media library on Supabase: files in the `blog-public` Storage bucket (under
 * `media/<uploader>/`), metadata in `public.media_assets`. Uploaded images are
 * reachable by URL once uploaded, like in most CMSs; RLS decides who may
 * upload, edit and delete.
 */
export class SupabaseMediaRepository implements MediaRepository {
  constructor(private readonly client: SupabaseClient) {}

  private publicUrl(row: Pick<MediaRow, "visibility" | "storage_bucket" | "storage_path">) {
    if (row.visibility !== "public") return "";
    return this.client.storage.from(row.storage_bucket).getPublicUrl(row.storage_path).data
      .publicUrl;
  }

  private variantsOf(row: Pick<MediaRow, "visibility" | "storage_bucket" | "variants">) {
    return row.variants
      .map((variant) => ({
        width: variant.width,
        src: this.publicUrl({ ...row, storage_path: variant.path }),
      }))
      .filter((variant) => variant.src)
      .sort((a, b) => a.width - b.width);
  }

  /** Counts how many articles use each asset (as cover or inside the content). */
  private async usage(): Promise<Map<string, number>> {
    const { data, error } = await this.client
      .from("articles")
      .select("cover_image_id, content_blocks");
    if (error) throw toDomainError(error, "");
    const counts = new Map<string, number>();
    for (const article of data ?? []) {
      const ids = collectAssetIds(article.content_blocks);
      if (typeof article.cover_image_id === "string") ids.add(article.cover_image_id);
      for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }

  private toAsset(row: MediaRow, usage: Map<string, number>): MediaAsset {
    return {
      id: row.id,
      src: this.publicUrl(row),
      width: row.width,
      height: row.height,
      variants: this.variantsOf(row),
      mimeType: row.mime_type,
      sizeBytes: row.file_size_bytes,
      alt: row.alt_text ?? "",
      caption: row.caption ?? "",
      uploadedBy: row.uploaded_by,
      createdAt: row.created_at,
      usageCount: usage.get(row.id) ?? 0,
    };
  }

  private async row(id: string) {
    const { data, error } = await this.client
      .from("media_assets")
      .select(COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) throw toDomainError(error, "");
    if (!data) throw new DomainError(mediaMessages.notFound, "not_found");
    return mediaRowSchema.parse(data);
  }

  async list() {
    const [{ data, error }, usage] = await Promise.all([
      this.client.from("media_assets").select(COLUMNS).order("created_at", { ascending: false }),
      this.usage(),
    ]);
    if (error) throw toDomainError(error, "");
    return z
      .array(mediaRowSchema)
      .parse(data ?? [])
      .map((row) => this.toAsset(row, usage));
  }

  async upload(file: MediaUpload, context: WriteContext) {
    if (!isAllowedImageType(file.mimeType)) throw new DomainError(mediaMessages.type, "invalid");
    if (file.bytes.byteLength > maxImageBytes) throw new DomainError(mediaMessages.size, "invalid");

    const base = `media/${context.actorId}/${crypto.randomUUID()}`;
    const path = `${base}.${extensionOf[file.mimeType]}`;
    const variants = file.variants
      .filter((variant) => file.width === null || variant.width < file.width)
      .map((variant) => ({
        ...variant,
        path: `${base}-w${variant.width}.${extensionOf[variant.mimeType]}`,
      }));
    const uploaded: string[] = [];
    // Do not leave orphaned files behind when anything fails.
    const cleanUp = () =>
      uploaded.length ? this.client.storage.from(BUCKET).remove(uploaded) : undefined;
    for (const item of [
      { path, bytes: file.bytes, mimeType: file.mimeType },
      ...variants.map((variant) => ({
        path: variant.path,
        bytes: variant.bytes,
        mimeType: variant.mimeType,
      })),
    ]) {
      const { error: uploadError } = await this.client.storage
        .from(BUCKET)
        .upload(item.path, item.bytes, { contentType: item.mimeType, upsert: false });
      if (uploadError) {
        await cleanUp();
        console.error("[media] Storage upload failed:", uploadError);
        throw new DomainError("Το ανέβασμα απέτυχε. Δοκίμασε ξανά.", "invalid");
      }
      uploaded.push(item.path);
    }

    const { data, error } = await this.client
      .from("media_assets")
      .insert({
        uploaded_by: context.actorId,
        storage_bucket: BUCKET,
        storage_path: path,
        visibility: "public",
        mime_type: file.mimeType,
        file_size_bytes: file.bytes.byteLength,
        width: file.width,
        height: file.height,
        variants: variants.map((variant) => ({ width: variant.width, path: variant.path })),
        alt_text: file.alt,
      })
      .select(COLUMNS)
      .single();
    if (error) {
      await cleanUp();
      throw toDomainError(error, "");
    }
    return this.toAsset(mediaRowSchema.parse(data), new Map());
  }

  async update(input: MediaUpdate) {
    const { data, error } = await this.client
      .from("media_assets")
      .update({ alt_text: input.alt, caption: input.caption || null })
      .eq("id", input.id)
      .select(COLUMNS)
      .maybeSingle();
    if (error) throw toDomainError(error, "");
    // RLS hides rows the member may not change: no row means no permission.
    if (!data) throw new DomainError(mediaMessages.forbidden, "forbidden");
    return this.toAsset(mediaRowSchema.parse(data), await this.usage());
  }

  async remove(id: string) {
    const row = await this.row(id);
    if (((await this.usage()).get(id) ?? 0) > 0) {
      throw new DomainError(mediaMessages.inUse, "conflict");
    }
    const { data, error } = await this.client
      .from("media_assets")
      .delete()
      .eq("id", id)
      .select("id");
    if (error) throw toDomainError(error, "");
    if (!data?.length) throw new DomainError(mediaMessages.forbidden, "forbidden");
    await this.client.storage
      .from(row.storage_bucket)
      .remove([row.storage_path, ...row.variants.map((variant) => variant.path)]);
  }

  async resolve(ids: readonly string[]) {
    const sources: Record<string, PublicMediaSource> = {};
    if (ids.length === 0) return sources;
    const { data, error } = await this.client
      .from("media_assets")
      .select("id, storage_bucket, storage_path, visibility, width, height, variants")
      .in("id", [...ids]);
    if (error) throw toDomainError(error, "");
    for (const raw of data ?? []) {
      const row = { ...(raw as MediaRow), variants: variantsSchema.parse(raw.variants) };
      const src = this.publicUrl(row);
      if (!src) continue;
      const srcSet = srcSetOf(src, row.width, this.variantsOf(row));
      sources[String(row.id)] = {
        src,
        ...(typeof row.width === "number" ? { width: row.width } : {}),
        ...(typeof row.height === "number" ? { height: row.height } : {}),
        ...(srcSet ? { srcSet } : {}),
      };
    }
    return sources;
  }
}
