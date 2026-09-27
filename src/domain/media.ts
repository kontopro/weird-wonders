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

/**
 * Smaller copies made at upload so phones do not download the full image.
 * Only widths below the original are made; pages pick one with `srcset`.
 */
export const imageVariantWidths = [480, 960, 1440] as const;
export const maxImageVariants = imageVariantWidths.length;

/** A smaller copy of an image (`src` is a URL the browser can load). */
export type ImageVariant = { width: number; src: string };

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
  /** Smaller copies, narrowest first. */
  variants: ImageVariant[];
  /** How many articles use it (cover or content). Used assets cannot be deleted. */
  usageCount: number;
};

/** What the public renderer needs to show an image. */
export type PublicMediaSource = {
  src: string;
  width?: number;
  height?: number;
  /** `srcset` value listing the smaller copies and the original. */
  srcSet?: string;
};

/**
 * `srcset` for an image and its smaller copies, e.g.
 * "a-w480.webp 480w, a-w960.webp 960w, a.webp 1600w". Empty when there is
 * nothing to choose from (no copies, or the original width is unknown).
 */
export function srcSetOf(
  src: string,
  width: number | null | undefined,
  variants: readonly ImageVariant[],
): string {
  if (!src || !width || variants.length === 0) return "";
  return [...variants]
    .filter((variant) => variant.width < width)
    .sort((a, b) => a.width - b.width)
    .map((variant) => `${variant.src} ${variant.width}w`)
    .concat(`${src} ${width}w`)
    .join(", ");
}

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
  /** Smaller copies made by the editor (see `imageVariantWidths`). */
  variants: Array<{ width: number; mimeType: AllowedImageType; bytes: Uint8Array }>;
};

export function isImageVariantWidth(value: number): boolean {
  return (imageVariantWidths as readonly number[]).includes(value);
}

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
