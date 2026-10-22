"use client";

import { useState } from "react";
import { DEMO_INSTRUMENTS } from "@/lib/demo-instruments";
import type { BacktestResult } from "@/lib/backtest";

type BacktestResponse = { result?: BacktestResult; error?: string; details?: unknown };

const money = (value: number) => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(value);

export function StrategyLab() {
  const [symbol, setSymbol] = useState("OBBY");
  const [fastPeriod, setFastPeriod] = useState("5");
  const [slowPeriod, setSlowPeriod] = useState("20");
  const [maxPositionPercent, setMaxPositionPercent] = useState("50");
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runBacktest() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/bots/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, fastPeriod: Number(fastPeriod), slowPeriod: Number(slowPeriod), maxPositionPercent: Number(maxPositionPercent) }),
      });
      const payload = await response.json() as BacktestResponse;
      if (!response.ok || !payload.result) throw new Error(payload.error || "Backtest could not be completed.");
      setResult(payload.result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Backtest could not be completed.");
    } finally {
      setLoading(false);
    }
  }

  const selected = DEMO_INSTRUMENTS.find(instrument => instrument.symbol === symbol);

  return (
    <div className="strategy-lab">
      <section className="strategy-lab-notice">
        <span className="account-mode">BACKTEST ONLY</span>
        <p>Test a deterministic SMA crossover against fictional historical prices. This does not place orders, run continuously, or predict future returns.</p>
      </section>
      <div className="strategy-lab-layout">
        <section className="account-panel strategy-config">
          <span className="trade-eyebrow">STRATEGY CONFIGURATION</span>
          <h2>SMA crossover</h2>
          <p className="muted">Buy when the fast moving average crosses above the slow average; sell when it crosses below.</p>
          <div className="field">
            <label htmlFor="strategy-symbol">Demo instrument</label>
            <select id="strategy-symbol" value={symbol} onChange={event => setSymbol(event.target.value)}>
              {DEMO_INSTRUMENTS.map(instrument => <option key={instrument.symbol} value={instrument.symbol}>{instrument.symbol} — {instrument.name}</option>)}
            </select>
            {selected && <small className="field-help">{selected.sector} · {selected.description}</small>}
          </div>
          <div className="strategy-config-grid">
            <div className="field"><label htmlFor="strategy-fast">Fast SMA bars</label><input id="strategy-fast" type="number" min="2" max="20" value={fastPeriod} onChange={event => setFastPeriod(event.target.value)} /></div>
            <div className="field"><label htmlFor="strategy-slow">Slow SMA bars</label><input id="strategy-slow" type="number" min="10" max="60" value={slowPeriod} onChange={event => setSlowPeriod(event.target.value)} /></div>
          </div>
          <div className="field">
            <label htmlFor="strategy-risk">Maximum position size <b>{maxPositionPercent}%</b></label>
            <input id="strategy-risk" type="range" min="1" max="50" value={maxPositionPercent} onChange={event => setMaxPositionPercent(event.target.value)} />
            <small className="field-help">The strategy cannot allocate more than half of virtual cash to one position.</small>
          </div>
          {Number(fastPeriod) >= Number(slowPeriod) && <p className="trade-validation">Fast SMA must be shorter than slow SMA.</p>}
          {error && <div className="trade-alert error" role="alert">{error}{error.toLowerCase().includes("sign in") && <div className="trade-auth-links"><a href="/auth/sign-in">Sign in</a><a href="/auth/sign-up">Create an account</a></div>}</div>}
          <button type="button" className="btn overview-primary-action strategy-run" disabled={loading || !Number.isInteger(Number(fastPeriod)) || !Number.isInteger(Number(slowPeriod)) || Number(fastPeriod) >= Number(slowPeriod)} onClick={() => void runBacktest()}>
            {loading ? "Running backtest…" : "Run simulated backtest"}
          </button>
        </section>

        <section className="account-panel strategy-results">
          <div className="account-panel-head"><div><h2>Backtest results</h2><p>Fixed 240-bar simulation · $3,000 virtual starting balance</p></div>{result && <span className="account-mode">COMPLETE</span>}</div>
          {!result && !loading && <div className="history-empty">Configure a strategy and run a backtest to see simulated results.</div>}
          {loading && <div className="history-empty" role="status">Calculating signals, execution costs and drawdown…</div>}
          {result && <>
            <div className="strategy-result-grid">
              <div><small>Final equity</small><b>{money(result.finalEquity)}</b></div>
              <div><small>Strategy return</small><b className={result.totalReturnPercent >= 0 ? "positive" : "negative"}>{result.totalReturnPercent >= 0 ? "+" : ""}{result.totalReturnPercent.toFixed(2)}%</b></div>
              <div><small>Buy & hold</small><b className={result.buyAndHoldReturnPercent >= 0 ? "positive" : "negative"}>{result.buyAndHoldReturnPercent >= 0 ? "+" : ""}{result.buyAndHoldReturnPercent.toFixed(2)}%</b></div>
              <div><small>Max drawdown</small><b className="negative">-{result.maxDrawdownPercent.toFixed(2)}%</b></div>
              <div><small>Trades</small><b>{result.trades}</b></div>
              <div><small>Fees paid</small><b>{money(result.feesPaid)}</b></div>
            </div>
            <div className="strategy-equity-chart" role="img" aria-label="Backtest equity curve">
              <svg viewBox="0 0 600 180" preserveAspectRatio="none">
                <line x1="0" y1="90" x2="600" y2="90" />
                <polyline points={result.equityCurve.map((point, index) => {
                  const values = result.equityCurve.map(item => item.equity);
                  const min = Math.min(...values, result.initialBalance);
                  const max = Math.max(...values, result.initialBalance);
                  const x = index / Math.max(1, result.equityCurve.length - 1) * 600;
                  const y = 160 - ((point.equity - min) / Math.max(1, max - min)) * 140;
                  return `${x.toFixed(2)},${y.toFixed(2)}`;
                }).join(" ")} />
              </svg>
            </div>
            <p className="strategy-assumptions">Assumptions: {result.assumptions.feeBps} bps fees per fill, {result.assumptions.slippageBps} bps slippage per fill, max {result.assumptions.maxPositionPercent}% position sizing. Signals execute on the next bar, not the signal bar.</p>
          </>}
        </section>
      </div>
    </div>
  );
}
