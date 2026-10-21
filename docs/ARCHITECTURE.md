# Architecture

NexoraTrade starts as a modular Next.js monolith with a PostgreSQL data layer on Neon. Browser components must never connect directly to the database. All account ownership checks and future trade execution belong on the server.

## Boundaries
- `src/app`: routes and pages
- `src/components`: shared presentation components
- `src/lib`: formatting, sample data, and input validation
- `src/db`: server-only database connection and Drizzle schema
- `drizzle`: versioned migrations

## Trading safety requirements
Use decimal-safe arithmetic, transactionally update the ledger and positions, make order requests idempotent, reject stale quotes, and verify account ownership on every request. Demo funds only; never add real-money rails to this product.
