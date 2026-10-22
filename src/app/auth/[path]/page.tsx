import { AuthView } from "@neondatabase/auth-ui";
import { authViewPaths } from "@neondatabase/auth-ui/server";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

export const dynamicParams = false;
export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }));
}

function MarketPulse() {
  const candles = [
    [12, 58, 48, 66], [25, 44, 38, 59], [38, 49, 40, 56], [51, 32, 26, 53],
    [64, 37, 29, 44], [77, 21, 17, 40], [90, 27, 19, 34], [103, 14, 10, 31],
    [116, 22, 15, 29], [129, 11, 6, 25], [142, 15, 8, 21], [155, 4, 0, 19],
  ];
  return (
    <svg className="auth-market-chart" viewBox="0 0 168 78" role="img" aria-label="Illustrative simulated market chart">
      {[18, 38, 58].map(y => <line key={y} x1="0" y1={y} x2="168" y2={y} />)}
      {candles.map(([x, y, top, bottom], i) => (
        <g key={x} className={i === 2 || i === 4 || i === 8 ? "down" : "up"}>
          <line x1={x} y1={top} x2={x} y2={bottom} />
          <rect x={x - 3} y={y} width="6" height={Math.max(5, bottom - y - 2)} rx="1" />
        </g>
      ))}
    </svg>
  );
}

export default async function AuthPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;
  if (!Object.values(authViewPaths).includes(path as (typeof authViewPaths)[keyof typeof authViewPaths])) notFound();

  return (
    <main className="auth-experience">
      <section className="auth-story" aria-label="About NexoraTrade">
        <Link href="/" className="auth-story-brand" aria-label="NexoraTrade home">
          <Image src="/logos/nexoratrade-expanded.jpg" alt="NexoraTrade" width={200} height={55} priority />
        </Link>
        <div className="auth-story-content">
          <span className="auth-story-eyebrow"><i /> THE NEXORA DEMO EXCHANGE</span>
          <h1>Build your edge.<br /><span>Risk nothing.</span></h1>
          <p>Learn the markets, test your ideas, and build confidence with a virtual portfolio. No deposits. No real-money trades. Just room to learn.</p>
          <div className="auth-chart-card">
            <div className="auth-chart-heading"><div><span>SIMULATED MARKET</span><strong>OMNI <small>/ USD</small></strong></div><span className="auth-chart-live"><i /> DEMO DATA</span></div>
            <div className="auth-chart-value"><strong>$124.80</strong><span>+2.64% <small>illustrative</small></span></div>
            <MarketPulse />
            <div className="auth-chart-footer"><span>Practice portfolio</span><strong>$3,000 <small>virtual cash</small></strong></div>
          </div>
          <div className="auth-trust-points">
            <span><b>01</b> Learn by doing</span>
            <span><b>02</b> Practice with virtual cash</span>
            <span><b>03</b> Improve at your own pace</span>
          </div>
        </div>
        <div className="auth-story-bottom"><span>© {new Date().getFullYear()} NexoraTrade</span><span>Educational simulation only</span></div>
      </section>
      <section className="auth-form-side">
        <Link href="/" className="auth-mobile-brand" aria-label="Back to NexoraTrade home">
          <Image src="/logos/nexoratrade-expanded.jpg" alt="NexoraTrade" width={176} height={48} priority />
        </Link>
        <div className="auth-form-wrap">
          <div className="auth-form-topline"><span>YOUR NEXT MOVE STARTS HERE</span><Link href="/">Back to home <b aria-hidden="true">↗</b></Link></div>
          <div className="auth-form-card"><AuthView path={path as (typeof authViewPaths)[keyof typeof authViewPaths]} /></div>
          <p className="auth-legal">By continuing, you agree to use NexoraTrade as an educational paper-trading simulator. Prices are fictional and no brokerage orders are placed.</p>
        </div>
        <div className="auth-form-bottom"><span><i /> Secure account access</span><span>Built for learning, not speculation.</span></div>
      </section>
    </main>
  );
}
