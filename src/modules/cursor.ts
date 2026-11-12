import { gsap } from 'gsap'
import { qs } from '../lib/env'

/**
 * 准星光标：方框跟随指针；悬停在链接或按钮上时，方框吸附并包住目标元素，
 * 显示动作标签（外链为 OPEN ↗）。只在精确指针且未减少动态时启用。
 */
export function initReticle() {
  const root = qs('.reticle')
  const box = root ? qs('.reticle__box', root) : null
  const dot = root ? qs('.reticle__dot', root) : null
  const label = root ? qs('.reticle__label', root) : null
  if (!root || !box || !dot || !label) return
  document.documentElement.classList.add('has-reticle')

  const pos = { x: innerWidth / 2, y: innerHeight / 2 }
  const cur = { x: pos.x, y: pos.y, w: 18, h: 18 }
  let target: HTMLElement | null = null

  window.addEventListener(
    'pointermove',
    e => {
      if (e.pointerType !== 'mouse') return
      pos.x = e.clientX
      pos.y = e.clientY
      gsap.set(dot, { x: pos.x, y: pos.y })
    },
    { passive: true },
  )
  window.addEventListener('pointerdown', () => root.classList.add('is-down'))
  window.addEventListener('pointerup', () => root.classList.remove('is-down'))
  document.addEventListener('mouseleave', () => gsap.to(root, { opacity: 0, duration: 0.2 }))
  document.addEventListener('mouseenter', () => gsap.to(root, { opacity: 1, duration: 0.2 }))

  document.addEventListener('pointerover', e => {
    const el = (e.target as Element).closest<HTMLElement>('a, button, [data-glitch]')
    if (el === target) return
    target = el
    root.classList.toggle('is-snap', !!el)
    let text = ''
    if (el?.matches('a[target="_blank"]')) text = 'OPEN ↗'
    else if (el?.matches('a[href^="#"]')) text = 'GOTO'
    else if (el?.matches('button')) text = 'EXEC'
    label.textContent = text
  })

  gsap.ticker.add((_t, dt) => {
    const k = 1 - Math.exp(-(dt / 1000) * 18)
    let tx = pos.x
    let ty = pos.y
    let tw = 18
    let th = 18
    if (target && target.isConnected) {
      const r = target.getBoundingClientRect()
      // 大块元素（例如整行项目）只吸附一部分，避免方框过大
      if (r.width < 420 && r.height < 160) {
        tx = r.left + r.width / 2 + (pos.x - (r.left + r.width / 2)) * 0.08
        ty = r.top + r.height / 2 + (pos.y - (r.top + r.height / 2)) * 0.08
        tw = r.width + 14
        th = r.height + 10
      } else {
        tw = 34
        th = 34
      }
    }
    cur.x += (tx - cur.x) * k
    cur.y += (ty - cur.y) * k
    cur.w += (tw - cur.w) * k
    cur.h += (th - cur.h) * k
    box.style.transform = `translate(${cur.x - cur.w / 2}px, ${cur.y - cur.h / 2}px)`
    box.style.width = `${cur.w}px`
    box.style.height = `${cur.h}px`
    label.style.transform = `translate(${cur.x + cur.w / 2 + 8}px, ${cur.y - cur.h / 2 - 4}px)`
  })
}
