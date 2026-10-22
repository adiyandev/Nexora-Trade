# NexoraTrade — Product, Design, and System Guide

NexoraTrade is a dark-first, demo-only trading terminal. It combines fictional instruments, generated simulated prices and candles, a virtual trading account, and account-specific portfolio tools in a Next.js web application.

> **Demo-only product.** NexoraTrade does not connect to a brokerage, accept deposits, or execute real-money trades. Every instrument, price, and candle in the market UI is fictional or simulated. Nothing represents a real security or live market quote.

This guide describes the implementation in this repository. It is not a product promise for features that have not been built.

## Contents

- [Product scope](#product-scope)
- [Technology and project structure](#technology-and-project-structure)
- [Getting started](#getting-started)
- [Environment configuration](#environment-configuration)
- [Routes and screens](#routes-and-screens)
- [Visual design system](#visual-design-system)
- [Trading terminal layout](#trading-terminal-layout)
- [In-house chart](#in-house-chart)
- [Market data and simulated instruments](#market-data-and-simulated-instruments)
- [Demo trading and account data](#demo-trading-and-account-data)
- [API reference](#api-reference)
- [Database and migrations](#database-and-migrations)
- [Authentication and security boundaries](#authentication-and-security-boundaries)
- [Testing and quality checks](#testing-and-quality-checks)
- [Known limitations](#known-limitations)

## Product scope

The app provides simulated market exploration and account-backed demo trading:

- Only fictional Nexora demo tickers are exposed in search, watchlists, charts, quotes, and the order ticket.
- Fictional prices and candles are generated for display and paper-trading practice. They are not real securities or exchange data.
- Signed-in users can manage a virtual account, submit supported market buy/sell orders, review positions and order history, and maintain a personal watchlist.
- The server validates and executes demo orders against virtual funds; browser-side controls are not a substitute for server validation.
- The charts are implemented by NexoraTrade using SVG and React. The app does not use TradingView or Lightweight Charts.

## Technology and project structure

| Area | Implementation |
| --- | --- |
| Web framework | Next.js 15 App Router |
| UI | React 19, TypeScript, Tailwind CSS v4, application CSS |
| Icons | Lucide React |
| Database | Neon Postgres with Drizzle ORM |
| Authentication | Neon Auth |
| Validation | Zod |
| Portfolio chart | Recharts |
| Market candlestick chart | In-house interactive SVG renderer |
| Tests | Vitest |

```text
src/
  app/                 Pages, layouts, and API route handlers
  app/api/             Market-data and authenticated demo-account endpoints
  components/          Shared page shell, charts, tables, and account views
  db/                  Server-side Neon connection and Drizzle schema
  lib/                 Market data, simulated instruments, auth, and validation
drizzle/               SQL migrations
docs/                  Architecture, migration, roadmap, and deployment notes
```

### Important components and modules

| File | Responsibility |
| --- | --- |
| `src/components/app-shell.tsx` | Shared navigation, global symbol search, DEMO status, and page frame. |
| `src/components/live-candlestick-chart.tsx` | Demo instrument selection, timeframe selection, simulated quote/candle loading, refresh, watchlist save, OHLC display, and simulated candle updates. Used by both Markets and Trade screens. |
| `src/components/market-candlestick-plot.tsx` | In-house SVG candles, SMA 20, volume bars, axes, hover/crosshair, zoom, drag-pan, and fit-to-data behavior. |
| `src/components/market-quotes-panel.tsx` | Market quote overview and market filters. |
| `src/components/market-table.tsx` | Tabular market listing. |
| `src/components/demo-account-view.tsx` | Overview and portfolio account metrics, equity history, positions, and recent activity. |
| `src/components/portfolio-chart.tsx` | Shared portfolio-visualization component, where used. |
| `src/lib/demo-instruments.ts` | Fictional instrument catalog, simulated quote function, and prior-close calculation. |
| `src/lib/market-data.ts` | Server-only simulated quote generation for supported fictional instruments. |
| `src/db/schema.ts` | Drizzle definitions for application account and trading tables. |

## Getting started

1. Install Node.js 20 or later.
2. Copy `.env.example` to `.env.local`.
3. Set the development Neon/Auth configuration described below.
4. Install dependencies with `npm install`.
5. Review and apply the SQL migrations in order to the **development database branch**.
6. Start the app with `npm run dev`.

Useful project scripts:

```sh
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
```

The authenticated account and order features require configured authentication and a compatible database. Simulated market browsing does not require a market-data provider.

## Environment configuration

Configure secrets in the deployment environment or an untracked local `.env.local`. Never commit secret values.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon Postgres application connection for the selected environment. |
| `NEON_AUTH_BASE_URL` | Neon Auth endpoint associated with the same database branch. |
| `NEON_AUTH_COOKIE_SECRET` | High-entropy cookie secret of at least 32 characters. Generate it locally. |
| `NEXT_PUBLIC_NEON_AUTH_URL` | Public Neon Auth URL used by the client-side auth setup. |
| `NEXT_PUBLIC_APP_URL` | Application origin used by the app/auth configuration. |

Keep the database and Neon Auth URLs pointed at matching branches. Development must not use the production database branch.

## Routes and screens

| Route | Screen |
| --- | --- |
| `/` | Overview, market snapshot, and demo account summary. |
| `/markets` | Fictional instrument watchlist, symbol search, simulated quote metadata, chart, timeframe controls, and chart interactions. |
| `/trade` | Market chart alongside a virtual order ticket, account/position context, and open positions. |
| `/portfolio` | Demo account equity, performance metrics, historical snapshots, and positions. |
| `/orders` | User's recorded demo order history. |
| `/watchlist` | Account-specific saved demo symbols and their simulated quotes. |
| `/academy` | Learning route; detailed lesson content remains limited/in progress. |
| `/settings` | Settings route and account preferences surface. |
| `/auth/*` | Neon Auth sign-in, registration, and related auth pages. |

The shared `AppShell` provides a horizontal header with primary navigation and keyboard-accessible search over fictional demo instruments only. Search results open the corresponding symbol on `/markets`.

## Visual design system

The application uses distinct visual treatments for the general product pages and the market terminal:

- **Application and trading-terminal surfaces:** dark canvas, raised near-black panels, cool gray borders, compact typography, rounded corners, and green accents.
- **Market movement:** teal/green for rising candles and positive values; coral/red for falling candles and negative values; purple for the SMA 20 overlay.
- **Status and trust cues:** DEMO/virtual-funds labels remain visible, and fictional instruments and simulated prices are explicitly identified.
- **Layout:** Nexora-branded navigation, symbol search, settings, account actions, virtual cash, and equity live in a compact horizontal header. The desktop trade workspace places the symbol list and order ticket at the sides, with the chart and positions in the center column. Smaller screens wrap navigation and stack panels, turning the watchlist into a horizontal scroller.
- **Controls:** timeframe tabs, refresh, watchlist-save, fit, search, and order actions use consistent compact buttons, clear active/disabled states, and labels/tooltips where appropriate.

The main global stylesheet is `src/app/globals.css`. The chart SVG draws its own grid and labels and is sized through the chart container; it does not rely on a third-party charting runtime.

## Trading terminal layout

The shared market chart component supports the Markets page and embedded Trade workspace:

1. **Instrument watchlist:** fictional demo symbols only; can be filtered in place.
2. **Quote heading:** instrument name, exchange, current quote, and change where available.
3. **Market statistics:** asset class, previous close, chart-window high/low, and window volume, all derived from simulated data.
4. **Market metadata:** simulated status, demo session, quote timestamp, and fetch time.
5. **Chart toolbar:** timeframe selection, watchlist save, SMA 20 toggle, fit, refresh, zoom buttons, drag-to-pan, wheel zoom, and Shift+wheel horizontal navigation.
6. **Chart:** candle plot with moving average and volume, sized for its containing panel.
7. **OHLC strip/footer:** open, high, low, close, volume, hovered candle time, and an explicit demo-data disclaimer.

In `/trade`, symbol selection is shared with the ticket. For demo instruments, price updates are passed to the order ticket so its quote and the chart's displayed quote stay in sync. An order is still revalidated and priced by the server when submitted.

## In-house chart

`MarketCandlestickPlot` renders a responsive SVG plot without TradingView or Lightweight Charts.

### Visual layers

- Candle wicks show each bar's high-to-low range.
- Solid candle bodies show open-to-close movement: teal for up bars and coral for down bars.
- A purple SMA 20 line provides a simple trend reference.
- Volume bars occupy a separate lower chart region and follow the candle's direction color.
- Price and time axes, gridlines, latest-price marker, and current-value label provide orientation.
- A pointer crosshair links the hovered bar to the OHLC strip.

### Interactions

- Hover or pointer movement selects a candle and updates the OHLC readout.
- Wheel scrolling zooms the visible candle count.
- Pointer dragging pans through candle history.
- Fit expands the view to include all currently loaded candles.
- Shift+wheel or horizontal wheel movement pans through history; vertical wheel movement zooms.
- Successful Trade-page fills add a B/S marker and apply a short-lived, local-only price impact to the simulated candle stream. This is visual demo feedback, not a global quote, a market prediction, or an exchange effect.
- ResizeObserver keeps the SVG's view box aligned with the chart panel as the page responds to viewport changes.
- Changing symbol or timeframe resets chart navigation.

The component receives candle data as props. The chart does not own data fetching, order execution, or market-source selection.

## Market data and simulated instruments

### Simulated demo instruments

Every listed instrument is fictional and served from NexoraTrade's demo simulation. There is no real-symbol allowlist and no external market-data request in the quote or candle routes. The supported symbols in `src/lib/demo-instruments.ts` are:

`OMNI`, `VLT`, `HALO`, `BRIK`, `PWN`, `BLX`, `BYTE`, `CHIP`, `MEDI`, `LOOT`, `OBBY`, `SLRP`, `ROBO`, `LAND`, `POWR`, `DOMO`, and `INSR`.

The candle API builds illustrative history from each instrument's configured base price and change for timeframes `1m`, `5m`, `15m`, `1H`, `1D`, `1W`, and `1M`. The browser updates the latest demo candle and quote periodically to create visible motion. This deterministic price oscillation is for UI practice only; it is not a market feed, prediction, or executable price source.

## Demo trading and account data

The account and trade features are private to the authenticated user:

- New accounts start with $3,000 of virtual cash. Resetting an account restores $3,000 and clears its trading history. The balance migration changes only untouched legacy accounts; accounts with activity retain their prior starting balance.
- Orders currently support market buys and sells for assets seeded in the database.
- The server verifies the session, validates request data, retrieves a quote, and calls the database's transactional demo execution function.
- Execution records orders/fills and updates cash, positions, and ledger data. Idempotency keys protect against duplicate submissions. The Trade chart adds a local B/S marker and a fading simulated price impulse after a successful fill; this effect is not stored as a market quote or applied for other users.
- Account views calculate cash, position values, P&L, and equity from persisted account data and available quotes.
- Equity history consists of stored snapshots. Account reads record a new snapshot no more frequently than once per 15 minutes when quotes are available.
- Watchlists are associated with the authenticated user.

The user interface applies validation for convenience, but the server/database are the authority for order limits, cash, positions, and execution acceptance.

## API reference

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `/api/market/candles` | `GET` | Return generated demo candles for a supported fictional symbol/timeframe; rejects all other symbols. |
| `/api/market/quotes` | `GET` | Batch simulated quotes for supported fictional symbols; rejects all other symbols. |
| `/api/demo/account` | `GET` | Load the signed-in user's demo account, positions, equity snapshots, and recent orders. |
| `/api/demo/orders` | `GET` | List the signed-in user's recorded orders. |
| `/api/demo/orders` | `POST` | Validate, price, and submit an idempotent demo market order. |
| `/api/demo/watchlist` | `GET` | Load a user's active demo watchlist and simulated quotes. |
| `/api/demo/watchlist` | `POST` | Add a supported active demo asset to the user's watchlist. |
| `/api/demo/watchlist?symbol=...` | `DELETE` | Remove a symbol from the user's watchlist. |
| `/api/demo/reset` | `POST` | Reset endpoint for the authenticated demo account; consult its handler before use. |
| `/api/health` | `GET` | Basic service health endpoint. |
| `/api/auth/*` | Auth methods | Neon Auth route integration. |

Account and watchlist APIs require a valid signed-in session. Error responses communicate configuration, auth, unsupported-symbol, and validation failures; clients should not treat missing data as successful account/order state.

## Database and migrations

Drizzle schema and connection code live in `src/db/`. SQL migrations are versioned in `drizzle/`:

- `0001_core_trading.sql` defines the core demo trading schema, constraints, and execution logic.
- `0002_demo_market_symbols.sql` adds fictitious demo-only assets so they can be referenced by orders and watchlists.
- `0003_demo_only_market.sql` disables legacy real-market assets, removes them from saved watchlists, and corrects the quote-source label for new simulated orders while preserving historical order records.
- `0004_demo_starting_balance.sql` sets the new-account and reset default to $3,000 and updates untouched legacy accounts; accounts with order, ledger, or open-position history are preserved.

Read `docs/DB-MIGRATIONS.md` and `docs/VERCEL-DEPLOYMENT.md` before migration or deployment work. Use a separate development Neon branch and test migrations there first. The core account/order functions were smoke-tested only on the dedicated development branch; migrations 0003 and 0004 have not been applied by this change.

## Authentication and security boundaries

- Browser components call application endpoints; they never connect directly to Postgres.
- Authentication and account ownership checks happen server-side.
- Order validation occurs server-side and is reinforced in the database execution function.
- SQL/database mutations use Drizzle or parameterized SQL.
- Environment secrets must remain out of source control and client bundles.
- All market prices are simulations and must not be used for real trading or investment decisions.
- Do not add brokerage credentials, deposits, withdrawals, real-money execution, or other real financial rails to this demo product without a separately reviewed product and security decision.

## Testing and quality checks

Run the targeted checks before proposing changes:

```sh
npm run typecheck
npm run lint
npm test
```

Vitest tests cover input validation and demo-instrument price/catalog behavior. UI changes should also be checked at desktop and mobile widths, especially the `/markets` chart, `/trade` terminal and ticket, hover OHLC display, timeframe/reset behavior, and quote-to-ticket synchronization.

## Known limitations

- No external quote provider or real-time market feed is configured.
- Fictional symbols and their candle movement are generated simulations, not investable securities. Trade-driven price impacts are local to the open Trade page and disappear after their short decay or a page reload.
- Orders are market-only, virtual fills. Limit orders, pending orders, cancellation, fees, short selling, and brokerage integration are not enabled.
- Equity history is recorded opportunistically when an account is viewed, with a 15-minute minimum interval; it is not a continuous scheduled time series.
- A production database migration and deployment must be reviewed separately; development setup or smoke tests do not authorize production rollout.
- The Academy route exists, but a complete lesson curriculum is not represented as shipped.
