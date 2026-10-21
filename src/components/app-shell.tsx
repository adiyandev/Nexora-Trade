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
  Wallet,
  Star,
  Settings,
} from "lucide-react";
import { type FormEvent, type KeyboardEvent, useMemo, useState } from "react";

const links = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/markets", label: "Markets", icon: ChartNoAxesCombined },
  { href: "/trade", label: "Trade", icon: Activity },
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/watchlist", label: "Watchlist", icon: Star },
  { href: "/academy", label: "Learn", icon: BookOpen },
];
const instruments = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "TSLA", name: "Tesla, Inc." },
  { symbol: "AMZN", name: "Amazon.com, Inc." },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "META", name: "Meta Platforms, Inc." },
  { symbol: "AMD", name: "Advanced Micro Devices" },
  { symbol: "SPY", name: "SPDR S&P 500 ETF" },
  { symbol: "QQQ", name: "Invesco QQQ Trust" },
  { symbol: "BTC-USD", name: "Bitcoin / USD" },
  { symbol: "ETH-USD", name: "Ethereum / USD" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const suggestions = useMemo(() => {
    const term = query.trim().toUpperCase();
    if (!term) return instruments.slice(0, 6);
    return instruments.filter(item => item.symbol.includes(term) || item.name.toUpperCase().includes(term)).slice(0, 6);
  }, [query]);

  function chooseSymbol(symbol: string) {
    setQuery("");
    setSearchOpen(false);
    setActiveSuggestion(0);
    router.push(`/markets?symbol=${encodeURIComponent(symbol)}`);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const exact = instruments.find(item => item.symbol.toUpperCase() === query.trim().toUpperCase());
    const selected = exact ?? suggestions[activeSuggestion] ?? suggestions[0];
    if (selected) chooseSymbol(selected.symbol);
    else setSearchOpen(true);
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSearchOpen(true);
      setActiveSuggestion(index => suggestions.length ? (index + 1) % suggestions.length : 0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSearchOpen(true);
      setActiveSuggestion(index => suggestions.length ? (index - 1 + suggestions.length) % suggestions.length : 0);
    } else if (event.key === "Escape") {
      setSearchOpen(false);
    }
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
            <form className="global-market-search-wrap" onSubmit={submitSearch} role="search">
              <div className="global-market-search">
                <Search size={14} aria-hidden="true" />
                <input
                  aria-label="Search supported market symbols"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={searchOpen}
                  aria-controls="global-market-suggestions"
                  aria-activedescendant={searchOpen && suggestions[activeSuggestion] ? `market-option-${suggestions[activeSuggestion].symbol}` : undefined}
                  placeholder="Search symbol…"
                  value={query}
                  onFocus={() => setSearchOpen(true)}
                  onChange={event => { setQuery(event.target.value); setActiveSuggestion(0); setSearchOpen(true); }}
                  onKeyDown={handleSearchKeyDown}
                  onBlur={() => window.setTimeout(() => setSearchOpen(false), 120)}
                />
                <kbd>↵</kbd>
              </div>
              {searchOpen && <div className="global-market-suggestions" id="global-market-suggestions" role="listbox" aria-label="Market symbol suggestions">
                {suggestions.length ? suggestions.map((item, index) => (
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === activeSuggestion}
                    id={`market-option-${item.symbol}`}
                    key={item.symbol}
                    className={index === activeSuggestion ? "global-market-option active" : "global-market-option"}
                    onMouseDown={event => event.preventDefault()}
                    onMouseEnter={() => setActiveSuggestion(index)}
                    onClick={() => chooseSymbol(item.symbol)}
                  >
                    <span className="market-option-symbol">{item.symbol}</span>
                    <span className="market-option-name">{item.name}</span>
                  </button>
                )) : <div className="market-search-empty">No supported symbol matches “{query}”.</div>}
                <div className="market-search-hint">↑ ↓ to navigate · Enter to open · Esc to close</div>
              </div>}
            </form>
            <Link href="/settings" className="settings-shortcut" aria-label="Settings" title="Settings"><Settings size={14} /></Link>
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
