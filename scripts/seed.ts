/**
 * StitchOps Database Seed Script
 *
 * Creates demo users and inserts all seed data.
 * Run: npm run seed
 *
 * This script is fully self-contained and idempotent — running it
 * multiple times will not create duplicates.
 *
 * Prerequisites:
 * - Supabase project set up
 * - Database migrations applied (001, 002, 003)
 * - .env.local with Supabase URL and secret key
 */

import { createClient } from '@supabase/supabase-js'
import { loadEnvConfig } from '@next/env'
import * as crypto from 'crypto'
import * as path from 'path'

// Load .env.local from the project root
loadEnvConfig(path.resolve(__dirname, '..'))

// Resolve with fallback: modern key names → legacy key names
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SECRET_KEY) {
  console.error(
    'Missing Supabase credentials. Set in .env.local:\n' +
    '  NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)\n' +
    '  SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)'
  )
  process.exit(1)
}

// Secret key client (admin operations only — never exposed to browser)
const supabase = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DEMO_PASSWORD = 'Demo@2026!'

// ─── Base data constants ────────────────────────────────────
const BUYER_B_ID = '11111111-1111-1111-1111-111111111111'
const BUYER_C_ID = '22222222-2222-2222-2222-222222222222'
const UNIT_ALPHA = 'aaaa0001-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const UNIT_BETA = 'aaaa0002-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const UNIT_GAMMA = 'aaaa0003-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const TEMPLATE_ID = 'bb000001-bb00-bb00-bb00-bb0000000001'
const ORDER_1 = 'a0000001-0000-0000-0000-000000000001'
const ORDER_2 = 'a0000002-0000-0000-0000-000000000002'
const ORDER_3 = 'a0000003-0000-0000-0000-000000000003'

// ─── Demo users ─────────────────────────────────────────────
const DEMO_USERS = [
  { email: 'merchandiser@stitchops.demo', password: DEMO_PASSWORD, full_name: 'Priya Rajan', role: 'merchandiser' as const },
  { email: 'supervisor@stitchops.demo', password: DEMO_PASSWORD, full_name: 'Muthu Kumar', role: 'supervisor' as const, production_unit: UNIT_ALPHA },
  { email: 'supervisor2@stitchops.demo', password: DEMO_PASSWORD, full_name: 'Selvam Raj', role: 'supervisor' as const, production_unit: UNIT_BETA },
  { email: 'buyer-b@stitchops.demo', password: DEMO_PASSWORD, full_name: 'James Wilson', role: 'buyer' as const },
  { email: 'buyer-c@stitchops.demo', password: DEMO_PASSWORD, full_name: 'Klaus Mueller', role: 'buyer' as const },
]

