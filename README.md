# Nosh फ़रमाइए – Monorepo Guide

Nosh फ़रमाइए is a full-stack food delivery platform that bundles a customer-facing storefront, an operations-focused admin console, and a modular Node.js API into a single repository. This guide explains how the pieces fit together and how to run the project with either a traditional (legacy) workflow or the shipping Docker stack.

## Repository layout

```text
nosh-farmaiye/
├── admin/           # React + Vite admin dashboard
├── frontend/        # React + Vite customer storefront
├── backend/         # Express/MongoDB API + background scripts
├── shared/          # Cross-package utilities (consumed by web apps)
├── docker/          # Dockerfiles and nginx configs for production images
├── docker-compose.yml
└── uploads/         # Created at runtime; holds menu & receipt uploads
```

## System architecture

```text
Architecture at a glance

 ┌──────────────────────┐        HTTPS + REST         ┌────────────────────────────┐
 │  Customer Web App    │  ─────────────────────────▶ │                            │
 │  (`frontend/`)       │ ⬅────────────────────────── │     Express API service     │
 └──────────────────────┘     status updates / data   │        (`backend/`)         │
                                                        │ - Authentication & JWTs    │
 ┌──────────────────────┐        HTTPS + REST         │ - Menu, order, coupon logic │
 │    Admin Console     │  ─────────────────────────▶ │ - Upload handling           │
 │    (`admin/`)        │ ⬅────────────────────────── │                            │
 └──────────────────────┘     dashboards / analytics   └─────────────┬──────────────┘
                                                                     │
                                                        Mongoose ODM │
                                                                     ▼
                                                   ┌────────────────────────┐
                                                   │    MongoDB database     │
                                                   │  Orders, menu, coupons  │
                                                   └──────────┬─────────────┘
                                                              │ file system mount
                                                              ▼
                                                   ┌────────────────────────┐
                                                   │  media uploads folder   │
                                                   │ (`backend/uploads/`)    │
                                                   └────────────────────────┘

 Stripe payments (test keys) ⇄ Express API ⇄ Customer/Admin apps for checkout flows

```

How it fits together:

- **Client layer** – The customer storefront (`frontend/`) and admin panel (`admin/`) are separate Vite apps that call the API over HTTPS. The admin uses JWT-secured endpoints for protected operations and receives analytics snapshots.
- **API layer** – The Express backend (`backend/`) exposes REST endpoints, handles authentication, validates payloads shared with the frontends, and orchestrates background scripts.
- **Data layer** – Persistent order, menu, and coupon data live in MongoDB, while uploaded images are stored on the server (or bind-mounted volume in Docker).
- **Integrations** – Stripe is invoked for payment intent simulation, allowing end-to-end checkout testing without touching production payments.

## Deployment flows

```text

Local dev vs. Dockerised stack

 ┌──────────────────────────────────┐      REST / HTTPS      ┌──────────────────────────────────┐
 │        Developer Workstation     │                        │        Docker Compose Stack      │
 │                                  │                        │                                  │
 │  • `frontend/` Vite dev srv      │                        │                                  │
 │  • `admin/` Vite dev srv         │                        │   admin container (nginx)        │
 │  • `backend/` nodemon API        │                        │                                  │
 │  • Local MongoDB instance        │                        │   frontend container (nginx)     │
 │                                  │                        │                                  │
 │  Optional seed scripts           │ ── menu data ───▶     │    backend container (Express)    │
 │  populate menu/coupons           │                        │                                  │
 │                                  │                        │   uploads bind                   │
 │  Stripe test keys used           │◀── payment intents ──▶│                                  │
 │  during checkout simulations     │                        │   mongo container (MongoDB 6)    │
 └──────────────────────────────────┘                        └──────────────────────────────────┘

 Stripe API (cloud) ◀────────────── HTTPS ───────────────▶ local backend / backend container

```

## Order lifecycle

