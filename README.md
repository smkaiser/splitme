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

---

🧹 Just Exploring?
No problem! If you were just checking things out and don’t need to keep this code:

- Simply delete your Spark.
- Everything will be cleaned up — no traces left behind.

📄 License For Spark Template Resources 

The Spark Template files and resources from GitHub are licensed under the terms of the MIT license, Copyright GitHub, Inc.
