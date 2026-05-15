import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getTableClient, getTripIdBySlug, listTripRows, nowIso } from '../shared/tableClient'
import { getClientPrincipal, getAuthenticatedUser, isAuthenticated } from '../shared/auth'

interface UpdateExpenseBody {
  amount?: number
  date?: string
  place?: string
  description?: string
  paidBy?: string
  participants?: string[]
  splits?: Record<string, number> | null
}

function validate(body: any) {
  if (!body || typeof body !== 'object') throw new Error('body required')
  if (body.amount !== undefined && (typeof body.amount !== 'number' || !Number.isFinite(body.amount) || body.amount <= 0)) throw new Error('amount must be positive number')
  if (body.date && isNaN(Date.parse(body.date))) throw new Error('date must be ISO string')
  if (body.place && typeof body.place !== 'string') throw new Error('place must be string')
  if (body.description && typeof body.description !== 'string') throw new Error('description must be string')
  if (body.paidBy && typeof body.paidBy !== 'string') throw new Error('paidBy must be string')
  if (body.participants && (!Array.isArray(body.participants) || body.participants.length === 0)) throw new Error('participants must be non-empty array')
  // splits validation is deferred to handler where we have access to existing expense data
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
      const meta = rows.find(r => r.rowKey === 'meta') as any
      if (meta && meta.locked) {
        return { status: 423, jsonBody: { error: 'trip locked' } }
      }
  // Public mode: no auth required
      const principal = getClientPrincipal(req)
      const user = isAuthenticated(principal) ? getAuthenticatedUser(principal) : null
      const lastEditedBy = user ? user.name : null

      const expense: any = rows.find(r => r.rowKey === `expense:${expenseId}`)
      if (!expense) return { status: 404, jsonBody: { error: 'expense not found' } }
      const participantIds = new Set(rows.filter(r => r.type === 'participant').map(r => r.participantId))
      if (body.paidBy && !participantIds.has(body.paidBy)) return { status: 400, jsonBody: { error: 'paidBy participant not found' } }
      if (body.participants) {
        for (const pid of body.participants) if (!participantIds.has(pid)) return { status: 400, jsonBody: { error: `participant not found: ${pid}` } }
      }
      if (body.splits !== undefined && body.splits !== null) {
        if (typeof body.splits !== 'object' || Array.isArray(body.splits)) return { status: 400, jsonBody: { error: 'splits must be an object' } }
        const effectiveParticipants = body.participants || (expense.participantIds || '').split(',').filter(Boolean)
        const participantSet = new Set(effectiveParticipants)
        for (const key of Object.keys(body.splits)) {
          if (!participantSet.has(key)) return { status: 400, jsonBody: { error: `splits key not in participants: ${key}` } }
        }
        for (const val of Object.values(body.splits)) {
          if (typeof val !== 'number' || !Number.isFinite(val) || val < 0) return { status: 400, jsonBody: { error: 'splits values must be finite non-negative numbers' } }
        }
        const effectiveAmount = body.amount !== undefined ? body.amount : expense.amount
        const sum = Object.values(body.splits).reduce((a: number, b: unknown) => a + (b as number), 0)
        if (Math.abs(sum - Number(effectiveAmount)) > 0.01) return { status: 400, jsonBody: { error: 'splits must sum to amount' } }
      }
      const updated = {
        ...expense,
        amount: body.amount !== undefined ? body.amount : expense.amount,
        date: body.date || expense.date,
        place: body.place !== undefined ? body.place : expense.place,
        description: body.description !== undefined ? body.description : expense.description,
        paidBy: body.paidBy || expense.paidBy,
        participantIds: body.participants ? body.participants.join(',') : expense.participantIds,
        splits: body.splits !== undefined ? (body.splits ? JSON.stringify(body.splits) : '') : expense.splits,
        updatedAt: nowIso(),
        lastEditedBy: lastEditedBy || ''
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
        splits: updated.splits ? JSON.parse(updated.splits) : null,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        createdBy: updated.createdBy || null,
        lastEditedBy
      }}
    } catch (e: any) {
      ctx.error(e)
      return { status: e.status || 500, jsonBody: { error: e.message || 'internal error' } }
    }
  }
})
