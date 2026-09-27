import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  isAllowedImageType,
  isImageVariantWidth,
  maxImageBytes,
  mediaMessages,
  mediaUpdateSchema,
  mediaUploadSchema,
  type MediaUpdate,
} from "@/domain/media";
import { DomainError } from "@/domain/errors";
import { requireMember } from "@/server/auth";
import { getRepositories } from "@/server/repositories";

const contextOf = async () => {
  const user = await requireMember();
  return { actorId: user.id, actorRole: user.role };
};

const optionalInt = (value: FormDataEntryValue | null) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
};

export const listMedia = createServerFn({ method: "GET" }).handler(async () => {
  await requireMember();
  return getRepositories().media.list();
});

/**
 * Accepts `multipart/form-data`: `file`, `alt`, `width`, `height` and the
 * smaller copies as `variant:<width>` files (see `imageVariantWidths`).
 */
export const uploadMedia = createServerFn({ method: "POST" })
  .validator((form: FormData) => {
    if (!(form instanceof FormData)) throw new DomainError("Λείπει το αρχείο.", "invalid");
    const file = form.get("file");
    if (!(file instanceof File)) throw new DomainError("Λείπει το αρχείο.", "invalid");
    if (!isAllowedImageType(file.type)) throw new DomainError(mediaMessages.type, "invalid");
    if (file.size > maxImageBytes) throw new DomainError(mediaMessages.size, "invalid");
    const meta = mediaUploadSchema.parse({
      alt: String(form.get("alt") ?? ""),
      width: optionalInt(form.get("width")),
      height: optionalInt(form.get("height")),
    });
    const variants: Array<{ width: number; file: File }> = [];
    for (const [key, entry] of form.entries()) {
      const value: unknown = entry;
      const width = key.startsWith("variant:") ? Number(key.slice("variant:".length)) : NaN;
      if (Number.isNaN(width)) continue;
      if (!isImageVariantWidth(width) || !(value instanceof File)) {
        throw new DomainError(mediaMessages.type, "invalid");
      }
      if (!isAllowedImageType(value.type)) throw new DomainError(mediaMessages.type, "invalid");
      if (value.size > maxImageBytes) throw new DomainError(mediaMessages.size, "invalid");
      if (meta.width !== null && width >= meta.width) continue;
      variants.push({ width, file: value });
    }
    return { file, meta, variants };
  })
  .handler(async ({ data: { file, meta, variants } }) => {
    const context = await contextOf();
    const mimeType = file.type;
    if (!isAllowedImageType(mimeType)) throw new DomainError(mediaMessages.type, "invalid");
    return getRepositories().media.upload(
      {
        ...meta,
        fileName: file.name,
        mimeType,
        bytes: new Uint8Array(await file.arrayBuffer()),
        variants: await Promise.all(
          variants.flatMap(({ width, file: variant }) =>
            isAllowedImageType(variant.type)
              ? [
                  variant.arrayBuffer().then((buffer) => ({
                    width,
                    mimeType: variant.type as typeof mimeType,
                    bytes: new Uint8Array(buffer),
                  })),
                ]
              : [],
          ),
        ),
      },
      context,
    );
  });

export const updateMedia = createServerFn({ method: "POST" })
  .validator((input: MediaUpdate) => mediaUpdateSchema.parse(input))
  .handler(async ({ data }) => getRepositories().media.update(data, await contextOf()));

export const deleteMedia = createServerFn({ method: "POST" })
  .validator((id: string) => z.string().min(1).max(100).parse(id))
  .handler(async ({ data }) => {
    await getRepositories().media.remove(data, await contextOf());
  });
