import { gsap } from 'gsap'
import { Flip } from 'gsap/Flip'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { qs, qsa } from '../lib/env'
import { jumpBy, resyncScroll } from './smoothScroll'

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

  const total = qs('[data-stage-total]', stage)
  const setNum = (key: string) => {
    const vis = items.filter(i => !i.hidden).map(i => i.dataset.key)
    if (num) num.textContent = String(Math.max(0, vis.indexOf(key)) + 1).padStart(2, '0')
  }
  // 舞台左上的玻璃签显示当前项目的类别（取自项目自己的 meta，不新增文案）
  const hint = qs('.showcase__hint', stage)
  const label = (key: string) => items.find(i => i.dataset.key === key)?.querySelector('.project__meta span')?.textContent ?? ''
  const setHint = (key: string) => {
    stage.dataset.active = key
    if (!hint) return
    const text = label(key)
    if (!animate || !hint.textContent) return void (hint.textContent = text)
    gsap.to(hint, {
      yPercent: -40,
      opacity: 0,
      duration: 0.18,
      ease: 'power2.in',
      overwrite: true,
      onComplete: () => {
        hint.textContent = text
        gsap.fromTo(hint, { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: 'expo.out' })
      },
    })
  }
  if (hint) hint.textContent = label(active)
  stage.dataset.active = active
  const activate = (key: string, force = false) => {
    if (!panels.has(key)) return
    if (key === active) {
      if (force) setNum(key)
      return
    }
    const order = items.map(i => i.dataset.key)
    const dir: 1 | -1 = order.indexOf(key) > order.indexOf(active) ? 1 : -1
    const prev = panels.get(active)!
    const next = panels.get(key)!
    active = key
    items.forEach(i => i.classList.toggle('is-active', i.dataset.key === key))
    setNum(key)
    setHint(key)
    wipe?.progress(1)
    // 上一次切换遗留的插图补间必须清掉，否则被打断的那张会停在 0.4 透明度 / 0.94 缩放
    panels.forEach(p => {
      const g = qs('svg', p)
      const c = qs('.project__cover', p)
      gsap.killTweensOf([g, c])
      if (p !== next) gsap.set([g, c], { clearProps: 'transform,opacity' })
    })
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
    gsap.fromTo(qs('svg', next), { scale: 1.12, yPercent: dir * 6, opacity: 1 }, { scale: 1, yPercent: 0, duration: 1.1, ease: 'expo.out' })
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
        gsap.killTweensOf(qs('svg', prev))
        gsap.set(qs('svg', prev), { clearProps: 'transform,opacity' })
      },
    })
  }

  // 移动端舞台吸顶时，上方留出的缝隙用纸色遮住，免得列表文字从页眉和舞台之间漏出来
  ScrollTrigger.create({ trigger: stage, start: 'top 73px', endTrigger: wrap, end: 'bottom 73px', toggleClass: 'is-stuck' })

  // ---- 滚动同步 ----
  // 不再给每个项目各建一个 onToggle 触发器（筛选改变布局后它们的区间会失效，且只在“跨线”时触发，
  // 停在区间内时永远不会补同步）。改为：整张列表一个触发器，每次更新都按“58% 读线”实时求出当前项。
  const visible = () => items.filter(i => !i.hidden)
  const atLine = () => {
    const vis = visible()
    if (!vis.length) return null
    const line = innerHeight * 0.58
    let pick = vis[0]!
    for (const it of vis) {
      const r = it.getBoundingClientRect()
      if (r.top <= line) pick = it
      else break
    }
    return pick
  }
  let busy = false
  const sync = () => {
    if (busy || hovering) return
    const it = atLine()
    if (it) activate(it.dataset.key!)
  }
  // 一旦开始滚动，滚动就重新接管（悬停只在指针真正移动时生效）
  const onScroll = () => {
    hovering = false
    sync()
  }
  ScrollTrigger.create({ trigger: wrap, start: 'top 58%', end: 'bottom 58%', onUpdate: onScroll, onToggle: onScroll, onRefresh: sync })

  items.forEach(it => {
    const key = it.dataset.key!
    // 只认真实的指针移动：滚动时内容从静止的光标下滑过，浏览器也会派发 pointerenter，
    // 那种“假悬停”曾让舞台锁死在光标下的项目、不再跟随滚动
    it.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse' || busy || (!e.movementX && !e.movementY)) return
      hovering = true
      activate(key)
    })
    it.addEventListener('pointerleave', () => (hovering = false))
    it.addEventListener('focusin', () => activate(key))
  })

  // 点舞台 = 打开当前项目
  stage.addEventListener('click', () => {
    const link = items.find(i => i.dataset.key === active)?.querySelector<HTMLAnchorElement>('h3 a')
    if (link) window.open(link.href, '_blank', 'noopener')
  })

  // ---- 筛选 ----
  // 顺序：旧项淡出 → 一次性切换 hidden（布局只变这一次）→ 以筛选栏为锚补偿滚动 → 夹取当前项并同步舞台
  // → 留下的项用 Flip（非 absolute，不脱离文档流）滑到新位置、新项依次升入 → 布局稳定后再 refresh。
  const buttons = qsa<HTMLButtonElement>('[data-filter]')
  const bar = qs('.filters')
  let current = 'all'
  let seq: gsap.core.Timeline | null = null
  const settle = () => {
    gsap.set(items, { clearProps: 'transform,opacity' })
    busy = false
    seq = null
    resyncScroll()
    ScrollTrigger.refresh()
    sync()
  }
  const apply = (f: string) => {
    if (f === current) return
    current = f
    buttons.forEach(x => x.setAttribute('aria-pressed', String(x.dataset.filter === f)))
    // 连点：把上一轮（可能已从“淡出”接力到“滑入”）一路快进到底，再开始新一轮
    for (let guard = 0; seq && guard < 4; guard++) {
      const s0 = seq
      s0.progress(1)
      if (seq === s0) {
        s0.kill()
        seq = null
      }
    }
    gsap.killTweensOf(items)
    gsap.set(items, { opacity: 1, y: 0 })
    busy = true
    hovering = false
    const match = (i: HTMLElement) => f === 'all' || i.dataset.cat === f
    const leaving = items.filter(i => !i.hidden && !match(i))
    const swap = () => {
      const anchor = bar?.getBoundingClientRect().top ?? 0
      const stay = items.filter(i => !i.hidden && match(i))
      const state = animate && stay.length ? Flip.getState(stay) : null
      const entering = items.filter(i => i.hidden && match(i))
      items.forEach(c => (c.hidden = !match(c)))
      gsap.set(leaving, { clearProps: 'opacity,transform' })
      // 列表变短时浏览器会夹取滚动位置：把筛选栏拉回原来的视口位置，并让 Lenis 认这个新位置
      const drift = (bar?.getBoundingClientRect().top ?? 0) - anchor
      if (Math.abs(drift) > 1) jumpBy(drift)
      else resyncScroll()
      // 夹取：当前项若被筛掉（或不在读线上），立刻换成读线处的可见项
      const vis = visible()
      if (total) total.textContent = String(vis.length).padStart(2, '0')
      const pick = atLine() ?? vis[0]
      if (pick) activate(pick.dataset.key!, true)
      if (!animate) return settle()
      seq = gsap.timeline({ onComplete: settle })
      if (state) seq.add(Flip.from(state, { duration: 0.7, ease: 'expo.inOut' }), 0)
      if (entering.length)
        seq.fromTo(entering, { opacity: 0, y: 48 }, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.07 }, state ? 0.18 : 0)
      if (!seq.duration()) seq.to({}, { duration: 0.01 })
    }
    if (animate && leaving.length) {
      seq = gsap.timeline({ onComplete: swap })
      seq.to(leaving, { opacity: 0, y: -18, duration: 0.24, ease: 'power2.in', stagger: 0.03 })
    } else swap()
  }
  buttons.forEach(b => b.addEventListener('click', () => apply(b.dataset.filter ?? 'all')))
  // 字体 / 图片 / 视口变化后的 refresh 也会经 onRefresh 重新同步
  addEventListener('resize', () => !busy && requestAnimationFrame(sync))
}
