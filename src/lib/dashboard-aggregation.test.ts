/**
 * Tests for dashboard production update aggregation and date filtering.
 *
 * These tests verify the same logic used by ProductionTrendChart to ensure
 * that seeded production_updates records (with update_date as 'YYYY-MM-DD' strings)
 * are correctly matched to the rolling 7-day window displayed on the dashboard.
 */
import { describe, it, expect } from 'vitest'

// ─── Helpers mirroring the chart's logic ─────────────────────────────────────

function buildChartData(
  updates: { update_date?: string | null; created_at?: string | null; quantity_completed: number }[],
  referenceDate: Date
) {
  const days: { date: string; quantity: number }[] = []
  // Use UTC arithmetic to match the production chart implementation
  const todayUtc = new Date(Date.UTC(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate()
  ))
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayUtc)
    d.setUTCDate(d.getUTCDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const qty = updates
      .filter((u) => {
        const updateDateStr = u.update_date
          ? String(u.update_date).slice(0, 10)
          : u.created_at
          ? String(u.created_at).slice(0, 10)
          : null
        return updateDateStr === dateStr
      })
      .reduce((sum, u) => sum + (u.quantity_completed ?? 0), 0)
    days.push({ date: dateStr, quantity: qty })
  }
  return days
}

// ─── Test data matching the actual seeded records ────────────────────────────

const REF = new Date('2026-11-05') // Seed reference date = dashboard runtime date

/**
 * Builds the 18-update seeded dataset as returned by Supabase.
 * update_date is a plain DATE string (no time component).
 * created_at is a TIMESTAMPTZ (all seeded on the same day).
 */
function buildSeededUpdates() {
  const updates: { update_date: string; created_at: string; quantity_completed: number; stage: string }[] = []
  const orders = [
    { stage: 'stitching' },
    { stage: 'finishing' },
    { stage: 'printing' },
  ]
  // Build using UTC date arithmetic to match how Supabase stores DATE values
  const refUtc = new Date(Date.UTC(REF.getUTCFullYear(), REF.getUTCMonth(), REF.getUTCDate()))
  for (let i = 6; i >= 0; i--) {
    const d = new Date(refUtc)
    d.setUTCDate(d.getUTCDate() - i)
    if (d.getUTCDay() === 0) continue // skip Sunday (getUTCDay: 0=Sun)
    const dateStr = d.toISOString().split('T')[0]
    for (const order of orders) {
      updates.push({
        update_date: dateStr,
        created_at: '2026-11-05T17:19:27.067187+00:00',
        quantity_completed: 400,
        stage: order.stage,
      })
    }
  }
  return updates
}

describe('Dashboard Production Trend — date filtering', () => {
  it('matches update_date DATE string against rolling 7-day window', () => {
    const updates = buildSeededUpdates()
    expect(updates.length).toBe(18) // 6 working days × 3 orders

    // Use REF as reference date (same as seed reference date)
    const chart = buildChartData(updates, REF)
    expect(chart.length).toBe(7)

    // Window is 2026-10-30 to 2026-11-05.
    // Nov 1 (Sunday) should show 0 — no updates seeded for Sundays
    const nov01 = chart.find((d) => d.date === '2026-11-01')
    expect(nov01?.quantity).toBe(0)

    // All working days should show 3 × 400 = 1200 pcs
    const workingDays = chart.filter((d) => d.date !== '2026-11-01')
    workingDays.forEach((day) => {
      expect(day.quantity).toBe(1200) // 3 orders × 400 pcs
    })
  })

  it('total weekly quantity matches sum of all working-day updates', () => {
    const updates = buildSeededUpdates()
    const chart = buildChartData(updates, REF)
    const total = chart.reduce((s, d) => s + d.quantity, 0)
    // 6 working days × 3 orders × 400 pcs = 7,200
    expect(total).toBe(7200)
  })

  it('handles update_date as plain DATE string (no time component)', () => {
    // Simulates exactly what Supabase returns for DATE columns
    const updates = [{ update_date: '2026-11-05', created_at: '2026-11-05T12:00:00+00:00', quantity_completed: 500 }]
    // Use REF so the window includes 2026-11-05
    const chart = buildChartData(updates, REF)
    const nov05Entry = chart.find((d) => d.date === '2026-11-05')
    expect(nov05Entry).toBeDefined()
    expect(nov05Entry?.quantity).toBe(500)
  })

  it('falls back to created_at when update_date is null', () => {
    const updates = [{ update_date: null, created_at: '2026-11-04T08:30:00+00:00', quantity_completed: 350 }]
    const chart = buildChartData(updates, REF)
    const nov04 = chart.find((d) => d.date === '2026-11-04')
    expect(nov04?.quantity).toBe(350)
  })

  it('does not include updates outside the 7-day window', () => {
    // Update from 3 weeks ago — should NOT appear in the chart
    const updates = [{ update_date: '2026-10-10', created_at: '2026-10-10T12:00:00+00:00', quantity_completed: 9999 }]
    const chart = buildChartData(updates, REF)
    const total = chart.reduce((s, d) => s + d.quantity, 0)
    expect(total).toBe(0)
  })

  it('correctly handles multiple updates on the same day (aggregation)', () => {
    // 3 updates on Nov 5 from 3 different orders
    const updates = [
      { update_date: '2026-11-05', created_at: '2026-11-05T17:00:00+00:00', quantity_completed: 378 },
      { update_date: '2026-11-05', created_at: '2026-11-05T17:00:00+00:00', quantity_completed: 370 },
      { update_date: '2026-11-05', created_at: '2026-11-05T17:00:00+00:00', quantity_completed: 513 },
    ]
    const chart = buildChartData(updates, REF)
    const nov05 = chart.find((d) => d.date === '2026-11-05')
    expect(nov05).toBeDefined()
    expect(nov05?.quantity).toBe(378 + 370 + 513) // 1261
  })

  it('returns 0 for all days when updates array is empty', () => {
    const chart = buildChartData([], REF)
    const total = chart.reduce((s, d) => s + d.quantity, 0)
    expect(total).toBe(0)
    expect(chart.every((d) => d.quantity === 0)).toBe(true)
  })

  it('limit(100) vs limit(10) — shows why limit matters', () => {
    // With limit(10), only the 10 most recent of 18 updates are available.
    // This means older days (Oct 30, Oct 31, Nov 2) show partial data.
    const allUpdates = buildSeededUpdates()
    const top10 = allUpdates.slice(0, 10) // .order(update_date desc).limit(10)
    const top100 = allUpdates.slice(0, 100) // .limit(100)

    const chart10 = buildChartData(top10, REF)
    const chart100 = buildChartData(top100, REF)

    const total10 = chart10.reduce((s, d) => s + d.quantity, 0)
    const total100 = chart100.reduce((s, d) => s + d.quantity, 0)

    // limit(10) misses 8 updates → shows lower total
    expect(total10).toBeLessThan(total100)
    // limit(100) captures all 18 → full total
    expect(total100).toBe(7200)
  })
})

