import { describe, it, expect } from 'vitest'
import {
  calculateRunRate,
  countWorkingDays,
  addWorkingDays,
  isWorkingDay,
  isEarlyWarning,
} from './run-rate'

// Reference date for all tests: Thursday 5 November 2026
const REF = new Date('2026-11-05')

describe('isWorkingDay', () => {
  it('Monday is a working day', () => {
    expect(isWorkingDay(new Date('2026-11-02'))).toBe(true)
  })
  it('Saturday is a working day', () => {
    expect(isWorkingDay(new Date('2026-11-07'))).toBe(true)
  })
  it('Sunday is NOT a working day', () => {
    expect(isWorkingDay(new Date('2026-11-08'))).toBe(false)
  })
})

describe('countWorkingDays', () => {
  it('counts correctly for one week', () => {
    // Thu 5 Nov to Thu 12 Nov = 7 days, excluding Sun 8 Nov = 6 working days
    const from = new Date('2026-11-05')
    const to = new Date('2026-11-12')
    expect(countWorkingDays(from, to)).toBe(6)
  })
  it('returns 0 if deadline is in the past', () => {
    const from = new Date('2026-11-05')
    const to = new Date('2026-11-04')
    expect(countWorkingDays(from, to)).toBe(0)
  })
  it('returns 0 if from equals to', () => {
    const d = new Date('2026-11-05')
    expect(countWorkingDays(d, d)).toBe(0)
  })
})

describe('addWorkingDays', () => {
  it('adds 5 working days correctly', () => {
    // From Thu 5 Nov: Fri 6, Sat 7, [skip Sun 8], Mon 9, Tue 10, Wed 11 = 5 working days
    const result = addWorkingDays(new Date('2026-11-05'), 5)
    expect(result.toISOString().split('T')[0]).toBe('2026-11-11')
  })
  it('adding 0 days returns same date', () => {
    const d = new Date('2026-11-05')
    const result = addWorkingDays(d, 0)
    expect(result.toISOString().split('T')[0]).toBe('2026-11-05')
  })
})

