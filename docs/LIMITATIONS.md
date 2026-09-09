# Known Limitations / Incomplete Parts

This was scoped to demonstrate full-stack fundamentals within the assignment
window, not to be production-complete. Called out explicitly rather than
hidden:

## Not implemented
- **Purchase Order module** — inbound stock is currently recorded via the
  generic Stock Movement log (`IN` + reason), not a dedicated PO
  create/approve/receive workflow with supplier records.
- **Invoice module / PDF export** — challans exist, but there is no separate
  GST invoice generation or PDF export (listed as a bonus in the brief).
- **Accounts role is read-only** — no accounts-specific screens (e.g.
  receivables, payments) exist yet; the role only gates future write access.
- **Password reset / user management UI** — users are seeded directly in the
  database; there's no "create user" or "forgot password" flow.
- **File/image upload (S3)** — product image upload is not implemented (listed
  as a bonus in the brief).
- **CI/CD pipeline** — no GitHub Actions workflow is included; deployment is
  manual (documented in `DEPLOYMENT.md`).
- **Automated tests** — no unit/integration test suite yet. Given more time,
  the next additions would be: Vitest/Jest tests for the challan stock-transaction
  logic (the highest-risk business rule), and Supertest coverage of the auth/role
  middleware.

## Simplifications
- **Single warehouse per product** — `location` is a free-text field rather
  than a full multi-warehouse stock ledger with per-location quantities.
- **No pessimistic locking beyond the DB transaction** — concurrent
  confirmation of two challans against the same low-stock product is handled
  correctly (the transaction re-checks stock and the second one fails
  cleanly), but there's no optimistic-concurrency version field on `Product`.
- **Customer follow-up reminders are passive** — `followUpDate` is stored and
  shown, but there's no notification/reminder job.
- **Basic pagination** — list endpoints support `page`/`limit`, but the
  frontend list screens don't yet render pagination controls (they show the
  first page/limit worth of results); the API itself is ready for it.
- **CORS is origin-list based**, not fully dynamic — fine for a small number
  of known frontend deployments, would need revisiting for multi-tenant use.

## Deliberate scope decisions
- Sales challans are the only outbound stock-affecting document — this
  satisfies the module 4 requirement (stock reduction, no negative stock,
  product snapshotting) without also building a parallel invoice flow that
  would duplicate most of the same logic.
- Role permissions favor "everyone can read, specific roles can write" rather
  than fully bespoke per-field permissions, matching the brief's emphasis on
  4 simple roles rather than granular ACLs.
