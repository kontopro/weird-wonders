import { useEffect, useState } from "react";

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  useEffect(() => { setBookmarks(JSON.parse(localStorage.getItem("bookmarks") ?? "[]") as string[]); }, []);
  const toggle = (slug: string) => setBookmarks((current) => {
    const next = current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug];
    localStorage.setItem("bookmarks", JSON.stringify(next));
    return next;
  });
  return { bookmarks, toggle };
}