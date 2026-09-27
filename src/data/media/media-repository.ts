import type { WriteContext } from "@/data/articles/article-repository";
import type { MediaAsset, MediaUpdate, MediaUpload, PublicMediaSource } from "@/domain/media";

export interface MediaRepository {
  /** The library, newest first (members only). */
  list(): Promise<MediaAsset[]>;
  upload(file: MediaUpload, context: WriteContext): Promise<MediaAsset>;
  update(input: MediaUpdate, context: WriteContext): Promise<MediaAsset>;
  /** Refuses assets that are still used by an article. */
  remove(id: string, context: WriteContext): Promise<void>;
  /** Public sources for the given ids (unknown ids are left out). */
  resolve(ids: readonly string[]): Promise<Record<string, PublicMediaSource>>;
}