// ─── Token utilities ───────────────────────────────────────
async function hashToken(token: string): Promise<string> {
  return crypto.createHash('sha256').update(token).digest('hex')
}
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// ─── Phase 1: Insert base data ──────────────────────────────
async function seedBaseData() {
  console.log('\n📦 Seeding base data...\n')

  // ── Buyers ──
  const { error: buyersError } = await supabase.from('buyers').upsert([
    { id: BUYER_B_ID, name: 'Company B', country: 'United Kingdom', contact_name: 'James Wilson', contact_email: 'james.wilson@companyb.uk' },
    { id: BUYER_C_ID, name: 'Company C', country: 'Germany', contact_name: 'Klaus Mueller', contact_email: 'k.mueller@companyc.de' },
  ], { onConflict: 'id' })
  if (buyersError) console.error('  Buyers:', buyersError.message)
  else console.log('  ✓ Buyers (2)')

  // ── Production units ──
  const { error: unitsError } = await supabase.from('production_units').upsert([
    { id: UNIT_ALPHA, name: 'Unit Alpha', location: 'Tiruppur Main', capacity_per_day: 800 },
    { id: UNIT_BETA, name: 'Unit Beta', location: 'Tiruppur South', capacity_per_day: 600 },
    { id: UNIT_GAMMA, name: 'Unit Gamma', location: 'Tiruppur East', capacity_per_day: 400 },
  ], { onConflict: 'id' })
  if (unitsError) console.error('  Production units:', unitsError.message)
  else console.log('  ✓ Production units (3)')

  // ── TNA template ──
  const { error: tmplError } = await supabase.from('tna_templates').upsert([
    { id: TEMPLATE_ID, name: 'Standard Knitwear (9-Stage)' },
  ], { onConflict: 'id' })
  if (tmplError) console.error('  TNA template:', tmplError.message)
  else console.log('  ✓ TNA template (1)')

  // ── TNA template milestones (check before insert) ──
  const { count: tmplMsCount } = await supabase
    .from('tna_template_milestones')
    .select('*', { count: 'exact', head: true })
    .eq('template_id', TEMPLATE_ID)
  if ((tmplMsCount ?? 0) === 0) {
    const { error: tmplMsError } = await supabase.from('tna_template_milestones').insert([
      { template_id: TEMPLATE_ID, stage: 'fabric_inhouse', name: 'Fabric In-house', days_before_exfactory: 55, sort_order: 1 },
      { template_id: TEMPLATE_ID, stage: 'cutting', name: 'Cutting Complete', days_before_exfactory: 48, sort_order: 2 },
      { template_id: TEMPLATE_ID, stage: 'stitching', name: 'Stitching Complete', days_before_exfactory: 35, sort_order: 3 },
      { template_id: TEMPLATE_ID, stage: 'printing', name: 'Printing Complete', days_before_exfactory: 28, sort_order: 4 },
      { template_id: TEMPLATE_ID, stage: 'washing', name: 'Washing Complete', days_before_exfactory: 21, sort_order: 5 },
      { template_id: TEMPLATE_ID, stage: 'finishing', name: 'Finishing Complete', days_before_exfactory: 14, sort_order: 6 },
      { template_id: TEMPLATE_ID, stage: 'packing', name: 'Packing Complete', days_before_exfactory: 7, sort_order: 7 },
      { template_id: TEMPLATE_ID, stage: 'final_inspection', name: 'Final Inspection', days_before_exfactory: 3, sort_order: 8 },
      { template_id: TEMPLATE_ID, stage: 'dispatch', name: 'Dispatch', days_before_exfactory: 0, sort_order: 9 },
    ])
    if (tmplMsError) console.error('  TNA milestones:', tmplMsError.message)
    else console.log('  ✓ TNA template milestones (9)')
  } else {
    console.log(`  ✓ TNA template milestones already exist (${tmplMsCount})`)
  }

  // ── Orders ── (created_by set to real merchandiser — must be called after createUsers)
  // Orders are inserted in seedOrdersAndDependencies() which receives the real merchandiser UUID
}

// ─── Phase 2: Create demo users ─────────────────────────────
async function createUsers() {
  console.log('\n👥 Creating demo users...\n')
  const userMap: Record<string, string> = {}

  for (const user of DEMO_USERS) {
    console.log(`  ${user.email}`)
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existing = (existingUsers?.users ?? []).find((u: { email?: string }) => u.email === user.email)

    let userId: string
    if (existing) {
      console.log(`    → already exists: ${existing.id}`)
      userId = existing.id
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { full_name: user.full_name, role: user.role },
      })
      if (error) {
        console.error(`    → error: ${error.message}`)
        continue
      }
      userId = data.user.id
      console.log(`    → created: ${userId}`)
    }
    userMap[user.email] = userId

    // Upsert profile
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      production_unit_id: 'production_unit' in user ? user.production_unit : null,
    }, { onConflict: 'id' })
    if (profileError) console.error(`    → profile error: ${profileError.message}`)
  }

  return userMap
}

