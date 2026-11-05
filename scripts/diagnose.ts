/**
 * Diagnostic script — checks actual DB state without exposing credentials.
 * Run: npx tsx scripts/diagnose.ts
 */
import { createClient } from '@supabase/supabase-js'
import { loadEnvConfig } from '@next/env'
import * as path from 'path'

loadEnvConfig(path.resolve(__dirname, '..'))

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SECRET_KEY) { console.error('Missing credentials'); process.exit(1) }

// Use service role to bypass RLS for diagnostic purposes
const supabase = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log('\n=== StitchOps DB Diagnostic ===\n')

  // 1. Count production_updates
  const { count: updateCount, error: countErr } = await supabase
    .from('production_updates')
    .select('*', { count: 'exact', head: true })
  console.log(`production_updates total rows: ${updateCount} (error: ${countErr?.message ?? 'none'})`)

  // 2. Show all update_dates and order_ids (no sensitive data)
  const { data: updates, error: updErr } = await supabase
    .from('production_updates')
    .select('id, order_id, supervisor_id, stage, quantity_completed, update_date, created_at')
    .order('update_date', { ascending: false })
  if (updErr) { console.error('Updates query error:', updErr.message); }
  else {
    console.log('\nAll production_updates:')
    updates?.forEach(u => {
      console.log(`  order:${u.order_id.slice(0,8)} stage:${u.stage.padEnd(18)} qty:${String(u.quantity_completed).padStart(4)} update_date:${u.update_date} created_at:${u.created_at?.slice(0,10)}`)
    })
  }

  // 3. Check 7-day window (today = runtime date)
  const today = new Date()
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  const windowStart = sevenDaysAgo.toISOString().split('T')[0]
  const windowEnd = today.toISOString().split('T')[0]
  console.log(`\nDashboard 7-day window: ${windowStart} to ${windowEnd}`)

  const { data: inWindow } = await supabase
    .from('production_updates')
    .select('update_date, quantity_completed, stage')
    .gte('update_date', windowStart)
    .lte('update_date', windowEnd)
  console.log(`Updates IN window: ${inWindow?.length ?? 0}`)
  const totalInWindow = inWindow?.reduce((s, u) => s + u.quantity_completed, 0) ?? 0
  console.log(`Total quantity in window: ${totalInWindow}`)

  // 4. Check profiles exist
  const { data: profiles } = await supabase.from('profiles').select('id, email, role')
  console.log(`\nProfiles (${profiles?.length ?? 0}):`)
  profiles?.forEach(p => console.log(`  ${p.role.padEnd(14)} ${p.email}`))

  // 5. Check orders exist
  const { count: orderCount } = await supabase
    .from('orders').select('*', { count: 'exact', head: true })
  console.log(`\nOrders: ${orderCount}`)

  // 6. Date format returned by Supabase for update_date
  if (updates && updates.length > 0) {
    const sample = updates[0]
    console.log(`\nSample update_date value: "${sample.update_date}" (type: ${typeof sample.update_date})`)
    console.log(`Sample created_at value:  "${sample.created_at}" (type: ${typeof sample.created_at})`)
  }
}

main().catch(console.error)
