import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Brain, Check, Clipboard, Clock, FlaskConical, Globe2, History, Laptop, Leaf, Orbit, Share2, Sparkles, Users } from "lucide-react";
import { useState } from "react";
import { categories, categoryStyles } from "@/lib/articles";
import { articleRepository } from "@/data/articles";
import { ArticleCard } from "@/components/article-card";
import { Button } from "@/components/ui/button";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { siteConfig } from "@/config/site";

export const Route = createFileRoute("/")({
  loader: () => articleRepository.listPublished(),
  head: () => ({ meta: [
    { title: siteConfig.seo.title },
    { name: "description", content: siteConfig.seo.description },
    { property: "og:title", content: siteConfig.seo.socialTitle }, { property: "og:description", content: siteConfig.seo.socialDescription },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Index,
});

function Index() {
  const articles = Route.useLoaderData();
  const { bookmarks, toggle } = useBookmarks();
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const featured = articles[0];
  if (!featured) return null;
  const categoryIcons = [FlaskConical, History, Laptop, Leaf, Orbit, Globe2, Users, Brain];
  const fact = "Οι μέλισσες μπορούν να αναγνωρίσουν ανθρώπινα πρόσωπα συνδυάζοντας τα χαρακτηριστικά τους σαν παζλ.";
  const subscribe = (event: React.FormEvent) => { event.preventDefault(); setMessage(/^\S+@\S+\.\S+$/.test(email) ? "Είσαι μέσα! Το πρώτο fact έρχεται σύντομα." : "Γράψε μια έγκυρη διεύθυνση email."); };
  return (
    <div>
      <section className="hero section-shell">
        <div className="hero-lead">
          <img src={featured.image} alt="Πυκνές κορυφές δέντρων που συναντιούνται" width={1600} height={1008} className="hero-image" />
           <div className="hero-overlay"><span className="category-pill nature">Φύση</span><h1>{featured.title}</h1><p>{featured.excerpt}</p><div className="hero-meta"><span><Clock /> {featured.minutes} λεπτά ανάγνωσης</span><Link to="/arthro/$slug" params={{ slug: featured.slug }} className="link-button">Ανακάλυψέ το <ArrowRight /></Link></div></div>
        </div>
        <div className="trending-stack"><div className="section-kicker"><span>Τώρα διαβάζονται</span><Sparkles /></div>{articles.slice(1, 3).map((article, index) => <Link key={article.slug} to="/arthro/$slug" params={{ slug: article.slug }} className="trending-card"><img src={article.image} alt="" width={1200} height={900} /><div><span>0{index + 1} · {article.category}</span><h2>{article.title}</h2><p>{article.minutes} λεπτά ανάγνωσης</p></div></Link>)}</div>
      </section>

      <section className="fact-band"><div className="section-shell fact-layout"><div><p className="eyebrow">Το <span className="brand-literal">{siteConfig.contentLabels.singular}</span> της ημέρας</p><h2>{revealed ? fact : "Έτοιμος να ανακαλύψεις κάτι απρόσμενο;"}</h2><div className="fact-actions"><Button onClick={() => setRevealed(true)}>{revealed ? "Αποκαλύφθηκε" : "Αποκάλυψέ το"}</Button>{revealed && <><Button variant="outline" onClick={() => { navigator.clipboard.writeText(fact); setCopied(true); }}><Clipboard /> {copied ? "Αντιγράφηκε" : "Αντιγραφή"}</Button><Button variant="ghost" size="icon" onClick={() => navigator.share?.({ title: siteConfig.name, text: fact })} aria-label="Κοινοποίηση"><Share2 /></Button></>}</div></div><div className={`fact-mark ${revealed ? "revealed" : ""}`}>F</div></div></section>

      <section className="section-shell section-block"><header className="section-heading"><div><p className="eyebrow">Ο κόσμος είναι μεγαλύτερος απ’ όσο νομίζεις</p><h2>Διάλεξε την περιέργειά σου</h2></div><Link to="/katigories">Όλες οι κατηγορίες <ArrowRight /></Link></header><div className="category-grid">{categories.map((category, index) => { const Icon = categoryIcons[index] ?? BookOpen; return <Link key={category} to="/anakalyψε" search={{ category }} className={`category-tile ${categoryStyles[category]}`}><Icon /><span>{category}</span><small>Ανακάλυψε</small></Link>; })}</div></section>

      <section className="section-shell section-block"><header className="section-heading"><div><p className="eyebrow">Νέα γνώση, χωρίς θόρυβο</p><h2>Νέα {siteConfig.contentLabels.plural}</h2></div><Link to="/anakalyψε">Δες τα όλα <ArrowRight /></Link></header><div className="article-grid">{articles.slice(0, 6).map((article) => <ArticleCard key={article.slug} article={article} saved={bookmarks.includes(article.slug)} onBookmark={() => toggle(article.slug)} />)}</div></section>

      <section className="popular-band"><div className="section-shell popular-layout"><div><p className="eyebrow">Αυτή την εβδομάδα</p><h2>Οι ιστορίες που άνοιξαν τις περισσότερες συζητήσεις.</h2></div><ol>{articles.slice(0, 5).map((article, index) => <li key={article.slug}><span>0{index + 1}</span><Link to="/arthro/$slug" params={{ slug: article.slug }}>{article.title}</Link><small>{article.category}</small></li>)}</ol></div></section>

      <section className="section-shell newsletter"><div><p className="eyebrow">Μια μικρή έκπληξη κάθε εβδομάδα</p><h2>Ένα συναρπαστικό fact στο inbox σου, χωρίς περιττά μηνύματα.</h2></div><form onSubmit={subscribe} noValidate><label htmlFor="newsletter-email">Email</label><div><input id="newsletter-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="to@email.sou" /><Button type="submit">Εγγραφή <ArrowRight /></Button></div>{message && <p className={message.startsWith("Είσαι") ? "success" : "error"}>{message.startsWith("Είσαι") && <Check />} {message}</p>}</form></section>
    </div>
  );
}
