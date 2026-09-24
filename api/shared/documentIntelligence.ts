const API_VERSION = '2024-11-30'
const MODEL_ID = 'prebuilt-receipt'
const MAX_POLL_ATTEMPTS = 30
const DEFAULT_POLL_DELAY_MS = 500

interface DocumentField {
  content?: unknown
  confidence?: unknown
  valueString?: unknown
  valueDate?: unknown
  valueNumber?: unknown
  valueCurrency?: {
    amount?: unknown
    currencyCode?: unknown
  }
}

export interface ReceiptAnalysis {
  merchantName: string | null
  transactionDate: string | null
  total: number | null
  currency: string | null
  confidence: {
    merchantName: number | null
    transactionDate: number | null
    total: number | null
  }
}

function asField(value: unknown): DocumentField | null {
  return value && typeof value === 'object' ? value as DocumentField : null
}

function fieldConfidence(field: DocumentField | null): number | null {
  return typeof field?.confidence === 'number' && Number.isFinite(field.confidence)
    ? field.confidence
    : null
}

function fieldString(field: DocumentField | null): string | null {
  const value = typeof field?.valueString === 'string'
    ? field.valueString
    : typeof field?.content === 'string'
      ? field.content
      : ''
  return value.trim() || null
}

function fieldDate(field: DocumentField | null): string | null {
  if (typeof field?.valueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(field.valueDate)) {
    return field.valueDate
  }
  if (typeof field?.content !== 'string') return null
  const parsed = new Date(field.content)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10)
}

function fieldAmount(field: DocumentField | null): number | null {
  const raw = field?.valueCurrency?.amount ?? field?.valueNumber
  return typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? raw : null
}

export function normalizeReceiptResult(result: unknown): ReceiptAnalysis {
  const analyzeResult = result && typeof result === 'object'
    ? (result as { analyzeResult?: unknown }).analyzeResult
    : null
  const documents = analyzeResult && typeof analyzeResult === 'object'
    ? (analyzeResult as { documents?: unknown }).documents
    : null
  const firstDocument = Array.isArray(documents) ? documents[0] : null
  const fields = firstDocument && typeof firstDocument === 'object'
    ? (firstDocument as { fields?: unknown }).fields
    : null
  const fieldMap = fields && typeof fields === 'object'
    ? fields as Record<string, unknown>
    : {}

  const merchantName = asField(fieldMap.MerchantName)
  const transactionDate = asField(fieldMap.TransactionDate)
  const total = asField(fieldMap.Total)
  const currencyCode = total?.valueCurrency?.currencyCode

  return {
    merchantName: fieldString(merchantName),
    transactionDate: fieldDate(transactionDate),
    total: fieldAmount(total),
    currency: typeof currencyCode === 'string' && currencyCode.trim()
      ? currencyCode.trim().toUpperCase()
      : null,
    confidence: {
      merchantName: fieldConfidence(merchantName),
      transactionDate: fieldConfidence(transactionDate),
      total: fieldConfidence(total)
    }
  }
}

function getErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback
  const error = (body as { error?: unknown }).error
  if (!error || typeof error !== 'object') return fallback
  const message = (error as { message?: unknown }).message
  return typeof message === 'string' && message.trim() ? message : fallback
}

function pollDelay(response: Response): number {
  const retryAfter = Number(response.headers.get('retry-after'))
  return Number.isFinite(retryAfter) && retryAfter > 0
    ? Math.min(retryAfter * 1000, 5000)
    : DEFAULT_POLL_DELAY_MS
}

function sleep(milliseconds: number) {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

export async function analyzeReceiptDocument(
  endpoint: string,
  apiKey: string,
  base64Source: string
): Promise<ReceiptAnalysis> {
  const serviceEndpoint = endpoint.replace(/\/+$/, '')
  const analyzeUrl = `${serviceEndpoint}/documentintelligence/documentModels/${MODEL_ID}:analyze?api-version=${API_VERSION}`
  const headers = {
    'Content-Type': 'application/json',
    'Ocp-Apim-Subscription-Key': apiKey
  }

  const initialResponse = await fetch(analyzeUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ base64Source })
  })

  if (initialResponse.status !== 202) {
    const body = await initialResponse.json().catch(() => null)
    throw new Error(getErrorMessage(body, `Document Intelligence rejected the receipt (${initialResponse.status})`))
  }

  const operationLocation = initialResponse.headers.get('operation-location')
  if (!operationLocation) {
    throw new Error('Document Intelligence did not return an operation location')
  }

  let delay = pollDelay(initialResponse)
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    await sleep(delay)
    const response = await fetch(operationLocation, {
      headers: { 'Ocp-Apim-Subscription-Key': apiKey }
    })
    const body = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(getErrorMessage(body, `Receipt analysis failed (${response.status})`))
    }

    const status = body && typeof body === 'object'
      ? (body as { status?: unknown }).status
      : null
    if (status === 'succeeded') return normalizeReceiptResult(body)
    if (status === 'failed') {
      throw new Error(getErrorMessage(body, 'Document Intelligence could not analyze the receipt'))
    }
    if (status !== 'running' && status !== 'notStarted') {
      throw new Error('Document Intelligence returned an unknown analysis status')
    }
    delay = pollDelay(response)
  }

  throw new Error('Receipt analysis timed out')
}
