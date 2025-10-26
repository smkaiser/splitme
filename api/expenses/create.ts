import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getTableClient, getTripIdBySlug, listTripRows, newId, nowIso } from '../shared/tableClient'

interface CreateExpenseBody {
  amount: number
  date?: string
  place?: string
  description?: string
  paidBy: string
  participants: string[]
}

function validate(body: any): asserts body is CreateExpenseBody {
  if (!body || typeof body !== 'object') throw new Error('body required')
  if (typeof body.amount !== 'number' || !Number.isFinite(body.amount) || body.amount <= 0) throw new Error('amount must be positive number')
  if (typeof body.paidBy !== 'string' || !body.paidBy) throw new Error('paidBy required')
  if (!Array.isArray(body.participants) || body.participants.length === 0) throw new Error('participants array required')
  if (body.date && isNaN(Date.parse(body.date))) throw new Error('date must be ISO string')
  if (body.place && typeof body.place !== 'string') throw new Error('place must be string')
  if (body.description && typeof body.description !== 'string') throw new Error('description must be string')
}

app.http('createExpense', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'trips/{slug}/expenses',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const slug = (req as any).params?.slug || ''
    if (!slug) return { status: 400, jsonBody: { error: 'slug required' } }
    try {
      let body: any
      try { body = await req.json() } catch { return { status: 400, jsonBody: { error: 'invalid json' } } }
      try { validate(body) } catch (e: any) { return { status: 400, jsonBody: { error: e.message } } }
      const client = getTableClient()
      const tripId = await getTripIdBySlug(client, slug)
      if (!tripId) return { status: 404, jsonBody: { error: 'not found' } }
      const rows = await listTripRows(client, tripId)
      const meta = rows.find(r => r.rowKey === 'meta') as any
      if (meta && meta.locked) {
        return { status: 423, jsonBody: { error: 'trip locked' } }
      }
  // Public mode: no auth required
      const participantIds = new Set(rows.filter(r => r.type === 'participant').map(r => r.participantId))
      if (!participantIds.has(body.paidBy)) return { status: 400, jsonBody: { error: 'paidBy participant not found' } }
      for (const pid of body.participants) { if (!participantIds.has(pid)) return { status: 400, jsonBody: { error: `participant not found: ${pid}` } } }
      const expenseId = newId()
      const now = nowIso()
      await client.createEntity({
        partitionKey: tripId,
        rowKey: `expense:${expenseId}`,
        type: 'expense',
        expenseId,
        amount: body.amount,
        date: body.date || now,
        place: body.place || '',
        description: body.description || '',
        paidBy: body.paidBy,
        participantIds: body.participants.join(','),
        createdAt: now,
        updatedAt: now
      })
      return { status: 201, jsonBody: {
        id: expenseId,
        amount: body.amount,
        date: body.date || now,
        place: body.place || '',
        description: body.description || '',
        paidBy: body.paidBy,
        participants: body.participants,
        createdAt: now
      }}
    } catch (e: any) {
      ctx.error(e)
      return { status: e.status || 500, jsonBody: { error: e.message || 'internal error' } }
    }
  }
})
