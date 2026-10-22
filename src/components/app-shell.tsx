"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BookOpen,
  Bot,
  Trophy,
  ChartNoAxesCombined,
  ClipboardList,
  LayoutDashboard,
  Search,
  Wallet,
  Star,
  Settings,
} from "lucide-react";
import { type FormEvent, type KeyboardEvent as ReactKeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEMO_INSTRUMENTS } from "@/lib/demo-instruments";

const links = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/markets", label: "Markets", icon: ChartNoAxesCombined },
  { href: "/trade", label: "Trade", icon: Activity },
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/watchlist", label: "Watchlist", icon: Star },
  { href: "/academy", label: "Learn", icon: BookOpen },
  { href: "/bots", label: "Strategy Lab", icon: Bot },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
];
const instruments = DEMO_INSTRUMENTS.map(({ symbol, name }) => ({ symbol, name }));
const formatBalance = (value: number) => new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(value);

type AccountBalanceResponse = {
  account: { cash: number; equity: number | null };
  error?: string;
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [cashBalance, setCashBalance] = useState<number | null>(null);
  const [netWorth, setNetWorth] = useState<number | null>(null);
  const [balanceState, setBalanceState] = useState<"loading" | "ready" | "signed-out" | "unavailable">("loading");
  const [balanceError, setBalanceError] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const refreshBalance = useCallback(async () => {
    try {
      const response = await fetch("/api/demo/account", { cache: "no-store" });
      if (response.status === 401) {
        setCashBalance(null);
        setNetWorth(null);
        setBalanceError("");
        setBalanceState("signed-out");
        return;
      }
      if (!response.headers.get("content-type")?.includes("application/json")) {
        throw new Error(`Account balance could not be loaded (HTTP ${response.status}).`);
      }
      const payload = await response.json() as AccountBalanceResponse;
      if (!response.ok) throw new Error(payload.error || "Account balance could not be loaded.");
      if (!Number.isFinite(payload.account?.cash) || (payload.account.equity !== null && !Number.isFinite(payload.account.equity))) {
        throw new Error("The demo account returned an invalid balance.");
      }
      setCashBalance(payload.account.cash);
      setNetWorth(payload.account.equity);
      setBalanceError("");
      setBalanceState("ready");
    } catch (cause) {
      setCashBalance(null);
      setNetWorth(null);
      setBalanceError(cause instanceof Error ? cause.message : "Account balance could not be loaded.");
      setBalanceState("unavailable");
    }
  }, []);

  useEffect(() => {
    function handleGlobalShortcut(event: globalThis.KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleGlobalShortcut);
    return () => window.removeEventListener("keydown", handleGlobalShortcut);
  }, []);

  useEffect(() => {
    void refreshBalance();
    window.addEventListener("demo-account-updated", refreshBalance);
    return () => window.removeEventListener("demo-account-updated", refreshBalance);
  }, [refreshBalance]);

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

  function handleSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
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
      <header className="topbar site-header">
        <Link className="brand brand-logo-link" href="/" aria-label="NexoraTrade overview"><Image className="brand-logo brand-logo-expanded" src="/logos/nexoratrade-expanded.jpg" alt="" width={190} height={52} priority /><Image className="brand-logo brand-logo-short" src="/logos/nexoratrade-mark.jpg" alt="" width={42} height={42} priority /></Link>
        <nav className="top-navigation" aria-label="Main navigation">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-current={pathname === href || (href !== "/" && pathname.startsWith(`${href}/`)) ? "page" : undefined} className={pathname === href || (href !== "/" && pathname.startsWith(`${href}/`)) ? "active" : ""}>
              <Icon size={14} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="header-market-status"><span className="status-square" />Demo prices · fictional assets</div>
        <div className="topbar-actions site-header-actions">
          <div className="header-account-summary" title={balanceError || undefined} aria-live="polite">
            <span className="header-balance-icon" aria-hidden="true">$</span>
            <span className="header-balance-copy">
              <small>{balanceState === "ready" ? "DEMO BALANCE" : "ACCOUNT BALANCE"}</small>
              <b>{cashBalance === null ? balanceState === "loading" ? "Loading…" : balanceState === "signed-out" ? "Sign in" : "Unavailable" : formatBalance(cashBalance)}</b>
              {balanceState === "ready" && <small className="header-net-worth">Equity {netWorth === null ? "—" : formatBalance(netWorth)}</small>}
            </span>
          </div>
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
              <kbd>Ctrl K</kbd>
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
      <main className="main">
        {children}
      </main>
    </div>
  );
}
