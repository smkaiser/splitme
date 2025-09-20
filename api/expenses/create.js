"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const tableClient_1 = require("../shared/tableClient");
function validate(body) {
    if (!body || typeof body !== 'object')
        throw new Error('body required');
    if (typeof body.amount !== 'number' || !Number.isFinite(body.amount) || body.amount <= 0)
        throw new Error('amount must be positive number');
    if (typeof body.paidBy !== 'string' || !body.paidBy)
        throw new Error('paidBy required');
    if (!Array.isArray(body.participants) || body.participants.length === 0)
        throw new Error('participants array required');
    if (body.date && isNaN(Date.parse(body.date)))
        throw new Error('date must be ISO string');
    if (body.place && typeof body.place !== 'string')
        throw new Error('place must be string');
    if (body.description && typeof body.description !== 'string')
        throw new Error('description must be string');
}
functions_1.app.http('createExpense', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'trips/{slug}/expenses',
    handler: async (req, ctx) => {
        const slug = req.params?.slug || '';
        if (!slug)
            return { status: 400, jsonBody: { error: 'slug required' } };
        try {
            let body;
            try {
                body = await req.json();
            }
            catch {
                return { status: 400, jsonBody: { error: 'invalid json' } };
            }
            try {
                validate(body);
            }
            catch (e) {
                return { status: 400, jsonBody: { error: e.message } };
            }
            const client = (0, tableClient_1.getTableClient)();
            const tripId = await (0, tableClient_1.getTripIdBySlug)(client, slug);
            if (!tripId)
                return { status: 404, jsonBody: { error: 'not found' } };
            const rows = await (0, tableClient_1.listTripRows)(client, tripId);
            const meta = rows.find(r => r.rowKey === 'meta');
            (0, tableClient_1.requireWriteAuth)(meta.secretToken, req.headers.get('x-trip-key') || undefined);
            const participantIds = new Set(rows.filter(r => r.type === 'participant').map(r => r.participantId));
            if (!participantIds.has(body.paidBy))
                return { status: 400, jsonBody: { error: 'paidBy participant not found' } };
            for (const pid of body.participants) {
                if (!participantIds.has(pid))
                    return { status: 400, jsonBody: { error: `participant not found: ${pid}` } };
            }
            const expenseId = (0, tableClient_1.newId)();
            const now = (0, tableClient_1.nowIso)();
            await client.createEntity({
                partitionKey: tripId,
                rowKey: `expense:${expenseId}`,
                type: 'expense',
                expenseId,
                amount: body.amount,
                date: body.date || now,
                place: body.place || '',
                description: body.description || '',
                paidBy: body.paidBy,
                participantIds: body.participants.join(','),
                createdAt: now,
                updatedAt: now
            });
            return { status: 201, jsonBody: {
                    id: expenseId,
                    amount: body.amount,
                    date: body.date || now,
                    place: body.place || '',
                    description: body.description || '',
                    paidBy: body.paidBy,
                    participants: body.participants,
                    createdAt: now
                } };
        }
        catch (e) {
            ctx.error(e);
            return { status: e.status || 500, jsonBody: { error: e.message || 'internal error' } };
        }
    }
});
//# sourceMappingURL=create.js.map