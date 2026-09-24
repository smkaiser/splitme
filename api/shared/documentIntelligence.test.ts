import { describe, expect, it } from 'vitest'
import { normalizeReceiptResult } from './documentIntelligence'

describe('normalizeReceiptResult', () => {
  it('extracts the fields used by the expense form', () => {
    const result = normalizeReceiptResult({
      analyzeResult: {
        documents: [{
          fields: {
            MerchantName: {
              type: 'string',
              valueString: 'Contoso Cafe',
              confidence: 0.98
            },
            TransactionDate: {
              type: 'date',
              valueDate: '2026-09-24',
              confidence: 0.94
            },
            Total: {
              type: 'currency',
              valueCurrency: { amount: 42.75, currencyCode: 'usd' },
              confidence: 0.99
            }
          }
        }]
      }
    })

    expect(result).toEqual({
      merchantName: 'Contoso Cafe',
      transactionDate: '2026-09-24',
      total: 42.75,
      currency: 'USD',
      confidence: {
        merchantName: 0.98,
        transactionDate: 0.94,
        total: 0.99
      }
    })
  })

  it('returns nulls when the service cannot identify receipt fields', () => {
    expect(normalizeReceiptResult({ analyzeResult: { documents: [] } })).toEqual({
      merchantName: null,
      transactionDate: null,
      total: null,
      currency: null,
      confidence: {
        merchantName: null,
        transactionDate: null,
        total: null
      }
    })
  })
})
