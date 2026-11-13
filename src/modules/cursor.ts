import { gsap } from 'gsap'
import { qs, qsa } from '../lib/env'

/**
 * 钴蓝小圆点光标：跟随有阻尼，悬停可交互元素时放大成圆环，
 * 带 data-cursor 的元素显示一个短标签；data-magnetic 元素被指针轻轻吸附。
 * 只在精确指针 + 允许动效时启用，系统光标保留（只在 CSS 中隐藏于大面积区域外不做处理）。
 */
export function initCursor() {
  const el = qs('.cursor')
  const label = qs('.cursor__label')
  if (!el || !label) return
  document.documentElement.classList.add('has-cursor')
  const xTo = gsap.quickTo(el, 'x', { duration: 0.45, ease: 'power3.out' })
  const yTo = gsap.quickTo(el, 'y', { duration: 0.45, ease: 'power3.out' })
  let shown = false

  window.addEventListener(
    'pointermove',
    e => {
      if (e.pointerType !== 'mouse') return
      if (!shown) {
        shown = true
        gsap.set(el, { x: e.clientX, y: e.clientY })
        el.classList.add('is-on')
      }
      xTo(e.clientX)
      yTo(e.clientY)
    },
    { passive: true },
  )
  document.documentElement.addEventListener('pointerleave', () => el.classList.remove('is-on'))
  document.documentElement.addEventListener('pointerenter', () => shown && el.classList.add('is-on'))
  window.addEventListener('pointerdown', () => el.classList.add('is-down'))
  window.addEventListener('pointerup', () => el.classList.remove('is-down'))

  const interactive = 'a, button, [data-cursor], [role="button"], .lab__drop'
  document.addEventListener('pointerover', e => {
    const t = (e.target as Element).closest<HTMLElement>(interactive)
    el.classList.toggle('is-hover', !!t)
    const text = t?.closest<HTMLElement>('[data-cursor]')?.dataset.cursor ?? ''
    label.textContent = text
    el.classList.toggle('has-label', !!text)
  })
  document.addEventListener('pointerout', e => {
    if (!(e.relatedTarget as Element | null)?.closest(interactive)) {
      el.classList.remove('is-hover', 'has-label')
    }
  })

  initMagnetic()
}

export function initMagnetic() {
  qsa('[data-magnetic]').forEach(m => {
    const xTo = gsap.quickTo(m, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.45)' })
    const yTo = gsap.quickTo(m, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.45)' })
    const strength = Number(m.dataset.magnetic) || 0.32
    m.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return
      const r = m.getBoundingClientRect()
      xTo((e.clientX - (r.left + r.width / 2)) * strength)
      yTo((e.clientY - (r.top + r.height / 2)) * strength)
    })
    m.addEventListener('pointerleave', () => {
      xTo(0)
      yTo(0)
    })
  })
}
