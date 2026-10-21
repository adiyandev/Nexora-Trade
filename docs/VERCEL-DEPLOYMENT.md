# Vercel deployment

NexoraTrade is a Next.js App Router application and must be deployed to a server-capable host such as Vercel. GitHub Pages only hosts static files and is not suitable for this authenticated application.

## Connect the repository

1. Open https://vercel.com/new and import `adiyandev/Nexora-Trade`.
2. Keep the framework preset as Next.js and the root directory as `./`.
3. Use `main` for production deployments.
4. Do not configure static export.

## Environment variables

Set these in Vercel Project Settings → Environment Variables for Preview and Production as appropriate:

- `DATABASE_URL`: pooled connection string for Neon branch `nexoratrade-development` while developing. Never use production for development or schema experiments.
- `NEON_AUTH_BASE_URL`: Neon Auth base URL for the same development branch.
- `NEXT_PUBLIC_NEON_AUTH_URL`: same Auth URL; this URL is public configuration, not a database credential.
- `NEON_AUTH_COOKIE_SECRET`: unique random value of at least 32 characters. Generate with `openssl rand -base64 32`. Never reuse across unrelated applications.
- `NEXT_PUBLIC_APP_URL`: canonical Vercel URL (public configuration).

Never prefix private credentials with `NEXT_PUBLIC_`. GitHub Actions secrets do not automatically populate Vercel runtime environment variables.

## Neon Auth

Neon Auth is enabled on `nexoratrade-development`. The UI supports email OTP and the provider configured on that branch. Once Vercel assigns a canonical URL, add it to Neon Auth's trusted origins / redirect URLs. Do not modify the Neon production branch.

## CI

GitHub Actions runs type checking, linting, tests, and a Next.js build on pushes to `main`. It uses fake, nonfunctional values for build-time configuration and does not run database migrations.

## Current limitations

Deployment and login remain unverified until Vercel completes a successful build and its domain is added to Neon Auth trusted origins. The trade interface remains a paper-trading preview, not a live trading engine.
