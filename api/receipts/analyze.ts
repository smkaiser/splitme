import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getClientPrincipal, isAuthenticated } from '../shared/auth'
import { analyzeReceiptDocument } from '../shared/documentIntelligence'
import { getTableClient, getTripIdBySlug } from '../shared/tableClient'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_BYTES = 4 * 1024 * 1024

function isValidBase64(value: string): boolean {
  return value.length > 0
    && value.length % 4 === 0
    && /^[A-Za-z0-9+/]+={0,2}$/.test(value)
}

app.http('analyzeReceipt', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'trips/{slug}/receipts/analyze',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const principal = getClientPrincipal(req)
    if (!isAuthenticated(principal)) {
      return { status: 401, jsonBody: { error: 'authentication required' } }
    }

    const slug = (req as any).params?.slug || ''
    if (!slug) return { status: 400, jsonBody: { error: 'slug required' } }

    const endpoint = process.env.DOCUMENT_INTELLIGENCE_ENDPOINT
    const apiKey = process.env.DOCUMENT_INTELLIGENCE_API_KEY
    if (!endpoint || !apiKey) {
      ctx.error('Document Intelligence environment variables are not configured')
      return { status: 503, jsonBody: { error: 'receipt scanning is not configured' } }
    }

    try {
      const client = getTableClient()
      const tripId = await getTripIdBySlug(client, slug)
      if (!tripId) return { status: 404, jsonBody: { error: 'trip not found' } }

      const meta = await client.getEntity<Record<string, any>>(tripId, 'meta')
      if (meta.locked) {
        return { status: 423, jsonBody: { error: 'trip locked' } }
      }

      let body: any
      try {
        body = await req.json()
      } catch {
        return { status: 400, jsonBody: { error: 'invalid json' } }
      }

      const contentType = String(body?.contentType || '').toLowerCase()
      if (!ALLOWED_TYPES.has(contentType)) {
        return { status: 400, jsonBody: { error: 'unsupported content type (jpeg, png, or webp only)' } }
      }

      const dataBase64 = String(body?.dataBase64 || '')
      if (!isValidBase64(dataBase64)) {
        return { status: 400, jsonBody: { error: 'valid base64 image data required' } }
      }

      const image = Buffer.from(dataBase64, 'base64')
      if (image.length === 0) {
        return { status: 400, jsonBody: { error: 'empty image' } }
      }
      if (image.length > MAX_BYTES) {
        return { status: 413, jsonBody: { error: 'image too large (max 4 MB)' } }
      }

      const analysis = await analyzeReceiptDocument(endpoint, apiKey, dataBase64)
      return { status: 200, jsonBody: analysis }
    } catch (error: any) {
      ctx.error(`receipt analysis failed: ${error?.message || error}`)
      return { status: 502, jsonBody: { error: error?.message || 'receipt analysis failed' } }
    }
  }
})
