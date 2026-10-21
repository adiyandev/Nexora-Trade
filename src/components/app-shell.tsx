"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BookOpen,
  ChartNoAxesCombined,
  CircleHelp,
  ClipboardList,
  LayoutDashboard,
  Search,
  Settings,
  Wallet,
  Star,
} from "lucide-react";
import { FormEvent, useState } from "react";

const links = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/markets", label: "Markets", icon: ChartNoAxesCombined },
  { href: "/trade", label: "Trade", icon: Activity },
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/watchlist", label: "Watchlist", icon: Star },
  { href: "/academy", label: "Learn", icon: BookOpen },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const symbol = query.trim().toUpperCase();
    if (!symbol) return;
    router.push(`/markets?symbol=${encodeURIComponent(symbol)}`);
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="NexoraTrade overview">Nexora<span>Trade</span></Link>
        <nav className="nav" aria-label="Main navigation">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={pathname === href || (href !== "/" && pathname.startsWith(`${href}/`)) ? "active" : ""}>
              <Icon size={15} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-note">
          <b>Demo environment</b><br />
          Virtual funds only. No deposits, withdrawals, or real-money orders.
          <br /><br />
          <CircleHelp size={13} style={{ display: "inline", verticalAlign: "-3px", marginRight: 5 }} />
          Learn at your own pace.
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="topbar-context">
            <div className="eyebrow">NEXORATRADE / PAPER TRADING</div>
            <div className="topbar-market-status"><span className="status-square" /> Historical / potentially delayed market data</div>
          </div>
          <div className="topbar-actions">
            <form className="global-market-search" onSubmit={submitSearch} role="search">
              <Search size={14} aria-hidden="true" />
              <input
                aria-label="Search market symbol"
                placeholder="Search symbol…"
                value={query}
                onChange={event => setQuery(event.target.value)}
              />
              <kbd>↵</kbd>
            </form>
            <span className="account-mode" aria-label="Demo account mode">DEMO</span>
            <div className="account-links">
              <Link href="/auth/sign-in">Sign in</Link>
              <Link href="/auth/sign-up" className="create-account-link">Create account</Link>
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
