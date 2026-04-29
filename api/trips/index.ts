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
          let locked: boolean | undefined = (ent as any).locked
          let photoUpdatedAt: string | undefined = (ent as any).photoUpdatedAt
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
                if (typeof (meta as any).locked === 'boolean') locked = (meta as any).locked
                if ((meta as any).photoUpdatedAt) photoUpdatedAt = (meta as any).photoUpdatedAt
              }
              // Only allow listing trips owned by this user (or unclaimed legacy trips)
              if (meta && (meta as any).ownerId && (meta as any).ownerId !== user.id) {
                continue
              }
            } catch {}
          }
          if (ownerId && ownerId !== user.id) continue
          trips.push({ slug, name: name ?? slug, tripId, createdAt, ownerId: ownerId ?? null, ownerName: ownerName ?? null, ownerProvider: ownerProvider ?? null, locked: !!locked, photoUpdatedAt: photoUpdatedAt || null, role: 'owner' as const })
        }

        // Also fetch trips where user is a contributor via the reverse index
        const contributedSlugs = new Set<string>()
        try {
          for await (const ent of client.listEntities({ queryOptions: { filter: `PartitionKey eq 'contributorIdx:${user.id}'` } })) {
            const cSlug = (ent as any).rowKey
            if (trips.some(t => t.slug === cSlug)) continue // already listed as owner
            contributedSlugs.add(cSlug)
            const cTripId = (ent as any).tripId
            const cTripName = (ent as any).tripName
            const cJoinedAt = (ent as any).joinedAt
            // Fetch basic meta for the trip
            let cCreatedAt = cJoinedAt
            let cLocked = false
            let cOwnerId: string | null = null
            let cOwnerName: string | null = null
            let cOwnerProvider: string | null = null
            let cPhotoUpdatedAt: string | null = null
            try {
              const meta = await client.getEntity<Record<string, any>>(cTripId, 'meta')
              cCreatedAt = meta.createdAt || cJoinedAt
              cLocked = !!(meta as any).locked
              cOwnerId = (meta as any).ownerId || null
              cOwnerName = (meta as any).ownerName || null
              cOwnerProvider = (meta as any).ownerProvider || null
              cPhotoUpdatedAt = (meta as any).photoUpdatedAt || null
            } catch (metaErr: any) {
              if (metaErr.statusCode === 404) {
                // Stale index — trip was deleted; clean up and skip
                try { await client.deleteEntity(`contributorIdx:${user.id}`, cSlug) } catch {}
                continue
              }
            }
            trips.push({
              slug: cSlug,
              name: cTripName || cSlug,
              tripId: cTripId,
              createdAt: cCreatedAt,
              ownerId: cOwnerId,
              ownerName: cOwnerName,
              ownerProvider: cOwnerProvider,
              locked: cLocked,
              photoUpdatedAt: cPhotoUpdatedAt,
              role: 'contributor' as const
            })
          }
        } catch (e) {
          ctx.log(`Failed to fetch contributor index: ${e}`)
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
        ownerProvider: user.provider,
        locked: false
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
        ownerProvider: user.provider,
        locked: false
      })

  return { status: 201, jsonBody: { tripId, slug, name, createdAt: now, ownerId: user.id, ownerName: user.name, ownerProvider: user.provider, locked: false } }
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
      // Clean up contributor reverse-index rows before deleting trip rows
      for (const row of rows) {
        if ((row as any).type === 'contributor' && (row as any).userId) {
          try {
            await client.deleteEntity(`contributorIdx:${(row as any).userId}`, slug)
          } catch {}
        }
      }
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
