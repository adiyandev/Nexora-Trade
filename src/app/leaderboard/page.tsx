import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { LeaderboardWorkspace } from "@/components/leaderboard-workspace";

export default function LeaderboardPage() {
  return (
    <AppShell>
      <PageHeading title="Demo leaderboard" subtitle="Compare opt-in simulated portfolio results while keeping account identity private." />
      <LeaderboardWorkspace />
    </AppShell>
  );
}
