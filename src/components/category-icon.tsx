import {
  BookOpen,
  Brain,
  FlaskConical,
  Globe2,
  History,
  Laptop,
  Leaf,
  Orbit,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { CategoryIconKey } from "@/domain/taxonomy";

const icons: Record<CategoryIconKey, LucideIcon> = {
  science: FlaskConical,
  history: History,
  technology: Laptop,
  nature: Leaf,
  space: Orbit,
  culture: Globe2,
  human: Users,
  daily: Brain,
};

export function CategoryIcon({ iconKey }: { iconKey: CategoryIconKey | null }) {
  const Icon = iconKey ? icons[iconKey] : BookOpen;
  return <Icon aria-hidden="true" />;
}
