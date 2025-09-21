import { TableClient, odata } from '@azure/data-tables'
import { randomUUID } from 'crypto'

const tableName = process.env.TABLE_NAME || 'TripsData'

export function getConnectionString() {
  const cs =
    process.env.TABLES_CONNECTION_STRING ||
    process.env.STORAGE_CONNECTION || // added to support Static Web Apps custom setting
    process.env.AzureWebJobsStorage
  if (!cs) throw new Error('Missing TABLES_CONNECTION_STRING/STORAGE_CONNECTION/AzureWebJobsStorage')
  return cs
}

export function getTableClient() {
  const connectionString = getConnectionString()
  // allowInsecureConnection is mainly helpful when using Azurite locally
  return TableClient.fromConnectionString(connectionString, tableName, { allowInsecureConnection: true })
}

export interface TripMetaRow {
  partitionKey: string // tripId
  rowKey: string // 'meta'
  type: 'trip'
  name: string
  slug: string
  createdAt: string
  updatedAt: string
}

export interface ParticipantRow {
  partitionKey: string
  rowKey: string // participant:{id}
  type: 'participant'
  participantId: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface ExpenseRow {
  partitionKey: string
  rowKey: string // expense:{id}
  type: 'expense'
  expenseId: string
  amount: number
  date: string
  place: string
  description: string
  paidBy: string
  participantIds: string
  createdAt: string
  updatedAt: string
}

export interface SlugIndexRow {
  partitionKey: string // 'slug'
  rowKey: string // slug
  tripId: string
}

export function newId() { return randomUUID() }

export function nowIso() { return new Date().toISOString() }

export async function ensureTableExists(client: TableClient) {
  try { await client.createTable() } catch (e: any) { if (e.statusCode !== 409) throw e }
}

export async function getTripIdBySlug(client: TableClient, slug: string): Promise<string | null> {
  try {
    const entity = await client.getEntity<SlugIndexRow>('slug', slug)
    return (entity as any).tripId || null
  } catch (e: any) {
    if (e.statusCode === 404) return null
    throw e
  }
}

export async function listTripRows(client: TableClient, tripId: string) {
  const rows: any[] = []
  for await (const entity of client.listEntities({ queryOptions: { filter: odata`PartitionKey eq ${tripId}` } })) {
    rows.push(entity)
  }
  return rows
}

// Public mode: auth disabled – keep function for compatibility (no-op)
export function requireWriteAuth(_secretTokenFromRow: string, _provided?: string) { /* no-op */ }
