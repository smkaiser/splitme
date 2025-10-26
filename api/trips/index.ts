import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getTableClient, ensureTableExists, newId, nowIso, getTripIdBySlug, listTripRows } from '../shared/tableClient'
import { getClientPrincipal, getAuthenticatedUser, isAuthenticated } from '../shared/auth'

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,64)
}

app.http('trips', {
  methods: ['POST','GET'],
  authLevel: 'anonymous',
  route: 'trips',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const principal = getClientPrincipal(req)
    // GET -> list trips (without secret tokens)
    if (req.method === 'GET') {
      if (!isAuthenticated(principal)) {
        return { status: 401, jsonBody: { error: 'authentication required' } }
      }
      const user = getAuthenticatedUser(principal)!
      try {
        const client = getTableClient()
        await ensureTableExists(client)
        // list slug partition
        const trips: any[] = []
        for await (const ent of client.listEntities({ queryOptions: { filter: `PartitionKey eq 'slug'` } })) {
          const slug = (ent as any).rowKey
          let name = (ent as any).name as string | undefined // may be undefined for older rows
          const tripId = (ent as any).tripId
          let createdAt: string | undefined = (ent as any).createdAt
          let ownerId: string | undefined = (ent as any).ownerId
          let ownerName: string | undefined = (ent as any).ownerName
          let ownerProvider: string | undefined = (ent as any).ownerProvider
          // If ownership metadata missing or does not match the current user, fall back to meta row
          if (!ownerId || ownerId !== user.id || !name || !createdAt) {
            try {
              // meta row fetch
              const rows = await listTripRows(client, tripId)
              const meta = rows.find(r => r.rowKey === 'meta')
              if (meta) {
                createdAt = (meta as any).createdAt
                name = (meta as any).name || name
                ownerId = (meta as any).ownerId || ownerId
                ownerName = (meta as any).ownerName || ownerName
                ownerProvider = (meta as any).ownerProvider || ownerProvider
              }
              // Only allow listing trips owned by this user (or unclaimed legacy trips)
              if (meta && (meta as any).ownerId && (meta as any).ownerId !== user.id) {
                continue
              }
            } catch {}
          }
          if (ownerId && ownerId !== user.id) continue
          trips.push({ slug, name: name ?? slug, tripId, createdAt, ownerId: ownerId ?? null, ownerName: ownerName ?? null, ownerProvider: ownerProvider ?? null })
        }
        return { status: 200, jsonBody: { trips } }
      } catch (e: any) {
        ctx.error(e)
        return { status: e.status || 500, jsonBody: { error: e.message || 'internal error' } }
      }
    }
    // POST -> create trip
    try {
      if (!isAuthenticated(principal)) {
        return { status: 401, jsonBody: { error: 'authentication required' } }
      }
      const user = getAuthenticatedUser(principal)!
      const body: any = await req.json()
      const name = String(body.name || '').trim()
      if (!name) return { status: 400, jsonBody: { error: 'name required' } }

      const client = getTableClient()
      await ensureTableExists(client)

      let baseSlug = body.slug ? slugify(body.slug) : slugify(name)
      if (!baseSlug) baseSlug = 'trip'
      let slug = baseSlug
      let attempt = 1
      while (await getTripIdBySlug(client, slug)) {
        slug = `${baseSlug}-${attempt++}`
      }

      const tripId = newId()
      const now = nowIso()

      // trip meta row
      await client.createEntity({
        partitionKey: tripId,
        rowKey: 'meta',
        type: 'trip',
        name,
        slug,
        createdAt: now,
        updatedAt: now,
        ownerId: user.id,
        ownerName: user.name,
        ownerProvider: user.provider
      })

      // slug index row (store name for list endpoint)
      await client.createEntity({
        partitionKey: 'slug',
        rowKey: slug,
        tripId,
        name,
        createdAt: now,
        ownerId: user.id,
        ownerName: user.name,
        ownerProvider: user.provider
      })

  return { status: 201, jsonBody: { tripId, slug, name, createdAt: now, ownerId: user.id, ownerName: user.name, ownerProvider: user.provider } }
    } catch (e: any) {
      ctx.error(e)
      return { status: e.status || 500, jsonBody: { error: e.message || 'internal error' } }
    }
  }
})

// Delete trip and related rows
app.http('deleteTrip', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'trips/{slug}',
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
      const tripId = await getTripIdBySlug(client, slug)
      if (!tripId) return { status: 404, jsonBody: { error: 'not found' } }
      let ownerId: string | undefined
      try {
        const meta = await client.getEntity(tripId, 'meta')
        ownerId = (meta as any).ownerId
        if (ownerId && ownerId !== user.id) {
          return { status: 403, jsonBody: { error: 'forbidden' } }
        }
      } catch {}
      if (!ownerId) {
        // Legacy trips without owner metadata fall back to slug entry check
        try {
          const slugRow = await client.getEntity('slug', slug)
          ownerId = (slugRow as any).ownerId
          if (ownerId && ownerId !== user.id) {
            return { status: 403, jsonBody: { error: 'forbidden' } }
          }
        } catch {}
      }
      // list rows and delete
      const rows = await listTripRows(client, tripId)
      for (const row of rows) {
        try { await client.deleteEntity(tripId, (row as any).rowKey) } catch {}
      }
      // delete slug index row
      try { await client.deleteEntity('slug', slug) } catch {}
      return { status: 204 }
    } catch (e: any) {
      ctx.error(e)
      return { status: e.status || 500, jsonBody: { error: e.message || 'internal error' } }
    }
  }
})
