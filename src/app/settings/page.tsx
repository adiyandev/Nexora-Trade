"use client";

import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";

export default function SettingsPage() {
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function resetDemoAccount() {
    const confirmed = window.confirm(
      "Reset your demo account to $3,000? This permanently deletes your demo orders, fills, positions, ledger history, and recorded portfolio snapshots. Your watchlist will be kept. This cannot be undone."
    );
    if (!confirmed) return;

    setResetting(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/demo/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const payload = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error || "Demo account reset failed.");
      setNotice(payload.message || "Demo account reset.");
      window.dispatchEvent(new Event("demo-account-updated"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Demo account reset failed.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <AppShell>
      <PageHeading title="Settings" subtitle="Manage your simulated trading environment and account data." />
      <div className="settings-workspace">
        <section className="account-panel">
          <span className="trade-eyebrow">TRADING ENVIRONMENT</span>
          <h2>Paper trading</h2>
          <p className="settings-copy">All orders use simulated prices for fictional Nexora instruments. NexoraTrade does not connect to a brokerage, handle deposits, or place real-money orders.</p>
          <div className="settings-info-row"><span>Account mode</span><span className="account-mode">DEMO ONLY</span></div>
          <div className="settings-info-row"><span>Initial virtual balance</span><b>$3,000.00 USD</b></div>
          <div className="settings-info-row"><span>Execution model</span><b>Simulated market orders</b></div>
          <div className="settings-info-row"><span>Market data</span><b>Fictional simulation</b></div>
        </section>

        <section className="account-panel settings-danger-panel">
          <span className="trade-eyebrow">DESTRUCTIVE ACTION</span>
          <h2>Reset demo account</h2>
          <p className="settings-copy">Reset your virtual cash to $3,000 and permanently clear recorded orders, fills, positions, ledger entries, and portfolio snapshots. Your saved watchlist will remain.</p>
          {error && <div className="trade-alert error" role="alert">{error}{error.toLowerCase().includes("sign in") && <div className="trade-auth-links"><Link href="/auth/sign-in">Sign in</Link><Link href="/auth/sign-up">Create an account</Link></div>}</div>}
          {notice && <div className="trade-alert success" role="status">{notice}</div>}
          <button className="btn reset-account-button" onClick={() => void resetDemoAccount()} disabled={resetting}>
            {resetting ? "Resetting account…" : "Reset demo account"}
          </button>
          <p className="settings-footnote">A confirmation dialog is required before any account history is deleted. This action affects only your authenticated demo account.</p>
        </section>

        <section className="account-panel">
          <span className="trade-eyebrow">DATA & PRIVACY</span>
          <h2>Your data</h2>
          <p className="settings-copy">Demo account balances, orders, fills, and watchlists are scoped to your authenticated user. Fill markers and temporary price impacts are local chart effects; they are not shared market quotes or additional account transactions.</p>
          <div className="settings-links"><Link href="/portfolio" className="text-link">View portfolio →</Link><Link href="/orders" className="text-link">Review orders →</Link><Link href="/watchlist" className="text-link">Manage watchlist →</Link></div>
        </section>
      </div>
    </AppShell>
  );
}
