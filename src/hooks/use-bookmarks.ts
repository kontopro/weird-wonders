import { useEffect, useState } from "react";
import { parseBookmarks } from "@/lib/bookmarks";

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  useEffect(() => {
    setBookmarks(parseBookmarks(localStorage.getItem("bookmarks")));
  }, []);
  const toggle = (slug: string) =>
    setBookmarks((current) => {
      const next = current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug];
      localStorage.setItem("bookmarks", JSON.stringify(next));
      return next;
    });
  return { bookmarks, toggle };
}
