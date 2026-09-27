import type { MediaUpdate } from "@/domain/media";
import { deleteMedia, listMedia, updateMedia, uploadMedia } from "@/functions/media";

/** Isomorphic entry point; every call runs on the server. */
export const mediaApi = {
  list: () => listMedia(),
  /** `form` carries `file`, `alt`, `width` and `height`. */
  upload: (form: FormData) => uploadMedia({ data: form }),
  update: (input: MediaUpdate) => updateMedia({ data: input }),
  remove: (id: string) => deleteMedia({ data: id }),
};
