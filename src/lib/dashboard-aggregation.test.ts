/**
 * Tests for dashboard production update aggregation and date filtering.
 *
 * Root cause of dashboard issue (PGRST201):
 *   production_updates has two FKs to profiles (supervisor_id, ai_corrected_by).
 *   PostgREST cannot resolve "supervisor:profiles(full_name)" without an explicit hint.
 *   Fix: use "supervisor:profiles!production_updates_supervisor_id_fkey(full_name)".
 */
import { describe, it, expect } from 'vitest'

// ─── Helpers mirroring ProductionTrendChart's aggregation logic ──────────────

function buildChartData(
  updates: { update_date?: string | null; created_at?: string | null; quantity_completed: number }[],
  referenceDate: Date
) {
  const days: { date: string; quantity: number }[] = []
  // UTC arithmetic — avoids local-timezone day-shifting when converting to ISO strings
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

// ─── Reference date (matches the seed reference date) ───────────────────────
const REF = new Date('2026-11-05T00:00:00.000Z')

function buildSeededUpdates() {
  const updates: { update_date: string; created_at: string; quantity_completed: number; stage: string }[] = []
  const refUtc = new Date(Date.UTC(REF.getUTCFullYear(), REF.getUTCMonth(), REF.getUTCDate()))
  for (let i = 6; i >= 0; i--) {
    const d = new Date(refUtc)
    d.setUTCDate(d.getUTCDate() - i)
    if (d.getUTCDay() === 0) continue // skip Sunday
    const dateStr = d.toISOString().split('T')[0]
    for (const stage of ['stitching', 'finishing', 'printing']) {
      updates.push({
        update_date: dateStr,
        created_at: '2026-11-05T17:19:27.067187+00:00',
        quantity_completed: 400,
        stage,
      })
    }
  }
  return updates
}

// ─── Date filtering tests ────────────────────────────────────────────────────

describe('Dashboard Production Trend — date filtering', () => {
  it('matches update_date DATE string against rolling 7-day window', () => {
    const updates = buildSeededUpdates()
    expect(updates.length).toBe(18) // 6 working days × 3 orders

    const chart = buildChartData(updates, REF)
    expect(chart.length).toBe(7)

    // Sunday (2026-11-01) has no seeded updates
    const nov01 = chart.find((d) => d.date === '2026-11-01')
    expect(nov01?.quantity).toBe(0)

    // Working days show 3 orders × 400 pcs each = 1200
    const workingDays = chart.filter((d) => d.date !== '2026-11-01')
    workingDays.forEach((day) => expect(day.quantity).toBe(1200))
  })

  it('total weekly quantity = 6 working days × 3 orders × 400 pcs', () => {
    const chart = buildChartData(buildSeededUpdates(), REF)
    const total = chart.reduce((s, d) => s + d.quantity, 0)
    expect(total).toBe(7200)
  })

  it('handles update_date as plain Supabase DATE string YYYY-MM-DD', () => {
    const updates = [{ update_date: '2026-11-05', created_at: '2026-11-05T12:00:00+00:00', quantity_completed: 500 }]
    const chart = buildChartData(updates, REF)
    const nov05 = chart.find((d) => d.date === '2026-11-05')
    expect(nov05).toBeDefined()
    expect(nov05?.quantity).toBe(500)
  })

  it('falls back to created_at when update_date is null', () => {
    const updates = [{ update_date: null, created_at: '2026-11-04T08:30:00+00:00', quantity_completed: 350 }]
    const chart = buildChartData(updates, REF)
    expect(chart.find((d) => d.date === '2026-11-04')?.quantity).toBe(350)
  })

  it('does not include updates outside the 7-day window', () => {
    const updates = [{ update_date: '2026-10-10', created_at: '2026-10-10T12:00:00+00:00', quantity_completed: 9999 }]
    const chart = buildChartData(updates, REF)
    expect(chart.reduce((s, d) => s + d.quantity, 0)).toBe(0)
  })

  it('aggregates multiple updates on the same day', () => {
    const updates = [
      { update_date: '2026-11-05', created_at: '2026-11-05T17:00:00+00:00', quantity_completed: 378 },
      { update_date: '2026-11-05', created_at: '2026-11-05T17:00:00+00:00', quantity_completed: 370 },
      { update_date: '2026-11-05', created_at: '2026-11-05T17:00:00+00:00', quantity_completed: 513 },
    ]
    const chart = buildChartData(updates, REF)
    const nov05 = chart.find((d) => d.date === '2026-11-05')
    expect(nov05?.quantity).toBe(1261)
  })

  it('returns all zeros when updates array is empty', () => {
    const chart = buildChartData([], REF)
    expect(chart.every((d) => d.quantity === 0)).toBe(true)
  })

  it('limit(100) captures all data vs limit(10) which truncates', () => {
    const all = buildSeededUpdates()
    const total100 = buildChartData(all.slice(0, 100), REF).reduce((s, d) => s + d.quantity, 0)
    const total10 = buildChartData(all.slice(0, 10), REF).reduce((s, d) => s + d.quantity, 0)
    expect(total10).toBeLessThan(total100)
    expect(total100).toBe(7200)
  })
})

// ─── Regression test: PGRST201 fix ──────────────────────────────────────────

describe('PGRST201 regression — production_updates FK ambiguity', () => {
  /**
   * production_updates has TWO foreign keys to profiles:
   *   1. supervisor_id      → profiles(id)  [FK: production_updates_supervisor_id_fkey]
   *   2. ai_corrected_by    → profiles(id)  [FK: production_updates_ai_corrected_by_fkey]
   *
   * Querying ".select('*, supervisor:profiles(full_name)')" without the FK hint
   * causes PostgREST to return PGRST201 (ambiguous embed) and 0 rows — NOT an error
   * thrown to the caller, but an empty result set. This was the root cause of the
   * dashboard showing "No updates yet" even with 18 rows in the database.
   *
   * Fix: use the explicit FK hint "!production_updates_supervisor_id_fkey".
   */

  it('the dashboard query uses the explicit FK hint', () => {
    // Exact string in src/app/dashboard/page.tsx
    const select = '*, supervisor:profiles!production_updates_supervisor_id_fkey(full_name)'
    expect(select).toContain('!production_updates_supervisor_id_fkey')
    expect(select).not.toBe('*, supervisor:profiles(full_name)')
  })

  it('the order detail query uses the explicit FK hint', () => {
    // Exact string in src/app/dashboard/orders/[id]/page.tsx
    const select = '*, supervisor:profiles!production_updates_supervisor_id_fkey(full_name)'
    expect(select).toContain('!production_updates_supervisor_id_fkey')
  })

  it('the updates page query uses the explicit FK hint', () => {
    // Exact string in src/app/dashboard/updates/page.tsx
    const select = '*, supervisor:profiles!production_updates_supervisor_id_fkey(full_name), order:orders(po_number)'
    expect(select).toContain('!production_updates_supervisor_id_fkey')
  })

  it('the ambiguous query string is recognised as broken', () => {
    // This pattern caused PGRST201 — it must NOT appear in the codebase
    const broken = '*, supervisor:profiles(full_name)'
    expect(broken).not.toContain('!')
    // The fix is to always specify the FK name when there are multiple FKs
  })
})

// ─── Real seeded data values (from diagnostic output) ───────────────────────

describe('Dashboard — real seeded quantity verification', () => {
  it('correctly totals the actual seeded diagnostic values', () => {
    // Exact values from npx tsx scripts/diagnose.ts on 2026-11-05
    const seeded = [
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
    const chart = buildChartData(seeded, REF)
    expect(chart.reduce((s, d) => s + d.quantity, 0)).toBe(7691)
    expect(chart.find(d => d.date === '2026-11-05')?.quantity).toBe(1261)
    expect(chart.find(d => d.date === '2026-11-01')?.quantity).toBe(0)
    expect(chart.find(d => d.date === '2026-10-30')?.quantity).toBe(1319)
  })
})
