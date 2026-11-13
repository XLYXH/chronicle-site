import { gsap } from 'gsap'
import { qsa } from '../lib/env'

/**
 * 滚动速度：大标题沿滚动方向被轻微拉长、斜切（v11 起幅度减半，并去掉了 WebGL 漏光层——
 * 屏幕边缘的发光属于“为效果而效果”）。
 */
export function initVelocity(animate: boolean, onVel: (v: number) => void) {
  if (!animate) return
  const stretch = qsa('.sec-title, .connect__title')
  let lastY = scrollY
  let v = 0
  let shown = 0
  gsap.ticker.add(
    (_t, dtMs) => {
      const dt = Math.max(0.001, dtMs / 1000)
      const y = scrollY
      const raw = (y - lastY) / dt
      lastY = y
      v += (Math.max(-1, Math.min(1, raw / 3200)) - v) * (1 - Math.exp(-dt * 7))
      if (Math.abs(v) < 0.002) v = 0
      if (Math.abs(v - shown) > 0.003 || (v === 0 && shown !== 0)) {
        shown = v
        const a = Math.abs(v)
        stretch.forEach(el => gsap.set(el, { skewY: -v * 1.6, scaleY: 1 + a * 0.07, transformOrigin: v > 0 ? '50% 0%' : '50% 100%' }))
        onVel(v)
      }
    },
    false,
    true, // 排在最前：先读 scrollY，再让其它模块写样式，避免强制回流
  )
}
