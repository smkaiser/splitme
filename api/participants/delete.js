"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const tableClient_1 = require("../shared/tableClient");
functions_1.app.http('deleteParticipant', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'trips/{slug}/participants/{participantId}',
    handler: async (req, ctx) => {
        const slug = req.params?.slug || '';
        const participantId = req.params?.participantId || '';
        if (!slug || !participantId)
            return { status: 400, jsonBody: { error: 'slug and participantId required' } };
        try {
            const client = (0, tableClient_1.getTableClient)();
            const tripId = await (0, tableClient_1.getTripIdBySlug)(client, slug);
            if (!tripId)
                return { status: 404, jsonBody: { error: 'not found' } };
            const rows = await (0, tableClient_1.listTripRows)(client, tripId);
            // Public mode: no auth required
            // Prevent deletion if participant is referenced in an expense
            const expenseUsing = rows.find(r => r.type === 'expense' && (r.participantIds || '').split(',').includes(participantId));
            if (expenseUsing)
                return { status: 409, jsonBody: { error: 'participant in use by expense' } };
            await client.deleteEntity(tripId, `participant:${participantId}`);
            return { status: 204 };
        }
        catch (e) {
            ctx.error(e);
            return { status: e.status || 500, jsonBody: { error: e.message || 'internal error' } };
        }
    }
});
//# sourceMappingURL=delete.js.map