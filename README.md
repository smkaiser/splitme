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

	- `participants:{slug}`
	- `expenses:{slug}`
	- Trip list itself stored under `trips`.

### Authentication & Guest Access

Trip creation and deletion now require a signed-in account. The app uses Azure Static Web Apps built-in authentication with quick sign-in buttons for:

- Microsoft (Azure AD)
- Google
- GitHub
- Twitter
- Facebook

You can enable additional providers in the Azure portal as needed—the frontend menu automatically exposes anything listed in `AUTH_PROVIDERS`.

Guests can still participate in existing trips without signing in. The homepage offers a "Join a Trip" input for people who only have the shared `/t/{slug}` URL. Once inside a trip, the expense interface remains open so collaborators without accounts can contribute.

**Enabling providers**: In the Static Web Apps resource, configure the chosen identity providers (client IDs/secrets where required) and ensure post-login redirects include the site origin (defaults work for SWA). No secrets are stored in the repo; everything relies on the platform-managed auth flow.

Security note: Trip URLs behave as shared secrets—anyone with the link can still view and edit that specific trip. Require sign-in only gates administrative actions (creating or deleting trips). If you need stricter controls, extend the owner metadata checks to other endpoints.

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

- Trip meta: `partitionKey=tripId`, `rowKey=meta`, includes `ownerId`, `ownerName`, `ownerProvider`
- Participant: `rowKey=participant:{participantId}`
- Expense: `rowKey=expense:{expenseId}`
- Slug index: `partitionKey=slug`, `rowKey={slug}`, properties `tripId`, `ownerId`, `ownerName`, `ownerProvider`, `name`, `createdAt`

Owner metadata is stamped when a signed-in user creates a trip. Legacy trips without owner info are considered "unclaimed" and can be managed by any authenticated user until ownership is set.

### Functions Implemented
- POST ` /api/trips` (auth required) → create trip (body: `{ name, slug? }`) returns `{ tripId, slug, name, createdAt, ownerId, ownerName, ownerProvider }`
- GET ` /api/trips/{slug}` → fetch trip (participants + expenses)
- POST ` /api/trips/{slug}/participants` (auth) → add participant
- DELETE ` /api/trips/{slug}/participants/{participantId}` (auth) → delete participant (fails 409 if referenced)
- POST ` /api/trips/{slug}/expenses` (auth) → add expense
- PATCH ` /api/trips/{slug}/expenses/{expenseId}` (auth) → update expense
- DELETE ` /api/trips/{slug}/expenses/{expenseId}` (auth) → delete expense
- DELETE ` /api/trips/{slug}` (auth) → delete trip (only owner, or unclaimed legacy trip)

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

### Node.js Version
Azure Functions (and many managed environments) in this setup target **Node 18 LTS**. The project now includes:
- `.nvmrc` with `18.20.3`
- `"engines": { "node": ">=18 <19" }` in `package.json`

Use:
```bash
nvm use
```
before installing dependencies locally. If deploying outside Static Web Apps (e.g. dedicated Function App), set the Function App setting:
```bash
az functionapp config set -g <rg> -n <func-app-name> --linux-fx-version "NODE|18-lts"
```

### Environment Variables
| Name | Purpose |
|------|---------|
| `TABLES_CONNECTION_STRING` | Preferred explicit connection string for Azure Table Storage |
| `STORAGE_CONNECTION` | Alternate name (used in Static Web Apps) supported by code fallback |
| `AzureWebJobsStorage` | Fallback storage connection (Functions default) |
| `TABLE_NAME` | Override table name (default `TripsData`) |

### Static Web Apps Routing
The file `staticwebapp.config.json` provides SPA routing so deep links like `/t/{slug}` work in production and ensures `/api/*` is left to Functions. A specific rule now requires authentication for `/api/trips` while leaving the rest of the API anonymous so trip pages remain guest-friendly. If you customize routes, keep the catch-all rewrite to `index.html`.

### Security Notes
- Trip creation/deletion is locked behind platform auth; only the owner (or a signed-in user when ownership is missing) can delete a trip.
- Trip content remains editable by anyone with the slug URL. Extend the ownership checks to participant/expense endpoints if you need stricter controls.
- Consider adding ETag-based concurrency control on updates; currently last write wins.

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
