# Mini ERP + CRM Operations Portal

A small internal ERP/CRM system for a wholesale/distribution company: customers,
products & inventory, and a sales challan workflow with stock control.

- **Backend:** Node.js + TypeScript + Express + Prisma + PostgreSQL, JWT auth, role-based access
- **Frontend:** React + TypeScript + Vite, responsive admin UI
- **Deployment:** Render/Railway/Fly.io (backend), Vercel/Netlify (frontend), Neon/Supabase/Render (Postgres) — see `docs/DEPLOYMENT.md`

```
erp-crm/
├── backend/          Express + Prisma API
├── frontend/          React + Vite admin UI
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   ├── LIMITATIONS.md
│   └── postman_collection.json
└── docker-compose.yml Local Postgres + API in containers
```

## 1. Roles & demo credentials

All roles use the password: **`Password123!`**

| Role       | Email               |
|------------|----------------------|
| Admin      | admin@erp.test        |
| Sales      | sales@erp.test        |
| Warehouse  | warehouse@erp.test    |
| Accounts   | accounts@erp.test     |

Permission summary:

| Action                              | Admin | Sales | Warehouse | Accounts |
|--------------------------------------|:---:|:---:|:---:|:---:|
| View customers/products/challans      | ✅ | ✅ | ✅ | ✅ |
| Create/edit customers, add notes      | ✅ | ✅ | ❌ | ❌ |
| Create/edit products, stock movements | ✅ | ❌ | ✅ | ❌ |
| Create sales challans                 | ✅ | ✅ | ❌ | ❌ |
| Confirm/cancel challans               | ✅ | ✅ | ✅ | ❌ |

Accounts currently has read-only access (see `docs/LIMITATIONS.md`).

## 2. Local setup — Backend

Requirements: Node 18+, a PostgreSQL database (local or free cloud instance).

```bash
cd backend
cp .env.example .env      # edit DATABASE_URL, JWT_SECRET as needed
npm install
npx prisma migrate dev --name init   # creates tables
npm run seed                          # creates demo users/customer/products
npm run dev                           # http://localhost:4000
```

Health check: `GET http://localhost:4000/health`

### Option B — Docker (Postgres + API together)

```bash
# from the repo root
docker compose up --build
```
This starts Postgres on `5432` and the API on `4000`. Run migrations/seed once
the containers are healthy:
```bash
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run seed
```

## 3. Local setup — Frontend

```bash
cd frontend
cp .env.example .env      # set VITE_API_URL=http://localhost:4000
npm install
npm run dev                # http://localhost:5173
```

Log in with any demo account above.

## 4. Environment variables

**Backend (`backend/.env`)**
| Variable | Description |
|---|---|
| `PORT` | Port the API listens on (default 4000) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign JWTs — set a long random value in production |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `8h` |
| `CORS_ORIGIN` | Comma-separated list of allowed frontend origins |

**Frontend (`frontend/.env`)**
| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the backend API |

Never commit real `.env` files — only the `.env.example` templates are tracked in git.

## 5. Deployment

Full step-by-step instructions (Render + Vercel + Neon, all free tiers) are in
**`docs/DEPLOYMENT.md`**, plus an optional AWS EC2 path.

## 6. API documentation

Import **`docs/postman_collection.json`** into Postman. It includes a `{{base_url}}`
variable and a login request that auto-saves the JWT into `{{token}}` for the
rest of the collection.

Core endpoints:
```
POST   /auth/login
GET    /auth/me
GET    /customers            (search, status, type, page, limit)
POST   /customers
PATCH  /customers/:id
POST   /customers/:id/notes
GET    /products              (search, lowStock, page, limit)
POST   /products
PATCH  /products/:id
POST   /products/:id/stock-movements
GET    /challans               (status, customerId, page, limit)
POST   /challans
PATCH  /challans/:id/status
```

## 7. Architecture & limitations

See `docs/ARCHITECTURE.md` and `docs/LIMITATIONS.md`.

## 8. Assumptions made

- "Wholesale/distribution company" needs one primary outbound document type
  (sales challan) rather than separate delivery-note/invoice modules — invoicing
  is stubbed as a natural next step (see limitations).
- Purchase orders (inbound stock) are handled through the generic stock movement
  log (`IN` type with a reason) rather than a full PO approval workflow, to keep
  scope realistic within the timeframe.
- Single-warehouse-per-product `location` field (text) is sufficient rather than
  full multi-warehouse stock ledgers.
- All authenticated roles can view all modules; write access is restricted by
  role as shown in the table above.
