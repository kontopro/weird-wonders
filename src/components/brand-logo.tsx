import { Link } from "@tanstack/react-router";

export function BrandLogo({ showTagline = false }: { showTagline?: boolean }) {
  return (
    <div className="brand-lockup">
      <Link to="/" className="logo" aria-label="FACTάκι">
        <span className="logo-fact">FACT</span><span className="logo-aki">άκι</span>
      </Link>
      {showTagline && <span className="brand-tagline">Μικρό fact. Μεγάλη έκπληξη.</span>}
    </div>
  );
}