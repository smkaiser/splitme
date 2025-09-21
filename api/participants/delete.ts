import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getTableClient, getTripIdBySlug, listTripRows } from '../shared/tableClient'

app.http('deleteParticipant', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'trips/{slug}/participants/{participantId}',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const slug = (req as any).params?.slug || ''
    const participantId = (req as any).params?.participantId || ''
    if (!slug || !participantId) return { status: 400, jsonBody: { error: 'slug and participantId required' } }
    try {
      const client = getTableClient()
      const tripId = await getTripIdBySlug(client, slug)
      if (!tripId) return { status: 404, jsonBody: { error: 'not found' } }
      const rows = await listTripRows(client, tripId)
  // Public mode: no auth required

      // Prevent deletion if participant is referenced in an expense
      const expenseUsing = rows.find(r => r.type === 'expense' && (r.participantIds || '').split(',').includes(participantId))
      if (expenseUsing) return { status: 409, jsonBody: { error: 'participant in use by expense' } }

      await client.deleteEntity(tripId, `participant:${participantId}`)
      return { status: 204 }
    } catch (e: any) {
      ctx.error(e)
      return { status: e.status || 500, jsonBody: { error: e.message || 'internal error' } }
    }
  }
})