```text
Order lifecycle (happy path)

 Customer App            Express API              MongoDB                Stripe (test)            Admin Console
     │                        │                      │                        │                        │
     │──browse menu──────────▶│                      │                        │                        │
     │◀──menu data─────────── │                      │                        │                        │
     │──order + intent───────▶│──inventory lookup───▶│                        │                        │
     │                        │◀──stock confirmation │                        │                        │
     │                        │──create test payment─────────────────────────▶│                        │
     │                        │◀──payment confirmation────────────────────────│                        │
     │◀──order receipt─────── │                      │                        │                        │
     │                        │──persist order─────▶ │                        │                        │
     │                        │◀──write acknowledgement│                      │                        │
     │                        │──status webhook / push───────────────────────────────────────────────▶│
     │                        │                      │                        │◀──optional webhook────┤
     │                        │                      │                        │                        │

```

- The customer storefront drives the flow, submitting a payment intent alongside the order payload.
- The backend coordinates inventory checks against MongoDB, calls Stripe with sandbox keys, and persists the final status.
- The admin console receives push/webhook updates (or polls) to refresh dashboards and handle fulfilment.

## Technology stack

| Layer    | Major dependencies |
|----------|--------------------|
| Frontend | React 18, Vite 5, React Router 6, Axios, React Toastify |
| Admin    | React 18, Vite 5, Chart.js 4, React-Chartjs-2 |
| Backend  | Node.js 20+, Express 4, Mongoose 8, JWT, Multer, Stripe SDK |
| Database | MongoDB 6 (local service or container) |
| Tooling  | ESLint, Nodemon, Node test runner, Docker Compose |

## Environment configuration

### Backend (`backend/.env`)

| Variable | Purpose |
|----------|---------|
| `PORT` | API port (default `4000`) |
| `MONGO_URL` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing access tokens (use a long random value) |
| `SALT` | Bcrypt salt rounds for admin password hashing |
| `STRIPE_SECRET_KEY` | Stripe secret key (test key is fine for development) |
| `ALLOWED_ORIGINS` | Comma-separated list of origins allowed by CORS |
| `FRONTEND_URL` | Public URL of the customer app |
| `ADMIN_URL` | Public URL of the admin app |
| `CURRENCY` | ISO currency code (e.g., `INR`) |
| `DELIVERY_FEE` | Flat delivery fee collected from customers |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | Seeded admin credentials created by `npm run bootstrap:*` |
| `ADMIN_FORCE_RESET` | If `true`, forces seeded admin to reset password at first login |

Copy the template:

```powershell
Copy-Item backend/.env.example backend/.env
```

### Admin (`admin/.env`)

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | URL for the backend API |
| `VITE_BRAND_NAME_EN` | English display name for the admin console |
| `VITE_BRAND_NAME_HI` | Optional Hindi display name |

### Frontend (`frontend/.env`)

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | URL for the backend API |
| `VITE_BRAND_NAME_EN` | English display name for the storefront |
| `VITE_BRAND_NAME_HI` | Optional Hindi display name |
| `VITE_DELIVERY_FEE` | Delivery fee shown to end-users |
| `VITE_OWNER_NAME` | Attribution text shown in the footer |

## Legacy (manual) deployment

### Prerequisites

- Node.js ≥ 20 and npm ≥ 10
- MongoDB 6 running locally (`mongodb://127.0.0.1:27017/nosh-farmaiye` by default)
- Stripe test account (only required if you want to exercise payment flows)

### Step 1 – Install dependencies

```powershell
git clone https://github.com/Mshandev/Food-Delivery.git nosh-farmaiye
cd nosh-farmaiye
npm install --prefix backend
npm install --prefix admin
npm install --prefix frontend
```

