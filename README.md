# NexoraTrade

NexoraTrade is a dark-first, educational paper-trading application built with Next.js 15, React 19, TypeScript, Tailwind CSS v4, Neon Postgres/Auth, Drizzle ORM, Zod, Recharts, Vitest, and Lightweight Charts.

**This application is a demo trading simulator. It does not connect to a brokerage and does not place real-money trades.**

## Current product capabilities

- Provider-sourced historical OHLCV candles through a server-side market-data endpoint.
- Lightweight Charts candlesticks, volume histogram, crosshair, zoom/pan, fit-to-data, timeframe switching, and quote metadata.
- Supported watchlist instruments: AAPL, MSFT, NVDA, TSLA, AMZN, GOOGL, META, AMD, SPY, QQQ, BTC-USD, and ETH-USD.
- Batch market quotes and gainers/losers filters, with unavailable quotes shown honestly.
- Authenticated demo account, server-validated simulated market orders, cash and position checks, idempotency, fills, ledger entries, and persisted positions.
- Account/portfolio views, stored equity snapshots, order history, and per-user persistent watchlists.

## Data provider

The current integration uses Yahoo Finance's chart-data endpoint as an **unofficial provider interface**. It supplies historical or potentially delayed data and may rate-limit or change behavior. The application labels the data as historical/potentially delayed; it does not promise real-time quotes.

Provider credentials are not required for this endpoint. For a production-grade commercial product, evaluate a supported market-data vendor and its licensing, exchange coverage, latency, rate limits, and redistribution terms before claiming real-time data.

## Environment variables

Set these in the environment where the app runs:

- `DATABASE_URL`: Neon Postgres connection string for that environment.
- `NEON_AUTH_BASE_URL`: Neon Auth URL for the matching Neon branch.
- `NEON_AUTH_COOKIE_SECRET`: high-entropy secret of at least 32 characters. Generate locally; never commit or share it.
- `NEXT_PUBLIC_NEON_AUTH_URL`: public Neon Auth URL used by the existing app setup.
- `NEXT_PUBLIC_APP_URL`: app origin.

Do not commit secret values. Keep each environment's database URL and Auth URL matched to the same Neon branch.

## Database migrations

The core schema migration is `drizzle/0001_core_trading.sql`.

It has been applied and smoke-tested **only on the dedicated Neon development branch** `nexoratrade-development` (`br-wandering-brook-b4hkz1hg`). The smoke test covered buy/sell accounting, average position updates, duplicate idempotency behavior, insufficient cash/position rejection, stale quote rejection, and verified its test fixtures were rolled back.

The protected production branch has not been migrated by this work. Before enabling persistent trading in production, review the migration and apply it to the intended production database through a separately reviewed deployment procedure. Do not point a development build at the production branch.

## Local setup

1. Install Node.js 20 or later.
2. Copy `.env.example` to `.env.local` and fill in development-branch settings.
3. Install dependencies with `npm install`.
4. Run `npm run dev`.
5. Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` before release.

## Routes

- `/` — overview, real quote watch, and account summary.
- `/markets` — candlestick chart and instrument selection.
- `/trade` — simulated market-order ticket.
- `/portfolio` — current positions and recorded equity history.
- `/orders` — persisted demo order history.
- `/watchlist` — saved user watchlist.
- `/academy` — learning section (lesson content is still a follow-up task).

## Known limitations / release checklist

- The market data provider is unofficial and may be delayed/rate-limited; no WebSocket real-time stream is configured.
- Market orders are simulated; limit orders, pending orders, cancellation, fees, short selling, and brokerage integration are not enabled.
- Equity snapshots are recorded when the authenticated account endpoint is viewed, at most once per 15 minutes. They are not a scheduled continuous portfolio feed.
- Production persistence requires a reviewed production schema migration and correct production environment variables.
- Verify the Vercel deployment and all environment settings before considering the release operational.
