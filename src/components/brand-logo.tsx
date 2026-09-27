import { Link } from "@tanstack/react-router";
import { siteConfig } from "@/config/site";
import { useT } from "@/i18n";
import { useLocalized } from "@/i18n/links";

export function BrandLogo({ showTagline = false }: { showTagline?: boolean }) {
  const t = useT();
  const { lp } = useLocalized();
  return (
    <div className="brand-lockup">
      <Link to="/{-$lang}" params={{ lang: lp }} className="logo" aria-label={siteConfig.name}>
        <span className="logo-fact">{siteConfig.wordmark.primary}</span>
        <span className="logo-aki">{siteConfig.wordmark.accent}</span>
      </Link>
      {showTagline && <span className="brand-tagline">{t.site.tagline}</span>}
    </div>
  );
}
