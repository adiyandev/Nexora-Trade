# Security notes

- This is a demo-only paper-trading application. No real-money transactions, deposits, withdrawals, private keys, or wallet custody.
- Sample prices and account values are illustrative, not live.
- Keep secrets server-side; never expose `DATABASE_URL` to client bundles.
- Every API route must validate input and authorize account ownership.
- Trade execution must use database transactions, idempotency keys, immutable fills, ledger entries, and decimal-safe math.
- Test migrations on a separate Neon branch. Production database remains untouched until explicitly approved.
