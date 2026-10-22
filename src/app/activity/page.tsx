import Link from "next/link";
import { Activity, BookOpen, ClipboardList, Wallet } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";

const destinations = [
  { href: "/orders", title: "Order history", description: "Review submitted market orders, fills, statuses and execution details.", icon: ClipboardList },
  { href: "/portfolio", title: "Portfolio records", description: "Review virtual cash, current positions and recorded equity snapshots.", icon: Wallet },
  { href: "/academy", title: "Learning progress", description: "Continue lessons and review your saved learning progress.", icon: BookOpen },
];

export default function ActivityPage() {
  return (
    <AppShell>
      <PageHeading title="Activity" subtitle="A single place to find the records maintained by your NexoraTrade demo account." />
      <section className="activity-hub" aria-label="Activity destinations">
        {destinations.map(({ href, title, description, icon: Icon }) => (
          <Link className="activity-hub-row" href={href} key={href}>
            <span className="activity-hub-icon"><Icon size={17} strokeWidth={1.8} aria-hidden="true" /></span>
            <span className="activity-hub-copy"><strong>{title}</strong><small>{description}</small></span>
            <span className="activity-hub-arrow" aria-hidden="true">→</span>
          </Link>
        ))}
      </section>
      <p className="activity-hub-note"><Activity size={14} aria-hidden="true" /> New accounts start with no trading or learning history. Records appear here in their relevant sections after you use those features.</p>
    </AppShell>
  );
}
