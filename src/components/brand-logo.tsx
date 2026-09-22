import { Link } from "@tanstack/react-router";
import { siteConfig } from "@/config/site";

export function BrandLogo({ showTagline = false }: { showTagline?: boolean }) {
  return (
    <div className="brand-lockup">
      <Link to="/" className="logo" aria-label={siteConfig.name}>
        <span className="logo-fact">{siteConfig.wordmark.primary}</span>
        <span className="logo-aki">{siteConfig.wordmark.accent}</span>
      </Link>
      {showTagline && <span className="brand-tagline">{siteConfig.tagline}</span>}
    </div>
  );
}
