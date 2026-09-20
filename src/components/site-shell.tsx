import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, Moon, Search, Shuffle, Sun, X, ArrowUp } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { articles } from "@/lib/articles";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { siteConfig } from "@/config/site";

export function SiteShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const [dark, setDark] = useState(false);
  const [cookies, setCookies] = useState(true);
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") === "dark";
    setDark(savedTheme); document.documentElement.classList.toggle("dark", savedTheme);
    setCookies(localStorage.getItem("cookie-consent") !== "accepted");
    const onScroll = () => setShowTop(window.scrollY > 700);
    window.addEventListener("scroll", onScroll); return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const toggleTheme = () => { const next = !dark; setDark(next); localStorage.setItem("theme", next ? "dark" : "light"); document.documentElement.classList.toggle("dark", next); };
  const random = () => { const article = articles[Math.floor(Math.random() * articles.length)]; if (article) navigate({ to: "/arthro/$slug", params: { slug: article.slug } }); };
  const nav = [
    ["Αρχική", "/"], ["Ανακάλυψε", "/anakalyψε"], ["Κατηγορίες", "/katigories"], ["Δημοφιλή", "/dimofili"], ["Σχετικά", "/sxetika"],
  ] as const;
  return <div className="site-frame">
    <header className="site-header">
      <div className="header-inner">
        <BrandLogo showTagline />
        <nav className="desktop-nav" aria-label="Κύρια πλοήγηση">{nav.map(([label, to]) => <Link key={to} to={to} activeProps={{ className: "active" }}>{label}</Link>)}</nav>
        <div className="header-actions">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/anakalyψε" })} aria-label="Αναζήτηση"><Search /></Button>
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={dark ? "Φωτεινό θέμα" : "Σκούρο θέμα"}>{dark ? <Sun /> : <Moon />}</Button>
          <Button className="random-button" onClick={random}><Shuffle /> Τυχαίο {siteConfig.contentLabels.singular}</Button>
          <Button variant="ghost" size="icon" className="menu-button" onClick={() => setMenu(!menu)} aria-label="Μενού">{menu ? <X /> : <Menu />}</Button>
        </div>
      </div>
      {menu && <nav className="mobile-nav" aria-label="Μενού κινητού">{nav.map(([label, to]) => <Link key={to} to={to} onClick={() => setMenu(false)}>{label}</Link>)}<Button onClick={random}><Shuffle /> Τυχαίο {siteConfig.contentLabels.singular}</Button></nav>}
    </header>
    <main>{children}</main>
    <footer className="site-footer"><div><BrandLogo /><p>Κάθε μέρα κρύβει κάτι που δεν γνώριζες.</p></div><div className="footer-links"><Link to="/sxetika">Σχετικά</Link><Link to="/anakalyψε">Ανακάλυψε</Link><span>© 2026</span></div></footer>
    {cookies && <aside className="cookie-banner"><p><strong>Μικρά cookies, μεγάλη περιέργεια.</strong><br />Χρησιμοποιούμε μόνο απαραίτητα cookies για τη σωστή εμπειρία.</p><Button onClick={() => { localStorage.setItem("cookie-consent", "accepted"); setCookies(false); }}>Εντάξει</Button></aside>}
    {showTop && <Button size="icon" className="back-top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Επιστροφή στην κορυφή"><ArrowUp /></Button>}
  </div>;
}
