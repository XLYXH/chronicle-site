/**
 * 全站动效语言：同一组缓动与时长，保证每一处转场“说同一种话”。
 * - out：元素入场（快起慢收，有分量感）
 * - inOut：幕布 / 遮罩 / 线条展开等「空间」转场
 * - soft：小尺度位移、悬停反馈
 */
export const EASE = {
  out: 'expo.out',
  inOut: 'expo.inOut',
  soft: 'power3.out',
  in: 'power3.in',
} as const

export const DUR = {
  xs: 0.45,
  sm: 0.8,
  md: 1.2,
  lg: 1.6,
} as const

export const STAGGER = {
  chars: 0.028,
  words: 0.06,
  items: 0.1,
} as const
