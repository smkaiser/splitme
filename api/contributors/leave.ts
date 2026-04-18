import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getTableClient, getTripIdBySlug } from '../shared/tableClient'
import { getClientPrincipal, getAuthenticatedUser, isAuthenticated } from '../shared/auth'

app.http('leaveTripAsContributor', {
  methods: ['DELETE'],
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
      const tripId = await getTripIdBySlug(client, slug)
      if (!tripId) return { status: 404, jsonBody: { error: 'trip not found' } }

      // Delete contributor row from trip partition
      try {
        await client.deleteEntity(tripId, `contributor:${user.id}`)
      } catch (e: any) {
        if (e.statusCode !== 404) throw e
      }

      // Delete reverse index
      try {
        await client.deleteEntity(`contributorIdx:${user.id}`, slug)
      } catch (e: any) {
        if (e.statusCode !== 404) throw e
      }

      return { status: 204 }
    } catch (e: any) {
      ctx.error(e)
      return { status: e.status || 500, jsonBody: { error: e.message || 'internal error' } }
    }
  }
})
