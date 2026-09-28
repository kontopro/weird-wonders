import { siteConfig } from "@/config/site";
import { langParam } from "@/i18n";
import {
  ArrowDownRight,
  ArrowUpRight,
  Copy,
  Edit3,
  Eye,
  MoreHorizontal,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  articleStatusLabels,
  formatViews,
  type AdminArticle,
  type ArticleStatus,
} from "@/lib/admin-data";

// CSS modifier per status (`status-review` predates the `in_review` code).
const statusTone: Record<ArticleStatus, string> = {
  draft: "draft",
  in_review: "review",
  scheduled: "scheduled",
  published: "published",
  archived: "archived",
};

/** Shows the article's language when the blog publishes in more than one. */
function LanguageBadge({ language }: { language: string }) {
  if (siteConfig.languages.length < 2) return null;
  return (
    <small className="lang-badge" title={language}>
      {language.toUpperCase()}
    </small>
  );
}

export function ArticleStatusBadge({ status }: { status: ArticleStatus }) {
  return (
    <span className={`admin-status status-${statusTone[status]}`}>
      <i />
      {articleStatusLabels[status]}
    </span>
  );
}

export function StatsCard({
  label,
  value,
  note,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  /** A short line under the number (plain facts, no trends). */
  note?: string;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <article className={`stats-card ${tone}`}>
      <div className="stats-icon">
        <Icon />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </article>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="admin-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ArticleActions({
  article,
  onDelete,
  onDuplicate,
}: {
  article: AdminArticle;
  onDelete: (article: AdminArticle) => void;
  onDuplicate: (article: AdminArticle) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Ενέργειες για ${article.title}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="admin-action-menu">
        <DropdownMenuItem asChild>
          <Link to="/admin/articles/$id/edit" params={{ id: article.id }}>
            <Edit3 /> Επεξεργασία
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            to="/{-$lang}/arthro/$slug"
            params={{ lang: langParam(article.language), slug: article.slug }}
          >
            <Eye /> Προεπισκόπηση
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onDuplicate(article)}>
          <Copy /> Αντιγραφή
        </DropdownMenuItem>
        <DropdownMenuItem className="admin-danger" onSelect={() => onDelete(article)}>
          <Trash2 /> Διαγραφή
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ArticlesTable({
  articles,
  onDelete,
  onDuplicate,
  compact = false,
}: {
  articles: AdminArticle[];
  onDelete: (article: AdminArticle) => void;
  onDuplicate: (article: AdminArticle) => void;
  compact?: boolean;
}) {
  return (
    <div className={`articles-table-wrap ${compact ? "compact" : ""}`}>
      <table className="articles-table">
        <thead>
          <tr>
            <th>Άρθρο</th>
            <th>Κατηγορία</th>
            {!compact && <th>Συντάκτης</th>}
            <th>Κατάσταση</th>
            <th>Ημερομηνία</th>
            <th>Προβολές</th>
            <th>
              <span className="sr-only">Ενέργειες</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {articles.map((article) => (
            <tr key={article.id}>
              <td>
                <div className="article-cell">
                  <img src={article.image || undefined} alt="" />
                  <div>
                    <strong>
                      <Link
                        to="/admin/articles/$id/edit"
                        params={{ id: article.id }}
                        className="article-title-link"
                      >
                        {article.title}
                      </Link>{" "}
                      <LanguageBadge language={article.language} />
                    </strong>
                    <span>{article.excerpt}</span>
                  </div>
                </div>
              </td>
              <td>{article.category.name}</td>
              {!compact && <td>{article.author.name}</td>}
              <td>
                <ArticleStatusBadge status={article.status} />
              </td>
              <td>{article.date}</td>
              <td>{formatViews(article.views)}</td>
              <td>
                <ArticleActions article={article} onDelete={onDelete} onDuplicate={onDuplicate} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="articles-mobile-list">
        {articles.map((article) => (
          <article className="admin-article-card" key={article.id}>
            <img src={article.image || undefined} alt="" />
            <div className="admin-article-card-head">
              <ArticleStatusBadge status={article.status} />
              <ArticleActions article={article} onDelete={onDelete} onDuplicate={onDuplicate} />
            </div>
            <strong>
              <Link
                to="/admin/articles/$id/edit"
                params={{ id: article.id }}
                className="article-title-link"
              >
                {article.title}
              </Link>{" "}
              <LanguageBadge language={article.language} />
            </strong>
            <div className="admin-article-card-meta">
              <span>{article.category.name}</span>
              <span>{article.date}</span>
              <span>{formatViews(article.views)} προβολές</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function ArticlesLoadingSkeleton() {
  return (
    <div className="admin-loading" aria-label="Φόρτωση άρθρων">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index}>
          <Skeleton className="admin-skeleton-image" />
          <div>
            <Skeleton className="admin-skeleton-title" />
            <Skeleton className="admin-skeleton-copy" />
          </div>
          <Skeleton className="admin-skeleton-badge" />
        </div>
      ))}
    </div>
  );
}
