import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { LiveCandlestickChart } from "@/components/live-candlestick-chart";
import { DemoAccountView } from "@/components/demo-account-view";
import { MarketQuotesPanel } from "@/components/market-quotes-panel";

export default function Home() {
  return (
    <AppShell>
      <div className="overview-page">
        <section className="overview-hero">
          <div className="overview-hero-copy">
            <span className="overview-kicker"><span className="overview-kicker-dot" /> YOUR DEMO WORKSPACE</span>
            <h1>Good trading starts<br />with <span>a clear view.</span></h1>
            <p>Explore simulated markets, understand your positions, and practise with virtual funds — at your own pace.</p>
            <div className="overview-hero-actions">
              <Link href="/trade" className="btn overview-primary-action">Open trading terminal <span aria-hidden="true">↗</span></Link>
              <Link href="/academy" className="btn btn-secondary">Learn the basics</Link>
            </div>
          </div>
          <div className="overview-hero-aside" aria-label="Trading mode">
            <div className="overview-mode-icon" aria-hidden="true">N</div>
            <span className="overview-mode-label">PRACTICE ENVIRONMENT</span>
            <strong>Risk-free by design.</strong>
            <p>Every order uses demo funds. No real-money trades are placed.</p>
            <div className="overview-mode-foot"><span /> Virtual portfolio <b>Enabled</b></div>
          </div>
        </section>

        <div className="overview-section-heading">
          <div><span className="overview-section-kicker">YOUR ACCOUNT</span><h2>Portfolio snapshot</h2></div>
          <Link href="/portfolio" className="overview-subtle-link">Full portfolio <span aria-hidden="true">→</span></Link>
        </div>
        <DemoAccountView mode="overview" />

        <div className="overview-section-heading overview-market-heading">
          <div><span className="overview-section-kicker">EXPLORE THE SIMULATION</span><h2>Market overview</h2><p>Fictional instruments and simulated price movement.</p></div>
          <Link href="/markets" className="overview-subtle-link">All markets <span aria-hidden="true">→</span></Link>
        </div>
        <section className="overview-chart-section">
          <div className="overview-panel-intro"><div><span className="overview-panel-icon" aria-hidden="true">⌁</span><div><h3>Price action</h3><p>Choose an instrument and timeframe to explore its demo candles.</p></div></div><span className="overview-demo-tag"><span /> SIMULATED DATA</span></div>
          <LiveCandlestickChart />
        </section>

        <MarketQuotesPanel />

        <section className="overview-learning-strip">
          <div className="overview-learning-mark" aria-hidden="true">✳</div>
          <div><span className="overview-section-kicker">NEW TO TRADING?</span><h2>Build confidence before you trade.</h2><p>Learn order types, portfolio basics, and how risk works — without risking real money.</p></div>
          <Link href="/academy" className="btn btn-secondary">Explore the academy <span aria-hidden="true">→</span></Link>
        </section>
        <p className="overview-disclaimer">NexoraTrade is a simulated learning environment. Quotes, candles, fills, and account balances are for practice only and are not investment advice.</p>
      </div>
    </AppShell>
  );
}
