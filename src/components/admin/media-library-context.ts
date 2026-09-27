import { createContext, useContext } from "react";
import type { MediaAsset } from "@/domain/media";

export type MediaLibraryContextValue = {
  assets: MediaAsset[];
  loading: boolean;
  find: (id: string | null | undefined) => MediaAsset | undefined;
  add: (asset: MediaAsset) => void;
  refresh: () => Promise<void>;
};

export const MediaLibraryContext = createContext<MediaLibraryContextValue | null>(null);

export function useMediaLibrary() {
  const value = useContext(MediaLibraryContext);
  if (!value) throw new Error("useMediaLibrary needs a MediaLibraryProvider.");
  return value;
}
