import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { qs, qsa } from '../lib/env'

/**
 * v7 的“手感”层：只做排版节奏与微交互，不新增任何文案。
 *  - 筛选：一颗墨色液滴在按钮间滑动（移动时被拉长、落定时回弹）
 *  - 信笺：随滚动逐词“写出”，落款下方一笔手写下划线
 */
export function initCraft(animate: boolean) {
  filterPill(animate)
  if (!animate) return
  const root = document.documentElement
  root.classList.add('has-craft')
  letter()
}

function filterPill(animate: boolean) {
  const bar = qs('.filters')
  if (!bar) return
  const pill = document.createElement('span')
  pill.className = 'filters__pill'
  pill.setAttribute('aria-hidden', 'true')
  bar.prepend(pill)
  bar.classList.add('has-pill')
  const buttons = qsa<HTMLButtonElement>('[data-filter]', bar)
  const target = () => buttons.find(b => b.getAttribute('aria-pressed') === 'true') ?? buttons[0]
  let shown = false
  const place = (instant: boolean) => {
    const b = target()
    if (!b) return
    const x = b.offsetLeft
    const y = b.offsetTop
    const w = b.offsetWidth
    if (instant || !animate || !shown) {
      gsap.set(pill, { x, y, width: w, height: b.offsetHeight, scaleY: 1 })
      shown = true
      return
    }
    const from = gsap.getProperty(pill, 'x') as number
    const dist = Math.abs(x - from)
    gsap.to(pill, { x, y, width: w, height: b.offsetHeight, duration: 0.7, ease: 'expo.out', overwrite: 'auto' })
    // 液滴感：移动途中竖向收紧，落定时轻轻回弹
    gsap.fromTo(pill, { scaleY: 1 }, { scaleY: Math.max(0.72, 1 - dist / 900), duration: 0.18, ease: 'power2.out', yoyo: true, repeat: 1, overwrite: false })
  }
  place(true)
  buttons.forEach(b => b.addEventListener('click', () => requestAnimationFrame(() => place(false))))
  new ResizeObserver(() => place(true)).observe(bar)
  document.fonts?.ready.then(() => place(true))
}

function letter() {
  const p = qs('.letter blockquote p')
  const fig = qs('.letter')
  if (!p || !fig) return
  // 逐词包裹（保留原文与空格，屏幕阅读器读到的仍是同一段文字）
  const words = (p.textContent ?? '').split(/(\s+)/)
  p.textContent = ''
  const spans: HTMLElement[] = []
  words.forEach(w => {
    if (/^\s+$/.test(w) || !w) return void p.append(w)
    const s = document.createElement('span')
    s.className = 'ink'
    s.textContent = w
    p.append(s)
    spans.push(s)
  })
  fig.classList.add('is-writing')
  let lit = 0
  const set = (n: number) => {
    if (n === lit) return
    const [a, b, on] = n > lit ? [lit, n, true] : [n, lit, false]
    for (let i = a; i < b; i++) spans[i]!.classList.toggle('is-on', on)
    lit = n
  }
  ScrollTrigger.create({
    trigger: p,
    start: 'top 82%',
    end: 'bottom 62%',
    onUpdate: self => set(Math.round(self.progress * spans.length)),
    onLeave: () => set(spans.length),
  })
  const close = qs('.letter__close')
  if (close) ScrollTrigger.create({ trigger: close, start: 'top 85%', once: true, onEnter: () => close.classList.add('is-signed') })
  // 键盘或查找跳到这里时直接显出全文
  fig.addEventListener('focusin', () => set(spans.length))
}
