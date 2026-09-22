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
import { formatViews, type AdminArticle, type ArticleStatus } from "@/lib/admin-data";

export function ArticleStatusBadge({ status }: { status: ArticleStatus }) {
  return (
    <span
      className={`admin-status status-${status === "Δημοσιευμένο" ? "published" : status === "Πρόχειρο" ? "draft" : "scheduled"}`}
    >
      <i />
      {status}
    </span>
  );
}

export function StatsCard({
  label,
  value,
  trend,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  trend: string;
  icon: LucideIcon;
  tone: string;
}) {
  const positive = !trend.startsWith("-");
  return (
    <article className={`stats-card ${tone}`}>
      <div className="stats-icon">
        <Icon />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small className={positive ? "positive" : "negative"}>
        {positive ? <ArrowUpRight /> : <ArrowDownRight />}
        {trend}
      </small>
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
          <Link to="/admin/articles/$slug/edit" params={{ slug: article.slug }}>
            <Edit3 /> Επεξεργασία
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/arthro/$slug" params={{ slug: article.slug }}>
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
                  <img src={article.image} alt="" />
                  <div>
                    <strong>{article.title}</strong>
                    <span>{article.excerpt}</span>
                  </div>
                </div>
              </td>
              <td>{article.category}</td>
              {!compact && <td>{article.author}</td>}
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
            <img src={article.image} alt="" />
            <div className="admin-article-card-head">
              <ArticleStatusBadge status={article.status} />
              <ArticleActions article={article} onDelete={onDelete} onDuplicate={onDuplicate} />
            </div>
            <strong>{article.title}</strong>
            <div className="admin-article-card-meta">
              <span>{article.category}</span>
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
