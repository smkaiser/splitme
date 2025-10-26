"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const tableClient_1 = require("../shared/tableClient");
functions_1.app.http('createParticipant', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'trips/{slug}/participants',
    handler: async (req, ctx) => {
        const slug = req.params?.slug || '';
        if (!slug)
            return { status: 400, jsonBody: { error: 'slug required' } };
        try {
            const body = await req.json();
            const name = String(body.name || '').trim();
            if (!name)
                return { status: 400, jsonBody: { error: 'name required' } };
            const client = (0, tableClient_1.getTableClient)();
            const tripId = await (0, tableClient_1.getTripIdBySlug)(client, slug);
            if (!tripId)
                return { status: 404, jsonBody: { error: 'not found' } };
            const rows = await (0, tableClient_1.listTripRows)(client, tripId);
            const meta = rows.find(r => r.rowKey === 'meta');
            if (meta && meta.locked) {
                return { status: 423, jsonBody: { error: 'trip locked' } };
            }
            // Public mode: no auth required
            const participantId = (0, tableClient_1.newId)();
            const now = (0, tableClient_1.nowIso)();
            await client.createEntity({
                partitionKey: tripId,
                rowKey: `participant:${participantId}`,
                type: 'participant',
                participantId,
                name,
                createdAt: now,
                updatedAt: now
            });
            return { status: 201, jsonBody: { id: participantId, name, createdAt: now, updatedAt: now } };
        }
        catch (e) {
            ctx.error(e);
            return { status: e.status || 500, jsonBody: { error: e.message || 'internal error' } };
        }
    }
});
//# sourceMappingURL=create.js.map