import { describe, expect, it } from 'vitest'
import { clamp, coverScale, damp, formatCount, lerp, mapRange } from './math'

describe('math', () => {
  it('clamps and lerps', () => {
    expect(clamp(2)).toBe(1)
    expect(clamp(-1)).toBe(0)
    expect(lerp(0, 10, 0.25)).toBe(2.5)
  })
  it('damps towards target without overshoot', () => {
    const v = damp(0, 1, 8, 1 / 60)
    expect(v).toBeGreaterThan(0)
    expect(v).toBeLessThan(1)
    expect(damp(0, 1, 8, 10)).toBeCloseTo(1, 5)
  })
  it('maps ranges and guards zero-width input', () => {
    expect(mapRange(5, 0, 10, 100, 200)).toBe(150)
    expect(mapRange(5, 1, 1, 7, 9)).toBe(7)
  })
  it('formats loader counts', () => {
    expect(formatCount(0)).toBe('000')
    expect(formatCount(0.421)).toBe('042')
    expect(formatCount(1.5)).toBe('100')
  })
  it('computes cover scale for wide and tall viewports', () => {
    expect(coverScale(1600, 800, 1536, 1024)).toEqual([1, 0.75])
    const [sx, sy] = coverScale(390, 844, 1536, 1024)
    expect(sy).toBe(1)
    expect(sx).toBeCloseTo(390 / 844 / 1.5, 5)
  })
})
