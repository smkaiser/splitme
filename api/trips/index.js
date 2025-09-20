"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const tableClient_1 = require("../shared/tableClient");
const crypto_1 = require("crypto");
function slugify(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
}
functions_1.app.http('trips', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'trips',
    handler: async (req, ctx) => {
        try {
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
            const secretToken = (0, crypto_1.randomBytes)(24).toString('hex');
            const now = (0, tableClient_1.nowIso)();
            // trip meta row
            await client.createEntity({
                partitionKey: tripId,
                rowKey: 'meta',
                type: 'trip',
                name,
                slug,
                secretToken,
                createdAt: now,
                updatedAt: now
            });
            // slug index row
            await client.createEntity({
                partitionKey: 'slug',
                rowKey: slug,
                tripId
            });
            return { status: 201, jsonBody: { tripId, slug, name, secretToken, createdAt: now } };
        }
        catch (e) {
            ctx.error(e);
            return { status: e.status || 500, jsonBody: { error: e.message || 'internal error' } };
        }
    }
});
//# sourceMappingURL=index.js.map