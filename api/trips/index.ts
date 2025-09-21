import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getTableClient, ensureTableExists, newId, nowIso, getTripIdBySlug, listTripRows } from '../shared/tableClient'

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,64)
}

app.http('trips', {
  methods: ['POST','GET'],
  authLevel: 'anonymous',
  route: 'trips',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    // GET -> list trips (without secret tokens)
    if (req.method === 'GET') {
      try {
        const client = getTableClient()
        await ensureTableExists(client)
        // list slug partition
        const trips: any[] = []
        for await (const ent of client.listEntities({ queryOptions: { filter: `PartitionKey eq 'slug'` } })) {
          const slug = (ent as any).rowKey
          const name = (ent as any).name // may be undefined for older rows
          const tripId = (ent as any).tripId
          let createdAt: string | undefined
            // Fetch meta if name or createdAt missing
          if (!name || !createdAt) {
            try {
              // meta row fetch
              const rows = await listTripRows(client, tripId)
              const meta = rows.find(r => r.rowKey === 'meta')
              if (meta) {
                createdAt = (meta as any).createdAt
              }
            } catch {}
          }
          trips.push({ slug, name, tripId, createdAt })
        }
        return { status: 200, jsonBody: { trips } }
      } catch (e: any) {
        ctx.error(e)
        return { status: e.status || 500, jsonBody: { error: e.message || 'internal error' } }
      }
    }
    // POST -> create trip
    try {
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
        updatedAt: now
      })

      // slug index row (store name for list endpoint)
      await client.createEntity({
        partitionKey: 'slug',
        rowKey: slug,
        tripId,
        name
      })

  return { status: 201, jsonBody: { tripId, slug, name, createdAt: now } }
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
    const slug = (req as any).params?.slug
    if (!slug) return { status: 400, jsonBody: { error: 'slug required' } }
    try {
      const client = getTableClient()
      const tripId = await getTripIdBySlug(client, slug)
      if (!tripId) return { status: 404, jsonBody: { error: 'not found' } }
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
