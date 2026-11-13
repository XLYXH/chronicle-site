import { describe, expect, it } from 'vitest'
import { bezelCurve, buildLensMap, lensVector, roundRectSDF } from './lens'

describe('roundRectSDF', () => {
  it('内部为负、外部为正、边上约为 0', () => {
    expect(roundRectSDF(0, 0, 50, 20, 20).d).toBeLessThan(0)
    expect(roundRectSDF(60, 0, 50, 20, 20).d).toBeGreaterThan(0)
    expect(Math.abs(roundRectSDF(50, 0, 50, 20, 20).d)).toBeLessThan(1e-9)
  })
  it('法线朝外', () => {
    const n = roundRectSDF(45, 0, 50, 20, 20)
    expect(n.nx).toBe(1)
    expect(roundRectSDF(-45, 0, 50, 20, 20).nx).toBe(-1)
  })
})

describe('lens map', () => {
  it('弧面曲线在边上最强、内侧归零', () => {
    expect(bezelCurve(0)).toBeCloseTo(1)
    expect(bezelCurve(1)).toBe(0)
  })
  it('边缘向内取样，中心不动（无放大时）', () => {
    const s = { w: 100, h: 40, r: 20, bezel: 10, edge: 8 }
    expect(lensVector(99, 20, s)[0]).toBeLessThan(0)
    expect(lensVector(1, 20, s)[0]).toBeGreaterThan(0)
    const c = lensVector(50, 20, s)
    expect(Math.abs(c[0]) + Math.abs(c[1])).toBe(0)
  })
  it('放大：向中心取样', () => {
    const s = { w: 100, h: 100, r: 50, bezel: 10, edge: 0, magnify: 0.2 }
    expect(lensVector(70, 50, s)[0]).toBeCloseTo(-4)
  })
  it('编码后中心为中性灰、scale 为最大位移的两倍', () => {
    const m = buildLensMap({ w: 20, h: 20, r: 10, bezel: 4, edge: 5 })
    expect(m.data.length).toBe(20 * 20 * 4)
    const o = (10 * 20 + 10) * 4
    expect(m.data[o]).toBe(128)
    expect(m.scale).toBeGreaterThan(0)
    expect(m.scale).toBeLessThanOrEqual(10.01)
  })
})
