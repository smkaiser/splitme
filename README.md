# SplitMe

A multi-trip expense splitter for groups of friends. Add participants, log expenses, and see who owes whom — all in real time.

## Features

- **Multiple trips** — create separate trips (e.g. "Italy 2025", "Ski Weekend") each with their own participants and expenses
- **Smart settlements** — automatically calculates the minimum number of payments to settle up
- **Guest access** — anyone with a trip link (`/t/{slug}`) can view and add expenses, no account required
- **CSV import/export** — bulk-import expenses from a spreadsheet or export for your records
- **Auth-gated admin** — trip creation and deletion require sign-in (Microsoft, Google, GitHub, Facebook via Azure SWA)

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Azure Functions v4 (Node/TypeScript) |
| Storage | Azure Table Storage (single `TripsData` table) |
| Hosting | Azure Static Web Apps |
| Auth | Azure SWA built-in authentication |

## Getting Started

### Prerequisites

- Node.js 18 (`nvm use` to pick up `.nvmrc`)
- [Azure Functions Core Tools v4](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local)
- [Azurite](https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azurite) for local table storage

### Install

```bash
npm install
cd api && npm install && cd ..
```

### Run Locally

1. **Start Azurite** (in a separate terminal):
   ```bash
   azurite --silent --location .azurite
   ```

2. **Start the app** (frontend + API together):
   ```bash
   npm run dev:full
   ```
   - Frontend: http://localhost:5173
   - API: http://localhost:7071/api

The Vite dev server proxies `/api/*` to the Functions host automatically. A mock `/.auth/me` endpoint returns an unauthenticated session so the app works without Azure SWA auth locally.

> **Note:** Trip creation/deletion require auth, so those features are disabled in local dev by default. All other features (viewing trips, adding participants/expenses, settlements) work fully.

### Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite dev server only |
| `npm run dev:api` | Azure Functions only |
| `npm run dev:full` | Frontend + API concurrently |
| `npm run build` | Production build (tsc + vite) |
| `npm run build:api` | Compile API TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Vitest |

## API

All endpoints live under `/api`. Trip creation and deletion require authentication; everything else is anonymous.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/trips` | ✅ | Create a trip |
| GET | `/api/trips/{slug}` | | Fetch trip with participants + expenses |
| POST | `/api/trips/{slug}/participants` | | Add participant |
| DELETE | `/api/trips/{slug}/participants/{id}` | | Remove participant (409 if referenced) |
| POST | `/api/trips/{slug}/expenses` | | Add expense |
| PATCH | `/api/trips/{slug}/expenses/{id}` | | Update expense |
| DELETE | `/api/trips/{slug}/expenses/{id}` | | Delete expense |
| DELETE | `/api/trips/{slug}` | ✅ | Delete trip (owner only) |

## Data Model

Single Azure Table (`TripsData`), partitioned by `tripId`:

| Row type | PartitionKey | RowKey | Notes |
|----------|-------------|--------|-------|
| Trip meta | `{tripId}` | `meta` | name, owner info, timestamps |
| Participant | `{tripId}` | `participant:{id}` | name |
| Expense | `{tripId}` | `expense:{id}` | amount, payer, participants, date |
| Slug index | `slug` | `{slug}` | maps slug → tripId |

## Deploying

The app deploys to Azure Static Web Apps via GitHub Actions (`.github/workflows/`).

1. Create a Storage Account with Table Storage enabled
2. Set `TABLES_CONNECTION_STRING` in your SWA app settings
3. Push to `main` — the workflow builds, lints, tests, and deploys automatically

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `TABLES_CONNECTION_STRING` | Azure Table Storage connection string |
| `TABLE_NAME` | Override table name (default: `TripsData`) |

## License

MIT
