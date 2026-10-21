import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { LiveCandlestickChart } from "@/components/live-candlestick-chart";

export default function Home() {
  return (
    <AppShell>
      <PageHeading
        title="Your trading workspace"
        subtitle="Follow real market prices and inspect historical candles, then practice with virtual funds."
      />
      <div className="workspace-status-row">
        <div className="workspace-status"><span className="live-dot" /><span><b>Market data</b><small>Live provider connection · periodic refresh</small></span></div>
        <div className="workspace-status"><span className="demo-status-dot" /><span><b>Paper trading</b><small>Demo mode · no real-money orders</small></span></div>
        <Link href="/markets" className="btn btn-secondary">Explore all markets ↗</Link>
      </div>
      <LiveCandlestickChart />
      <div className="grid home-quick-links" style={{ marginTop: 18 }}>
        <Link href="/trade" className="card home-quick-link"><span className="quick-link-icon">↗</span><span><b>Practice trading</b><small>Open the demo order ticket and learn order basics.</small></span><span className="quick-link-arrow">→</span></Link>
        <Link href="/academy" className="card home-quick-link"><span className="quick-link-icon">◎</span><span><b>Learn the basics</b><small>Build your understanding of markets and risk.</small></span><span className="quick-link-arrow">→</span></Link>
      </div>
      <p className="muted home-data-note">Candles and prices come from the market data provider and may be delayed. Account balances and simulated order execution are separate from market data and are not yet persisted in this version.</p>
    </AppShell>
  );
}
