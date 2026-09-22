import { createFileRoute, Link } from "@tanstack/react-router";
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
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArticlesTable, ConfirmDialog, StatsCard } from "@/components/admin/admin-ui";
import { formatViews, type AdminArticle } from "@/lib/admin-data";
import { articleRepository } from "@/data/articles";
import { brandedTitle, siteConfig } from "@/config/site";

export const Route = createFileRoute("/admin/")({
  loader: () => articleRepository.listAdmin(),
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

function AdminDashboard() {
  const loadedRows = Route.useLoaderData();
  const [rows, setRows] = useState<AdminArticle[]>(() => loadedRows);
  const [target, setTarget] = useState<AdminArticle>();
  const duplicate = async (article: AdminArticle) => {
    const copy = await articleRepository.duplicate(article.id);
    setRows((current) => [copy, ...current]);
    toast.success("Δημιουργήθηκε αντίγραφο ως πρόχειρο.");
  };
  return (
    <div className="admin-page">
      <header className="admin-page-header dashboard-heading">
        <div>
          <p className="admin-overline">Κυριακή, 20 Σεπτεμβρίου</p>
          <h1>
            Καλημέρα, Μαρία <span className="sr-only">👋</span>
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
          value="128"
          trend="+8 αυτόν τον μήνα"
          icon={FileText}
          tone="sky"
        />
        <StatsCard
          label="Δημοσιευμένα"
          value="104"
          trend="+6 αυτόν τον μήνα"
          icon={BookOpen}
          tone="green"
        />
        <StatsCard label="Πρόχειρα" value="17" trend="-2 από χθες" icon={PenLine} tone="coral" />
        <StatsCard
          label="Προβολές αυτόν τον μήνα"
          value="84,2K"
          trend="+12,4%"
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
          <ArticlesTable
            compact
            articles={rows.slice(0, 4)}
            onDelete={setTarget}
            onDuplicate={duplicate}
          />
        </section>
        <aside className="admin-dashboard-side">
          <section className="admin-panel popular-mini">
            <header>
              <div>
                <p className="admin-overline">Οι αναγνώστες επιλέγουν</p>
                <h2>Δημοφιλή άρθρα</h2>
              </div>
            </header>
            {[...rows]
              .sort((a, b) => b.views - a.views)
              .slice(0, 3)
              .map((article, index) => (
                <div className="popular-mini-row" key={article.id}>
                  <span>0{index + 1}</span>
                  <div>
                    <strong>{article.title}</strong>
                    <small>{formatViews(article.views)} προβολές</small>
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
        description="Η ενέργεια περνά από το ενεργό article repository."
        confirmLabel="Διαγραφή"
        onConfirm={async () => {
          if (target) {
            await articleRepository.delete(target.id);
            setRows((current) => current.filter((row) => row.id !== target.id));
          }
          setTarget(undefined);
          toast.success("Το άρθρο αφαιρέθηκε από τη λίστα.");
        }}
      />
    </div>
  );
}