// ─── Phase 3: Insert orders (needs real merchandiser UUID) ──
async function seedOrdersAndDependencies(merchandiserId: string) {
  console.log('\n📋 Seeding orders, items, and milestones...\n')

  // ── Orders ──
  const { error: ordersError } = await supabase.from('orders').upsert([
    {
      id: ORDER_1, po_number: 'B-PO-88213', buyer_id: BUYER_B_ID,
      style_name: "Men's Crew Neck Tee, Navy",
      style_description: '100% cotton, 180gsm single jersey, crew neck, short sleeve',
      total_quantity: 12000, production_unit_id: UNIT_ALPHA, current_stage: 'stitching',
      completed_quantity: 6800, ex_factory_date: '2026-11-20', status: 'active', risk_status: 'AMBER',
      notes: 'FOB basis. Inspection by SGS on day of dispatch.', created_by: merchandiserId,
    },
    {
      id: ORDER_2, po_number: 'B-PO-88240', buyer_id: BUYER_B_ID,
      style_name: "Men's Polo Shirt, White",
      style_description: '100% pique cotton, 200gsm, three-button placket, ribbed collar',
      total_quantity: 8000, production_unit_id: UNIT_ALPHA, current_stage: 'finishing',
      completed_quantity: 5200, ex_factory_date: '2026-11-12', status: 'active', risk_status: 'RED',
      notes: 'Critical order — must not miss. UK customer compliance inspection required.', created_by: merchandiserId,
    },
    {
      id: ORDER_3, po_number: 'C-PO-0488', buyer_id: BUYER_C_ID,
      style_name: 'Kids Printed Tee, Yellow',
      style_description: "100% cotton, 160gsm, children's all-over digital print, crew neck",
      total_quantity: 10000, production_unit_id: UNIT_BETA, current_stage: 'printing',
      completed_quantity: 3100, ex_factory_date: '2026-11-28', status: 'active', risk_status: 'GREEN',
      notes: 'GOTS certified fabric required. Oeko-Tex Standard 100 certificate needed.', created_by: merchandiserId,
    },
  ], { onConflict: 'id' })
  if (ordersError) { console.error('  Orders:', ordersError.message); return }
  else console.log('  ✓ Orders (3)')

  // ── Order items ──
  const itemGroups: Array<[string, Array<{ colour: string; size: string; quantity: number }>]> = [
    [ORDER_1, [
      { colour: 'Navy', size: 'XS', quantity: 500 },
      { colour: 'Navy', size: 'S', quantity: 1500 },
      { colour: 'Navy', size: 'M', quantity: 3000 },
      { colour: 'Navy', size: 'L', quantity: 3500 },
      { colour: 'Navy', size: 'XL', quantity: 2500 },
      { colour: 'Navy', size: 'XXL', quantity: 1000 },
    ]],
    [ORDER_2, [
      { colour: 'White', size: 'S', quantity: 1000 },
      { colour: 'White', size: 'M', quantity: 2500 },
      { colour: 'White', size: 'L', quantity: 2500 },
      { colour: 'White', size: 'XL', quantity: 1500 },
      { colour: 'White', size: 'XXL', quantity: 500 },
    ]],
    [ORDER_3, [
      { colour: 'Yellow', size: '2-3Y', quantity: 2000 },
      { colour: 'Yellow', size: '4-5Y', quantity: 2500 },
      { colour: 'Yellow', size: '6-7Y', quantity: 2500 },
      { colour: 'Yellow', size: '8-9Y', quantity: 2000 },
      { colour: 'Yellow', size: '10-11Y', quantity: 1000 },
    ]],
  ]
  for (const [orderId, items] of itemGroups) {
    const { count } = await supabase
      .from('order_items').select('*', { count: 'exact', head: true }).eq('order_id', orderId)
    if ((count ?? 0) === 0) {
      const { error } = await supabase.from('order_items').insert(
        items.map((item) => ({ order_id: orderId, ...item }))
      )
      if (error) console.error(`  Items for ${orderId}:`, error.message)
    }
  }
  console.log('  ✓ Order items (16)')

  // ── Order milestones ──
  type MilestoneRow = { stage: string; name: string; target_date: string; completed_date: string | null; sort_order: number; target_quantity: number; completed_quantity: number; is_active: boolean }
  const milestonesData: Record<string, MilestoneRow[]> = {
    [ORDER_1]: [
      { stage: 'fabric_inhouse', name: 'Fabric In-house', target_date: '2026-09-26', completed_date: '2026-09-25', sort_order: 1, target_quantity: 12000, completed_quantity: 12000, is_active: false },
      { stage: 'cutting', name: 'Cutting Complete', target_date: '2026-10-03', completed_date: '2026-10-04', sort_order: 2, target_quantity: 12000, completed_quantity: 12000, is_active: false },
      { stage: 'stitching', name: 'Stitching Complete', target_date: '2026-10-16', completed_date: null, sort_order: 3, target_quantity: 12000, completed_quantity: 6800, is_active: true },
      { stage: 'printing', name: 'Printing Complete', target_date: '2026-10-23', completed_date: null, sort_order: 4, target_quantity: 12000, completed_quantity: 0, is_active: false },
      { stage: 'washing', name: 'Washing Complete', target_date: '2026-10-30', completed_date: null, sort_order: 5, target_quantity: 12000, completed_quantity: 0, is_active: false },
      { stage: 'finishing', name: 'Finishing Complete', target_date: '2026-11-06', completed_date: null, sort_order: 6, target_quantity: 12000, completed_quantity: 0, is_active: false },
      { stage: 'packing', name: 'Packing Complete', target_date: '2026-11-13', completed_date: null, sort_order: 7, target_quantity: 12000, completed_quantity: 0, is_active: false },
      { stage: 'final_inspection', name: 'Final Inspection', target_date: '2026-11-17', completed_date: null, sort_order: 8, target_quantity: 12000, completed_quantity: 0, is_active: false },
      { stage: 'dispatch', name: 'Dispatch', target_date: '2026-11-20', completed_date: null, sort_order: 9, target_quantity: 12000, completed_quantity: 0, is_active: false },
    ],
    [ORDER_2]: [
      { stage: 'fabric_inhouse', name: 'Fabric In-house', target_date: '2026-09-18', completed_date: '2026-09-17', sort_order: 1, target_quantity: 8000, completed_quantity: 8000, is_active: false },
      { stage: 'cutting', name: 'Cutting Complete', target_date: '2026-09-25', completed_date: '2026-09-26', sort_order: 2, target_quantity: 8000, completed_quantity: 8000, is_active: false },
      { stage: 'stitching', name: 'Stitching Complete', target_date: '2026-10-08', completed_date: '2026-10-09', sort_order: 3, target_quantity: 8000, completed_quantity: 8000, is_active: false },
      { stage: 'printing', name: 'Printing Complete', target_date: '2026-10-15', completed_date: '2026-10-16', sort_order: 4, target_quantity: 8000, completed_quantity: 8000, is_active: false },
      { stage: 'washing', name: 'Washing Complete', target_date: '2026-10-22', completed_date: '2026-10-22', sort_order: 5, target_quantity: 8000, completed_quantity: 8000, is_active: false },
      { stage: 'finishing', name: 'Finishing Complete', target_date: '2026-10-29', completed_date: null, sort_order: 6, target_quantity: 8000, completed_quantity: 5200, is_active: true },
      { stage: 'packing', name: 'Packing Complete', target_date: '2026-11-05', completed_date: null, sort_order: 7, target_quantity: 8000, completed_quantity: 0, is_active: false },
      { stage: 'final_inspection', name: 'Final Inspection', target_date: '2026-11-09', completed_date: null, sort_order: 8, target_quantity: 8000, completed_quantity: 0, is_active: false },
      { stage: 'dispatch', name: 'Dispatch', target_date: '2026-11-12', completed_date: null, sort_order: 9, target_quantity: 8000, completed_quantity: 0, is_active: false },
    ],
    [ORDER_3]: [
      { stage: 'fabric_inhouse', name: 'Fabric In-house', target_date: '2026-10-04', completed_date: '2026-10-03', sort_order: 1, target_quantity: 10000, completed_quantity: 10000, is_active: false },
      { stage: 'cutting', name: 'Cutting Complete', target_date: '2026-10-11', completed_date: '2026-10-12', sort_order: 2, target_quantity: 10000, completed_quantity: 10000, is_active: false },
      { stage: 'stitching', name: 'Stitching Complete', target_date: '2026-10-24', completed_date: '2026-10-25', sort_order: 3, target_quantity: 10000, completed_quantity: 10000, is_active: false },
      { stage: 'printing', name: 'Printing Complete', target_date: '2026-10-31', completed_date: null, sort_order: 4, target_quantity: 10000, completed_quantity: 3100, is_active: true },
      { stage: 'washing', name: 'Washing Complete', target_date: '2026-11-07', completed_date: null, sort_order: 5, target_quantity: 10000, completed_quantity: 0, is_active: false },
      { stage: 'finishing', name: 'Finishing Complete', target_date: '2026-11-14', completed_date: null, sort_order: 6, target_quantity: 10000, completed_quantity: 0, is_active: false },
      { stage: 'packing', name: 'Packing Complete', target_date: '2026-11-21', completed_date: null, sort_order: 7, target_quantity: 10000, completed_quantity: 0, is_active: false },
      { stage: 'final_inspection', name: 'Final Inspection', target_date: '2026-11-25', completed_date: null, sort_order: 8, target_quantity: 10000, completed_quantity: 0, is_active: false },
      { stage: 'dispatch', name: 'Dispatch', target_date: '2026-11-28', completed_date: null, sort_order: 9, target_quantity: 10000, completed_quantity: 0, is_active: false },
    ],
  }
  for (const [orderId, milestones] of Object.entries(milestonesData)) {
    const { count } = await supabase
      .from('order_milestones').select('*', { count: 'exact', head: true }).eq('order_id', orderId)
    if ((count ?? 0) === 0) {
      const { error } = await supabase.from('order_milestones').insert(
        milestones.map((m) => ({ order_id: orderId, ...m }))
      )
      if (error) console.error(`  Milestones for ${orderId}:`, error.message)
    }
  }
  console.log('  ✓ Order milestones (27)')
}

