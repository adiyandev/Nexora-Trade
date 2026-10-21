# Database migrations

1. Create a separate Neon development branch from production.
2. Set `DATABASE_URL` to the development branch's pooled connection string for application traffic.
3. Use a direct connection string for migration execution.
4. Generate reviewed migrations with Drizzle Kit and commit them to `drizzle/`.
5. Test migrations against development data before proposing production rollout.

Do not apply schema changes to the production branch without explicit approval. Existing `neon_auth` tables must be inspected before integrating auth; do not recreate them in the application schema.