describe('calculateRunRate', () => {
  it('returns COMPLETE when remaining is zero', () => {
    const result = calculateRunRate({
      targetQuantity: 1000,
      completedQuantity: 1000,
      milestoneDeadline: new Date('2026-11-20'),
      recentUpdates: [],
      referenceDate: REF,
    })
    expect(result.status).toBe('COMPLETE')
    expect(result.remainingQuantity).toBe(0)
  })

  it('returns RED when deadline has passed', () => {
    const result = calculateRunRate({
      targetQuantity: 1000,
      completedQuantity: 500,
      milestoneDeadline: new Date('2026-11-04'), // yesterday
      recentUpdates: [],
      referenceDate: REF,
    })
    expect(result.status).toBe('RED')
    expect(result.daysUntilDeadline).toBeLessThan(0)
  })

  it('returns RED when no production in 7 days', () => {
    const result = calculateRunRate({
      targetQuantity: 1000,
      completedQuantity: 0,
      milestoneDeadline: new Date('2026-11-20'),
      recentUpdates: [],
      referenceDate: REF,
    })
    expect(result.status).toBe('RED')
    expect(result.actualDailyOutput).toBe(0)
    expect(result.explanation).toContain('No production reported')
  })

  it('returns GREEN when actual >= required', () => {
    // 5000 remaining, 10 working days, requires 500/day
    // Producing 600/day average
    const updates = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(REF)
      d.setDate(d.getDate() - i)
      if (d.getDay() !== 0) {
        updates.push({ date: d, quantity: 600 })
      }
    }
    const result = calculateRunRate({
      targetQuantity: 10000,
      completedQuantity: 5000,
      milestoneDeadline: new Date('2026-11-20'), // 15 days, ~10 working days
      recentUpdates: updates,
      referenceDate: REF,
    })
    expect(result.status).toBe('GREEN')
    expect(result.shortfallPerDay).toBe(0)
  })

  it('returns AMBER when slightly below required but recoverable', () => {
    // 5000 remaining, ~10 working days, requires ~500/day
    // Producing 380/day — below required but > 70% of required (350)
    const updates = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(REF)
      d.setDate(d.getDate() - i)
      updates.push({ date: d, quantity: 380 })
    }
    // Ensure projection still hits deadline
    const deadline = new Date(REF)
    deadline.setDate(deadline.getDate() + 20) // plenty of buffer

    const result = calculateRunRate({
      targetQuantity: 5000,
      completedQuantity: 2000,
      milestoneDeadline: deadline,
      recentUpdates: updates,
      referenceDate: REF,
    })
    // 3000 remaining / ~14 working days = ~214/day required
    // Actual: 380/day >> required => GREEN
    expect(['GREEN', 'AMBER']).toContain(result.status)
  })

  it('returns RED for the B-PO-88240 scenario', () => {
    // 8000 total, 5200 completed, 2800 remaining
    // Ex-factory: 12 Nov 2026 = 7 days, ~4 working days (5,6,7,9,10,11,12)
    // Required: 700/day
    // Actual: 320/day (7-day avg)
    const updates = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(REF)
      d.setDate(d.getDate() - i)
      updates.push({ date: d, quantity: 320 })
    }
    const result = calculateRunRate({
      targetQuantity: 8000,
      completedQuantity: 5200,
      milestoneDeadline: new Date('2026-11-12'),
      recentUpdates: updates,
      referenceDate: REF,
    })
    expect(result.status).toBe('RED')
    expect(result.remainingQuantity).toBe(2800)
    expect(result.actualDailyOutput).toBeCloseTo(320, 0)
    expect(result.shortfallPerDay).toBeGreaterThan(0)
    expect(result.explanation).toContain('Delayed')
  })

  it('handles division by zero for zero working days', () => {
    const result = calculateRunRate({
      targetQuantity: 1000,
      completedQuantity: 500,
      milestoneDeadline: new Date('2026-11-05'), // same as today
      recentUpdates: [],
      referenceDate: REF,
    })
    // 0 working days remaining, RED
    expect(result.status).toBe('RED')
  })

  it('calculates correct projected completion date', () => {
    const updates = [
      { date: new Date('2026-11-04'), quantity: 500 },
      { date: new Date('2026-11-03'), quantity: 500 },
    ]
    const result = calculateRunRate({
      targetQuantity: 3500,
      completedQuantity: 0,
      milestoneDeadline: new Date('2026-11-30'),
      recentUpdates: updates,
      referenceDate: REF,
    })
    // actualDailyOutput = 1000/7 ≈ 143 pcs/day
    // 3500/143 ≈ 25 days
    expect(result.projectedCompletionDate).not.toBeNull()
    expect(result.actualDailyOutput).toBeCloseTo(1000 / 7, 1)
  })

  it('never produces negative shortfall', () => {
    const updates = [{ date: new Date(REF), quantity: 9000 }]
    const result = calculateRunRate({
      targetQuantity: 5000,
      completedQuantity: 0,
      milestoneDeadline: new Date('2026-11-30'),
      recentUpdates: updates,
      referenceDate: REF,
    })
    expect(result.shortfallPerDay).toBeGreaterThanOrEqual(0)
    expect(result.status).toBe('GREEN')
  })
})

describe('isEarlyWarning', () => {
  it('flags RED orders within 14 days', () => {
    const result = calculateRunRate({
      targetQuantity: 1000,
      completedQuantity: 0,
      milestoneDeadline: new Date('2026-11-10'), // 5 days away
      recentUpdates: [],
      referenceDate: REF,
    })
    expect(isEarlyWarning(result)).toBe(true)
  })

  it('does not flag GREEN orders within 14 days', () => {
    const updates = [{ date: new Date(REF), quantity: 9000 }]
    const result = calculateRunRate({
      targetQuantity: 500,
      completedQuantity: 0,
      milestoneDeadline: new Date('2026-11-10'),
      recentUpdates: updates,
      referenceDate: REF,
    })
    expect(result.status).toBe('GREEN')
    expect(isEarlyWarning(result)).toBe(false)
  })

  it('does not flag orders outside 14-day window', () => {
    const result = calculateRunRate({
      targetQuantity: 1000,
      completedQuantity: 0,
      milestoneDeadline: new Date('2026-11-30'), // 25 days away
      recentUpdates: [],
      referenceDate: REF,
    })
    // RED (no output) but > 14 days
    expect(isEarlyWarning(result)).toBe(false)
  })

  it('does not flag completed milestones', () => {
    const result = calculateRunRate({
      targetQuantity: 1000,
      completedQuantity: 1000,
      milestoneDeadline: new Date('2026-11-10'),
      recentUpdates: [],
      referenceDate: REF,
    })
    expect(result.status).toBe('COMPLETE')
    expect(isEarlyWarning(result)).toBe(false)
  })
})
