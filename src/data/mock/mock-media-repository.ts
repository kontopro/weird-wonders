import type { WriteContext } from "@/data/articles/article-repository";
import type { MediaRepository } from "@/data/media/media-repository";
import type { MockStore } from "@/data/mock/mock-store";
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
import { isEditorRole } from "@/domain/permissions";

type MockMedia = MockStore["media"][number];

/** Route that serves uploaded bytes in mock mode (`src/routes/media.demo.$id.ts`). */
export const demoMediaPath = (id: string, width?: number) =>
  `/media/demo/${id}${width ? `-w${width}` : ""}`;

/** In-memory media library for mock mode, with the database's rules. */
export class MockMediaRepository implements MediaRepository {
  constructor(private readonly store: MockStore) {}

  private usageCount(id: string) {
    return this.store.articles.filter(
      (article) => article.coverAssetId === id || collectAssetIds(article.content).has(id),
    ).length;
  }

  private toAsset(row: MockMedia): MediaAsset {
    const { bytes: _bytes, variants, ...rest } = row;
    return {
      ...rest,
      variants: variants.map(({ width, src }) => ({ width, src })),
      usageCount: this.usageCount(row.id),
    };
  }

  private find(id: string) {
    const row = this.store.media.find((item) => item.id === id);
    if (!row) throw new DomainError(mediaMessages.notFound, "not_found");
    return row;
  }

  /** Mirrors RLS: editors manage every asset, others only their own uploads. */
  private assertMayChange(row: MockMedia, context: WriteContext) {
    if (!isEditorRole(context.actorRole) && row.uploadedBy !== context.actorId) {
      throw new DomainError(mediaMessages.forbidden, "forbidden");
    }
  }

  async list() {
    return [...this.store.media]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((row) => this.toAsset(row));
  }

  async upload(file: MediaUpload, context: WriteContext) {
    if (!isAllowedImageType(file.mimeType)) throw new DomainError(mediaMessages.type, "invalid");
    if (file.bytes.byteLength > maxImageBytes) throw new DomainError(mediaMessages.size, "invalid");
    const id = crypto.randomUUID();
    const row: MockMedia = {
      id,
      src: demoMediaPath(id),
      bytes: file.bytes,
      variants: file.variants
        .filter((variant) => file.width === null || variant.width < file.width)
        .map((variant) => ({
          width: variant.width,
          src: demoMediaPath(id, variant.width),
          bytes: variant.bytes,
        }))
        .sort((a, b) => a.width - b.width),
      width: file.width,
      height: file.height,
      mimeType: file.mimeType,
      sizeBytes: file.bytes.byteLength,
      alt: file.alt,
      caption: "",
      uploadedBy: context.actorId,
      createdAt: new Date().toISOString(),
    };
    this.store.media.push(row);
    return this.toAsset(row);
  }

  async update(input: MediaUpdate, context: WriteContext) {
    const row = this.find(input.id);
    this.assertMayChange(row, context);
    row.alt = input.alt;
    row.caption = input.caption;
    return this.toAsset(row);
  }

  async remove(id: string, context: WriteContext) {
    const row = this.find(id);
    this.assertMayChange(row, context);
    if (this.usageCount(id) > 0) throw new DomainError(mediaMessages.inUse, "conflict");
    this.store.media = this.store.media.filter((item) => item.id !== id);
  }

  async resolve(ids: readonly string[]) {
    const sources: Record<string, PublicMediaSource> = {};
    for (const id of ids) {
      const row = this.store.media.find((item) => item.id === id);
      if (!row) continue;
      const srcSet = srcSetOf(row.src, row.width, row.variants);
      sources[id] = {
        src: row.src,
        ...(row.width ? { width: row.width } : {}),
        ...(row.height ? { height: row.height } : {}),
        ...(srcSet ? { srcSet } : {}),
      };
    }
    return sources;
  }

  /** Uploaded bytes for the demo media route; `<id>-w<width>` is a smaller copy. */
  file(id: string) {
    const [, baseId = id, width] = /^(.+)-w(\d+)$/.exec(id) ?? [];
    const row = this.store.media.find((item) => item.id === baseId);
    if (!row) return null;
    if (width) {
      const variant = row.variants.find((item) => item.width === Number(width));
      return variant?.bytes ? { bytes: variant.bytes, mimeType: "image/webp" } : null;
    }
    return row.bytes ? { bytes: row.bytes, mimeType: row.mimeType } : null;
  }
}
