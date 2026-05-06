# Andhrawala Outlet

Liquor outlet ordering, stock management, billing, pending payment tracking, realtime updates, notifications, and profit reporting.

## Stack

- `apps/api` — Node.js + Express + Socket.IO + SQLite. The schema is PostgreSQL-friendly and can be migrated to Postgres for production.
- `apps/web` — React + TypeScript + Vite admin/outlet dashboard.
- Push notification foundation — notification records are saved in the database and realtime events are sent over Socket.IO. Optional Firebase Cloud Messaging can be enabled with `FIREBASE_SERVICE_ACCOUNT_BASE64`.
- Product images — uploaded through the API and served from `/uploads` in local/dev. For production, replace the storage adapter with S3/R2/Firebase Storage.

## Local development

```bash
npm install
npm run dev:api
npm run dev:web
```

API defaults to <http://localhost:4000>. Web defaults to <http://localhost:5173>.

## Seed logins

| Role | Phone | Password |
| --- | --- | --- |
| Admin | `9000000000` | `123456` |
| Outlet | `9000000001` | `123456` |

## Checks

```bash
npm run typecheck
npm run build
```

## Production notes

- Use PostgreSQL instead of SQLite for production scale.
- Store product images in S3, Cloudflare R2, or Firebase Storage.
- Set `JWT_SECRET` to a strong secret.
- Set `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, and `FIREBASE_SERVICE_ACCOUNT_BASE64` to enable Firebase Cloud Messaging.
