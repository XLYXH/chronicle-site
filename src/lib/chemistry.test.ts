import { describe, expect, it } from 'vitest'
import { fuse, pairKey, RECIPES, TECHS } from './chemistry'
import { scrambleFrame } from './scramble'

describe('chemistry', () => {
  it('is order independent', () => {
    expect(pairKey('vue', 'esp32')).toBe('esp32+vue')
    expect(fuse('qt', 'cpp')?.title).toBe('Qt Blueprint Generator')
    expect(fuse('typescript', 'ai')?.badge).toBe('PaLM Proxy')
  })
  it('returns null for unknown pairs and self pairs', () => {
    expect(fuse('react', 'qt')).toBeNull()
    expect(fuse('vue', 'vue')).toBeNull()
  })
  it('only references existing techs', () => {
    const ids = new Set(TECHS.map(t => t.id))
    for (const r of RECIPES) for (const id of r.key.split('+')) expect(ids.has(id)).toBe(true)
  })
})

describe('scrambleFrame', () => {
  it('keeps length, spaces and punctuation; solves fully at 1', () => {
    const out = scrambleFrame('Hi, Qt 6.', 0, () => 0.1)
    expect(Array.from(out)).toHaveLength(9)
    expect(out[2]).toBe(',')
    expect(out[3]).toBe(' ')
    expect(out[7]).toBe('6')
    expect(scrambleFrame('Hello', 1)).toBe('Hello')
  })
  it('preserves case of scrambled letters', () => {
    const out = scrambleFrame('Ab', 0, () => 0.5)
    expect(out[0]).toMatch(/[A-Z]/)
    expect(out[1]).toMatch(/[a-z]/)
  })
})

import { orbitPoint, wrapAngle } from './orbit'
describe('orbit', () => {
  it('front of the ring is nearer and larger', () => {
    const front = orbitPoint(Math.PI / 2, 100, 0.4)
    const back = orbitPoint(-Math.PI / 2, 100, 0.4)
    expect(front.z).toBeCloseTo(1)
    expect(front.scale).toBeGreaterThan(back.scale)
    expect(front.y).toBeGreaterThan(back.y)
  })
  it('wraps angles', () => {
    expect(wrapAngle(Math.PI * 2.5)).toBeCloseTo(Math.PI / 2)
    expect(wrapAngle(-Math.PI * 2.5)).toBeCloseTo(-Math.PI / 2)
  })
})
