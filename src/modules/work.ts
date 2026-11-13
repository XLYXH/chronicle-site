import { gsap } from 'gsap'
import { Flip } from 'gsap/Flip'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { qs, qsa } from '../lib/env'

gsap.registerPlugin(Flip)
const NS = 'http://www.w3.org/2000/svg'
const svgEl = (tag: string, attrs: Record<string, string | number>) => {
  const e = document.createElementNS(NS, tag)
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v))
  return e
}

/** 作品筛选：按钮 aria-pressed，卡片用 FLIP 重新排布 */
export function initFilter(animate: boolean) {
  const buttons = qsa<HTMLButtonElement>('[data-filter]')
  const cards = qsa('.project')
  const wrap = qs('.projects')
  if (!wrap) return
  buttons.forEach(b =>
    b.addEventListener('click', () => {
      const f = b.dataset.filter
      buttons.forEach(x => x.setAttribute('aria-pressed', String(x === b)))
      // 卡片可能还没滚动揭示过：先完成揭示再记录 FLIP 状态
      gsap.killTweensOf(cards)
      gsap.set(cards, { opacity: 1, y: 0 })
      const state = animate ? Flip.getState(cards) : null
      cards.forEach(c => (c.hidden = f !== 'all' && c.dataset.cat !== f))
      wrap.classList.toggle('is-single', f !== 'all')
      // 页面高度变了，刷新滚动触发点
      requestAnimationFrame(() => ScrollTrigger.refresh())
      if (state)
        Flip.from(state, {
          duration: 0.8,
          ease: 'expo.inOut',
          absolute: true,
          onEnter: els => gsap.fromTo(els, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.7, ease: 'expo.out', overwrite: true }),
          onLeave: els => gsap.to(els, { opacity: 0, duration: 0.3 }),
        })
    }),
  )
}

/** 每个项目的插图都是小小的可交互概念图，呼应原仓库里的交互预览 */
export function initArt(animate: boolean) {
  blueprint(animate)
  monitor(animate)
  proxy(animate)
}

function local(e: PointerEvent, el: Element) {
  const r = el.getBoundingClientRect()
  return { x: ((e.clientX - r.left) / r.width) * 600, y: ((e.clientY - r.top) / r.height) * 340 }
}

/** Blueprint：中间的 TRANSFORM 节点跟随指针，连线随之弯曲 */
function blueprint(animate: boolean) {
  const art = qs('[data-art="blueprint"]')
  const svg = art && qs<SVGSVGElement>('svg', art)
  if (!art || !svg) return
  const grid = qs('.bp-grid', svg)!
  for (let x = 30; x < 600; x += 30) for (let y = 20; y < 340; y += 30) grid.append(svgEl('circle', { cx: x, cy: y, r: 1 }))
  const mid = qs('.bp-node--mid', svg)!
  const wires = qsa<SVGPathElement>('.bp-wire', svg)
  const p = { x: 300, y: 230 }
  const draw = () => {
    const d = `M150 110 C${(150 + p.x) / 2 + 30} 110 ${p.x - 100} ${p.y} ${p.x - 54} ${p.y} M${p.x + 54} ${p.y} C${p.x + 110} ${p.y} ${(p.x + 450) / 2 - 20} 90 450 90`
    wires.forEach(w => w.setAttribute('d', d))
    mid.setAttribute('transform', `translate(${p.x} ${p.y})`)
  }
  draw()
  if (!animate) return
  const to = (x: number, y: number) => gsap.to(p, { x, y, duration: 0.9, ease: 'expo.out', onUpdate: draw, overwrite: true })
  art.addEventListener('pointermove', e => {
    const l = local(e, art)
    to(Math.min(520, Math.max(110, l.x)), Math.min(290, Math.max(60, l.y)))
  })
  art.addEventListener('pointerleave', () => to(300, 230))
}

/** Monitor：芯片发出遥测波形，指针越靠近，信号增益越大 */
function monitor(animate: boolean) {
  const art = qs('[data-art="monitor"]')
  const svg = art && qs<SVGSVGElement>('svg', art)
  if (!art || !svg) return
  const pins = qs('.mo-pins', svg)!
  for (let i = 0; i < 5; i++) {
    const o = 134 + i * 18
    pins.append(svgEl('path', { d: `M${o} 120v-12M${o} 220v12M250 ${o - 0}h-12M350 ${o}h12` }))
  }
  const wave = qs<SVGPathElement>('.mo-wave', svg)!
  const s = { gain: 0.35, target: 0.35, t: 0 }
  const draw = () => {
    let d = ''
    for (let x = 40; x <= 560; x += 6) {
      const k = Math.abs(x - 300) < 58 ? 0 : 1
      const env = Math.exp(-Math.pow((x - 300) / 210, 2))
      const y = 170 + k * Math.sin(x * 0.06 - s.t * 3) * Math.sin(x * 0.013 + s.t) * 56 * s.gain * env
      d += `${x === 40 ? 'M' : 'L'}${x} ${y.toFixed(1)}`
    }
    wave.setAttribute('d', d)
  }
  draw()
  if (!animate) return
  let raf = 0
  let on = false
  const tick = () => {
    s.t += 1 / 60
    s.gain += (s.target - s.gain) * 0.08
    draw()
    if (on) raf = requestAnimationFrame(tick)
  }
  new IntersectionObserver(([en]) => {
    on = !!en?.isIntersecting
    cancelAnimationFrame(raf)
    if (on) raf = requestAnimationFrame(tick)
  }).observe(art)
  art.addEventListener('pointermove', e => {
    const l = local(e, art)
    s.target = 0.35 + 0.85 * Math.max(0, 1 - Math.hypot(l.x - 300, l.y - 170) / 300)
  })
  art.addEventListener('pointerleave', () => (s.target = 0.35))
}

/** Proxy：请求像小光点一样经过边缘节点，悬停时流量加快 */
function proxy(animate: boolean) {
  const art = qs('[data-art="proxy"]')
  const svg = art && qs<SVGSVGElement>('svg', art)
  if (!art || !svg) return
  const path = qs<SVGPathElement>('.px-path', svg)!
  const group = qs('.px-packets', svg)!
  const len = path.getTotalLength()
  const dots = Array.from({ length: 6 }, () => {
    const c = svgEl('circle', { r: 5 })
    group.append(c)
    return c
  })
  const s = { speed: 0.08, target: 0.08, t: 0 }
  const draw = () => {
    dots.forEach((c, i) => {
      const u = (s.t + i / dots.length) % 1
      const pt = path.getPointAtLength(u * len)
      c.setAttribute('cx', pt.x.toFixed(1))
      c.setAttribute('cy', pt.y.toFixed(1))
      c.setAttribute('opacity', String(Math.sin(u * Math.PI)))
    })
  }
  draw()
  if (!animate) return
  let raf = 0
  let on = false
  const tick = () => {
    s.speed += (s.target - s.speed) * 0.05
    s.t += s.speed / 60
    draw()
    if (on) raf = requestAnimationFrame(tick)
  }
  new IntersectionObserver(([en]) => {
    on = !!en?.isIntersecting
    cancelAnimationFrame(raf)
    if (on) raf = requestAnimationFrame(tick)
  }).observe(art)
  art.addEventListener('pointerenter', () => (s.target = 0.32))
  art.addEventListener('pointerleave', () => (s.target = 0.08))
}
