import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getTableClient, ensureTableExists, getTripIdBySlug, nowIso, listTripRows } from '../shared/tableClient'
import { getClientPrincipal, getAuthenticatedUser, isAuthenticated } from '../shared/auth'

app.http('joinTripAsContributor', {
  methods: ['POST'],
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

    try {
      const client = getTableClient()
      await ensureTableExists(client)
      const tripId = await getTripIdBySlug(client, slug)
      if (!tripId) return { status: 404, jsonBody: { error: 'trip not found' } }

      const rows = await listTripRows(client, tripId)
      const meta = rows.find(r => r.rowKey === 'meta') as any
      if (!meta) return { status: 500, jsonBody: { error: 'trip corrupt' } }

      // Don't allow owner to join as contributor
      if (meta.ownerId && meta.ownerId === user.id) {
        return { status: 409, jsonBody: { error: 'you are the trip owner' } }
      }

      // Check if already a contributor (idempotent)
      const existing = rows.find(r => r.rowKey === `contributor:${user.id}`)
      if (existing) {
        // Repair: ensure reverse index exists (handles partial failure on previous join)
        try {
          await client.getEntity(`contributorIdx:${user.id}`, slug)
        } catch (indexErr: any) {
          if (indexErr.statusCode === 404) {
            try {
              await client.createEntity({
                partitionKey: `contributorIdx:${user.id}`,
                rowKey: slug,
                tripId,
                tripName: meta.name || slug,
                joinedAt: (existing as any).joinedAt || nowIso()
              })
            } catch {}
          }
        }
        return {
          status: 200,
          jsonBody: {
            userId: user.id,
            userName: (existing as any).userName,
            userProvider: (existing as any).userProvider,
            linkedParticipantId: (existing as any).linkedParticipantId || null,
            joinedAt: (existing as any).joinedAt
          }
        }
      }

      // Parse optional linkedParticipantId from body
      let linkedParticipantId: string | null = null
      try {
        const body: any = await req.json()
        if (body?.linkedParticipantId) {
          // Validate the participant exists
          const participantExists = rows.some(
            r => r.type === 'participant' && r.participantId === body.linkedParticipantId
          )
          if (participantExists) {
            linkedParticipantId = body.linkedParticipantId
          }
        }
      } catch {
        // No body or invalid JSON is fine
      }

      const now = nowIso()

      // Create contributor row in trip partition
      await client.createEntity({
        partitionKey: tripId,
        rowKey: `contributor:${user.id}`,
        type: 'contributor',
        userId: user.id,
        userName: user.name,
        userProvider: user.provider,
        linkedParticipantId: linkedParticipantId || '',
        joinedAt: now,
        updatedAt: now
      })

      // Create reverse index for listing contributed trips
      await client.createEntity({
        partitionKey: `contributorIdx:${user.id}`,
        rowKey: slug,
        tripId,
        tripName: meta.name || slug,
        joinedAt: now
      })

      return {
        status: 201,
        jsonBody: {
          userId: user.id,
          userName: user.name,
          userProvider: user.provider,
          linkedParticipantId,
          joinedAt: now
        }
      }
    } catch (e: any) {
      ctx.error(e)
      return { status: e.status || 500, jsonBody: { error: e.message || 'internal error' } }
    }
  }
})
