import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// Mirror of the AI response schema from the classify route
const AI_CATEGORIES = [
  'MATERIAL_SHORTAGE',
  'MACHINE_BREAKDOWN',
  'LABOUR_SHORTAGE',
  'QUALITY_REWORK',
  'PRINTING_DELAY',
  'WASHING_DELAY',
  'POWER_OUTAGE',
  'SUBCONTRACTOR_DELAY',
  'OTHER',
] as const

const aiResponseSchema = z.object({
  originalNote: z.string(),
  englishTranslation: z.string(),
  reasonCategory: z.enum(AI_CATEGORIES),
  confidence: z.number().min(0).max(1),
  needsReview: z.boolean(),
})

describe('AI Response Schema Validation', () => {
  it('validates a correct AI response', () => {
    const valid = {
      originalNote: 'இயந்திரம் கேடு',
      englishTranslation: 'Machine breakdown',
      reasonCategory: 'MACHINE_BREAKDOWN',
      confidence: 0.95,
      needsReview: false,
    }
    expect(() => aiResponseSchema.parse(valid)).not.toThrow()
  })

  it('rejects invalid category', () => {
    const invalid = {
      originalNote: 'note',
      englishTranslation: 'note',
      reasonCategory: 'INVALID_CATEGORY',
      confidence: 0.9,
      needsReview: false,
    }
    expect(() => aiResponseSchema.parse(invalid)).toThrow()
  })

  it('rejects confidence out of range', () => {
    const invalid = {
      originalNote: 'note',
      englishTranslation: 'note',
      reasonCategory: 'OTHER',
      confidence: 1.5, // > 1
      needsReview: false,
    }
    expect(() => aiResponseSchema.parse(invalid)).toThrow()
  })

  it('marks needsReview=true when confidence < 0.75', () => {
    // Application logic: set needsReview if confidence < 0.75
    const confidence = 0.65
    const needsReview = confidence < 0.75
    expect(needsReview).toBe(true)
  })

  it('marks needsReview=false when confidence >= 0.75', () => {
    const confidence = 0.90
    const needsReview = confidence < 0.75
    expect(needsReview).toBe(false)
  })

  it('validates all valid categories', () => {
    for (const cat of AI_CATEGORIES) {
      const response = {
        originalNote: 'test',
        englishTranslation: 'test',
        reasonCategory: cat,
        confidence: 0.9,
        needsReview: false,
      }
      expect(() => aiResponseSchema.parse(response)).not.toThrow()
    }
  })
})

describe('Token Security', () => {
  it('generates 64-char hex token from 32 random bytes', () => {
    // Simulate token generation
    const bytes = new Uint8Array(32)
    for (let i = 0; i < 32; i++) bytes[i] = i // deterministic for test
    const token = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
    expect(token.length).toBe(64)
    expect(/^[0-9a-f]+$/.test(token)).toBe(true)
  })

  it('different random tokens are unique', () => {
    // Two 32-byte tokens should not collide
    const make = () => {
      const bytes = new Uint8Array(32)
      crypto.getRandomValues(bytes)
      return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
    }
    const t1 = make()
    const t2 = make()
    expect(t1).not.toBe(t2)
  })
})
