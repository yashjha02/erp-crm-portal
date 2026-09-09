# Architecture

## Overview

```
┌─────────────┐        HTTPS/JSON        ┌──────────────┐       SQL       ┌────────────┐
│  React SPA  │ ───────────────────────▶ │  Express API │ ───────────────▶ │ PostgreSQL │
│  (Vite)     │ ◀─────────────────────── │  (TS, Prisma)│ ◀─────────────── │            │
└─────────────┘        JWT bearer         └──────────────┘                  └────────────┘
```

- **Frontend** is a single-page React app. It never talks to the database directly —
  all data access goes through the REST API. Auth state (JWT + user profile) is kept
  in `localStorage` and attached as an `Authorization: Bearer <token>` header via a
  small `api` client wrapper (`frontend/src/api/client.ts`).
- **Backend** is a layered Express app:
  - `routes/*` — wire up URL + HTTP method + middleware chain (auth, role, validation)
  - `controllers/*` — request handling + business logic
  - `middleware/*` — cross-cutting concerns (JWT auth, role checks, Zod validation, error formatting)
  - `lib/prisma.ts` — a single shared Prisma Client instance
  - `prisma/schema.prisma` — single source of truth for the DB schema
- **Database**: PostgreSQL, accessed exclusively through Prisma (typed queries,
  migrations tracked in `prisma/migrations`).

## Why this stack

- **Express over NestJS**: for a project this size, Express + a thin layered structure
  gives the same clarity as Nest's modules/controllers/services without the extra
  boilerplate (decorators, DI container) — easier to review in a case-study context.
- **Prisma**: type-safe queries, first-class PostgreSQL support, and built-in
  migration tooling, which matters for a schema with several relations
  (Customer → Notes/Challans, Product → StockMovements, Challan → ChallanItems).
- **Zod** for request validation: schemas double as TypeScript types via `z.infer`,
  so validated request bodies are already correctly typed in controllers.
- **JWT (stateless) auth**: simplest correct option for an internal tool with a
  handful of roles; no session store needed.

## Data model

- `User` — `role` enum drives all authorization checks.
- `Customer` — CRM entity; `CustomerNote[]` gives an append-only follow-up log.
- `Product` — inventory entity; `currentStock` is the live balance,
  `StockMovement[]` is the append-only audit trail of every IN/OUT change
  (manual adjustments *and* challan-driven deductions/restorations all write
  a movement row with a `reason`).
- `Challan` + `ChallanItem` — the sales document. Two important design choices:
  1. **Snapshotting**: `customerSnapshot` (on `Challan`) and `productSnapshot`
     (on `ChallanItem`) store a JSON copy of the customer/product data *at the
     time of the challan*, in addition to the foreign keys. This means a
     challan's printed/exported contents never silently change if someone
     later edits the customer's address or a product's price — a real
     requirement for anything resembling a legal/accounting document.
  2. **Stock is only touched on `CONFIRMED`**: a `DRAFT` challan reserves
     nothing. Moving `DRAFT → CONFIRMED` (or creating directly as `CONFIRMED`)
     validates every line against current stock *inside a single DB
     transaction* and decrements stock + writes `StockMovement` rows
     atomically. `CONFIRMED → CANCELLED` restores the stock it had reduced.
     This all happens in `prisma.$transaction(...)` so a partial failure
     can't leave stock and challan state inconsistent.

## Request flow example — confirming a challan

1. `PATCH /challans/:id/status { status: "CONFIRMED" }` hits
   `requireAuth` → `requireRole("ADMIN","SALES","WAREHOUSE")` → `validateBody`.
2. `challan.controller.ts#updateChallanStatus` opens a transaction, loads the
   challan + items, re-checks each product's `currentStock` against the
   requested quantity (never trusts client-side numbers), decrements stock,
   and inserts one `StockMovement` per line item with `reason` referencing
   the challan number.
3. If any line is short on stock, the whole transaction throws an `ApiError`
   with `400` and a message naming the specific product/quantity — nothing
   is written.

## Frontend structure

- `context/AuthContext.tsx` — holds the logged-in user and login/logout logic.
- `components/Layout.tsx` — sidebar nav + route guard (redirects to `/login`
  if not authenticated).
- `pages/*` — one file per screen (Dashboard, Customers, CustomerDetail,
  Products, Challans, ChallanNew, ChallanDetail).
- `api/client.ts` — thin fetch wrapper that injects the JWT and normalizes
  error responses into `ApiClientError`.

The UI hides write actions (Add/Edit buttons) based on `user.role`, but this
is a UX convenience only — every write is re-checked by `requireRole` on the
server, which is the actual security boundary.

## Error handling & validation

- Every request body is validated with a Zod schema before it reaches a
  controller (`middleware/validate.ts`); failures return `400` with a
  field-level error map.
- `asyncHandler` wraps every controller so thrown/rejected errors reach the
  centralized `errorHandler` middleware instead of crashing the process.
- `errorHandler` maps known Prisma errors (`P2002` unique constraint →
  `409`, `P2025` not found → `404`) and any `ApiError` to the right HTTP
  status; anything unexpected falls back to `500` with a generic message
  (details are logged server-side, not leaked to the client in production
  beyond the message).
