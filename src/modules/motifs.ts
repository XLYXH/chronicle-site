import { gsap } from 'gsap'
import { qs, qsa } from '../lib/env'
import { setJumpTransition } from './smoothScroll'

/**
 * v9 · 取自 JIEJOE（B 站「JIEJOE_轻敲代码」）开源教程的几种手法，按本站的瓷白 / 墨色 / 钴蓝玻璃语言重写：
 *  - 019 斩切开屏：一道钴蓝刃光斜切过墨色幕布，幕布沿切口上下分离
 *  - 006 页面跳转动画 + 020 百叶窗：远距离跳转时，按指数递增高度的百叶片合上 → 瞬移 → 再打开
 *  - 016 SVG 波浪线条：联系区背后一片竖向细线，被指针速度“拨动”，弹簧回位
 *  - 011-03 SVG 描边按钮：按钮边缘一段光沿着轮廓追逐描边
 * 都不新增文案；减少动态效果时全部关闭（开屏幕布也不会出现）。
 */
export function initMotifs(animate: boolean, fine: boolean) {
  slashIntro(animate)
  if (!animate) return
  blinds()
  waves(fine)
  strokeButtons()
}

/* ---------- 019 斩切开屏 ---------- */
function slashIntro(animate: boolean) {
  const root = document.documentElement
  const el = qs('.slash')
  if (!el) return
  if (!animate || !root.classList.contains('has-slash')) return void el.remove()
  const up = qs('.slash__up', el)!
  const down = qs('.slash__down', el)!
  const blade = qs('.slash__blade', el)!
  // 切口：从左下到右上的一条斜线；p 为刃光走过的比例
  const st = { p: 0, open: 0 }
  const draw = () => {
    const W = innerWidth
    const H = innerHeight
    // 切线两端（略超出屏幕）
    const x0 = -0.05 * W
    const y0 = 0.78 * H
    const x1 = 1.05 * W
    const y1 = 0.22 * H
    const cx = x0 + (x1 - x0) * st.p
    const cy = y0 + (y1 - y0) * st.p
    blade.style.transform = `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px) rotate(${((Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI).toFixed(2)}deg)`
    blade.style.opacity = String(Math.min(1, st.p * 6) * (1 - st.open))
    // 切口画过的地方幕布才分开：上片沿法线向上，下片向下
    const gap = st.open * H * 0.75
    const nx = (y1 - y0) / Math.hypot(x1 - x0, y1 - y0)
    const ny = -(x1 - x0) / Math.hypot(x1 - x0, y1 - y0)
    up.style.transform = `translate(${(-nx * gap).toFixed(1)}px, ${(ny * gap).toFixed(1)}px)`
    down.style.transform = `translate(${(nx * gap).toFixed(1)}px, ${(-ny * gap).toFixed(1)}px)`
    const pct = (x: number, y: number) => `${((x / W) * 100).toFixed(2)}% ${((y / H) * 100).toFixed(2)}%`
    up.style.clipPath = `polygon(-10% -10%, 110% -10%, ${pct(x1, y1)}, ${pct(x0, y0)})`
    down.style.clipPath = `polygon(${pct(x0, y0)}, ${pct(x1, y1)}, 110% 110%, -10% 110%)`
    el.style.setProperty('--cut', String(st.p))
  }
  draw()
  const done = () => {
    el.remove()
    root.classList.remove('has-slash')
    try {
      sessionStorage.setItem('slash', '1')
    } catch {
      /* 忽略 */
    }
  }
  gsap
    .timeline({ onUpdate: draw, onComplete: done, delay: 0.15 })
    .to(st, { p: 1, duration: 0.42, ease: 'power4.inOut' })
    .to(st, { open: 1, duration: 0.85, ease: 'expo.inOut' }, '-=0.05')
  // 任何点击 / 按键都可以跳过
  const skip = () => gsap.getTweensOf(st).forEach(t => t.progress(1))
  addEventListener('keydown', skip, { once: true })
  el.addEventListener('pointerdown', skip, { once: true })
}

/* ---------- 006 跳转动画 × 020 百叶窗 ---------- */
function blinds() {
  const N = 7
  const wrap = document.createElement('div')
  wrap.className = 'blinds'
  wrap.setAttribute('aria-hidden', 'true')
  // 百叶片高度按 2^i 递增（020 的做法），越往下越宽，合上时像一扇被拉下的帘
  const weights = Array.from({ length: N }, (_, i) => Math.pow(1.55, i))
  const sum = weights.reduce((a, b) => a + b, 0)
  const slats = weights.map(w => {
    const s = document.createElement('i')
    s.style.height = `${((w / sum) * 100).toFixed(3)}%`
    wrap.append(s)
    return s
  })
  document.body.append(wrap)
  let busy = false
  setJumpTransition((distance, jump) => {
    if (busy || distance < innerHeight * 1.6) return false
    busy = true
    wrap.classList.add('is-on')
    const tl = gsap.timeline({
      onComplete: () => {
        wrap.classList.remove('is-on')
        busy = false
      },
    })
    tl.fromTo(slats, { scaleY: 0, transformOrigin: '50% 0%' }, { scaleY: 1.02, duration: 0.42, ease: 'power3.in', stagger: 0.035 })
    tl.add(jump)
    tl.to(
      slats,
      {
        scaleY: 0,
        transformOrigin: '50% 100%',
        duration: 0.55,
        ease: 'expo.out',
        stagger: { each: 0.04, from: 'end' },
      },
      '+=0.06',
    )
    return true
  })
}

