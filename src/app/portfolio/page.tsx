import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { DemoAccountView } from "@/components/demo-account-view";

export default function Portfolio() {
  return (
    <AppShell>
      <PageHeading title="Portfolio" subtitle="Your persisted demo balance, positions, and recorded equity snapshots. Values use the latest available market quotes." />
      <DemoAccountView mode="portfolio" />
    </AppShell>
  );
}
