"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const tableClient_1 = require("../shared/tableClient");
const auth_1 = require("../shared/auth");
function slugify(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
}
functions_1.app.http('trips', {
    methods: ['POST', 'GET'],
    authLevel: 'anonymous',
    route: 'trips',
    handler: async (req, ctx) => {
        const principal = (0, auth_1.getClientPrincipal)(req);
        // GET -> list trips (without secret tokens)
        if (req.method === 'GET') {
            if (!(0, auth_1.isAuthenticated)(principal)) {
                return { status: 401, jsonBody: { error: 'authentication required' } };
            }
            const user = (0, auth_1.getAuthenticatedUser)(principal);
            try {
                const client = (0, tableClient_1.getTableClient)();
                await (0, tableClient_1.ensureTableExists)(client);
                // list slug partition
                const trips = [];
                for await (const ent of client.listEntities({ queryOptions: { filter: `PartitionKey eq 'slug'` } })) {
                    const slug = ent.rowKey;
                    let name = ent.name; // may be undefined for older rows
                    const tripId = ent.tripId;
                    let createdAt = ent.createdAt;
                    let ownerId = ent.ownerId;
                    let ownerName = ent.ownerName;
                    let ownerProvider = ent.ownerProvider;
                    let locked = ent.locked;
                    // If ownership metadata missing or does not match the current user, fall back to meta row
                    if (!ownerId || ownerId !== user.id || !name || !createdAt) {
                        try {
                            // meta row fetch
                            const rows = await (0, tableClient_1.listTripRows)(client, tripId);
                            const meta = rows.find(r => r.rowKey === 'meta');
                            if (meta) {
                                createdAt = meta.createdAt;
                                name = meta.name || name;
                                ownerId = meta.ownerId || ownerId;
                                ownerName = meta.ownerName || ownerName;
                                ownerProvider = meta.ownerProvider || ownerProvider;
                                if (typeof meta.locked === 'boolean')
                                    locked = meta.locked;
                            }
                            // Only allow listing trips owned by this user (or unclaimed legacy trips)
                            if (meta && meta.ownerId && meta.ownerId !== user.id) {
                                continue;
                            }
                        }
                        catch { }
                    }
                    if (ownerId && ownerId !== user.id)
                        continue;
                    trips.push({ slug, name: name ?? slug, tripId, createdAt, ownerId: ownerId ?? null, ownerName: ownerName ?? null, ownerProvider: ownerProvider ?? null, locked: !!locked });
                }
                return { status: 200, jsonBody: { trips } };
            }
            catch (e) {
                ctx.error(e);
                return { status: e.status || 500, jsonBody: { error: e.message || 'internal error' } };
            }
        }
        // POST -> create trip
        try {
            if (!(0, auth_1.isAuthenticated)(principal)) {
                return { status: 401, jsonBody: { error: 'authentication required' } };
            }
            const user = (0, auth_1.getAuthenticatedUser)(principal);
            const body = await req.json();
            const name = String(body.name || '').trim();
            if (!name)
                return { status: 400, jsonBody: { error: 'name required' } };
            const client = (0, tableClient_1.getTableClient)();
            await (0, tableClient_1.ensureTableExists)(client);
            let baseSlug = body.slug ? slugify(body.slug) : slugify(name);
            if (!baseSlug)
                baseSlug = 'trip';
            let slug = baseSlug;
            let attempt = 1;
            while (await (0, tableClient_1.getTripIdBySlug)(client, slug)) {
                slug = `${baseSlug}-${attempt++}`;
            }
            const tripId = (0, tableClient_1.newId)();
            const now = (0, tableClient_1.nowIso)();
            // trip meta row
            await client.createEntity({
                partitionKey: tripId,
                rowKey: 'meta',
                type: 'trip',
                name,
                slug,
                createdAt: now,
                updatedAt: now,
                ownerId: user.id,
                ownerName: user.name,
                ownerProvider: user.provider,
                locked: false
            });
            // slug index row (store name for list endpoint)
            await client.createEntity({
                partitionKey: 'slug',
                rowKey: slug,
                tripId,
                name,
                createdAt: now,
                ownerId: user.id,
                ownerName: user.name,
                ownerProvider: user.provider,
                locked: false
            });
            return { status: 201, jsonBody: { tripId, slug, name, createdAt: now, ownerId: user.id, ownerName: user.name, ownerProvider: user.provider, locked: false } };
        }
        catch (e) {
            ctx.error(e);
            return { status: e.status || 500, jsonBody: { error: e.message || 'internal error' } };
        }
    }
});
// Delete trip and related rows
functions_1.app.http('deleteTrip', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'trips/{slug}',
    handler: async (req, ctx) => {
        const principal = (0, auth_1.getClientPrincipal)(req);
        if (!(0, auth_1.isAuthenticated)(principal)) {
            return { status: 401, jsonBody: { error: 'authentication required' } };
        }
        const user = (0, auth_1.getAuthenticatedUser)(principal);
        const slug = req.params?.slug;
        if (!slug)
            return { status: 400, jsonBody: { error: 'slug required' } };
        try {
            const client = (0, tableClient_1.getTableClient)();
            const tripId = await (0, tableClient_1.getTripIdBySlug)(client, slug);
            if (!tripId)
                return { status: 404, jsonBody: { error: 'not found' } };
            let ownerId;
            try {
                const meta = await client.getEntity(tripId, 'meta');
                ownerId = meta.ownerId;
                if (ownerId && ownerId !== user.id) {
                    return { status: 403, jsonBody: { error: 'forbidden' } };
                }
            }
            catch { }
            if (!ownerId) {
                // Legacy trips without owner metadata fall back to slug entry check
                try {
                    const slugRow = await client.getEntity('slug', slug);
                    ownerId = slugRow.ownerId;
                    if (ownerId && ownerId !== user.id) {
                        return { status: 403, jsonBody: { error: 'forbidden' } };
                    }
                }
                catch { }
            }
            // list rows and delete
            const rows = await (0, tableClient_1.listTripRows)(client, tripId);
            for (const row of rows) {
                try {
                    await client.deleteEntity(tripId, row.rowKey);
                }
                catch { }
            }
            // delete slug index row
            try {
                await client.deleteEntity('slug', slug);
            }
            catch { }
            return { status: 204 };
        }
        catch (e) {
            ctx.error(e);
            return { status: e.status || 500, jsonBody: { error: e.message || 'internal error' } };
        }
    }
});
//# sourceMappingURL=index.js.map