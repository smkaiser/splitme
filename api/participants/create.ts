import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getTableClient, getTripIdBySlug, listTripRows, newId, nowIso } from '../shared/tableClient'

app.http('createParticipant', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'trips/{slug}/participants',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const slug = (req as any).params?.slug || ''
    if (!slug) return { status: 400, jsonBody: { error: 'slug required' } }
    try {
      const body: any = await req.json()
      const name = String(body.name || '').trim()
      if (!name) return { status: 400, jsonBody: { error: 'name required' } }
      const client = getTableClient()
      const tripId = await getTripIdBySlug(client, slug)
      if (!tripId) return { status: 404, jsonBody: { error: 'not found' } }
      const rows = await listTripRows(client, tripId)
      const meta = rows.find(r => r.rowKey === 'meta') as any
      if (meta && meta.locked) {
        return { status: 423, jsonBody: { error: 'trip locked' } }
      }
  // Public mode: no auth required

      const participantId = newId()
      const now = nowIso()
      await client.createEntity({
        partitionKey: tripId,
        rowKey: `participant:${participantId}`,
        type: 'participant',
        participantId,
        name,
        createdAt: now,
        updatedAt: now
      })

      return { status: 201, jsonBody: { id: participantId, name, createdAt: now, updatedAt: now } }
    } catch (e: any) {
      ctx.error(e)
      return { status: e.status || 500, jsonBody: { error: e.message || 'internal error' } }
    }
  }
})
