import { describe, expect, it } from 'vitest'
import { tokenize } from './split'

describe('tokenize', () => {
  it('keeps latin words intact and collapses whitespace', () => {
    const tokens = tokenize('  Ideas   take shape. ')
    expect(tokens.map(t => (t.type === 'word' ? t.chars.join('') : ' '))).toEqual(['Ideas', ' ', 'take', ' ', 'shape.'])
  })
  it('splits CJK into single-character words', () => {
    const words = tokenize('让念头 shape').filter(t => t.type === 'word')
    expect(words.map(t => (t.type === 'word' ? t.chars.join('') : ''))).toEqual(['让', '念', '头', 'shape'])
  })
  it('handles astral characters as one char', () => {
    const [first] = tokenize('✳️a')
    expect(first?.type === 'word' && first.chars.length).toBe(3)
  })
})
