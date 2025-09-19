import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getTableClient, getTripIdBySlug, listTripRows } from '../shared/tableClient'

app.http('getTripBySlug', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'trips/{slug}',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
  // In v4 programming model, route params available via req.params
  const slug = (req as any).params?.slug || ''
    if (!slug) return { status: 400, jsonBody: { error: 'slug required' } }
    try {
      const client = getTableClient()
      const tripId = await getTripIdBySlug(client, slug)
      if (!tripId) return { status: 404, jsonBody: { error: 'not found' } }

      const rows = await listTripRows(client, tripId)
      const meta = rows.find(r => r.rowKey === 'meta')
      if (!meta) return { status: 500, jsonBody: { error: 'trip corrupt' } }

      const participants = rows.filter(r => r.type === 'participant').map(r => ({
        id: r.participantId,
        name: r.name,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      }))

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
      }))

      return { status: 200, jsonBody: {
        tripId,
        slug: meta.slug,
        name: meta.name,
        participants,
        expenses,
        createdAt: meta.createdAt,
        updatedAt: meta.updatedAt
      }}
    } catch (e: any) {
      ctx.error(e)
      return { status: e.status || 500, jsonBody: { error: e.message || 'internal error' } }
    }
  }
})