/* ---------- 016 SVG 波浪线条 ---------- */
function waves(fine: boolean) {
  const host = qs('.connect')
  if (!host) return
  const box = document.createElement('div')
  box.className = 'waves'
  box.setAttribute('aria-hidden', 'true')
  const NS = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(NS, 'svg')
  box.append(svg)
  host.prepend(box)
  type P = {
    x: number
    y: number
    cx: number
    cy: number
    vx: number
    vy: number
  }
  let lines: P[][] = []
  let paths: SVGPathElement[] = []
  let W = 0
  let H = 0
  const mouse = {
    x: -9999,
    y: -9999,
    lx: 0,
    ly: 0,
    sx: -9999,
    sy: -9999,
    vs: 0,
    a: 0,
    set: false,
  }
  const build = () => {
    const r = box.getBoundingClientRect()
    W = r.width
    H = r.height
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
    paths.forEach(p => p.remove())
    const xGap = W < 700 ? 22 : 12
    const yGap = 34
    const cols = Math.ceil(W / xGap) + 1
    const rows = Math.ceil(H / yGap) + 1
    lines = []
    paths = []
    for (let i = 0; i < cols; i++) {
      const pts: P[] = []
      for (let j = 0; j < rows; j++) pts.push({ x: i * xGap, y: j * yGap, cx: 0, cy: 0, vx: 0, vy: 0 })
      lines.push(pts)
      const path = document.createElementNS(NS, 'path')
      svg.append(path)
      paths.push(path)
    }
    draw()
  }
  const draw = () => {
    lines.forEach((pts, li) => {
      let d = ''
      pts.forEach((p, i) => {
        const last = i === pts.length - 1
        const x = p.x + (last ? 0 : p.cx)
        const y = p.y + (last ? 0 : p.cy)
        d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
      })
      paths[li]!.setAttribute('d', d)
    })
  }
  let raf = 0
  let visible = false
  let idle = 0
  const tick = () => {
    mouse.sx += (mouse.x - mouse.sx) * 0.1
    mouse.sy += (mouse.y - mouse.sy) * 0.1
    const dx = mouse.x - mouse.lx
    const dy = mouse.y - mouse.ly
    const d = Math.hypot(dx, dy)
    mouse.vs += (d - mouse.vs) * 0.1
    mouse.vs = Math.min(100, mouse.vs)
    mouse.lx = mouse.x
    mouse.ly = mouse.y
    if (d > 0.1) mouse.a = Math.atan2(dy, dx)
    let energy = 0
    const l = Math.max(175, mouse.vs)
    for (const pts of lines) {
      for (const p of pts) {
        const dist = Math.hypot(p.x - mouse.sx, p.y - mouse.sy)
        if (dist < l) {
          const f = 1 - dist / l
          p.vx += Math.cos(mouse.a) * f * mouse.vs * 0.08
          p.vy += Math.sin(mouse.a) * f * mouse.vs * 0.08
        }
        p.vx += -p.cx * 0.005
        p.vy += -p.cy * 0.005
        p.vx *= 0.925
        p.vy *= 0.925
        p.cx = Math.max(-100, Math.min(100, p.cx + p.vx * 2))
        p.cy = Math.max(-100, Math.min(100, p.cy + p.vy * 2))
        energy += Math.abs(p.vx) + Math.abs(p.vy) + Math.abs(p.cx) * 0.02
      }
    }
    draw()
    // 静止下来就停表，直到下一次指针移动
    idle = energy < 0.5 && mouse.vs < 0.2 ? idle + 1 : 0
    raf = visible && idle < 30 ? requestAnimationFrame(tick) : 0
  }
  const wake = () => {
    if (!raf && visible) raf = requestAnimationFrame(tick)
  }
  const move = (cx: number, cy: number) => {
    const r = box.getBoundingClientRect()
    mouse.x = cx - r.left
    mouse.y = cy - r.top
    if (!mouse.set) {
      mouse.set = true
      mouse.sx = mouse.lx = mouse.x
      mouse.sy = mouse.ly = mouse.y
    }
    idle = 0
    wake()
  }
  host.addEventListener('pointermove', e => move(e.clientX, e.clientY), {
    passive: true,
  })
  if (!fine) host.addEventListener('touchmove', e => e.touches[0] && move(e.touches[0].clientX, e.touches[0].clientY), { passive: true })
  new IntersectionObserver(([en]) => {
    visible = !!en?.isIntersecting
    if (visible && !lines.length) build()
    if (visible) wake()
  }).observe(box)
  let t = 0
  new ResizeObserver(() => {
    clearTimeout(t)
    t = window.setTimeout(() => lines.length && build(), 150)
  }).observe(box)
}

/* ---------- 011-03 SVG 描边按钮 ---------- */
function strokeButtons() {
  const NS = 'http://www.w3.org/2000/svg'
  qsa('.pill, .connect__bottom .link, .chip').forEach(b => {
    const svg = document.createElementNS(NS, 'svg')
    svg.setAttribute('class', 'trace')
    svg.setAttribute('aria-hidden', 'true')
    const rect = document.createElementNS(NS, 'rect')
    rect.setAttribute('pathLength', '100')
    svg.append(rect)
    b.append(svg)
    const fit = () => {
      const w = b.offsetWidth
      const h = b.offsetHeight
      const r = Math.min(h / 2, parseFloat(getComputedStyle(b).borderTopLeftRadius) || h / 2)
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
      rect.setAttribute('x', '1')
      rect.setAttribute('y', '1')
      rect.setAttribute('width', String(Math.max(0, w - 2)))
      rect.setAttribute('height', String(Math.max(0, h - 2)))
      rect.setAttribute('rx', String(Math.max(0, r - 1)))
    }
    fit()
    new ResizeObserver(fit).observe(b)
  })
}
