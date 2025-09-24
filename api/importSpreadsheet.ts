import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getTableClient, getTripIdBySlug, listTripRows } from './shared/tableClient'
import * as XLSX from 'xlsx'

interface ParsedRow {
  index: number
  include: boolean
  amount: number | null
  date: string // ISO (yyyy-mm-dd)
  description: string
  merchant?: string | null
  currency?: string | null
  warnings: string[]
}

interface ImportRequestBody {
  paidBy: string
  fileName: string
  fileContentBase64: string
}

const MAX_ROWS = 500

app.http('importSpreadsheet', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'trips/{slug}/importSpreadsheet',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const slug = (req as any).params?.slug
    if (!slug) return { status: 400, jsonBody: { error: 'slug required' } }
  let body: ImportRequestBody
  try { body = await req.json() as ImportRequestBody } catch { return { status: 400, jsonBody: { error: 'invalid json' } } }
    if (!body.paidBy) return { status: 400, jsonBody: { error: 'paidBy required' } }
    if (!body.fileName || !body.fileContentBase64) return { status: 400, jsonBody: { error: 'fileName and fileContentBase64 required' } }
    try {
      const client = getTableClient()
      const tripId = await getTripIdBySlug(client, slug)
      if (!tripId) return { status: 404, jsonBody: { error: 'trip not found' } }
      // Validate paidBy is an existing participant
      const rows = await listTripRows(client, tripId)
      const participantIds = new Set(rows.filter(r => r.type === 'participant').map(r => (r as any).participantId))
      if (!participantIds.has(body.paidBy)) return { status: 400, jsonBody: { error: 'paidBy participant not found' } }

      const buffer = Buffer.from(body.fileContentBase64, 'base64')
      const lower = body.fileName.toLowerCase()
      let parsedRows: ParsedRow[] = []
      if (lower.endsWith('.csv')) {
        parsedRows = parseCsv(buffer.toString('utf8'))
      } else if (lower.endsWith('.xlsx')) {
        parsedRows = parseXlsx(buffer)
      } else {
        return { status: 400, jsonBody: { error: 'unsupported file type (must be .csv or .xlsx)' } }
      }

      if (parsedRows.length > MAX_ROWS) {
        parsedRows = parsedRows.slice(0, MAX_ROWS)
        parsedRows[parsedRows.length - 1].warnings.push('truncated-rows')
      }

      // Basic validity stats
      let valid = 0
      for (const r of parsedRows) if (r.amount !== null && r.amount > 0 && r.description.trim()) valid++

      return { status: 200, jsonBody: {
        rows: parsedRows,
        summary: {
          totalRows: parsedRows.length,
            validRows: valid,
            invalidRows: parsedRows.length - valid
        }
      } }
    } catch (e: any) {
      ctx.error(e)
      return { status: 500, jsonBody: { error: e.message || 'internal error' } }
    }
  }
})

function normalizeHeader(h: string) {
  return h.trim().toLowerCase().replace(/[^a-z0-9]+/g,'')
}

function parseCsv(text: string): ParsedRow[] {
  // Normalize newlines and strip potential BOM
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
  const rawLines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const lines = rawLines.filter(l => l.trim().length > 0)
  if (lines.length === 0) return []
  const headerFields = splitCsvLine(lines[0])
  const headers = headerFields.map(unquoteCsv)
  const norm = headers.map(normalizeHeader)
  const map = detectColumns(norm)
  const rows: ParsedRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]).map(unquoteCsv)
    if (cols.every(c => !c.trim())) continue // skip empty row
    const warnings: string[] = []
    const amountStr = pick(cols, map.amount)
    const amount = parseAmount(amountStr, warnings)
    const dateStr = pick(cols, map.date)
    const date = parseDate(dateStr, warnings)
    const { description: desc, merchant: merchCaptured } = resolveDescription(cols, map, warnings)
    const currency = map.currency != null ? sanitizeCurrency(pick(cols, map.currency), warnings) : undefined
    const merchantVal = map.merchant != null ? pick(cols, map.merchant) || merchCaptured || null : (merchCaptured || null)
    rows.push({ index: rows.length, include: true, amount, date, description: desc, merchant: merchantVal, currency, warnings })
  }
  return rows
}

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        // Escaped quote
        if (line[i + 1] === '"') { cur += '"'; i++; continue }
        inQuotes = false
      } else {
        cur += ch
      }
    } else {
      if (ch === '"') { inQuotes = true } else if (ch === ',') { out.push(cur); cur = '' } else { cur += ch }
    }
  }
  out.push(cur)
  return out
}

function unquoteCsv(v: string): string { return v.trim() }

function parseXlsx(buf: Buffer): ParsedRow[] {
  const wb = XLSX.read(buf, { type: 'buffer' })
  // Explicitly only use the very first sheet even if others exist (requirement)
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return []
  const sheet = wb.Sheets[sheetName]
  const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  if (json.length === 0) return []
  const headers = Object.keys(json[0])
  const norm = headers.map(normalizeHeader)
  const map = detectColumns(norm)
  const rows: ParsedRow[] = []
  json.forEach((row, idx) => {
    const warnings: string[] = []
    const amount = parseAmount(row[headers[map.amount ?? -1]], warnings)
    const date = parseDate(row[headers[map.date ?? -1]], warnings)
    const currency = map.currency != null ? sanitizeCurrency(row[headers[map.currency]], warnings) : undefined
    const { description: desc, merchant: merchCaptured } = resolveDescriptionObject(row, headers, map, warnings)
    const merchantVal = map.merchant != null ? (row[headers[map.merchant]] || '').toString().trim() || merchCaptured || null : (merchCaptured || null)
    rows.push({ index: idx, include: true, amount, date, description: desc, merchant: merchantVal, currency, warnings })
  })
  return rows
}

