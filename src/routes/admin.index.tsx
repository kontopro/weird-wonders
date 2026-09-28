import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Eye,
  FileText,
  Hand,
  Lightbulb,
  PenLine,
  Plus,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useState, useSyncExternalStore } from "react";
import { mainLanguage } from "@/config/site";
import { popularWindowDays } from "@/domain/listing";
import { Button } from "@/components/ui/button";
import { ArticlesTable, ConfirmDialog, StatsCard } from "@/components/admin/admin-ui";
import { formatViews, type AdminArticle } from "@/lib/admin-data";
import { articleApi } from "@/data/articles";
import { errorMessage } from "@/lib/error-message";
import { brandedTitle, siteConfig } from "@/config/site";

export const Route = createFileRoute("/admin/")({
  loader: async () => {
    const [stats, recent, popular] = await Promise.all([
      articleApi.adminStats(),
      articleApi.pageAdmin({}),
      articleApi.listPopular(mainLanguage, 3),
    ]);
    return { stats, recent: recent.items.slice(0, 4), popular };
  },
  component: AdminDashboard,
  head: () => ({
    meta: [
      { title: brandedTitle("Επισκόπηση") },
      {
        name: "description",
        content: `Η σημερινή εικόνα της συντακτικής ομάδας του ${siteConfig.name}.`,
      },
      { property: "og:title", content: brandedTitle("Επισκόπηση") },
      {
        property: "og:description",
        content: `Η σημερινή εικόνα της συντακτικής ομάδας του ${siteConfig.name}.`,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const noSubscription = () => () => {};

/** Greeting by the time of day. */
function greeting(hour = new Date().getHours()): string {
  if (hour >= 5 && hour < 12) return "Καλημέρα";
  if (hour >= 12 && hour < 18) return "Καλό απόγευμα";
  return "Καλησπέρα";
}

function AdminDashboard() {
  const { stats, recent, popular } = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const [target, setTarget] = useState<AdminArticle>();
  const firstName = user.displayName.split(" ")[0] || user.displayName;
  // Chosen in the browser: the server's clock may be in another time zone.
  const hello = useSyncExternalStore(noSubscription, greeting, () => "Γεια σου");
  const duplicate = async (article: AdminArticle) => {
    try {
      await articleApi.duplicate(article.id);
      toast.success("Δημιουργήθηκε αντίγραφο ως πρόχειρο.");
      await router.invalidate();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };
  return (
    <div className="admin-page">
      <header className="admin-page-header dashboard-heading">
        <div>
          <p className="admin-overline">
            {new Intl.DateTimeFormat("el-GR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(new Date())}
          </p>
          <h1>
            {hello}, {firstName} <span className="sr-only">👋</span>
            <Hand className="greeting-hand" aria-hidden="true" />
          </h1>
          <p>Δες τι συμβαίνει σήμερα στο {siteConfig.name}.</p>
        </div>
        <Link to="/admin/articles/new" className="btn btn-primary admin-new-link">
          <Plus /> Νέο άρθρο
        </Link>
      </header>
      <section className="stats-grid" aria-label="Στατιστικά">
        <StatsCard
          label="Συνολικά άρθρα"
          value={formatViews(stats.total)}
          note={`${formatViews(stats.byStatus.archived)} αρχειοθετημένα`}
          icon={FileText}
          tone="sky"
        />
        <StatsCard
          label="Δημοσιευμένα"
          value={formatViews(stats.byStatus.published)}
          note={`${formatViews(stats.byStatus.scheduled)} προγραμματισμένα`}
          icon={BookOpen}
          tone="green"
        />
        <StatsCard
          label="Πρόχειρα"
          value={formatViews(stats.byStatus.draft)}
          note={`${formatViews(stats.byStatus.in_review)} σε έλεγχο`}
          icon={PenLine}
          tone="coral"
        />
        <StatsCard
          label="Προβολές"
          value={formatViews(stats.recentViews)}
          note={`τελευταίες ${popularWindowDays} ημέρες`}
          icon={Eye}
          tone="yellow"
        />
      </section>
      <div className="admin-dashboard-grid">
        <section className="admin-panel admin-recent">
          <header>
            <div>
              <p className="admin-overline">Ροή περιεχομένου</p>
              <h2>Πρόσφατα άρθρα</h2>
            </div>
            <Link to="/admin/articles">
              Όλα τα άρθρα <ArrowRight />
            </Link>
          </header>
          <ArticlesTable compact articles={recent} onDelete={setTarget} onDuplicate={duplicate} />
        </section>
        <aside className="admin-dashboard-side">
          <section className="admin-panel popular-mini">
            <header>
              <div>
                <p className="admin-overline">Οι αναγνώστες επιλέγουν</p>
                <h2>Δημοφιλή άρθρα</h2>
              </div>
            </header>
            {popular.length === 0 && <p>Δεν υπάρχουν ακόμα προβολές.</p>}
            {popular.map((article, index) => (
              <div className="popular-mini-row" key={article.id}>
                <span>0{index + 1}</span>
                <div>
                  <strong>{article.title}</strong>
                  <small>{formatViews(article.popularity)} προβολές</small>
                </div>
              </div>
            ))}
          </section>
          <section className="admin-panel quick-actions">
            <header>
              <div>
                <p className="admin-overline">Χωρίς καθυστέρηση</p>
                <h2>Γρήγορες ενέργειες</h2>
              </div>
            </header>
            <Link to="/admin/articles/new">
              <PenLine /> Γράψε νέο άρθρο <ArrowRight />
            </Link>
            <Link to="/admin/articles">
              <FileText /> Διαχείριση πρόχειρων <ArrowRight />
            </Link>
            <Link to="/admin/categories">
              <Sparkles /> Οργάνωση κατηγοριών <ArrowRight />
            </Link>
          </section>
        </aside>
      </div>
      <section className="editorial-reminder">
        <div className="reminder-icon">
          <Lightbulb />
        </div>
        <div>
          <p className="admin-overline">Editorial σημείωση</p>
          <h2>Η περιέργεια ξεκινά από μια καλή ερώτηση.</h2>
          <p>Προτεινόμενο θέμα: πώς τα φυτά «μετρούν» τη διάρκεια της νύχτας πριν ανθίσουν;</p>
        </div>
        <Link to="/admin/articles/new">
          Ξεκίνα προσχέδιο <ArrowRight />
        </Link>
      </section>
      <ConfirmDialog
        open={!!target}
        onOpenChange={(open) => !open && setTarget(undefined)}
        title="Να αφαιρεθεί το άρθρο;"
        description="Η διαγραφή είναι οριστική."
        confirmLabel="Διαγραφή"
        onConfirm={async () => {
          if (!target) return;
          try {
            await articleApi.delete(target.id);
            toast.success("Το άρθρο αφαιρέθηκε.");
            await router.invalidate();
          } catch (error) {
            toast.error(errorMessage(error));
          } finally {
            setTarget(undefined);
          }
        }}
      />
    </div>
  );
}
