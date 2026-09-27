import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Menu, Moon, Search, Shuffle, Sun, X, ArrowUp } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { articleApi } from "@/data/articles";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { siteConfig } from "@/config/site";
import { localizedPath, messagesFor, useT } from "@/i18n";
import { useLocalized } from "@/i18n/links";

const navRoutes = [
  ["home", "/{-$lang}"],
  ["discover", "/{-$lang}/anakalypse"],
  ["categories", "/{-$lang}/katigories"],
  ["popular", "/{-$lang}/dimofili"],
  ["about", "/{-$lang}/sxetika"],
] as const;

/** Links to the home page in the other languages (article pages add their own switch). */
function LanguageLinks() {
  const t = useT();
  const { lang } = useLocalized();
  const others = siteConfig.languages.filter((language) => language !== lang);
  if (others.length === 0) return null;
  return (
    <nav className="language-links" aria-label={t.nav.languages}>
      {others.map((language) => (
        <a key={language} href={localizedPath(language, "/")} hrefLang={language} lang={language}>
          {messagesFor(language).languageName}
        </a>
      ))}
    </nav>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  const t = useT();
  const { lang, lp } = useLocalized();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [menu, setMenu] = useState(false);
  const [dark, setDark] = useState(false);
  const [cookies, setCookies] = useState(true);
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") === "dark";
    setDark(savedTheme);
    document.documentElement.classList.toggle("dark", savedTheme);
    setCookies(localStorage.getItem("cookie-consent") !== "accepted");
    const onScroll = () => setShowTop(window.scrollY > 700);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  // Close the mobile menu after navigation.
  useEffect(() => setMenu(false), [pathname]);
  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  };
  const random = async () => {
    const articles = await articleApi.listPublished({ language: lang, limit: 50 });
    const article = articles[Math.floor(Math.random() * articles.length)];
    if (article) {
      void navigate({ to: "/{-$lang}/arthro/$slug", params: { lang: lp, slug: article.slug } });
    }
  };
  const randomLabel = t.nav.random(t.site.contentLabels.singular);
  const nav = navRoutes.map(([key, to]) => ({ label: t.nav[key], to }));
  return (
    <div className="site-frame">
      <header className="site-header">
        <div className="header-inner">
          <BrandLogo showTagline />
          <nav className="desktop-nav" aria-label={t.nav.mainLabel}>
            {nav.map(({ label, to }) => (
              <Link
                key={to}
                to={to}
                params={{ lang: lp }}
                activeProps={{ className: "active" }}
                activeOptions={{ exact: to === "/{-$lang}" }}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <LanguageLinks />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate({ to: "/{-$lang}/anakalypse", params: { lang: lp } })}
              aria-label={t.nav.search}
            >
              <Search />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={dark ? t.nav.lightTheme : t.nav.darkTheme}
            >
              {dark ? <Sun /> : <Moon />}
            </Button>
            <Button className="random-button" onClick={random}>
              <Shuffle /> {randomLabel}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="menu-button"
              onClick={() => setMenu(!menu)}
              aria-label={t.nav.menu}
            >
              {menu ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
        {menu && (
          <nav className="mobile-nav" aria-label={t.nav.mobileLabel}>
            {nav.map(({ label, to }) => (
              <Link key={to} to={to} params={{ lang: lp }}>
                {label}
              </Link>
            ))}
            <Button onClick={random}>
              <Shuffle /> {randomLabel}
            </Button>
          </nav>
        )}
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <div>
          <BrandLogo />
          <p>{t.site.footerLine}</p>
        </div>
        <div className="footer-links">
          <Link to="/{-$lang}/sxetika" params={{ lang: lp }}>
            {t.nav.about}
          </Link>
          <Link to="/{-$lang}/anakalypse" params={{ lang: lp }}>
            {t.nav.discover}
          </Link>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
      {cookies && (
        <aside className="cookie-banner">
          <p>
            <strong>{t.cookies.title}</strong>
            <br />
            {t.cookies.text}
          </p>
          <Button
            onClick={() => {
              localStorage.setItem("cookie-consent", "accepted");
              setCookies(false);
            }}
          >
            {t.cookies.accept}
          </Button>
        </aside>
      )}
      {showTop && (
        <Button
          size="icon"
          className="back-top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label={t.nav.backToTop}
        >
          <ArrowUp />
        </Button>
      )}
    </div>
  );
}
