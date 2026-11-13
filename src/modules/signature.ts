import { gsap } from 'gsap'
import { qs } from '../lib/env'

/**
 * v8 · 变形光标：靠近按钮 / 导航 / 筛选等实体控件时，光标化成一片贴合控件形状的玻璃框。
 * （v11 起移除了同一模块里的字重场、墨滴与景深展台：叠加太多，显得刻意。）
 */
export function initSignature(animate: boolean, fine: boolean) {
  if (!animate || !fine) return
  morphCursor()
}

/* ---------- 1. 变形光标 ---------- */
const SOLID =
  '.nav a, .filters button, .theme, .menu-btn, .totop, .pill, .chip, .dial, .brand, .footer__links a, .interest button, .connect__bottom .link, .hero__cta .link'

function morphCursor() {
  const cur = qs('.cursor')
  if (!cur) return
  // 放在 body 下：.cursor 自身被 transform 跟随指针，会成为 fixed 子元素的包含块
  const frame = document.createElement('i')
  frame.className = 'cursor__frame'
  frame.setAttribute('aria-hidden', 'true')
  document.body.append(frame)
  let target: HTMLElement | null = null
  let px = 0
  let py = 0
  const st = { x: 0, y: 0, w: 0, h: 0, r: 0 }
  let running = false
  const tick = () => {
    if (!target) return
    const b = target.getBoundingClientRect()
    const cs = getComputedStyle(target)
    const pad = 6
    const cx = b.left + b.width / 2
    const cy = b.top + b.height / 2
    // 框跟着控件走（磁吸会移动控件），并向指针偏一点点，像被手指按住的玻璃
    const tx = cx + (px - cx) * 0.14
    const ty = cy + (py - cy) * 0.14
    const k = 0.32
    st.x += (tx - st.x) * k
    st.y += (ty - st.y) * k
    st.w += (b.width + pad * 2 - st.w) * k
    st.h += (b.height + pad * 2 - st.h) * k
    const rr = parseFloat(cs.borderTopLeftRadius) || 12
    st.r += (Math.min(rr + pad, st.h / 2) - st.r) * k
    frame.style.transform = `translate(${(st.x - st.w / 2).toFixed(1)}px, ${(st.y - st.h / 2).toFixed(1)}px)`
    frame.style.width = `${st.w.toFixed(1)}px`
    frame.style.height = `${st.h.toFixed(1)}px`
    frame.style.borderRadius = `${st.r.toFixed(1)}px`
  }
  const start = () => {
    if (running) return
    running = true
    gsap.ticker.add(tick)
  }
  const stop = () => {
    running = false
    gsap.ticker.remove(tick)
  }
  window.addEventListener(
    'pointermove',
    e => {
      px = e.clientX
      py = e.clientY
    },
    { passive: true },
  )
  document.addEventListener('pointerover', e => {
    if ((e as PointerEvent).pointerType !== 'mouse') return
    const t = (e.target as Element).closest<HTMLElement>(SOLID)
    if (!t || t === target) return
    const fromNone = !target
    target = t
    if (fromNone) {
      // 从光标点处“长”出来，而不是从上一个控件飞过来
      st.x = px
      st.y = py
      st.w = 10
      st.h = 10
      st.r = 5
    }
    cur.classList.add('is-framed')
    frame.classList.add('is-on')
    start()
  })
  document.addEventListener('pointerout', e => {
    if (!target) return
    const to = (e.relatedTarget as Element | null)?.closest<HTMLElement>(SOLID)
    if (to === target) return
    if (!to) {
      target = null
      cur.classList.remove('is-framed')
      frame.classList.remove('is-on')
      stop()
    }
  })
  addEventListener(
    'scroll',
    () => {
      if (!target || target.matches(':hover')) return
      target = null
      cur.classList.remove('is-framed')
      frame.classList.remove('is-on')
      stop()
    },
    { passive: true },
  )
}
