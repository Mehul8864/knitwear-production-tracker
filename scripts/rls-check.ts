/**
 * RLS Check Script
 *
 * Tests the exact query the dashboard page runs, but simulated with the
 * authenticated merchandiser's identity using Supabase's
 * auth.admin.getUserById to fetch the session and then impersonating
 * that user with a JWT-scoped client.
 *
 * This proves whether RLS allows the merchandiser to read production_updates.
 * Run: npx tsx scripts/rls-check.ts
 */
import { createClient } from '@supabase/supabase-js'
import { loadEnvConfig } from '@next/env'
import * as path from 'path'

loadEnvConfig(path.resolve(__dirname, '..'))

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !ANON_KEY || !SECRET_KEY) {
  console.error('Missing env vars'); process.exit(1)
}

// Admin client (service role) â€” used only to get a user JWT
const adminClient = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Anon client â€” simulates what the browser / server component uses
const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const MERCHANDISER_EMAIL = 'merchandiser@stitchops.demo'
const MERCHANDISER_PASS = 'Demo@2026!'

async function main() {
  console.log('\n=== RLS Diagnostic: Production Updates ===\n')

  // â”€â”€ Step 1: Sign in as merchandiser using email/password (anon client)
  console.log(`1. Signing in as: ${MERCHANDISER_EMAIL}`)
  const { data: signIn, error: signInErr } = await anonClient.auth.signInWithPassword({
    email: MERCHANDISER_EMAIL,
    password: MERCHANDISER_PASS,
  })
  if (signInErr || !signIn.user) {
    console.error('  SIGN-IN FAILED:', signInErr?.message)
    process.exit(1)
  }
  console.log(`  âœ“ Signed in. User ID: ${signIn.user.id}`)

  // Create a new client instance with the authenticated session
  const authedClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${signIn.session!.access_token}`,
      },
    },
  })

  // â”€â”€ Step 2: Verify auth.uid() context via profiles table
  console.log('\n2. Reading own profile (tests auth.uid())...')
  const { data: profile, error: profErr } = await authedClient
    .from('profiles')
    .select('id, role, email')
    .eq('id', signIn.user.id)
    .single()
  if (profErr) {
    console.error('  Profile read FAILED:', profErr.message, 'code:', profErr.code)
  } else {
    console.log(`  âœ“ Profile: id=${profile.id} role=${profile.role} email=${profile.email}`)
  }

  // â”€â”€ Step 3: Test get_user_role() via a raw RPC-style check
  console.log('\n3. Testing get_user_role() function...')
  // We test by trying to read all profiles (only merchandiser can do this via the policy)
  const { data: allProfiles, error: allProfErr } = await authedClient
    .from('profiles')
    .select('role')
  if (allProfErr) {
    console.error('  Profiles (all) FAILED:', allProfErr.message)
  } else {
    console.log(`  âœ“ Can read ${allProfiles?.length} profiles â€” get_user_role()='merchandiser' is working`)
  }

  // â”€â”€ Step 4: Query production_updates WITHOUT the profiles join
  console.log('\n4. Query production_updates WITHOUT profiles join...')
  const { data: noJoin, error: noJoinErr, count: noJoinCount } = await authedClient
    .from('production_updates')
    .select('id, order_id, stage, quantity_completed, update_date', { count: 'exact' })
    .order('update_date', { ascending: false })
    .limit(5)
  if (noJoinErr) {
    console.error('  FAILED:', noJoinErr.message, '| code:', noJoinErr.code, '| details:', noJoinErr.details)
  } else {
    console.log(`  âœ“ Rows returned: ${noJoin?.length} | total count: ${noJoinCount}`)
    noJoin?.slice(0, 3).forEach(u =>
      console.log(`    order:${u.order_id?.slice(0,8)} stage:${u.stage} qty:${u.quantity_completed} date:${u.update_date}`)
    )
  }

  // â”€â”€ Step 5: Query production_updates WITH the profiles join (exact dashboard query)
  console.log('\n5. Query production_updates WITH supervisor:profiles!production_updates_supervisor_id_fkey(full_name) join...')
  const { data: withJoin, error: withJoinErr } = await authedClient
    .from('production_updates')
    .select('id, update_date, quantity_completed, supervisor:profiles!production_updates_supervisor_id_fkey(full_name)')
    .order('update_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100)
  if (withJoinErr) {
    console.error('  FAILED:', withJoinErr.message, '| code:', withJoinErr.code, '| details:', withJoinErr.details, '| hint:', withJoinErr.hint)
  } else {
    console.log(`  âœ“ Rows returned: ${withJoin?.length}`)
    withJoin?.slice(0, 3).forEach(u =>
      console.log(`    date:${u.update_date} qty:${u.quantity_completed} supervisor:${JSON.stringify(u.supervisor)}`)
    )
  }

  // â”€â”€ Step 6: Check orders query (which IS working per user report)
  console.log('\n6. Query orders (confirmed working)...')
  const { data: orders, error: ordErr } = await authedClient
    .from('orders')
    .select('id, po_number, status')
    .eq('status', 'active')
  if (ordErr) {
    console.error('  FAILED:', ordErr.message)
  } else {
    console.log(`  âœ“ Rows returned: ${orders?.length}`)
    orders?.forEach(o => console.log(`    ${o.po_number}`))
  }

  // â”€â”€ Step 7: Cross-check with service role â€” proves data exists
  console.log('\n7. Service role count (bypasses RLS â€” just verifies data exists)...')
  const { count: srCount } = await adminClient
    .from('production_updates')
    .select('*', { count: 'exact', head: true })
  console.log(`  Total rows (service role): ${srCount}`)

  // â”€â”€ Step 8: Check if supervisor_id FK references existing profiles
  console.log('\n8. Checking supervisor_id FK integrity...')
  const { data: updateSupervisors } = await adminClient
    .from('production_updates')
    .select('supervisor_id')
  const supervisorIds = [...new Set(updateSupervisors?.map(u => u.supervisor_id))]
  for (const sid of supervisorIds) {
    const { data: sup } = await adminClient
      .from('profiles')
      .select('id, role, email')
      .eq('id', sid)
      .single()
    console.log(`  supervisor_id ${sid?.slice(0, 8)}: ${sup ? `${sup.role} ${sup.email}` : 'NOT FOUND IN PROFILES'}`)
  }

  console.log('\n=== Diagnostic complete ===\n')
}

main().catch(console.error)
