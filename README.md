# ✨ Welcome to Your Spark Template!
You've just launched your brand-new Spark Template Codespace — everything’s fired up and ready for you to explore, build, and create with Spark!

This template is your blank canvas. It comes with a minimal setup to help you get started quickly with Spark development.

🚀 What's Inside?
- A clean, minimal Spark environment
- Pre-configured for local development
- Ready to scale with your ideas
  
🧠 What Can You Do?

Right now, this is just a starting point — the perfect place to begin building and testing your Spark applications.

## Multi-Trip Expense Splitter Enhancement

This project has been extended to support multiple independent trips, each with isolated participants and expenses.

### How it Works

- Root path `/` shows the Trips Admin where you can create and delete trips.
- Each trip gets a unique slug and is accessible at `/t/{slug}`.
- Data is stored in `localStorage` namespaced by trip slug:
	- `participants:{slug}`
	- `expenses:{slug}`
	- Trip list itself stored under `trips`.
- CSV export filenames now include the trip slug.

### Adding a Trip
1. Go to `/` (root).
2. Enter a trip name (e.g., `Italy 2025`).
3. Click Add Trip. A unique slug is generated automatically.
4. Click Open to manage expenses for that trip.

### Deleting a Trip
Deleting a trip will remove the trip entry and its associated participant/expense keys from `localStorage` (cannot be undone).

### Future Ideas
- Shareable read-only link mode
- Authentication & cloud sync
- Unequal split weights

## Backend (Azure Functions + Table Storage)

The app now includes an optional serverless backend (in `api/`) that enables sharing a trip with multiple users. Data is persisted in Azure Table Storage using a single table (default name `TripsData`).

### Data Model (Table Rows)
PartitionKey = tripId (except slug index rows)

- Trip meta: `partitionKey=tripId`, `rowKey=meta`
- Participant: `rowKey=participant:{participantId}`
- Expense: `rowKey=expense:{expenseId}`
- Slug index: `partitionKey=slug`, `rowKey={slug}`, property `tripId`

Each trip gets a `secretToken` stored only in the meta row. All write operations require header: `x-trip-key: {secretToken}`. Reads are anonymous.

### Functions Implemented
- POST ` /api/trips` → create trip (body: `{ name, slug? }`) returns `{ tripId, slug, name, secretToken }`
- GET ` /api/trips/{slug}` → fetch trip (participants + expenses)
- POST ` /api/trips/{slug}/participants` (auth) → add participant
- DELETE ` /api/trips/{slug}/participants/{participantId}` (auth) → delete participant (fails 409 if referenced)
- POST ` /api/trips/{slug}/expenses` (auth) → add expense
- PATCH ` /api/trips/{slug}/expenses/{expenseId}` (auth) → update expense
- DELETE ` /api/trips/{slug}/expenses/{expenseId}` (auth) → delete expense

### Running Locally

1. Copy the sample settings file:
	`cp api/local.settings.sample.json api/local.settings.json`
2. Add a valid storage connection string to `TABLES_CONNECTION_STRING` (or set `AzureWebJobsStorage`). For pure local dev you can use Azurite:
	- Install Azurite globally: `npm install -g azurite` (or use Docker)
	- Run: `azurite --silent &` (blob/queue/table endpoints on 10000/10001/10002)
	- Use connection string (AzTables currently requires standard emulator string, e.g.):
	  `UseDevelopmentStorage=true`
3. Install deps: `npm install`
4. Run both frontend + functions: `npm run dev:full`
	- Frontend: http://localhost:5173
	- Functions: http://localhost:7071/api

Scripts added:
- `dev:api` – run Azure Functions locally
- `dev:full` – run frontend + backend concurrently
- `build:api` – compile Functions TypeScript

### Environment Variables
| Name | Purpose |
|------|---------|
| `TABLES_CONNECTION_STRING` | Preferred explicit connection string for Azure Table Storage |
| `AzureWebJobsStorage` | Fallback storage connection (Functions default) |
| `TABLE_NAME` | Override table name (default `TripsData`) |

### Security Notes
- Secret token is returned only on trip creation; store it client-side (e.g., localStorage) to enable future mutations.
- Reads are open; you can later introduce a read token or restrict by adding validation in `getTripBySlug`.
- Future: Add ETag-based concurrency control on updates; currently last write wins.

### Planned Enhancements
- Frontend integration: replace local `useKV` with `useTripRemote` selectively when a remote trip is detected.
- Migration: one-click push of a local trip to remote backend.
- Read-only share links (omit secret token, disable write buttons).

### Deploying to Azure (High Level)
1. Create a Storage Account (Tables + (optional) blob for future exports).
2. Deploy Functions (via Azure Static Web Apps workflow or `func azure functionapp publish`).
3. Provide `TABLES_CONNECTION_STRING` as an app setting.
4. (If using Static Web Apps) configure the frontend build and link the API folder.

_Detailed deployment automation (Bicep / SWA config) can be added later._

---

🧹 Just Exploring?
No problem! If you were just checking things out and don’t need to keep this code:

- Simply delete your Spark.
- Everything will be cleaned up — no traces left behind.

📄 License For Spark Template Resources 

The Spark Template files and resources from GitHub are licensed under the terms of the MIT license, Copyright GitHub, Inc.
