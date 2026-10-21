# NexoraTrade product roadmap

Product direction: a professional, dark-first trading terminal with a separate progression layer inspired by the depth of trading simulators such as Roblox Stock Exchange 2. This is a paper-trading product; it must never imply real brokerage execution.

## Release principles

- Keep real-provider markets and fictional simulated markets visibly and technically separate.
- Never invent real-market quotes or candles. Display provider, freshness, delay and unavailable states honestly.
- Keep all order validation and accounting server-authoritative.
- Bots must use the same validated order engine as manual demo trades.
- Progression rewards learning and disciplined process, not maximum risk or leverage.
- Never run development migrations against the protected production Neon branch.
- Every feature requires automated tests and a verified deployment before being described as shipped.

## Phase 0 — Stabilize and audit

- [ ] Inspect current `main`, package scripts, routes, schema, migrations, market-data provider, auth, and trade engine.
- [ ] Obtain the actual failing Vercel build logs and verify the commit Vercel cloned.
- [ ] Verify CI (typecheck, lint, tests, production build) on the exact commit.
- [ ] Review quote freshness and ensure the order engine rejects unavailable or stale quotes.
- [ ] Review transaction isolation, idempotency, account ownership and reset behavior.
- [ ] Verify development, Preview and Production environment variable separation.
- [ ] Confirm the app does not imply the market feed is guaranteed real-time.

## Phase 1 — Reliable terminal and trading foundation

- [x] Dark-first workstation styling and responsive chart workspace.
- [x] Provider-backed historical OHLCV and quote metadata.
- [x] Authenticated demo accounts, market orders, fills, ledger entries, positions and P&L.
- [x] Provider-backed symbol list and persistent watchlists.
- [ ] Add robust provider caching, coalescing, backoff and provider-specific rate-limit handling.
- [ ] Clearly label delayed, stale, closed-session and unavailable market data.
- [ ] Review decimal arithmetic and ledger invariants for every buy/sell path.
- [ ] Add configurable transparent simulated fees and slippage.
- [ ] Add functional pending limit orders, cancellation, and explicit order-state transitions.
- [ ] Add end-to-end trade journey tests and a tested mobile layout.
- [ ] Review visual hierarchy, loading/empty/error states, focus states and reduced-motion behavior.

## Phase 2 — Fictional Nexora Exchange

- [ ] Define a market-environment boundary: real-provider vs fictional-simulation.
- [ ] Add fictional instruments with explicit fictional branding, metadata and sectors.
- [ ] Implement a server-authoritative deterministic simulation engine with seeded/replayable tests.
- [ ] Generate OHLCV candles, volume and simulated events from the engine; never fabricate real-market candles.
- [ ] Persist fictional market state and simulation ticks safely.
- [ ] Separate virtual balances, positions, orders, ledgers and performance between environments.
- [ ] Add clear mode switching that cannot silently mix account history.
- [ ] Test repeatability, restart behavior, bounds, market halts and malformed requests.

## Phase 3 — Short selling and risk controls

- [ ] Specify the accounting model for short positions, proceeds, collateral, margin and buying power.
- [ ] Track position direction, average entry, partial close, realized/unrealized P&L and fees.
- [ ] Add margin limits, forced-close rules, and explicit rejection reasons.
- [ ] Ensure short-sale proceeds and collateral cannot be spent twice.
- [ ] Add property-based or invariant tests for long/short accounting, concurrent orders and duplicate submissions.
- [ ] Explain simulated risk clearly; do not present virtual fills as brokerage execution.

## Phase 4 — Progression HQ

- [ ] Extend existing learning progress with a server-owned XP ledger and progression profile.
- [ ] Define levels, lessons, daily/weekly missions and achievements.
- [ ] Make reward claims idempotent and enforce completion conditions server-side.
- [ ] Reward education, journaling and risk-aware behavior; do not reward oversized exposure or losses recovered through gambling-like mechanics.
- [ ] Add earned cosmetic titles, badges and terminal customization.
- [ ] Add clear progress, empty, completed and unavailable states.
- [ ] Test duplicate claims, timezone boundaries and account isolation.

## Phase 5 — Bot laboratory

- [ ] Begin with deterministic rule-based strategies, not unrestricted autonomous agents.
- [ ] Add strategy configuration, versioning, risk limits and a kill switch.
- [ ] Build a backtest engine with explicit assumptions, fees, slippage and no look-ahead bias.
- [ ] Run bots only in a paper account and through the normal validated order service.
- [ ] Add run logs, decisions, errors, exposure, drawdown and stop reasons.
- [ ] Isolate jobs and enforce time, memory, order-rate and notional limits.
- [ ] Test restarts, duplicate scheduling, concurrent execution and permission boundaries.

## Phase 6 — Leaderboards and seasons

- [ ] Define season resets and consistent starting balances/rules.
- [ ] Keep Real Markets and Nexora Exchange rankings separate.
- [ ] Choose metrics that show return alongside drawdown and risk; avoid ranking by leverage alone.
- [ ] Use recorded transactions/snapshots as source data, not client-submitted performance.
- [ ] Add opt-in public profiles, display-name controls and privacy-safe ranking data.
- [ ] Detect resets, duplicate rewards, abusive account churn and suspicious bot behavior.
- [ ] Test deterministic scoring and tie-breaking.

## Phase 7 — Quality and release

- [ ] Run lint, typecheck, unit, integration and production build checks on the final commit.
- [ ] Test API malformed inputs, auth isolation, idempotency, rate limits and transactional failures.
- [ ] Inspect desktop, tablet and mobile layouts; verify keyboard and reduced-motion behavior.
- [ ] Review market-data provider terms, reliability and limitations.
- [ ] Review every schema migration and apply only to the designated development Neon branch during development.
- [ ] Obtain explicit production migration review before any production schema change.
- [ ] Confirm the deployed Vercel commit matches the release commit and smoke-test the deployed site.
- [ ] Document known provider delays, missing credentials and feature limitations.

## Current known constraints

- The market-data adapter uses an unofficial Yahoo Finance chart endpoint; data may be delayed, rate-limited or unavailable.
- The existing order path is market-order focused and long-only. Short selling requires an accounting/schema design before UI controls are added.
- Vercel deployment status and production database configuration must be verified independently of GitHub CI.
- No real-money brokerage execution is in scope.
