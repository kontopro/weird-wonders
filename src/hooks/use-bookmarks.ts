import { useCallback, useSyncExternalStore } from "react";
import { parseBookmarks } from "@/lib/bookmarks";

const storageKey = "bookmarks";
const changeEvent = "bookmarks-change";

function readRaw(): string | null {
  try {
    return localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  // Other tabs fire "storage"; this tab fires our own event.
  window.addEventListener("storage", onChange);
  window.addEventListener(changeEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(changeEvent, onChange);
  };
}

/** Saved articles, kept in this browser only (none on the server render). */
export function useBookmarks() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  const bookmarks = parseBookmarks(raw);
  const toggle = useCallback((slug: string) => {
    const current = parseBookmarks(readRaw());
    const next = current.includes(slug)
      ? current.filter((item) => item !== slug)
      : [...current, slug];
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Storage unavailable: nothing to remember.
    }
    window.dispatchEvent(new Event(changeEvent));
  }, []);
  return { bookmarks, toggle };
}
