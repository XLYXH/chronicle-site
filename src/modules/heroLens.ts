import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { qs } from '../lib/env'
import { clamp } from '../lib/math'
import { mountGlass, type GlassMode } from './glass'

/**
 * 首屏的玻璃透镜：取代 v5 的液体球。
 * 一枚悬浮的厚玻璃透镜压在标题上：边缘弧面折射、中心放大、RGB 轻微色散，背后的点阵与标题被它“弯”过去。
 *  - 指针：带惯性地追随，移动越快沿运动方向拉得越长（液滴的形变）；触屏上点哪里就漂到哪里；
 *  - 滚动：透镜离开标题，漂到 “a fragment.” 上方，然后缩小并分裂成三颗小水珠，随后淡出；
 *  - 减少动态效果：透镜静止在标题上，随首屏一起滚走。
 */
export interface HeroLens {
  intro(v: number): void
}

const DROPS = [
  { dx: -0.95, dy: -0.35, s: 0.3 },
  { dx: 1.05, dy: 0.15, s: 0.22 },
  { dx: 0.2, dy: 0.95, s: 0.16 },
]

export function initHeroLens(animate: boolean, mode: GlassMode): HeroLens | null {
  const hero = qs('.hero')
  const spark = qs('.hero__title .spark')
  const word = qs('.fragment__word')
  const frag = qs('.fragment')
  if (!hero || !spark) return null

  const layer = document.createElement('div')
  layer.className = 'lens-layer'
  layer.setAttribute('aria-hidden', 'true')
  layer.innerHTML =
    '<div class="lens__caustic"></div><div class="lens lg"><i class="lens__spec"></i></div>' +
    DROPS.map(() => '<div class="lens lens--drop lg"><i class="lens__spec"></i></div>').join('')
  const lens = layer.querySelector<HTMLElement>('.lens:not(.lens--drop)')!
  const caustic = layer.querySelector<HTMLElement>('.lens__caustic')!
  const drops = Array.from(layer.querySelectorAll<HTMLElement>('.lens--drop'))
  if (animate) document.body.append(layer)
  else {
    layer.classList.add('is-static')
    hero.append(layer)
  }

  let D = 0
  const size = () => {
    const m = Math.min(innerWidth, innerHeight)
    const portrait = innerWidth < innerHeight
    D = Math.round(clamp(m * (portrait ? (innerWidth < 700 ? 0.5 : 0.36) : 0.4), 150, 400))
    layer.style.setProperty('--d', `${D}px`)
  }
  size()

  if (mode === 'refract') {
    const lensOpts = {
      bezel: (w: number) => w * 0.2,
      edge: (w: number) => w * 0.09,
      magnify: 0.16,
      dispersion: 0.035,
      radius: (w: number) => w / 2,
    }
    const g = mountGlass(lens, lensOpts)
    const dropGlass = drops.map(d => mountGlass(d, { ...lensOpts, magnify: 0.12, dispersion: 0 }))
    window.addEventListener('resize', () => {
      size()
      g.update()
      dropGlass.forEach(x => x.update())
    })
  } else {
    window.addEventListener('resize', size)
  }

  // 静止位置：横屏时与标题里的 ✳ 同心、略偏右；竖屏时悬在标题上方的留白里（滚动时才掠过标题）
  const edition = qs('.hero__edition') ?? spark
  const restView = () => {
    const r = spark.getBoundingClientRect()
    if (innerWidth < innerHeight) {
      const t = edition.getBoundingClientRect()
      return { x: innerWidth * 0.64, y: t.top - D * 0.46 }
    }
    return { x: r.left + r.width / 2 + D * 0.18, y: r.top + r.height / 2 }
  }
  const restPos = () => {
    const p = restView()
    if (animate) return p
    const h = hero.getBoundingClientRect()
    return { x: p.x - h.left, y: p.y - h.top }
  }

  const place = (n: HTMLElement, x: number, y: number, sx: number, sy: number, a: number, s = 1) => {
    n.style.transform = `translate(${(x - n.offsetWidth / 2).toFixed(1)}px, ${(y - n.offsetHeight / 2).toFixed(1)}px) rotate(${a.toFixed(3)}rad) scale(${(sx * s).toFixed(4)}, ${(sy * s).toFixed(4)}) rotate(${(-a).toFixed(3)}rad)`
  }

  // 背景的同心圆与点阵以透镜的静止位为圆心，让折射有东西可“弯”
  const stage = qs('.hero__stage')
  let lastStage = ''
  const syncStage = (_p?: unknown) => {
    if (!stage || scrollY > 4) return
    const p = restView()
    const x = Math.round(p.x)
    const y = Math.round(p.y)
    const k = `${x},${y}`
    if (k === lastStage) return
    lastStage = k
    stage.style.setProperty('--lx', `${x}px`)
    stage.style.setProperty('--ly', `${y}px`)
  }

  let introV = animate ? 0 : 1
  const api: HeroLens = {
    intro(v) {
      introV = v
      if (!animate) draw()
    },
  }

  // 减少动态：只在首屏内静态摆放
  const draw = () => {
    const p = restPos()
    syncStage(p)
    place(lens, p.x, p.y, 1, 1, 0)
    place(caustic, p.x + D * 0.16, p.y + D * 0.3, 1, 1, 0)
    drops.forEach(d => (d.style.opacity = '0'))
  }
  if (!animate) {
    draw()
    window.addEventListener('resize', draw)
    return api
  }

  // ---- 动态 ----
  const ptr = { x: 0, y: 0, on: false }
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches
  window.addEventListener(
    'pointermove',
    e => {
      if (e.pointerType !== 'mouse') return
      ptr.x = e.clientX
      ptr.y = e.clientY
      ptr.on = true
    },
    { passive: true },
  )
  document.documentElement.addEventListener('pointerleave', () => (ptr.on = false))
  // 触屏：轻点首屏空白处，透镜漂过去停下
  let parked: { x: number; y: number } | null = null
  hero.addEventListener('pointerup', e => {
    if (e.pointerType === 'mouse' || (e.target as Element).closest('a,button')) return
    parked = { x: e.clientX, y: e.clientY + scrollY }
  })

  let hide = false
  if (frag) {
    ScrollTrigger.create({
      trigger: frag,
      start: 'bottom 35%',
      end: 'max',
      onToggle: self => {
        hide = self.isActive
        layer.classList.toggle('is-gone', hide)
      },
    })
  }

  const pos = { x: 0, y: 0 }
  let first = true
  let stretch = 0
  let angle = 0
  const t0 = performance.now()
  const smooth = (t: number) => t * t * (3 - 2 * t)

  gsap.ticker.add((_t, dtMs) => {
    if (hide) return
    const dt = Math.min(0.05, dtMs / 1000)
    const t = (performance.now() - t0) / 1000
    const heroH = hero.offsetHeight
    const y0 = scrollY
    // 首屏内的目标：静止位 + 呼吸漂浮；鼠标在首屏时追随指针
    const rest = restPos()
    if (y0 < 4) syncStage(rest)
    let tx = rest.x + Math.sin(t * 0.55) * D * 0.03
    let ty = rest.y + Math.cos(t * 0.43) * D * 0.04
    if (fine && ptr.on && ptr.y > 96 && y0 < heroH * 0.5) {
      tx += (ptr.x - tx) * 0.88
      ty += (ptr.y - ty) * 0.88
    } else if (parked) {
      tx = parked.x
      ty = parked.y - y0
    }
    // 滚动：从首屏漂向 “a fragment.”
    let split = 0
    let shrink = 1
    if (word && frag) {
      const wr = word.getBoundingClientRect()
      const wx = wr.left + wr.width * 0.62
      const wy = wr.top + wr.height * 0.5
      const a = smooth(clamp(y0 / (heroH * 0.9)))
      tx += (wx - tx) * a
      ty += (wy - ty) * a
      const fr = frag.getBoundingClientRect()
      split = smooth(clamp((innerHeight * 0.5 - (fr.top + fr.height * 0.5)) / (fr.height * 0.24)))
      shrink = 1 - a * 0.18 - split * 0.5
    }
    if (first) {
      pos.x = tx
      pos.y = ty
      first = false
    }
    const k = 1 - Math.exp(-dt * 7)
    const dx = (tx - pos.x) * k
    const dy = (ty - pos.y) * k
    pos.x += dx
    pos.y += dy
    const speed = Math.hypot(dx, dy) / Math.max(dt, 0.001)
    stretch += (clamp(speed / 4200, 0, 0.13) - stretch) * (1 - Math.exp(-dt * 10))
    if (speed > 30) angle = Math.atan2(dy, dx)
    const intro = introV
    const sx = 1 + stretch
    const sy = 1 / (1 + stretch * 0.7)
    place(lens, pos.x, pos.y, sx, sy, angle, intro * shrink)
    place(caustic, pos.x + D * 0.16 * shrink, pos.y + D * 0.3 * shrink, sx, sy, angle, intro * shrink)
    lens.style.setProperty('--spec', String((angle / Math.PI) * 6 * stretch))
    drops.forEach((d, i) => {
      const c = DROPS[i]!
      const e = split
      const pop = clamp(e * 1.6 - i * 0.12)
      place(d, pos.x + c.dx * D * 0.62 * e, pos.y + c.dy * D * 0.5 * e, 1, 1, 0, (c.s / 0.3) * pop)
      d.style.opacity = pop > 0.01 ? '1' : '0'
    })
  })
  return api
}
