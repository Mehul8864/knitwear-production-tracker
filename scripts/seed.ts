/**
 * StitchOps Database Seed Script
 *
 * Creates demo users and inserts seed data.
 * Run: npx tsx scripts/seed.ts
 *
 * Prerequisites:
 * - Supabase project set up
 * - Database migrations applied (001, 002)
 * - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import * as crypto from 'crypto'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Service role client (admin operations only — never exposed to browser)
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DEMO_PASSWORD = 'Demo@2026!'

const DEMO_USERS = [
  {
    email: 'merchandiser@stitchops.demo',
    password: DEMO_PASSWORD,
    full_name: 'Priya Rajan',
    role: 'merchandiser' as const,
  },
  {
    email: 'supervisor@stitchops.demo',
    password: DEMO_PASSWORD,
    full_name: 'Muthu Kumar',
    role: 'supervisor' as const,
    production_unit: 'aaaa0001-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  },
  {
    email: 'supervisor2@stitchops.demo',
    password: DEMO_PASSWORD,
    full_name: 'Selvam Raj',
    role: 'supervisor' as const,
    production_unit: 'aaaa0002-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  },
  {
    email: 'buyer-b@stitchops.demo',
    password: DEMO_PASSWORD,
    full_name: 'James Wilson',
    role: 'buyer' as const,
  },
  {
    email: 'buyer-c@stitchops.demo',
    password: DEMO_PASSWORD,
    full_name: 'Klaus Mueller',
    role: 'buyer' as const,
  },
]

async function hashToken(token: string): Promise<string> {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

async function createUsers() {
  const userMap: Record<string, string> = {}

  for (const user of DEMO_USERS) {
    console.log(`Creating user: ${user.email}`)

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existing = existingUsers?.users.find((u) => u.email === user.email)

    let userId: string
    if (existing) {
      console.log(`  User already exists: ${existing.id}`)
      userId = existing.id
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { full_name: user.full_name, role: user.role },
      })
      if (error) {
        console.error(`  Error creating user: ${error.message}`)
        continue
      }
      userId = data.user.id
      console.log(`  Created: ${userId}`)
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

    if (profileError) {
      console.error(`  Profile error: ${profileError.message}`)
    }
  }

  return userMap
}

async function updateOrderCreators(merchandiserId: string) {
  const orderIds = [
    'order001-0000-0000-0000-000000000001',
    'order002-0000-0000-0000-000000000002',
    'order003-0000-0000-0000-000000000003',
  ]

  for (const id of orderIds) {
    await supabase
      .from('orders')
      .update({ created_by: merchandiserId })
      .eq('id', id)
  }

  console.log('Updated order creators')
}

async function seedProductionUpdates(supervisorId: string, supervisor2Id: string) {
  const referenceDate = new Date('2026-11-05')
  const updates = []

  // 7 days of updates for B-PO-88213 (stitching, supervisor 1)
  for (let i = 6; i >= 0; i--) {
    const d = new Date(referenceDate)
    d.setDate(d.getDate() - i)
    if (d.getDay() === 0) continue // skip Sunday

    const qty = 350 + Math.floor(Math.random() * 150) // 350-500 pcs/day
    updates.push({
      client_id: crypto.randomUUID(),
      order_id: 'order001-0000-0000-0000-000000000001',
      milestone_id: null,
      supervisor_id: supervisorId,
      stage: 'stitching',
      quantity_completed: qty,
      update_date: d.toISOString().split('T')[0],
      issue_note_original: null,
      issue_note_english: null,
      ai_category: null,
      ai_needs_review: false,
      photo_urls: [],
    })
  }

  // 7 days of updates for B-PO-88240 (finishing, supervisor 1)
  for (let i = 6; i >= 0; i--) {
    const d = new Date(referenceDate)
    d.setDate(d.getDate() - i)
    if (d.getDay() === 0) continue

    const qty = 300 + Math.floor(Math.random() * 100) // 300-400 pcs/day
    const hasIssue = i === 3
    updates.push({
      client_id: crypto.randomUUID(),
      order_id: 'order002-0000-0000-0000-000000000002',
      milestone_id: null,
      supervisor_id: supervisorId,
      stage: 'finishing',
      quantity_completed: hasIssue ? 150 : qty,
      update_date: d.toISOString().split('T')[0],
      issue_note_original: hasIssue ? 'இன்று இயந்திரம் கேடு ஆனது. மூன்று மணி நேரம் நிறுத்தப்பட்டது.' : null,
      issue_note_english: hasIssue ? 'Machine breakdown today. Production halted for 3 hours.' : null,
      ai_category: hasIssue ? 'MACHINE_BREAKDOWN' : null,
      ai_confidence: hasIssue ? 0.95 : null,
      ai_needs_review: false,
      photo_urls: [],
    })
  }

  // 7 days of updates for C-PO-0488 (printing, supervisor 2)
  for (let i = 6; i >= 0; i--) {
    const d = new Date(referenceDate)
    d.setDate(d.getDate() - i)
    if (d.getDay() === 0) continue

    const qty = 500 + Math.floor(Math.random() * 200) // 500-700 pcs/day — on track
    const hasIssue = i === 1
    updates.push({
      client_id: crypto.randomUUID(),
      order_id: 'order003-0000-0000-0000-000000000003',
      milestone_id: null,
      supervisor_id: supervisor2Id,
      stage: 'printing',
      quantity_completed: qty,
      update_date: d.toISOString().split('T')[0],
      issue_note_original: hasIssue ? 'Ink delivery delayed by 2 hours.' : null,
      issue_note_english: hasIssue ? 'Ink delivery delayed by 2 hours.' : null,
      ai_category: hasIssue ? 'MATERIAL_SHORTAGE' : null,
      ai_confidence: hasIssue ? 0.82 : null,
      ai_needs_review: hasIssue ? true : false,
      photo_urls: [],
    })
  }

  // Insert updates
  for (const update of updates) {
    const { error } = await supabase.from('production_updates').upsert(update, {
      onConflict: 'client_id',
      ignoreDuplicates: true,
    })
    if (error) console.error('Update insert error:', error.message)
  }

  console.log(`Inserted ${updates.length} production updates`)
}

async function seedBuyerTokens(buyerBId: string | undefined, buyerCId: string | undefined) {
  const buyers = [
    { buyerId: '11111111-1111-1111-1111-111111111111', label: 'Company B Portal', email: buyerBId },
    { buyerId: '22222222-2222-2222-2222-222222222222', label: 'Company C Portal', email: buyerCId },
  ]

  for (const b of buyers) {
    const token = generateToken()
    const tokenHash = await hashToken(token)
    const expiresAt = new Date('2027-11-05').toISOString()

    const { error } = await supabase.from('buyer_access_tokens').insert({
      buyer_id: b.buyerId,
      token_hash: tokenHash,
      label: b.label,
      expires_at: expiresAt,
    })

    if (error) {
      console.error(`Token error for ${b.label}:`, error.message)
    } else {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
      console.log(`\n${b.label} Access Link:`)
      console.log(`${baseUrl}/buyer/${token}`)
    }
  }
}

async function main() {
  console.log('\n🧵 StitchOps Database Seed\n')
  console.log('Creating demo users...')
  const userMap = await createUsers()

  const merchandiserId = userMap['merchandiser@stitchops.demo']
  const supervisorId = userMap['supervisor@stitchops.demo']
  const supervisor2Id = userMap['supervisor2@stitchops.demo']

  if (!merchandiserId) {
    console.error('Merchandiser user not created — check Supabase auth settings')
    process.exit(1)
  }

  console.log('\nUpdating order creators...')
  await updateOrderCreators(merchandiserId)

  console.log('\nInserting production update history...')
  if (supervisorId && supervisor2Id) {
    await seedProductionUpdates(supervisorId, supervisor2Id)
  }

  console.log('\nGenerating buyer access tokens...')
  await seedBuyerTokens(
    userMap['buyer-b@stitchops.demo'],
    userMap['buyer-c@stitchops.demo']
  )

  console.log('\n✅ Seed completed successfully!')
  console.log('\nDemo credentials:')
  console.log('  merchandiser@stitchops.demo  /  Demo@2026!')
  console.log('  supervisor@stitchops.demo    /  Demo@2026!')
  console.log('  supervisor2@stitchops.demo   /  Demo@2026!')
  console.log('  buyer-b@stitchops.demo       /  Demo@2026!')
  console.log('  buyer-c@stitchops.demo       /  Demo@2026!')
}

main().catch(console.error)
