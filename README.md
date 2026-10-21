# NexoraTrade

A clean, light-themed cryptocurrency paper-trading platform. This repository is an initial application foundation; it is not connected to live trading or real-money rails.

## Safety model
- Demo funds only. No deposits, withdrawals, wallet addresses, private keys, or real-money orders.
- Prices shown in the starter UI are illustrative sample data, not live market quotes.
- Trade execution must be implemented server-side with authorization, atomic ledger updates, idempotency, decimal arithmetic, and stale-quote checks before this is used beyond a local prototype.
- Never expose `DATABASE_URL` or provider secrets to client code.

## Stack
Next.js App Router, React, TypeScript, Tailwind CSS v4, Drizzle ORM, Neon Postgres, Zod, Recharts, Vitest.

## Local setup
1. Install Node.js 20.
2. Copy `.env.example` to `.env.local`; leave `DATABASE_URL` blank until you have a development-branch connection string.
3. Run `npm install` then `npm run dev`.
4. Run `npm run typecheck`, `npm run lint`, and `npm test` before proposing changes.

## Neon setup
The existing Neon project is `ancient-union-47923213`. Keep its current production branch unchanged during development. Create/use a separate development branch, set its pooled URL in `DATABASE_URL` for the app, and use a direct connection for migrations. Do not run migrations against production without explicit approval. Existing `neon_auth` tables should be inspected before choosing the authentication integration.

## Project structure
- `src/app`: pages and route handlers
- `src/components`: navigation, cards, charts, shared UI
- `src/lib`: sample market data, formatting, validation, server database setup
- `src/db`: Drizzle schema and migration entrypoint
- `docs`: architecture, security boundaries, implementation roadmap

## Current status
Initial scaffold only. Authentication wiring, persisted demo accounts, live market-data ingestion, and server-authoritative order execution are not yet implemented. Do not present sample values as live data.
