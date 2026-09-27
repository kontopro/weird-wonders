import { z } from "zod";

/**
 * Media library rules shared by the adapters, the editor and the database
 * (Storage buckets accept the same types and size).
 */

/** Images only; SVG is excluded because it can carry scripts. */
export const allowedImageTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
] as const;
export type AllowedImageType = (typeof allowedImageTypes)[number];

export const maxImageBytes = 10 * 1024 * 1024;
/** The editor downsizes larger images to this width before uploading. */
export const maxImageWidth = 2000;

export type MediaAsset = {
  id: string;
  /** URL the browser can load (public Storage URL, or a demo route in mock mode). */
  src: string;
  width: number | null;
  height: number | null;
  mimeType: string;
  sizeBytes: number | null;
  /** Default alt text; blocks and covers may override it per use. */
  alt: string;
  caption: string;
  uploadedBy: string | null;
  createdAt: string;
  /** How many articles use it (cover or content). Used assets cannot be deleted. */
  usageCount: number;
};

/** What the public renderer needs to show an image. */
export type PublicMediaSource = { src: string; width?: number; height?: number };

export const mediaUpdateSchema = z
  .object({
    id: z.string().min(1).max(100),
    alt: z.string().trim().min(1, "Το alt text είναι υποχρεωτικό.").max(500),
    caption: z.string().trim().max(2000),
  })
  .strict();
export type MediaUpdate = z.infer<typeof mediaUpdateSchema>;

/** Metadata sent with an upload; the file itself travels as bytes. */
export const mediaUploadSchema = z
  .object({
    alt: z.string().trim().min(1, "Το alt text είναι υποχρεωτικό.").max(500),
    width: z.number().int().positive().max(20_000).nullable(),
    height: z.number().int().positive().max(20_000).nullable(),
  })
  .strict();
export type MediaUploadMeta = z.infer<typeof mediaUploadSchema>;

export type MediaUpload = MediaUploadMeta & {
  fileName: string;
  mimeType: AllowedImageType;
  bytes: Uint8Array;
};

export function isAllowedImageType(value: string): value is AllowedImageType {
  return (allowedImageTypes as readonly string[]).includes(value);
}

export const mediaMessages = {
  type: "Επιτρέπονται μόνο εικόνες JPG, PNG, WebP, AVIF ή GIF.",
  size: "Η εικόνα ξεπερνά τα 10 MB.",
  inUse: "Η εικόνα χρησιμοποιείται σε άρθρα και δεν μπορεί να διαγραφεί.",
  forbidden: "Δεν μπορείς να αλλάξεις αυτή την εικόνα.",
  notFound: "Η εικόνα δεν βρέθηκε.",
} as const;

/** Finds every `assetId` referenced inside an article's content blocks. */
export function collectAssetIds(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectAssetIds(item, found);
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (key === "assetId" && typeof item === "string") found.add(item);
      else collectAssetIds(item, found);
    }
  }
  return found;
}