### Step 2 – Configure environment files

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item admin/.env.example admin/.env
Copy-Item frontend/.env.example frontend/.env
# Edit each .env to supply real secrets, URLs, and branding
```

### Step 3 – Seed reference data (optional, but recommended)

```powershell
cd backend
npm run bootstrap:core   # admin user + menu + coupon catalog
npm run seed:analytics   # optional demo analytics data
cd ..
```

### Step 4 – Start the services

Launch each service in its own terminal:

```powershell
# Terminal 1 – Backend API
cd backend
npm run dev
```

```powershell
# Terminal 2 – Customer storefront
cd frontend
npm run dev -- --host
```

```powershell
# Terminal 3 – Admin console
cd admin
npm run dev -- --host
```

Applications will be available at:

- Customer storefront: <http://localhost:5173>
- Admin console: <http://localhost:5174>
- REST API: <http://localhost:4000>

### Step 5 – Maintenance commands

```powershell
# Lint React apps
npm run lint --prefix admin
npm run lint --prefix frontend

# Run backend unit tests
npm test --prefix backend
```

Uploads generated by the admin panel are written to `backend/uploads/`. The folder is created automatically and can be backed up independently on legacy deployments.

## Dockerised deployment

The repository ships with a production-oriented Compose stack that builds all services, serves the frontends through nginx, and provisions MongoDB with a persistent volume.

### Step 1 – Optional environment overrides

Create an override file to avoid committing secrets:

```powershell
@"
JWT_SECRET=replace-with-production-secret
STRIPE_SECRET_KEY=sk_test_yourkey
ADMIN_PASSWORD=ChangeMe!2025
"@ | Out-File -Encoding utf8 .env.docker
```

### Step 2 – Build and start the stack

```powershell
cd nosh-farmaiye
docker compose up -d --build 
```

### Step 3 – Inspect or update services

```powershell
# Tail logs
docker compose logs -f backend

# Stop services (preserves Mongo data)
docker compose down

# Full reset including Mongo volume
docker compose down -v
```

#### What the compose stack includes

| Service  | Role |
|----------|------|
| `mongo`  | MongoDB 6 with `mongo-data` volume |
| `backend`| Express API (bind-mounts `./backend/uploads` for persistent assets) |
| `frontend` | Production build served by nginx on port `5173` |
| `admin` | Production build served by nginx on port `5174` |

## Data & asset storage

- **Database** – Persisted inside MongoDB. Snapshot the `mongo-data` volume or run `mongodump` for backups.
- **Media uploads** – Stored in `backend/uploads`. In Docker, that directory is bind-mounted from the host.
- **Analytics demo data** – Generated with `npm run seed:analytics`; remove with `npm run clean:analytics`.

## Troubleshooting

| Scenarios | Resolution |
|---------|------------|
| Frontend requests fail with `ECONNREFUSED` | Ensure the backend is running on `http://localhost:4000` and that `VITE_API_BASE_URL` matches. |
| Admin login fails after seeding | Confirm `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `backend/.env`, then rerun `npm run bootstrap:core`. |
| Image uploads fail | Make sure `backend/uploads` exists and is writeable by the Node process. |
| Stripe API errors | Provide a valid Stripe test key in `backend/.env` or disable payment flows during demos. |
| Docker services stuck on `starting` | Check `docker compose logs`; Mongo must pass its health check before the backend and frontends boot. |

## Roadmap

- **Mobile experiences** – Ship a React Native or Flutter client that reuses backend contracts for on-the-go ordering and courier apps.
- **Observability** – Add centralized logging, metrics, and alerting (e.g., OpenTelemetry + Grafana) to monitor real-world deployments.
- **Smart fulfilment** – Introduce order batching, courier assignment optimizations, and SLA tracking for high-volume kitchens.
- **Internationalization** – Extend shared language packs and currency handling beyond the current English/Hindi focus.

## Contributing & quality gates

1. Run `npm run lint` in both `admin` and `frontend`.
2. Run `npm test` in `backend`.
3. Keep shared utilities framework-agnostic and avoid coupling them to React.
4. Submit pull requests against `main` with clear commit messages.

## License

This repository is distributed under the [MIT License](LICENSE). You are free to use, modify, and distribute the code with proper attribution.

## Useful references

- [Vite documentation](https://vitejs.dev/)
- [Express documentation](https://expressjs.com/)
- [Mongoose documentation](https://mongoosejs.com/)
- [Stripe API reference](https://stripe.com/docs/api)

Happy cooking and shipping! 🍲
