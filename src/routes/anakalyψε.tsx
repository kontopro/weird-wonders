import { createFileRoute } from "@tanstack/react-router";
import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { z } from "zod";
import { articles, categories } from "@/lib/articles";
import { ArticleCard } from "@/components/article-card";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { brandedTitle } from "@/config/site";

export const Route = createFileRoute("/anakalyψε")({ validateSearch: z.object({ category: z.string().optional() }), head: () => ({ meta: [{ title: brandedTitle("Ανακάλυψε") }, { name: "description", content: "Αναζήτησε ιστορίες και facts ανά θέμα και χρόνο ανάγνωσης." }, { property: "og:title", content: brandedTitle("Ανακάλυψε") }, { property: "og:description", content: "Βρες την επόμενη ιστορία που θα σε εκπλήξει." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: Discover });
function Discover() {
  const initial = Route.useSearch(); const [query, setQuery] = useState(""); const [category, setCategory] = useState(initial.category ?? "Όλες"); const [duration, setDuration] = useState("Όλοι"); const [sort, setSort] = useState("recent"); const { bookmarks, toggle } = useBookmarks();
  const results = useMemo(() => articles.filter((a) => (`${a.title} ${a.excerpt}`).toLowerCase().includes(query.toLowerCase()) && (category === "Όλες" || a.category === category) && (duration === "Όλοι" || (duration === "Σύντομα" ? a.minutes <= 5 : a.minutes > 5))).sort((a,b) => sort === "popular" ? b.popularity-a.popularity : articles.indexOf(a)-articles.indexOf(b)), [query, category, duration, sort]);
  return <div className="section-shell page-top"><p className="eyebrow">Περιηγήσου στο άγνωστο</p><h1 className="page-title">Ανακάλυψε</h1><div className="filters"><label className="search-box"><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Τι θέλεις να ανακαλύψεις;" /></label><label><span>Κατηγορία</span><select value={category} onChange={(e) => setCategory(e.target.value)}><option>Όλες</option>{categories.map(c => <option key={c}>{c}</option>)}</select></label><label><span>Χρόνος</span><select value={duration} onChange={(e) => setDuration(e.target.value)}><option>Όλοι</option><option>Σύντομα</option><option>Εκτενή</option></select></label><label><span>Ταξινόμηση</span><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="recent">Πιο πρόσφατα</option><option value="popular">Πιο δημοφιλή</option></select></label></div><div className="results-label"><SlidersHorizontal /> {results.length} αποτελέσματα</div>{results.length ? <div className="article-grid">{results.map(a => <ArticleCard key={a.slug} article={a} saved={bookmarks.includes(a.slug)} onBookmark={() => toggle(a.slug)} />)}</div> : <div className="empty-state"><span>?</span><h2>Καμία ανακάλυψη εδώ — ακόμα.</h2><p>Δοκίμασε μια άλλη λέξη ή άνοιξε τα φίλτρα.</p></div>}</div>;
}
