# NexoraTrade product roadmap

Product direction: a professional, dark-first trading terminal with fictional Nexora instruments, generated market motion, and a separate progression layer. This is a paper-trading product; it must never imply real brokerage execution.

## Release principles

- Keep the active market universe fictional and demo-only.
- Never imply generated quotes or candles are real market data.
- Keep all order validation and accounting server-authoritative.
- Bots must use the same validated order engine as manual demo trades.
- Progression rewards learning and disciplined process, not maximum risk or leverage.
- Never run development migrations against the protected production Neon branch.
- Every feature requires automated tests and a verified deployment before being described as shipped.

## Phase 0 — Stabilize and audit

- [x] Inspect current `main`, package scripts, routes, schema, migrations, demo market simulation, auth, and trade engine.
- [ ] Obtain the actual failing Vercel build logs and verify the commit Vercel cloned.
- [ ] Verify CI (typecheck, lint, tests, production build) on the exact commit.
- [x] Review quote freshness and ensure the order engine rejects unavailable or stale quotes.
- [x] Review transaction isolation, idempotency, account ownership and reset behavior.
- [ ] Verify development, Preview and Production environment variable separation.
- [x] Label demo quotes and generated candles as simulated, not real-time market data.

## Phase 1 — Reliable terminal and trading foundation

- [x] Dark-first workstation styling and responsive chart workspace.
- [x] Generated OHLCV candles and quote metadata for fictional demo instruments.
- [x] Authenticated demo accounts, market orders, fills, ledger entries, positions and P&L.
- [x] Demo-only symbol list and persistent watchlists.
- [x] In-house SVG chart with candles, volume, SMA, zoom, pan, and fit controls.
- [ ] Review decimal arithmetic and ledger invariants for every buy/sell path.
- [ ] Add configurable transparent simulated fees and slippage.
- [ ] Add functional pending limit orders, cancellation, and explicit order-state transitions.
- [ ] Add end-to-end trade journey tests and a tested mobile layout.
- [ ] Review visual hierarchy, loading/empty/error states, focus states and reduced-motion behavior.

## Phase 2 — Fictional Nexora Exchange

- [x] Restrict market search, quotes, candles, and trading to fictional demo instruments.
- [x] Add fictional instruments with explicit fictional branding, metadata and sectors.
- [x] Implement a server-authoritative deterministic simulation engine with replayable quote tests.
- [x] Generate deterministic OHLCV candles, volume and simulated quote metadata; never fabricate real-market candles.
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
- [x] Add an idempotent server-owned XP ledger and persisted lesson completion records.
- [x] Define initial levels and four beginner lessons with server-validated quizzes.
- [ ] Add daily/weekly missions and achievements.
- [x] Make lesson XP awards idempotent and validate quiz completion server-side.
- [ ] Add idempotent reward claims for missions and achievements.
- [ ] Reward education, journaling and risk-aware behavior; do not reward oversized exposure or losses recovered through gambling-like mechanics.
- [ ] Add earned cosmetic titles, badges and terminal customization.
- [x] Add clear academy progress, empty, completed and unavailable states.
- [ ] Test duplicate claims, timezone boundaries and account isolation.

## Phase 5 — Bot laboratory

- [x] Begin with a deterministic rule-based SMA crossover strategy, not unrestricted autonomous agents.
- [ ] Add strategy configuration, versioning, risk limits and a kill switch.
- [x] Build a deterministic SMA crossover backtest with explicit fee/slippage assumptions and next-bar execution.
- [ ] Persist strategy versions and backtest run logs.
- [ ] Run bots only in a paper account and through the normal validated order service.
- [ ] Add run logs, decisions, errors, exposure, drawdown and stop reasons.
- [ ] Isolate jobs and enforce time, memory, order-rate and notional limits.
- [ ] Test restarts, duplicate scheduling, concurrent execution and permission boundaries.

## Phase 6 — Leaderboards and seasons

- [x] Define monthly seasons based on recorded snapshots and a consistent return/drawdown methodology.
- [ ] Keep simulated market rankings separate from other progression rankings.
- [x] Rank by return with maximum drawdown shown alongside; tie-break on lower drawdown.
- [x] Use recorded current-season portfolio snapshots as the ranking source, not client-submitted performance.
- [x] Add opt-in public profiles, display-name controls and privacy-safe ranking data.
- [ ] Detect resets, duplicate rewards, abusive account churn and suspicious bot behavior.
- [ ] Test deterministic scoring and tie-breaking.

## Phase 7 — Quality and release

- [ ] Run lint, typecheck, unit, integration and production build checks on the final commit.
- [ ] Test API malformed inputs, auth isolation, idempotency, rate limits and transactional failures.
- [ ] Inspect desktop, tablet and mobile layouts; verify keyboard and reduced-motion behavior.
- [ ] Review generated market simulation bounds and all UI labels for clear demo-only status.
- [ ] Review every schema migration and apply only to the designated development Neon branch during development.
- [ ] Obtain explicit production migration review before any production schema change.
- [ ] Confirm the deployed Vercel commit matches the release commit and smoke-test the deployed site.
- [ ] Document simulation assumptions, missing features and deployment limitations.

## Current known constraints

- Market values and candles are generated simulations; they do not model or represent real exchange behavior.
- The existing order path is market-order focused and long-only. Short selling requires an accounting/schema design before UI controls are added.
- Vercel deployment status and production database configuration must be verified independently of GitHub CI.
- No real-money brokerage execution is in scope.
