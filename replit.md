# GRH — Conseil de la Région Souss-Massa

Application web de Gestion des Ressources Humaines (HR management) for the Souss-Massa Regional Council. Built for Moroccan territorial collectivities with bilingual FR/AR RTL support.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript + TailwindCSS + react-i18next |
| Backend | NestJS (Node.js/TypeScript) + Prisma ORM |
| Database | PostgreSQL (Replit managed) |

## How to run

Two workflows are configured — start them both:

1. **Backend** — NestJS API on port 4000
   ```
   cd backend && node dist/src/main.js
   ```

2. **Start application** — React/Vite frontend on port 5000 (webview)
   ```
   cd frontend && npm run dev
   ```

### Demo accounts (seeded)
| Email | Password | Role |
|---|---|---|
| `admin@region.ma` | `Admin@123` | Administrateur système |
| `drh@region.ma` | `Drh@123` | DRH |
| `agent@region.ma` | `Agent@123` | Agent |

## Environment variables

Set via Replit environment (shared):
- `JWT_SECRET` — JWT signing key (change for production)
- `JWT_ACCESS_EXPIRES` — Access token TTL (default: 15m)
- `JWT_REFRESH_EXPIRES` — Refresh token TTL (default: 7d)
- `PORT` — Backend port (4000)
- `DATABASE_URL` — Managed automatically by Replit

## Database

Schema is managed via Prisma. To re-apply schema after changes:
```
cd backend && node node_modules/prisma/build/index.js db push
```

To re-seed:
```
cd backend && node dist/prisma/seed.js
```

> Note: Use `node node_modules/prisma/build/index.js` instead of `npx prisma` — the `.bin/prisma` shim is a shell script incompatible with Node 24.

## Development (watch mode)

The pre-built `dist/` is used for the backend workflow. For live-reload during development, build first:
```
cd backend && npm run build
```

Or use `nest start --watch` directly (requires ts-node workaround).

## Modules (Lot 1 MVP)

- **4.1 Dossier administratif de l'agent** — identity, career history, diplomas, attachments
- **4.3 Congés et absences** — leave requests with hierarchical approval workflow
- **Fondations** — JWT auth + RBAC (6 profiles), FR/AR bilingualism, admin parameterization

## User preferences

- Keep existing project structure (backend/ + frontend/ monorepo)
- Use `node node_modules/prisma/build/index.js` for Prisma CLI (not npx)
