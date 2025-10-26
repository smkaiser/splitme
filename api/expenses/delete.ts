import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getTableClient, getTripIdBySlug, listTripRows } from '../shared/tableClient'

app.http('deleteExpense', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'trips/{slug}/expenses/{expenseId}',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { slug, expenseId } = (req as any).params || {}
    if (!slug || !expenseId) return { status: 400, jsonBody: { error: 'slug and expenseId required' } }
    try {
      const client = getTableClient()
      const tripId = await getTripIdBySlug(client, slug)
      if (!tripId) return { status: 404, jsonBody: { error: 'not found' } }
      const rows = await listTripRows(client, tripId)
      const meta = rows.find(r => r.rowKey === 'meta') as any
      if (meta && meta.locked) {
        return { status: 423, jsonBody: { error: 'trip locked' } }
      }
  // Public mode: no auth required
      const expense: any = rows.find(r => r.rowKey === `expense:${expenseId}`)
      if (!expense) return { status: 404, jsonBody: { error: 'expense not found' } }
      await client.deleteEntity(tripId, `expense:${expenseId}`)
      return { status: 204 }
    } catch (e: any) {
      ctx.error(e)
      return { status: e.status || 500, jsonBody: { error: e.message || 'internal error' } }
    }
  }
})
