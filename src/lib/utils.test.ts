import { describe, it, expect } from 'vitest'
import { percentage, formatNumber, truncate } from './utils'

describe('percentage', () => {
  it('calculates correct percentage', () => {
    expect(percentage(500, 1000)).toBe(50)
    expect(percentage(6800, 12000)).toBe(57)
    expect(percentage(5200, 8000)).toBe(65)
  })
  it('caps at 100', () => {
    expect(percentage(1100, 1000)).toBe(100)
  })
  it('returns 0 when total is 0', () => {
    expect(percentage(0, 0)).toBe(0)
  })
  it('returns 0 when value is 0', () => {
    expect(percentage(0, 1000)).toBe(0)
  })
})

describe('formatNumber', () => {
  it('formats numbers with Indian locale', () => {
    const formatted = formatNumber(12000)
    expect(formatted).toMatch(/12[,.]?000/)
  })
})

describe('truncate', () => {
  it('does not truncate short strings', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })
  it('truncates long strings', () => {
    const result = truncate('this is a very long string', 10)
    expect(result).toBe('this is...')
    expect(result.length).toBe(10)
  })
})
