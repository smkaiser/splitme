import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getTableClient, getTripIdBySlug, listTripRows, nowIso } from '../shared/tableClient'

interface UpdateExpenseBody {
  amount?: number
  date?: string
  place?: string
  description?: string
  paidBy?: string
  participants?: string[]
}

function validate(body: any) {
  if (!body || typeof body !== 'object') throw new Error('body required')
  if (body.amount !== undefined && (typeof body.amount !== 'number' || !Number.isFinite(body.amount) || body.amount <= 0)) throw new Error('amount must be positive number')
  if (body.date && isNaN(Date.parse(body.date))) throw new Error('date must be ISO string')
  if (body.place && typeof body.place !== 'string') throw new Error('place must be string')
  if (body.description && typeof body.description !== 'string') throw new Error('description must be string')
  if (body.paidBy && typeof body.paidBy !== 'string') throw new Error('paidBy must be string')
  if (body.participants && (!Array.isArray(body.participants) || body.participants.length === 0)) throw new Error('participants must be non-empty array')
}

app.http('updateExpense', {
  methods: ['PATCH','PUT'],
  authLevel: 'anonymous',
  route: 'trips/{slug}/expenses/{expenseId}',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { slug, expenseId } = (req as any).params || {}
    if (!slug || !expenseId) return { status: 400, jsonBody: { error: 'slug and expenseId required' } }
    try {
  let body: UpdateExpenseBody
  try { body = await req.json() as any } catch { return { status: 400, jsonBody: { error: 'invalid json' } } }
      try { validate(body) } catch (e: any) { return { status: 400, jsonBody: { error: e.message } } }
      const client = getTableClient()
      const tripId = await getTripIdBySlug(client, slug)
      if (!tripId) return { status: 404, jsonBody: { error: 'not found' } }
      const rows = await listTripRows(client, tripId)
  // Public mode: no auth required
      const expense: any = rows.find(r => r.rowKey === `expense:${expenseId}`)
      if (!expense) return { status: 404, jsonBody: { error: 'expense not found' } }
      const participantIds = new Set(rows.filter(r => r.type === 'participant').map(r => r.participantId))
      if (body.paidBy && !participantIds.has(body.paidBy)) return { status: 400, jsonBody: { error: 'paidBy participant not found' } }
      if (body.participants) {
        for (const pid of body.participants) if (!participantIds.has(pid)) return { status: 400, jsonBody: { error: `participant not found: ${pid}` } }
      }
      const updated = {
        ...expense,
        amount: body.amount !== undefined ? body.amount : expense.amount,
        date: body.date || expense.date,
        place: body.place !== undefined ? body.place : expense.place,
        description: body.description !== undefined ? body.description : expense.description,
        paidBy: body.paidBy || expense.paidBy,
        participantIds: body.participants ? body.participants.join(',') : expense.participantIds,
        updatedAt: nowIso()
      }
      await client.updateEntity(updated, 'Replace')
      return { status: 200, jsonBody: {
        id: expense.expenseId,
        amount: updated.amount,
        date: updated.date,
        place: updated.place,
        description: updated.description,
        paidBy: updated.paidBy,
        participants: updated.participantIds.split(',').filter(Boolean),
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt
      }}
    } catch (e: any) {
      ctx.error(e)
      return { status: e.status || 500, jsonBody: { error: e.message || 'internal error' } }
    }
  }
})
