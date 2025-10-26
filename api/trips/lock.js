"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const tableClient_1 = require("../shared/tableClient");
const auth_1 = require("../shared/auth");
functions_1.app.http('toggleTripLock', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'trips/{slug}/lock',
    handler: async (req, ctx) => {
        const principal = (0, auth_1.getClientPrincipal)(req);
        if (!(0, auth_1.isAuthenticated)(principal)) {
            return { status: 401, jsonBody: { error: 'authentication required' } };
        }
        const user = (0, auth_1.getAuthenticatedUser)(principal);
        const slug = req.params?.slug;
        if (!slug)
            return { status: 400, jsonBody: { error: 'slug required' } };
        let body;
        try {
            body = await req.json();
        }
        catch {
            return { status: 400, jsonBody: { error: 'invalid json' } };
        }
        if (typeof body.locked !== 'boolean') {
            return { status: 400, jsonBody: { error: 'locked flag required' } };
        }
        const desiredLocked = body.locked;
        try {
            const client = (0, tableClient_1.getTableClient)();
            const tripId = await (0, tableClient_1.getTripIdBySlug)(client, slug);
            if (!tripId)
                return { status: 404, jsonBody: { error: 'not found' } };
            let ownerId;
            let metaEntity;
            try {
                metaEntity = await client.getEntity(tripId, 'meta');
                ownerId = metaEntity.ownerId;
                if (ownerId && ownerId !== user.id) {
                    return { status: 403, jsonBody: { error: 'forbidden' } };
                }
            }
            catch (err) {
                ctx.log(`failed to fetch meta for lock toggle: ${err}`);
            }
            if (!ownerId) {
                try {
                    const slugRow = await client.getEntity('slug', slug);
                    ownerId = slugRow.ownerId;
                    if (ownerId && ownerId !== user.id) {
                        return { status: 403, jsonBody: { error: 'forbidden' } };
                    }
                }
                catch (err) {
                    ctx.log(`failed to fetch slug row for lock toggle: ${err}`);
                }
            }
            if (ownerId && ownerId !== user.id) {
                return { status: 403, jsonBody: { error: 'forbidden' } };
            }
            const now = (0, tableClient_1.nowIso)();
            try {
                await client.updateEntity({
                    partitionKey: tripId,
                    rowKey: 'meta',
                    locked: desiredLocked,
                    updatedAt: now
                }, 'Merge', { etag: metaEntity?.etag ?? '*' });
            }
            catch (err) {
                ctx.log(`failed to update meta lock state: ${err}`);
                return { status: 500, jsonBody: { error: 'failed to update lock state' } };
            }
            try {
                const slugEntity = await client.getEntity('slug', slug);
                await client.updateEntity({
                    partitionKey: 'slug',
                    rowKey: slug,
                    locked: desiredLocked,
                    updatedAt: now
                }, 'Merge', { etag: slugEntity.etag ?? '*' });
            }
            catch (err) {
                ctx.log(`failed to update slug lock state: ${err}`);
            }
            return { status: 200, jsonBody: { locked: desiredLocked, updatedAt: now } };
        }
        catch (e) {
            ctx.error(e);
            return { status: e.status || 500, jsonBody: { error: e.message || 'internal error' } };
        }
    }
});
//# sourceMappingURL=lock.js.map