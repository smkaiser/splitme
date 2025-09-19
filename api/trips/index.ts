import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getTableClient, ensureTableExists, newId, nowIso, getTripIdBySlug } from '../shared/tableClient'
import { randomBytes } from 'crypto'

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,64)
}

app.http('trips', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'trips',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
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
      const secretToken = randomBytes(24).toString('hex')
      const now = nowIso()

      // trip meta row
      await client.createEntity({
        partitionKey: tripId,
        rowKey: 'meta',
        type: 'trip',
        name,
        slug,
        secretToken,
        createdAt: now,
        updatedAt: now
      })

      // slug index row
      await client.createEntity({
        partitionKey: 'slug',
        rowKey: slug,
        tripId
      })

      return { status: 201, jsonBody: { tripId, slug, name, secretToken, createdAt: now } }
    } catch (e: any) {
      ctx.error(e)
      return { status: e.status || 500, jsonBody: { error: e.message || 'internal error' } }
    }
  }
})