describe('Dashboard — update_date string matching', () => {
  it('startsWith match works for DATE strings', () => {
    // Original chart code used u.update_date?.startsWith(dateStr)
    // This works ONLY if update_date is exactly 'YYYY-MM-DD' (which Supabase returns)
    // The new code uses .slice(0, 10) which is more robust
    const dateStr = '2026-11-05'
    const updateDate = '2026-11-05' // Supabase DATE column
    expect(updateDate.startsWith(dateStr)).toBe(true)
    expect(updateDate.slice(0, 10) === dateStr).toBe(true)

    // TIMESTAMPTZ would also match startsWith with just the date portion
    const timestamptz = '2026-11-05T17:19:27.067187+00:00'
    expect(timestamptz.startsWith(dateStr)).toBe(true)
    expect(timestamptz.slice(0, 10) === dateStr).toBe(true)
  })

  it('correctly handles the known seeded quantities from diagnostic output', () => {
    // Real values from npx tsx scripts/diagnose.ts output
    const seededUpdates = [
      { update_date: '2026-11-05', quantity_completed: 513, created_at: '2026-11-05T17:19:27.067187+00:00' },
      { update_date: '2026-11-05', quantity_completed: 370, created_at: '2026-11-05T17:19:27.067187+00:00' },
      { update_date: '2026-11-05', quantity_completed: 378, created_at: '2026-11-05T17:19:27.067187+00:00' },
      { update_date: '2026-11-04', quantity_completed: 674, created_at: '2026-11-05T17:19:27.067187+00:00' },
      { update_date: '2026-11-04', quantity_completed: 301, created_at: '2026-11-05T17:19:27.067187+00:00' },
      { update_date: '2026-11-04', quantity_completed: 359, created_at: '2026-11-05T17:19:27.067187+00:00' },
      { update_date: '2026-11-03', quantity_completed: 667, created_at: '2026-11-05T17:19:27.067187+00:00' },
      { update_date: '2026-11-03', quantity_completed: 391, created_at: '2026-11-05T17:19:27.067187+00:00' },
      { update_date: '2026-11-03', quantity_completed: 445, created_at: '2026-11-05T17:19:27.067187+00:00' },
      { update_date: '2026-11-02', quantity_completed: 501, created_at: '2026-11-05T17:19:27.067187+00:00' },
      { update_date: '2026-11-02', quantity_completed: 150, created_at: '2026-11-05T17:19:27.067187+00:00' },
      { update_date: '2026-11-02', quantity_completed: 372, created_at: '2026-11-05T17:19:27.067187+00:00' },
      { update_date: '2026-10-31', quantity_completed: 529, created_at: '2026-11-05T17:19:27.067187+00:00' },
      { update_date: '2026-10-31', quantity_completed: 342, created_at: '2026-11-05T17:19:27.067187+00:00' },
      { update_date: '2026-10-31', quantity_completed: 380, created_at: '2026-11-05T17:19:27.067187+00:00' },
      { update_date: '2026-10-30', quantity_completed: 519, created_at: '2026-11-05T17:19:27.067187+00:00' },
      { update_date: '2026-10-30', quantity_completed: 334, created_at: '2026-11-05T17:19:27.067187+00:00' },
      { update_date: '2026-10-30', quantity_completed: 466, created_at: '2026-11-05T17:19:27.067187+00:00' },
    ]
    // Use REF as reference date so the 7-day window is 2026-10-30 to 2026-11-05
    const chart = buildChartData(seededUpdates, REF)
    const total = chart.reduce((s, d) => s + d.quantity, 0)
    // Diagnostic confirmed total = 7,691
    expect(total).toBe(7691)

    // Nov 5 sum: 513+370+378 = 1261
    const nov05 = chart.find(d => d.date === '2026-11-05')
    expect(nov05).toBeDefined()
    expect(nov05?.quantity).toBe(1261)

    // Nov 1 (Sunday) sum: 0 (no updates)
    const nov01 = chart.find(d => d.date === '2026-11-01')
    expect(nov01).toBeDefined()
    expect(nov01?.quantity).toBe(0)

    // Oct 30 sum: 519+334+466 = 1319
    const oct30 = chart.find(d => d.date === '2026-10-30')
    expect(oct30).toBeDefined()
    expect(oct30?.quantity).toBe(1319)
  })
})