// ─── Phase 4: Production updates ────────────────────────────
async function seedProductionUpdates(supervisorId: string, supervisor2Id: string) {
  console.log('\n📊 Inserting 7-day production history...\n')
  const referenceDate = new Date('2026-11-05')
  const updates: Record<string, unknown>[] = []

  // Order 1 (stitching, supervisor 1): 350-500 pcs/day → AMBER
  for (let i = 6; i >= 0; i--) {
    const d = new Date(referenceDate); d.setDate(d.getDate() - i)
    if (d.getDay() === 0) continue
    updates.push({
      client_id: crypto.randomUUID(), order_id: ORDER_1, milestone_id: null,
      supervisor_id: supervisorId, stage: 'stitching',
      quantity_completed: 350 + Math.floor(Math.random() * 150),
      update_date: d.toISOString().split('T')[0],
      issue_note_original: null, issue_note_english: null,
      ai_category: null, ai_needs_review: false, photo_urls: [],
    })
  }

  // Order 2 (finishing, supervisor 1): 300-400 pcs/day, one machine breakdown → RED
  for (let i = 6; i >= 0; i--) {
    const d = new Date(referenceDate); d.setDate(d.getDate() - i)
    if (d.getDay() === 0) continue
    const hasIssue = i === 3
    updates.push({
      client_id: crypto.randomUUID(), order_id: ORDER_2, milestone_id: null,
      supervisor_id: supervisorId, stage: 'finishing',
      quantity_completed: hasIssue ? 150 : 300 + Math.floor(Math.random() * 100),
      update_date: d.toISOString().split('T')[0],
      issue_note_original: hasIssue ? 'இன்று இயந்திரம் கேடு ஆனது. மூன்று மணி நேரம் நிறுத்தப்பட்டது.' : null,
      issue_note_english: hasIssue ? 'Machine breakdown today. Production halted for 3 hours.' : null,
      ai_category: hasIssue ? 'MACHINE_BREAKDOWN' : null,
      ai_confidence: hasIssue ? 0.95 : null, ai_needs_review: false, photo_urls: [],
    })
  }

  // Order 3 (printing, supervisor 2): 500-700 pcs/day → GREEN
  for (let i = 6; i >= 0; i--) {
    const d = new Date(referenceDate); d.setDate(d.getDate() - i)
    if (d.getDay() === 0) continue
    const hasIssue = i === 1
    updates.push({
      client_id: crypto.randomUUID(), order_id: ORDER_3, milestone_id: null,
      supervisor_id: supervisor2Id, stage: 'printing',
      quantity_completed: 500 + Math.floor(Math.random() * 200),
      update_date: d.toISOString().split('T')[0],
      issue_note_original: hasIssue ? 'Ink delivery delayed by 2 hours.' : null,
      issue_note_english: hasIssue ? 'Ink delivery delayed by 2 hours.' : null,
      ai_category: hasIssue ? 'MATERIAL_SHORTAGE' : null,
      ai_confidence: hasIssue ? 0.82 : null,
      ai_needs_review: hasIssue ? true : false, photo_urls: [],
    })
  }

  for (const update of updates) {
    await supabase.from('production_updates').upsert(update, {
      onConflict: 'client_id', ignoreDuplicates: true,
    })
  }
  console.log(`  ✓ Production updates (${updates.length})`)
}

