import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getTableClient, getTripIdBySlug, nowIso } from '../shared/tableClient'
import { getPhotosContainer, tripPhotoBlobName } from '../shared/blobClient'
import { checkTripEditAccess } from '../shared/tripPermissions'
import { getClientPrincipal, getAuthenticatedUser, isAuthenticated } from '../shared/auth'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

async function loadMeta(client: ReturnType<typeof getTableClient>, tripId: string) {
  try {
    return await client.getEntity<Record<string, any>>(tripId, 'meta')
  } catch (e: any) {
    if (e.statusCode === 404) return null
    throw e
  }
}

app.http('tripPhoto', {
  methods: ['GET', 'PUT', 'DELETE'],
  authLevel: 'anonymous',
  route: 'trips/{slug}/photo',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const slug = (req as any).params?.slug || ''
    if (!slug) return { status: 400, jsonBody: { error: 'slug required' } }

    try {
      const client = getTableClient()
      const tripId = await getTripIdBySlug(client, slug)
      if (!tripId) return { status: 404, jsonBody: { error: 'not found' } }

      if (req.method === 'GET') {
        const meta = await loadMeta(client, tripId)
        const contentType = meta && (meta as any).photoContentType
        const updatedAt = meta && (meta as any).photoUpdatedAt
        if (!contentType || !updatedAt) {
          return { status: 404, jsonBody: { error: 'no photo' } }
        }
        const container = await getPhotosContainer()
        const blob = container.getBlockBlobClient(tripPhotoBlobName(tripId))
        try {
          const buf = await blob.downloadToBuffer()
          return {
            status: 200,
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=31536000, immutable',
              'Last-Modified': new Date(updatedAt).toUTCString()
            },
            body: buf
          }
        } catch (e: any) {
          if (e.statusCode === 404) return { status: 404, jsonBody: { error: 'no photo' } }
          throw e
        }
      }

      // Mutating methods require auth + (owner or contributor).
      const principal = getClientPrincipal(req)
      if (!isAuthenticated(principal)) {
        return { status: 401, jsonBody: { error: 'authentication required' } }
      }
      const user = getAuthenticatedUser(principal)!
      const access = await checkTripEditAccess(client, tripId, user)
      if (!access.allowed) {
        return { status: 403, jsonBody: { error: 'forbidden' } }
      }

      const container = await getPhotosContainer()
      const blob = container.getBlockBlobClient(tripPhotoBlobName(tripId))
      const now = nowIso()

      if (req.method === 'PUT') {
        let body: any
        try {
          body = await req.json()
        } catch {
          return { status: 400, jsonBody: { error: 'invalid json' } }
        }
        const contentType = String(body?.contentType || '').toLowerCase()
        if (!ALLOWED_TYPES.has(contentType)) {
          return { status: 400, jsonBody: { error: 'unsupported content type (jpeg, png, webp, gif only)' } }
        }
        const dataBase64 = String(body?.dataBase64 || '')
        if (!dataBase64) return { status: 400, jsonBody: { error: 'dataBase64 required' } }
        let buffer: Buffer
        try {
          buffer = Buffer.from(dataBase64, 'base64')
        } catch {
          return { status: 400, jsonBody: { error: 'invalid base64 data' } }
        }
        if (buffer.length === 0) return { status: 400, jsonBody: { error: 'empty image' } }
        if (buffer.length > MAX_BYTES) return { status: 413, jsonBody: { error: 'image too large (max 5 MB)' } }

        await blob.uploadData(buffer, { blobHTTPHeaders: { blobContentType: contentType } })

        // Update meta row
        try {
          await client.updateEntity({
            partitionKey: tripId,
            rowKey: 'meta',
            photoContentType: contentType,
            photoUpdatedAt: now,
            updatedAt: now
          }, 'Merge')
        } catch (err) {
          ctx.log(`failed to update meta with photo: ${err}`)
        }
        // Update slug index for fast list rendering
        try {
          await client.updateEntity({
            partitionKey: 'slug',
            rowKey: slug,
            photoContentType: contentType,
            photoUpdatedAt: now
          }, 'Merge')
        } catch (err) {
          ctx.log(`failed to update slug index with photo: ${err}`)
        }

        return { status: 200, jsonBody: { photoUpdatedAt: now, photoContentType: contentType } }
      }

      if (req.method === 'DELETE') {
        try { await blob.deleteIfExists() } catch (err) { ctx.log(`failed to delete photo blob: ${err}`) }
        try {
          await client.updateEntity({
            partitionKey: tripId,
            rowKey: 'meta',
            photoContentType: '',
            photoUpdatedAt: '',
            updatedAt: now
          }, 'Merge')
        } catch (err) {
          ctx.log(`failed to clear photo meta: ${err}`)
        }
        try {
          await client.updateEntity({
            partitionKey: 'slug',
            rowKey: slug,
            photoContentType: '',
            photoUpdatedAt: ''
          }, 'Merge')
        } catch (err) {
          ctx.log(`failed to clear photo slug index: ${err}`)
        }
        return { status: 204 }
      }

      return { status: 405, jsonBody: { error: 'method not allowed' } }
    } catch (e: any) {
      ctx.error(e)
      return { status: e.status || 500, jsonBody: { error: e.message || 'internal error' } }
    }
  }
})
