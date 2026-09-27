import { isAllowedImageType, maxImageBytes, maxImageWidth, mediaMessages } from "@/domain/media";

export type PreparedImage = { file: File; width: number; height: number };

/**
 * Runs in the browser before an upload: checks the type, downsizes images
 * wider than `maxImageWidth` and converts them to WebP. Animated GIFs and
 * images that would not get smaller are uploaded as they are.
 */
export async function prepareImage(original: File): Promise<PreparedImage> {
  if (!isAllowedImageType(original.type)) throw new Error(mediaMessages.type);

  const bitmap = await createImageBitmap(original);
  const { width, height } = bitmap;
  const keepOriginal = original.type === "image/gif";
  const scale = Math.min(1, maxImageWidth / width);
  const target = { width: Math.round(width * scale), height: Math.round(height * scale) };

  let file = original;
  if (!keepOriginal) {
    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, target.width, target.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.82),
    );
    if (blob && (blob.size < original.size || scale < 1)) {
      const name = original.name.replace(/\.[^.]+$/, "") || "image";
      file = new File([blob], `${name}.webp`, { type: "image/webp" });
    }
  }
  bitmap.close();

  if (file.size > maxImageBytes) throw new Error(mediaMessages.size);
  const kept = file === original;
  return { file, width: kept ? width : target.width, height: kept ? height : target.height };
}
