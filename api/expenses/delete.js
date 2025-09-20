"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const tableClient_1 = require("../shared/tableClient");
functions_1.app.http('deleteExpense', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'trips/{slug}/expenses/{expenseId}',
    handler: async (req, ctx) => {
        const { slug, expenseId } = req.params || {};
        if (!slug || !expenseId)
            return { status: 400, jsonBody: { error: 'slug and expenseId required' } };
        try {
            const client = (0, tableClient_1.getTableClient)();
            const tripId = await (0, tableClient_1.getTripIdBySlug)(client, slug);
            if (!tripId)
                return { status: 404, jsonBody: { error: 'not found' } };
            const rows = await (0, tableClient_1.listTripRows)(client, tripId);
            const meta = rows.find(r => r.rowKey === 'meta');
            (0, tableClient_1.requireWriteAuth)(meta.secretToken, req.headers.get('x-trip-key') || undefined);
            const expense = rows.find(r => r.rowKey === `expense:${expenseId}`);
            if (!expense)
                return { status: 404, jsonBody: { error: 'expense not found' } };
            await client.deleteEntity(tripId, `expense:${expenseId}`);
            return { status: 204 };
        }
        catch (e) {
            ctx.error(e);
            return { status: e.status || 500, jsonBody: { error: e.message || 'internal error' } };
        }
    }
});
//# sourceMappingURL=delete.js.map