import { gsap } from 'gsap'
import { qs } from '../lib/env'

/** 双层光标：点即时跟随，环带阻尼；悬停在 [data-cursor] 上时展开为标签 */
export function initCursor() {
  const root = qs('.cursor')
  const dot = qs('.cursor__dot')
  const ring = qs('.cursor__ring')
  const label = qs('.cursor__label')
  if (!root || !dot || !ring || !label) return

  document.documentElement.classList.add('has-cursor')
  const dotX = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' })
  const dotY = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' })
  const ringX = gsap.quickTo(ring, 'x', { duration: 0.5, ease: 'power3' })
  const ringY = gsap.quickTo(ring, 'y', { duration: 0.5, ease: 'power3' })
  let shown = false

  window.addEventListener(
    'pointermove',
    event => {
      if (event.pointerType !== 'mouse') return
      if (!shown) {
        gsap.set([dot, ring], { x: event.clientX, y: event.clientY })
        root.classList.add('is-visible')
        shown = true
      }
      dotX(event.clientX)
      dotY(event.clientY)
      ringX(event.clientX)
      ringY(event.clientY)
    },
    { passive: true },
  )

  document.addEventListener('pointerover', event => {
    const target = event.target as Element | null
    const labelled = target?.closest<HTMLElement>('[data-cursor]')
    const interactive = target?.closest('a, button, input, [role="button"]')
    const hidden = target?.closest('[data-cursor-hide]')
    root.classList.toggle('is-label', Boolean(labelled))
    root.classList.toggle('is-hover', Boolean(interactive) && !labelled)
    root.classList.toggle('is-hidden', Boolean(hidden))
    if (labelled) label.textContent = labelled.dataset.cursor ?? ''
  })

  document.addEventListener('pointerdown', () => root.classList.add('is-down'))
  document.addEventListener('pointerup', () => root.classList.remove('is-down'))
  document.documentElement.addEventListener('pointerleave', () => root.classList.remove('is-visible'))
  document.documentElement.addEventListener('pointerenter', () => shown && root.classList.add('is-visible'))
}

/** 磁吸：元素向指针偏移 strength 比例，离开时弹性回位 */
export function initMagnetic() {
  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach(el => {
    const strength = Number(el.dataset.magnetic) || 0.3
    el.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse') return
      const rect = el.getBoundingClientRect()
      gsap.to(el, {
        x: (event.clientX - rect.left - rect.width / 2) * strength,
        y: (event.clientY - rect.top - rect.height / 2) * strength,
        duration: 0.6,
        ease: 'power3.out',
        overwrite: 'auto',
      })
    })
    el.addEventListener('pointerleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1, 0.35)', overwrite: true })
    })
  })
}
