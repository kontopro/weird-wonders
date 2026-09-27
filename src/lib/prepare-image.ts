import {
  imageVariantWidths,
  isAllowedImageType,
  maxImageBytes,
  maxImageWidth,
  mediaMessages,
} from "@/domain/media";

export type PreparedImage = {
  file: File;
  width: number;
  height: number;
  /** Smaller WebP copies for `srcset` (none for GIFs and narrow images). */
  variants: Array<{ width: number; file: File }>;
};

const toWebp = async (bitmap: ImageBitmap, width: number, height: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
};

/**
 * Runs in the browser before an upload: checks the type, downsizes images
 * wider than `maxImageWidth`, converts them to WebP and makes the smaller
 * copies listed in `imageVariantWidths`. Animated GIFs are uploaded as they are.
 */
export async function prepareImage(original: File): Promise<PreparedImage> {
  if (!isAllowedImageType(original.type)) throw new Error(mediaMessages.type);

  const bitmap = await createImageBitmap(original);
  const { width, height } = bitmap;
  const isGif = original.type === "image/gif";
  const scale = Math.min(1, maxImageWidth / width);
  const target = { width: Math.round(width * scale), height: Math.round(height * scale) };
  const name = original.name.replace(/\.[^.]+$/, "") || "image";

  let file = original;
  const variants: PreparedImage["variants"] = [];
  if (!isGif) {
    const blob = await toWebp(bitmap, target.width, target.height);
    if (blob && (blob.size < original.size || scale < 1)) {
      file = new File([blob], `${name}.webp`, { type: "image/webp" });
    }
    for (const variantWidth of imageVariantWidths) {
      if (variantWidth >= target.width) break;
      const variantHeight = Math.round((target.height * variantWidth) / target.width);
      const variant = await toWebp(bitmap, variantWidth, variantHeight);
      if (variant) {
        variants.push({
          width: variantWidth,
          file: new File([variant], `${name}-w${variantWidth}.webp`, { type: "image/webp" }),
        });
      }
    }
  }
  bitmap.close();

  if (file.size > maxImageBytes) throw new Error(mediaMessages.size);
  const kept = file === original;
  return {
    file,
    width: kept ? width : target.width,
    height: kept ? height : target.height,
    variants,
  };
}
