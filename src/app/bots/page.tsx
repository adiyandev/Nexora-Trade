import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { StrategyLab } from "@/components/strategy-lab";

export default function BotsPage() {
  return (
    <AppShell>
      <PageHeading title="Strategy lab" subtitle="Experiment with rule-based strategies using deterministic fictional price history and explicit simulated trading costs." />
      <StrategyLab />
    </AppShell>
  );
}
