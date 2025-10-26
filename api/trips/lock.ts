import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getTableClient, getTripIdBySlug, nowIso } from '../shared/tableClient'
import { getClientPrincipal, getAuthenticatedUser, isAuthenticated } from '../shared/auth'

interface ToggleLockBody {
  locked: boolean
}

app.http('toggleTripLock', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'trips/{slug}/lock',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const principal = getClientPrincipal(req)
    if (!isAuthenticated(principal)) {
      return { status: 401, jsonBody: { error: 'authentication required' } }
    }
    const user = getAuthenticatedUser(principal)!
    const slug = (req as any).params?.slug
    if (!slug) return { status: 400, jsonBody: { error: 'slug required' } }

    let body: ToggleLockBody
    try {
      body = await req.json() as ToggleLockBody
    } catch {
      return { status: 400, jsonBody: { error: 'invalid json' } }
    }
    if (typeof body.locked !== 'boolean') {
      return { status: 400, jsonBody: { error: 'locked flag required' } }
    }
    const desiredLocked = body.locked

    try {
      const client = getTableClient()
      const tripId = await getTripIdBySlug(client, slug)
      if (!tripId) return { status: 404, jsonBody: { error: 'not found' } }

      let ownerId: string | undefined
      let metaEntity: Record<string, any> | undefined
      try {
        metaEntity = await client.getEntity<Record<string, any>>(tripId, 'meta')
        ownerId = metaEntity.ownerId
        if (ownerId && ownerId !== user.id) {
          return { status: 403, jsonBody: { error: 'forbidden' } }
        }
      } catch (err) {
        ctx.log(`failed to fetch meta for lock toggle: ${err}`)
      }
      if (!ownerId) {
        try {
          const slugRow = await client.getEntity<Record<string, any>>('slug', slug)
          ownerId = slugRow.ownerId
          if (ownerId && ownerId !== user.id) {
            return { status: 403, jsonBody: { error: 'forbidden' } }
          }
        } catch (err) {
          ctx.log(`failed to fetch slug row for lock toggle: ${err}`)
        }
      }
      if (ownerId && ownerId !== user.id) {
        return { status: 403, jsonBody: { error: 'forbidden' } }
      }

      const now = nowIso()
      try {
        await client.upsertEntity({
          partitionKey: tripId,
          rowKey: 'meta',
          ...(metaEntity ?? {}),
          locked: desiredLocked,
          updatedAt: now
        }, 'Merge')
      } catch (err) {
        ctx.log(`failed to update meta lock state: ${err}`)
        return { status: 500, jsonBody: { error: 'failed to update lock state' } }
      }
      try {
        const slugEntity = await client.getEntity<Record<string, any>>('slug', slug)
        await client.upsertEntity({
          partitionKey: 'slug',
          rowKey: slug,
          ...slugEntity,
          locked: desiredLocked,
          updatedAt: now
        }, 'Merge')
      } catch (err) {
        ctx.log(`failed to update slug lock state: ${err}`)
      }

      return { status: 200, jsonBody: { locked: desiredLocked, updatedAt: now } }
    } catch (e: any) {
      ctx.error(e)
      return { status: e.status || 500, jsonBody: { error: e.message || 'internal error' } }
    }
  }
})
