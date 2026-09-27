import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  Eye,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  PenLine,
  UserRound,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { signOut } from "@/functions/auth";
import { initialsOf, memberRoleLabels, type SessionUser } from "@/lib/auth-types";

const navItems = [
  { label: "Επισκόπηση", to: "/admin", icon: LayoutDashboard },
  { label: "Άρθρα", to: "/admin/articles", icon: BookOpen },
  { label: "Νέο άρθρο", to: "/admin/articles/new", icon: PenLine },
  { label: "Κατηγορίες", to: "/admin/categories", icon: FolderTree },
  { label: "Προφίλ", to: "/admin/profile", icon: UserRound },
] as const;

type SidebarProps = { user: SessionUser; onNavigate?: () => void };

export function AdminSidebar({ user, onNavigate }: SidebarProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const router = useRouter();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      await router.invalidate();
      await navigate({ to: "/login" });
    } finally {
      setSigningOut(false);
    }
  };
  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">
        <BrandLogo />
        <span>Συντακτική ομάδα</span>
      </div>
      <nav className="admin-nav" aria-label="Πλοήγηση διαχείρισης">
        {navItems.map(({ label, to, icon: Icon }) => {
          const active =
            to === "/admin" ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
          return (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: true }}
              className={active ? "active" : ""}
              onClick={onNavigate}
            >
              <Icon />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="admin-profile-card">
        <div className="admin-avatar" aria-hidden="true">
          {initialsOf(user.displayName)}
        </div>
        <div>
          <strong>{user.displayName}</strong>
          <span>
            {memberRoleLabels[user.role]}
            {user.isDemo ? " · demo" : ""}
          </span>
        </div>
      </div>
      <div className="admin-sidebar-actions">
        <Link to="/" className="admin-view-site" onClick={onNavigate}>
          <Eye /> Προβολή site
        </Link>
        {!user.isDemo && (
          <Button variant="ghost" onClick={onSignOut} disabled={signingOut}>
            <LogOut /> Αποσύνδεση
          </Button>
        )}
      </div>
    </aside>
  );
}

export function AdminLayout({ user, children }: { user: SessionUser; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="admin-shell">
      <div className="admin-desktop-sidebar">
        <AdminSidebar user={user} />
      </div>
      <header className="admin-mobile-header">
        <BrandLogo />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Κλείσιμο μενού" : "Άνοιγμα μενού"}
        >
          {open ? <X /> : <Menu />}
        </Button>
      </header>
      {open && (
        <>
          <button
            className="admin-nav-backdrop"
            onClick={() => setOpen(false)}
            aria-label="Κλείσιμο μενού"
          />
          <div className="admin-mobile-drawer">
            <AdminSidebar user={user} onNavigate={() => setOpen(false)} />
          </div>
        </>
      )}
      <main className="admin-main">{children}</main>
    </div>
  );
}
