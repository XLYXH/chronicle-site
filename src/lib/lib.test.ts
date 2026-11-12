import { describe, expect, it } from 'vitest'
import { scrambleFrame } from './scramble'
import { formatUptime, monthGrid, yearProgress } from './time'
import { run, share } from './terminal'

describe('scrambleFrame', () => {
  it('fully solved at progress 1', () => expect(scrambleFrame('PROJECTS', 1)).toBe('PROJECTS'))
  it('keeps length and spaces', () => {
    const out = scrambleFrame('A B', 0, () => 0)
    expect(out).toHaveLength(3)
    expect(out[1]).toBe(' ')
  })
})

describe('time', () => {
  it('formats uptime', () => expect(formatUptime((2 * 86400 + 3 * 3600 + 4 * 60 + 5) * 1000)).toBe('2D 03:04:05'))
  it('year progress in range', () => {
    expect(yearProgress(new Date(2026, 0, 1))).toBe(0)
    expect(yearProgress(new Date(2026, 6, 2))).toBeGreaterThan(0.49)
  })
  it('month grid starts on Monday', () => {
    const g = monthGrid(2026, 10) // 2026-11-01 是周日
    expect(g[0]).toEqual([0, 0, 0, 0, 0, 0, 1])
    expect(g.flat().filter(Boolean)).toHaveLength(30)
  })
})

describe('terminal', () => {
  it('lists projects', () => expect(run('ls').lines).toHaveLength(5))
  it('opens by prefix', () => expect(run('open qt').open).toContain('qt-blueprint-generator'))
  it('unknown command', () => expect(run('rm -rf /').lines[0]?.tone).toBe('err'))
  it('clear', () => expect(run('clear').clear).toBe(true))
  it('language share sums to 1', () => expect(share().reduce((s, [, v]) => s + v, 0)).toBeCloseTo(1))
})
