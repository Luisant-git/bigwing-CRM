# Bigwing CRM

Honda two-wheeler premium dealership CRM — Bangalore.

## Tech Stack

- **Backend:** Node.js 20 + Express 4 + TypeScript
- **Frontend:** React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Database:** PostgreSQL 15 (schemas: `auth`, `core`, `master`, `app`)
- **ORM:** Prisma
- **Queue:** BullMQ + Redis
- **API Docs:** Scalar (served at `/api/docs`)

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment file
cp .env.example .env
# Edit .env with your database credentials

# 3. Create PostgreSQL schemas
psql -U bigwing -d bigwing_crm -c "CREATE SCHEMA IF NOT EXISTS auth; CREATE SCHEMA IF NOT EXISTS core; CREATE SCHEMA IF NOT EXISTS master; CREATE SCHEMA IF NOT EXISTS app;"

# 4. Run migrations
pnpm db:migrate

# 5. Seed initial data (roles, admin, lookups)
pnpm db:seed

# 6. Start development
pnpm dev
```

## Project Structure

```
BigwingCRM/
├── apps/
│   ├── api/          # Express + TS backend
│   └── web/          # React + TS frontend (coming in M2)
├── packages/
│   ├── shared/       # Shared Zod schemas, enums, types
│   └── db/           # Prisma schema, migrations, seed
├── infra/            # Docker, nginx, CI/CD configs
└── pnpm-workspace.yaml
```

## Default Credentials

- **SuperAdmin:** admin@bigwing.in / BigWing@2026

## API Endpoints (M1)

- `POST /api/v1/auth/login` — Login
- `POST /api/v1/auth/refresh` — Refresh token
- `POST /api/v1/auth/logout` — Logout
- `GET /api/v1/users` — List users (Admin+)
- `POST /api/v1/users` — Create user (Admin+)
- `PATCH /api/v1/users/:id` — Update user (Admin+)
- `GET /api/docs` — Interactive API documentation
