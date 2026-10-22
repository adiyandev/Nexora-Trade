"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";

type Ranking = { displayName: string; returnPercent: number; maxDrawdownPercent: number; updatedAt: string };
type LeaderboardData = {
  profile: { displayName: string; isPublic: boolean } | null;
  season: string;
  rankings: Ranking[];
  methodology: string;
  error?: string;
};

export function LeaderboardWorkspace() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/leaderboard", { cache: "no-store" });
      const payload = await response.json() as LeaderboardData;
      if (!response.ok) throw new Error(payload.error || "Leaderboard could not be loaded.");
      setData(payload);
      setDisplayName(payload.profile?.displayName ?? "");
      setIsPublic(payload.profile?.isPublic ?? false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Leaderboard could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/leaderboard/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, isPublic }),
      });
      const payload = await response.json() as { profile?: { displayName: string; isPublic: boolean }; error?: string };
      if (!response.ok || !payload.profile) throw new Error(payload.error || "Profile could not be saved.");
      setNotice(payload.profile.isPublic ? "Your profile is now opted in to public rankings." : "Your profile is private and hidden from rankings.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Profile could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="leaderboard-workspace">
      <section className="leaderboard-privacy-note">
        <span className="account-mode">OPT-IN ONLY</span>
        <p>Public rankings use recorded demo portfolio snapshots, not client-submitted scores. Your profile stays hidden unless you explicitly opt in.</p>
      </section>
      <div className="leaderboard-layout">
        <section className="account-panel leaderboard-profile-panel">
          <span className="trade-eyebrow">PUBLIC PROFILE</span>
          <h2>Choose your display name</h2>
          <p className="muted">Only your chosen display name and simulated season metrics appear publicly. Your email and account ID are never listed.</p>
          {error && <div className="trade-alert error" role="alert">{error}{error.toLowerCase().includes("sign in") && <div className="trade-auth-links"><Link href="/auth/sign-in">Sign in</Link><Link href="/auth/sign-up">Create an account</Link></div>}</div>}
          {notice && <div className="trade-alert success" role="status">{notice}</div>}
          <form onSubmit={event => void saveProfile(event)} className="leaderboard-profile-form">
            <div className="field"><label htmlFor="leaderboard-name">Display name</label><input id="leaderboard-name" value={displayName} onChange={event => setDisplayName(event.target.value)} minLength={3} maxLength={20} pattern="[A-Za-z0-9_ ]+" required placeholder="DemoTrader_01" /><small className="field-help">3–20 letters, numbers, spaces or underscores.</small></div>
            <label className="leaderboard-optin"><input type="checkbox" checked={isPublic} onChange={event => setIsPublic(event.target.checked)} /><span><b>Show me on the public leaderboard</b><small>Turn this off any time to hide your profile.</small></span></label>
            <button type="submit" className="btn overview-primary-action" disabled={saving || loading}>{saving ? "Saving profile…" : "Save privacy settings"}</button>
          </form>
        </section>

        <section className="account-panel leaderboard-ranking-panel">
          <div className="account-panel-head"><div><span className="trade-eyebrow">DEMO SEASON</span><h2>{data?.season ?? "Current season"}</h2><p>Ranked by return, then lower drawdown.</p></div><span className="history-count">Top 25</span></div>
          {loading && <div className="history-empty" role="status">Loading recorded season results…</div>}
          {!loading && data?.rankings.length === 0 && <div className="history-empty"><b>No public rankings yet</b><p>Opt in above and record portfolio snapshots through your demo portfolio to participate.</p></div>}
          {!loading && data && data.rankings.length > 0 && <div className="table-wrap"><table className="account-table"><thead><tr><th>Rank</th><th>Trader</th><th>Return</th><th>Max drawdown</th></tr></thead><tbody>
            {data.rankings.map((item, index) => <tr key={item.displayName}><td><span className="leaderboard-rank">{index + 1}</span></td><td><b>{item.displayName}</b></td><td className={item.returnPercent >= 0 ? "positive" : "negative"}>{item.returnPercent >= 0 ? "+" : ""}{item.returnPercent.toFixed(2)}%</td><td className="negative">{item.maxDrawdownPercent.toFixed(2)}%</td></tr>)}
          </tbody></table></div>}
          {data && <p className="leaderboard-methodology">{data.methodology}</p>}
        </section>
      </div>
    </div>
  );
}
