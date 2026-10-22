import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { AcademyWorkspace } from "@/components/academy-workspace";

export default function Academy() {
  return (
    <AppShell>
      <PageHeading title="Learning academy" subtitle="Short interactive lessons that teach market basics, order types, and risk-aware practice." />
      <AcademyWorkspace />
    </AppShell>
  );
}
