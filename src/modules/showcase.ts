import { gsap } from 'gsap'
import { Flip } from 'gsap/Flip'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { qs, qsa } from '../lib/env'

gsap.registerPlugin(Flip)

/**
 * 作品展台：左侧（移动端在上方）是粘性的“舞台”，右侧是项目索引。
 * 悬停 / 聚焦 / 滚动到某个项目时，新的插图以一道“液体前沿”擦入——
 * 前沿是一条随进度起伏、带细碎锯齿的波浪 clip-path；同时整块舞台被位移滤镜扭一下。
 * 指针在舞台上移动时，按速度产生水波般的扭曲（feTurbulence + feDisplacementMap）。
 */
export function initShowcase(animate: boolean) {
  const stage = qs('[data-stage]')
  const items = qsa('.project')
  const wrap = qs('.projects')
  if (!stage || !wrap) return
  const panels = new Map(qsa('[data-panel]', stage).map(p => [p.dataset.panel!, p]))
  const num = qs('[data-stage-num]', stage)
  const disp = document.querySelector<SVGFEDisplacementMapElement>('#ripple feDisplacementMap')
  const turb = document.querySelector<SVGFETurbulenceElement>('#ripple feTurbulence')
  let active = items[0]?.dataset.key ?? 'blueprint'
  let wipe: gsap.core.Tween | null = null
  let hovering = false
  // 钴蓝“浪头”：走在新插图前面一点的液体层
  const wave = document.createElement('i')
  wave.className = 'showcase__wave'
  wave.setAttribute('aria-hidden', 'true')
  stage.append(wave)

  // ---- 位移滤镜：swap 时一次脉冲 + 指针速度驱动 ----
  const ripple = { amt: 0, pulse: 0 }
  let lastX = 0
  let lastY = 0
  let rafOn = false
  const applyRipple = () => {
    const a = ripple.amt + ripple.pulse
    const target = panels.get(active)
    if (!disp || !target) return
    if (a < 0.4) {
      panels.forEach(p => (p.style.filter = ''))
      return
    }
    disp.setAttribute('scale', a.toFixed(1))
    panels.forEach(p => (p.style.filter = p === target || p.classList.contains('is-leaving') ? 'url(#ripple)' : ''))
  }
  const loop = () => {
    ripple.amt *= 0.9
    applyRipple()
    if (ripple.amt + ripple.pulse > 0.4) requestAnimationFrame(loop)
    else rafOn = false
  }
  const kick = () => {
    if (!rafOn) {
      rafOn = true
      requestAnimationFrame(loop)
    }
  }
  if (animate) {
    stage.addEventListener('pointermove', e => {
      const v = Math.hypot(e.clientX - lastX, e.clientY - lastY)
      lastX = e.clientX
      lastY = e.clientY
      if (e.pointerType !== 'mouse') return
      ripple.amt = Math.min(26, ripple.amt + v * 0.35)
      turb?.setAttribute('baseFrequency', `${(0.008 + Math.min(v, 60) * 0.0002).toFixed(4)} 0.03`)
      kick()
    })
  }

  // ---- 液体前沿擦入 ----
  const front = (p: number, dir: 1 | -1, seed: number) => {
    // dir=1：从下往上涨；dir=-1：从上往下落
    const n = 28
    const amp = Math.sin(p * Math.PI) * 9
    const pts: string[] = []
    for (let i = 0; i <= n; i++) {
      const x = (i / n) * 100
      const wave = Math.sin(i * 0.55 + seed + p * 6) * amp + Math.sin(i * 1.9 + seed * 2) * amp * 0.25
      const jag = i % 2 ? amp * 0.18 : 0
      const base = dir === 1 ? 100 - p * 118 : p * 118
      pts.push(`${x.toFixed(2)}% ${Math.max(-10, Math.min(110, base + wave + jag)).toFixed(2)}%`)
    }
    return dir === 1 ? `polygon(${pts.join(',')},100% 110%,0% 110%)` : `polygon(0% -10%,100% -10%,${pts.reverse().join(',')})`
  }

  const activate = (key: string) => {
    if (key === active || !panels.has(key)) return
    const order = items.map(i => i.dataset.key)
    const dir: 1 | -1 = order.indexOf(key) > order.indexOf(active) ? 1 : -1
    const prev = panels.get(active)!
    const next = panels.get(key)!
    active = key
    items.forEach(i => i.classList.toggle('is-active', i.dataset.key === key))
    if (num) num.textContent = String(order.indexOf(key) + 1).padStart(2, '0')
    wipe?.progress(1)
    panels.forEach(p => p.classList.remove('is-active', 'is-leaving'))
    prev.classList.add('is-leaving')
    next.classList.add('is-active')
    if (!animate) {
      prev.classList.remove('is-leaving')
      next.style.clipPath = ''
      return
    }
    const st = { p: 0 }
    const seed = Math.random() * 10
    gsap.fromTo(qs('svg', next), { scale: 1.12, yPercent: dir * 6 }, { scale: 1, yPercent: 0, duration: 1.1, ease: 'expo.out' })
    gsap.fromTo(qs('.project__cover', next), { yPercent: 100 * dir, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.9, ease: 'expo.out', delay: 0.15 })
    gsap.to(qs('svg', prev), { scale: 0.94, opacity: 0.4, duration: 0.8, ease: 'expo.out' })
    ripple.pulse = 0
    gsap.fromTo(ripple, { pulse: 0 }, { pulse: 34, duration: 0.35, ease: 'power2.out', yoyo: true, repeat: 1, onUpdate: applyRipple, onComplete: applyRipple })
    kick()
    wipe = gsap.to(st, {
      p: 1,
      duration: 0.95,
      ease: 'power3.inOut',
      onUpdate: () => {
        next.style.clipPath = front(Math.max(0, st.p * 1.12 - 0.12), dir, seed)
        wave.style.clipPath = front(Math.min(1, st.p * 1.12), dir, seed + 1.3)
        wave.style.opacity = String(Math.min(1, (1 - st.p) * 4))
      },
      onComplete: () => {
        next.style.clipPath = ''
        wave.style.opacity = '0'
        prev.classList.remove('is-leaving')
        gsap.set(qs('svg', prev), { scale: 1, opacity: 1 })
      },
    })
  }

  items.forEach(it => {
    const key = it.dataset.key!
    it.addEventListener('pointerenter', e => {
      if (e.pointerType === 'mouse') {
        hovering = true
        activate(key)
      }
    })
    it.addEventListener('pointerleave', () => (hovering = false))
    it.addEventListener('focusin', () => activate(key))
    // 滚动同步：项目经过视口中线时切换（悬停时不打断）
    ScrollTrigger.create({
      trigger: it,
      start: 'top 58%',
      end: 'bottom 58%',
      onToggle: self => self.isActive && !hovering && !it.hidden && activate(key),
    })
  })

  // 点舞台 = 打开当前项目
  stage.addEventListener('click', () => {
    const link = items.find(i => i.dataset.key === active)?.querySelector<HTMLAnchorElement>('h3 a')
    if (link) window.open(link.href, '_blank', 'noopener')
  })

  // 筛选
  const buttons = qsa<HTMLButtonElement>('[data-filter]')
  buttons.forEach(b =>
    b.addEventListener('click', () => {
      const f = b.dataset.filter
      buttons.forEach(x => x.setAttribute('aria-pressed', String(x === b)))
      gsap.killTweensOf(items)
      gsap.set(items, { opacity: 1, y: 0 })
      const state = animate ? Flip.getState(items) : null
      items.forEach(c => (c.hidden = f !== 'all' && c.dataset.cat !== f))
      const first = items.find(i => !i.hidden)
      if (first && (f !== 'all' || items.find(i => i.dataset.key === active)?.hidden)) activate(first.dataset.key!)
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