interface ColumnMap { amount?: number; date?: number; description?: number; merchant?: number; currency?: number }
function detectColumns(norm: string[]): ColumnMap {
  const map: ColumnMap = {}
  norm.forEach((h,i) => {
    if (map.amount == null && /^(amount|amt|total|value)$/.test(h)) map.amount = i
    else if (map.date == null && /^(date|transactiondate|dt)$/.test(h)) map.date = i
    else if (map.description == null && /^(description|desc|note|notes|comment|comments|memo)$/.test(h)) map.description = i
    else if (map.merchant == null && /^(merchant|vendor|store|where|place|shop)$/.test(h)) map.merchant = i
    else if (map.currency == null && /^(currency|curr|ccy)$/.test(h)) map.currency = i
  })
  return map
}

function pick(arr: any[], idx?: number) { return (idx == null || idx < 0) ? '' : (arr[idx] ?? '').toString().trim() }

function parseAmount(v: any, warnings: string[]): number | null {
  if (v == null) return null
  let s = v.toString().trim()
  if (!s) return null
  // Replace comma decimal if no dot present but one comma
  if (s.indexOf('.') === -1 && (s.match(/,/g)?.length === 1)) {
    if (/^[0-9.,]+$/.test(s)) s = s.replace(',','.')
  }
  // remove currency symbols & thousands separators
  s = s.replace(/[$€£,\s]/g,'')
  const num = Number(s)
  if (!isFinite(num) || num === 0) { warnings.push('invalid-amount'); return null }
  if (num < 0) { warnings.push('neg-adjusted'); return Number(Math.abs(num).toFixed(2)) }
  return Number(num.toFixed(2))
}

function parseDate(v: any, warnings: string[]): string {
  if (v === undefined || v === null) return todayIso()
  // Excel date serial number case
  if (typeof v === 'number') {
    // Excel serial (1900-based) valid range heuristic
    if (v > 0 && v < 60000) {
      const base = Date.UTC(1899, 11, 30) // Excel erroneously counts 1900-02-29; library often adjusts, but we mimic common base
      const ms = base + v * 86400000
      const d = new Date(ms)
      if (!isNaN(d.getTime())) return d.toISOString().slice(0,10)
    } else {
      // treat large number as timestamp ms maybe
      const d2 = new Date(v)
      if (!isNaN(d2.getTime())) return d2.toISOString().slice(0,10)
    }
  }
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0,10)
  const s = v.toString().trim()
  if (!s) return todayIso()
  let d = new Date(s)
  if (isNaN(d.getTime())) {
    const m = s.match(/^(\d{1,2})[\/](\d{1,2})[\/](\d{4})$/)
    if (m) {
      const a = parseInt(m[1],10), b = parseInt(m[2],10)
      if (a > 12) d = new Date(`${m[3]}-${pad(b)}-${pad(a)}`)
      else d = new Date(`${m[3]}-${pad(a)}-${pad(b)}`)
    }
  }
  if (isNaN(d.getTime())) { warnings.push('date-fallback'); return todayIso() }
  return d.toISOString().slice(0,10)
}

function pad(n: number) { return n < 10 ? '0'+n : ''+n }
function todayIso() { return new Date().toISOString().slice(0,10) }

function sanitizeCurrency(v: any, warnings: string[]): string | null {
  if (!v) return null
  const s = v.toString().trim().toUpperCase()
  if (/^[A-Z]{3}$/.test(s)) return s
  warnings.push('invalid-currency')
  return null
}

interface DescriptionResult { description: string; merchant?: string | null }

function resolveDescription(cols: any[], map: ColumnMap, warnings: string[]): DescriptionResult {
  // Try explicit description column
  let desc = map.description != null ? pick(cols, map.description) : ''
  const merchant = map.merchant != null ? pick(cols, map.merchant) : ''
  if (desc) return { description: desc, merchant }
  // If description column exists but empty, fallback to merchant if available
  if (!desc && merchant) { warnings.push('guessed-description'); return { description: merchant, merchant } }
  // Fallback: search other textual cells excluding amount/date/description/merchant
  for (let i=0;i<cols.length;i++) {
    if ([map.amount, map.date, map.description, map.merchant].includes(i)) continue
    const val = pick(cols, i)
    if (val) { warnings.push('guessed-description'); return { description: val, merchant } }
  }
  warnings.push('missing-description')
  return { description: '', merchant }
}

function resolveDescriptionObject(row: any, headers: string[], map: ColumnMap, warnings: string[]): DescriptionResult {
  let desc = map.description != null ? (row[headers[map.description]] || '').toString().trim() : ''
  const merchant = map.merchant != null ? (row[headers[map.merchant]] || '').toString().trim() : ''
  if (desc) return { description: desc, merchant }
  if (!desc && merchant) { warnings.push('guessed-description'); return { description: merchant, merchant } }
  for (let i=0;i<headers.length;i++) {
    if ([map.amount, map.date, map.description, map.merchant].includes(i)) continue
    const val = (row[headers[i]] || '').toString().trim()
    if (val) { warnings.push('guessed-description'); return { description: val, merchant } }
  }
  warnings.push('missing-description')
  return { description: '', merchant }
}
