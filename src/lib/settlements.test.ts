import { describe, it, expect } from 'vitest'
import { calculateSettlements } from './settlements'
import type { Expense, Participant } from '@/types'

function makeParticipant(id: string, name: string): Participant {
  return { id, name }
}

function makeExpense(overrides: Partial<Expense> & Pick<Expense, 'amount' | 'paidBy' | 'participants'>): Expense {
  return {
    id: overrides.id ?? '1',
    date: overrides.date ?? '2025-01-01',
    place: overrides.place ?? '',
    description: overrides.description ?? 'test',
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    ...overrides,
  }
}

describe('calculateSettlements', () => {
  it('returns empty array when no expenses', () => {
    const participants = [makeParticipant('a', 'Alice')]
    expect(calculateSettlements([], participants)).toEqual([])
  })

  it('returns empty array when no participants', () => {
    const expenses = [makeExpense({ amount: 100, paidBy: 'a', participants: ['a'] })]
    expect(calculateSettlements(expenses, [])).toEqual([])
  })

  it('returns empty array for single participant expense', () => {
    const participants = [makeParticipant('a', 'Alice')]
    const expenses = [makeExpense({ amount: 50, paidBy: 'a', participants: ['a'] })]
    expect(calculateSettlements(expenses, participants)).toEqual([])
  })

  it('creates a single settlement for two participants, one payer', () => {
    const participants = [makeParticipant('a', 'Alice'), makeParticipant('b', 'Bob')]
    const expenses = [makeExpense({ amount: 100, paidBy: 'a', participants: ['a', 'b'] })]

    const result = calculateSettlements(expenses, participants)
    expect(result).toHaveLength(1)
    expect(result[0].from).toBe('b')
    expect(result[0].to).toBe('a')
    expect(result[0].amount).toBeCloseTo(50)
  })

  it('nets out balanced expenses between two people', () => {
    const participants = [makeParticipant('a', 'Alice'), makeParticipant('b', 'Bob')]
    const expenses = [
      makeExpense({ id: '1', amount: 100, paidBy: 'a', participants: ['a', 'b'] }),
      makeExpense({ id: '2', amount: 100, paidBy: 'b', participants: ['a', 'b'] }),
    ]

    const result = calculateSettlements(expenses, participants)
    expect(result).toEqual([])
  })

  it('handles three-way split correctly', () => {
    const participants = [
      makeParticipant('a', 'Alice'),
      makeParticipant('b', 'Bob'),
      makeParticipant('c', 'Carol'),
    ]
    const expenses = [makeExpense({ amount: 90, paidBy: 'a', participants: ['a', 'b', 'c'] })]

    const result = calculateSettlements(expenses, participants)
    const totalOwed = result.reduce((sum, s) => sum + s.amount, 0)
    expect(totalOwed).toBeCloseTo(60) // 30 from b + 30 from c

    // All settlements should flow to 'a'
    result.forEach(s => expect(s.to).toBe('a'))
  })

  it('minimises settlements with multiple payers', () => {
    const participants = [
      makeParticipant('a', 'Alice'),
      makeParticipant('b', 'Bob'),
      makeParticipant('c', 'Carol'),
    ]
    const expenses = [
      makeExpense({ id: '1', amount: 60, paidBy: 'a', participants: ['a', 'b', 'c'] }),
      makeExpense({ id: '2', amount: 30, paidBy: 'b', participants: ['a', 'b', 'c'] }),
    ]

    const result = calculateSettlements(expenses, participants)
    // Total spent: 90. Each owes 30.
    // Alice paid 60 (owes 30) → net +30
    // Bob paid 30 (owes 30) → net 0
    // Carol paid 0 (owes 30) → net -30
    // Settlement: Carol → Alice 30
    expect(result).toHaveLength(1)
    expect(result[0].from).toBe('c')
    expect(result[0].to).toBe('a')
    expect(result[0].amount).toBeCloseTo(30)
  })

  it('handles expenses where not all participants are involved', () => {
    const participants = [
      makeParticipant('a', 'Alice'),
      makeParticipant('b', 'Bob'),
      makeParticipant('c', 'Carol'),
    ]
    const expenses = [
      makeExpense({ id: '1', amount: 100, paidBy: 'a', participants: ['a', 'b'] }),
    ]

    const result = calculateSettlements(expenses, participants)
    // Only Alice and Bob split 100. Bob owes Alice 50. Carol unaffected.
    expect(result).toHaveLength(1)
    expect(result[0].from).toBe('b')
    expect(result[0].to).toBe('a')
    expect(result[0].amount).toBeCloseTo(50)
  })

  it('handles floating point precision', () => {
    const participants = [
      makeParticipant('a', 'Alice'),
      makeParticipant('b', 'Bob'),
      makeParticipant('c', 'Carol'),
    ]
    const expenses = [makeExpense({ amount: 100, paidBy: 'a', participants: ['a', 'b', 'c'] })]

    const result = calculateSettlements(expenses, participants)
    // 100/3 = 33.333... per person. Alice paid 100, owes 33.33 → net +66.67
    const totalOwed = result.reduce((sum, s) => sum + s.amount, 0)
    expect(totalOwed).toBeCloseTo(66.67, 1)
  })
})