// ─── Phase 5: Buyer access tokens ───────────────────────────
async function seedBuyerTokens() {
  console.log('\n🔑 Generating buyer access tokens...\n')
  const buyers = [
    { buyerId: BUYER_B_ID, label: 'Company B Portal' },
    { buyerId: BUYER_C_ID, label: 'Company C Portal' },
  ]
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  for (const b of buyers) {
    const token = generateToken()
    const tokenHash = await hashToken(token)
    const expiresAt = new Date('2027-11-05').toISOString()

    const { error } = await supabase.from('buyer_access_tokens').insert({
      buyer_id: b.buyerId, token_hash: tokenHash, label: b.label, expires_at: expiresAt,
    })
    if (error) {
      console.error(`  ${b.label}: ${error.message}`)
    } else {
      console.log(`  ✓ ${b.label} Access Link:`)
      console.log(`    ${baseUrl}/buyer/${token}`)
    }
  }
}

// ─── Main ───────────────────────────────────────────────────
async function main() {
  console.log('╔════════════════════════════════════╗')
  console.log('║    StitchOps Database Seed         ║')
  console.log('╚════════════════════════════════════╝')

  // Phase 1: Base data
  await seedBaseData()

  // Phase 2: Users
  const userMap = await createUsers()
  const merchandiserId = userMap['merchandiser@stitchops.demo']
  const supervisorId = userMap['supervisor@stitchops.demo']
  const supervisor2Id = userMap['supervisor2@stitchops.demo']
  if (!merchandiserId) {
    console.error('\n❌ Merchandiser user not created — check Supabase auth settings')
    process.exit(1)
  }

  // Phase 3: Orders, items, milestones (requires real merchandiser UUID)
  await seedOrdersAndDependencies(merchandiserId)

  // Phase 4: Production updates
  if (supervisorId && supervisor2Id) {
    await seedProductionUpdates(supervisorId, supervisor2Id)
  }

  // Phase 5: Buyer tokens
  await seedBuyerTokens()

  console.log('\n╔════════════════════════════════════╗')
  console.log('║    ✅ Seed completed successfully   ║')
  console.log('╚════════════════════════════════════╝')
  console.log('\nDemo login credentials:')
  console.log('  merchandiser@stitchops.demo  /  Demo@2026!')
  console.log('  supervisor@stitchops.demo    /  Demo@2026!')
  console.log('  supervisor2@stitchops.demo  /  Demo@2026!')
  console.log('  buyer-b@stitchops.demo       /  Demo@2026!')
  console.log('  buyer-c@stitchops.demo       /  Demo@2026!')
}

main().catch((err) => {
  console.error('\n❌ Seed failed:', err)
  process.exit(1)
})
