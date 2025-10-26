"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const tableClient_1 = require("../shared/tableClient");
const auth_1 = require("../shared/auth");
functions_1.app.http('getTripBySlug', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'trips/{slug}',
    handler: async (req, ctx) => {
        // In v4 programming model, route params available via req.params
        const slug = req.params?.slug || '';
        if (!slug)
            return { status: 400, jsonBody: { error: 'slug required' } };
        const principal = (0, auth_1.getClientPrincipal)(req);
        const user = (0, auth_1.isAuthenticated)(principal) ? (0, auth_1.getAuthenticatedUser)(principal) : null;
        try {
            const client = (0, tableClient_1.getTableClient)();
            const tripId = await (0, tableClient_1.getTripIdBySlug)(client, slug);
            if (!tripId)
                return { status: 404, jsonBody: { error: 'not found' } };
            const rows = await (0, tableClient_1.listTripRows)(client, tripId);
            const meta = rows.find(r => r.rowKey === 'meta');
            if (!meta)
                return { status: 500, jsonBody: { error: 'trip corrupt' } };
            const ownerId = meta.ownerId ?? null;
            const ownerName = meta.ownerName ?? null;
            const ownerProvider = meta.ownerProvider ?? null;
            const locked = !!meta.locked;
            const isOwner = !!(user && ownerId && user.id === ownerId);
            const participants = rows.filter(r => r.type === 'participant').map(r => ({
                id: r.participantId,
                name: r.name,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt
            }));
            const expenses = rows.filter(r => r.type === 'expense').map(r => ({
                id: r.expenseId,
                amount: Number(r.amount),
                date: r.date,
                place: r.place,
                description: r.description,
                paidBy: r.paidBy,
                participants: (r.participantIds || '').split(',').filter(Boolean),
                createdAt: r.createdAt,
                updatedAt: r.updatedAt
            }));
            return { status: 200, jsonBody: {
                    tripId,
                    slug: meta.slug,
                    name: meta.name,
                    participants,
                    expenses,
                    createdAt: meta.createdAt,
                    updatedAt: meta.updatedAt,
                    locked,
                    ownerId,
                    ownerName,
                    ownerProvider,
                    isOwner
                } };
        }
        catch (e) {
            ctx.error(e);
            return { status: e.status || 500, jsonBody: { error: e.message || 'internal error' } };
        }
    }
});
//# sourceMappingURL=getBySlug.js.map