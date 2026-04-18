import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getTableClient, getTripIdBySlug, listTripRows, nowIso } from '../shared/tableClient'
import { getClientPrincipal, getAuthenticatedUser, isAuthenticated } from '../shared/auth'

app.http('updateContributor', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'trips/{slug}/contributors',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const principal = getClientPrincipal(req)
    if (!isAuthenticated(principal)) {
      return { status: 401, jsonBody: { error: 'authentication required' } }
    }
    const user = getAuthenticatedUser(principal)!
    const slug = (req as any).params?.slug
    if (!slug) return { status: 400, jsonBody: { error: 'slug required' } }

    let body: any
    try {
      body = await req.json()
    } catch {
      return { status: 400, jsonBody: { error: 'invalid json' } }
    }

    try {
      const client = getTableClient()
      const tripId = await getTripIdBySlug(client, slug)
      if (!tripId) return { status: 404, jsonBody: { error: 'trip not found' } }

      // Verify the user is a contributor
      let existing: Record<string, any>
      try {
        existing = await client.getEntity<Record<string, any>>(tripId, `contributor:${user.id}`)
      } catch (e: any) {
        if (e.statusCode === 404) {
          return { status: 404, jsonBody: { error: 'you are not a contributor of this trip' } }
        }
        throw e
      }

      // Validate linkedParticipantId if provided
      const linkedParticipantId = body.linkedParticipantId ?? null
      if (linkedParticipantId) {
        const rows = await listTripRows(client, tripId)
        const participantExists = rows.some(
          r => r.type === 'participant' && r.participantId === linkedParticipantId
        )
        if (!participantExists) {
          return { status: 400, jsonBody: { error: 'participant not found' } }
        }
      }

      const now = nowIso()
      await client.updateEntity({
        partitionKey: tripId,
        rowKey: `contributor:${user.id}`,
        linkedParticipantId: linkedParticipantId || '',
        updatedAt: now
      }, 'Merge', { etag: existing.etag ?? '*' })

      return {
        status: 200,
        jsonBody: {
          userId: user.id,
          userName: existing.userName,
          userProvider: existing.userProvider,
          linkedParticipantId,
          joinedAt: existing.joinedAt
        }
      }
    } catch (e: any) {
      ctx.error(e)
      return { status: e.status || 500, jsonBody: { error: e.message || 'internal error' } }
    }
  }
})
