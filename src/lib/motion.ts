/** 全站共用的动效令牌：同一套缓动和时长，保证各模块节奏一致 */
export const EASE = {
  out: 'expo.out',
  inOut: 'expo.inOut',
  soft: 'power3.out',
  step: 'steps(6)',
} as const

export const DUR = { xs: 0.35, sm: 0.6, md: 1, lg: 1.4 } as const
