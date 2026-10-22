# Vercel deployment

NexoraTrade is a Next.js App Router application and must be deployed to a server-capable host such as Vercel. GitHub Pages only hosts static files and is not suitable for this authenticated application.

## Connect the repository

1. Open https://vercel.com/new and import `adiyandev/Nexora-Trade`.
2. Keep the framework preset as Next.js and the root directory as `./`.
3. Use `main` for production deployments.
4. Do not configure static export.

## Environment variables

Set these in Vercel Project Settings → Environment Variables for Preview and Production as appropriate:

- `DATABASE_URL` (preferred) or `DATABASE_URL_UNPOOLED`: connection string for the Neon branch that matches this deployment. Production uses the production branch; development and preview environments should use a separate development branch. Never use production for development or schema experiments.
- `NEON_AUTH_BASE_URL`: Neon Auth base URL for the same development branch.
- `NEXT_PUBLIC_NEON_AUTH_URL`: same Auth URL; this URL is public configuration, not a database credential.
- `NEON_AUTH_COOKIE_SECRET`: unique random value of at least 32 characters. Generate with `openssl rand -base64 32`. Never reuse across unrelated applications.
- `NEXT_PUBLIC_APP_URL`: canonical Vercel URL (public configuration).

Never prefix private credentials with `NEXT_PUBLIC_`. GitHub Actions secrets do not automatically populate Vercel runtime environment variables.

## Neon Auth

Neon Auth is enabled on both the production branch and `nexoratrade-development`. The production `NEON_AUTH_BASE_URL` and `NEXT_PUBLIC_NEON_AUTH_URL` must point to the production branch's Auth endpoint; the development/preview values should point to the development branch. The canonical production URL `https://nexora-trade-bice.vercel.app` is already listed as a trusted origin on production Neon Auth. Keep `NEON_AUTH_COOKIE_SECRET` configured for production and never expose it to the browser.

## CI

GitHub Actions runs type checking, linting, tests, and a Next.js build on pushes to `main`. It uses fake, nonfunctional values for build-time configuration and does not run database migrations.

## Production rollout status (2026-10-22)

The production database schema migrations `0001`–`0007` have been applied and verified. Production Vercel now has `NEXT_PUBLIC_NEON_AUTH_URL` configured, and the database client falls back to the integration-provided `DATABASE_URL_UNPOOLED` when `DATABASE_URL` is absent. The latest deployment and CI checks must still finish before declaring the latest code revision verified. The trade interface remains a paper-trading simulator, not a live trading engine.
