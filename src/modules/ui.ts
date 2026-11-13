import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { qs, qsa } from '../lib/env'
import { lockScroll } from './smoothScroll'
import { mountGlass, type GlassMode } from './glass'

/**
 * 顶栏：品牌、导航、工具按钮是三座玻璃小岛；当前章节由一颗玻璃液滴指示。
 * 液滴压在文字上方，折射模式下会把下面的字放大；移动时沿方向拉长、到位后回弹成圆润的胶囊。
 */
export function initHeader(animate: boolean, mode: GlassMode) {
  const header = qs('.header')
  const nav = qs('.nav')
  if (!header || !nav) return
  const blob = document.createElement('i')
  blob.className = 'nav__blob lg'
  blob.setAttribute('aria-hidden', 'true')
  nav.prepend(blob)
  if (mode === 'refract')
    mountGlass(blob, { bezel: (_w, h) => h * 0.45, edge: (_w, h) => h * 0.22, magnify: 0.1, radius: (w, h) => Math.min(w, h) / 2 })
  const links = qsa<HTMLAnchorElement>('a', nav)
  let active: HTMLAnchorElement | null = null
  let shown = false
  let lastX = 0

  const moveTo = (a: HTMLAnchorElement | null, instant = false) => {
    links.forEach(l => l.classList.toggle('is-lit', l === a))
    if (!a) {
      shown = false
      gsap.to(blob, { scaleX: 0, scaleY: 0, duration: animate ? 0.35 : 0, ease: 'power3.in', overwrite: true })
      return
    }
    const x = a.offsetLeft
    const w = a.offsetWidth
    if (!shown || instant || !animate) {
      // 从无到有：在目标处“凝结”出来
      gsap.set(blob, { x, width: w })
      gsap.fromTo(blob, { scaleX: shown ? 1 : 0.2, scaleY: shown ? 1 : 0.2 }, { scaleX: 1, scaleY: 1, duration: animate && !instant ? 0.6 : 0, ease: 'elastic.out(1, 0.6)', overwrite: true })
      shown = true
      lastX = x
      return
    }
    shown = true
    const from = Number(gsap.getProperty(blob, 'x'))
    lastX = from
    gsap.to(blob, {
      x,
      width: w,
      duration: 0.75,
      ease: 'elastic.out(1, 0.75)',
      overwrite: true,
      onUpdate: () => {
        // 速度 → 拉伸：横向拉长、纵向变扁，像被甩动的水滴
        const cur = Number(gsap.getProperty(blob, 'x'))
        const v = Math.abs(cur - lastX)
        lastX = cur
        const s = Math.min(0.28, v / 40)
        gsap.set(blob, { scaleX: 1 + s, scaleY: 1 - s * 0.55 })
      },
      onComplete: () => {
        gsap.to(blob, { scaleX: 1, scaleY: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' })
      },
    })
  }
  links.forEach(a => {
    a.addEventListener('pointerenter', () => moveTo(a))
    a.addEventListener('focus', () => moveTo(a))
  })
  nav.addEventListener('pointerleave', () => moveTo(active))
  nav.addEventListener('focusout', () => moveTo(active))

  const setActive = (id: string | null) => {
    active = links.find(a => a.dataset.nav === id) ?? null
    links.forEach(a => (a === active ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')))
    moveTo(active)
  }
  ;['work', 'play', 'about', 'connect'].forEach(id => {
    const sec = document.getElementById(id)
    if (!sec) return
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 55%',
      end: 'bottom 55%',
      onToggle: self => {
        if (self.isActive) setActive(id)
        else if (active?.dataset.nav === id) setActive(null)
      },
    })
  })
  window.addEventListener('resize', () => moveTo(active, true))
  // 收拢/展开时导航宽度变化，液滴跟着对齐
  nav.addEventListener('transitionend', e => {
    if ((e as TransitionEvent).propertyName === 'padding-left' && e.target === links[links.length - 1]) moveTo(active, true)
  })

  ScrollTrigger.create({
    start: 40,
    end: 'max',
    onToggle: self => header.classList.toggle('is-scrolled', self.isActive),
    onUpdate: self => {
      // 向下读时收起中文小字，向上翻时展开
      const tuck = self.direction > 0 && self.scroll() > innerHeight * 0.6
      if (self.direction < 0 || tuck) header.classList.toggle('is-tucked', tuck)
    },
  })

  const top = qs<HTMLAnchorElement>('.totop')
  const pct = top ? qs('.totop__pct', top) : null
  if (top) {
    let on = false
    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: self => {
        const p = Math.round(self.progress * 100)
        top.style.setProperty('--p', String(p))
        if (pct) pct.textContent = String(p)
        const want = self.scroll() > innerHeight * 0.8
        if (want !== on) {
          on = want
          top.classList.toggle('is-on', on)
          top.toggleAttribute('inert', !on)
        }
      },
    })
    top.setAttribute('inert', '')
  }
}

export function initMenu(animate: boolean) {
  const btn = qs<HTMLButtonElement>('.menu-btn')
  const menu = qs('.menu')
  if (!btn || !menu) return
  const label = qs('.sr', btn)
  const links = qsa('a', menu)
  const set = (open: boolean) => {
    btn.setAttribute('aria-expanded', String(open))
    if (label) label.textContent = open ? '关闭菜单' : '打开菜单'
    document.documentElement.classList.toggle('menu-open', open)
    menu.toggleAttribute('inert', !open)
    lockScroll(open)
    if (open) {
      if (animate) gsap.fromTo(links, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.7, stagger: 0.05, ease: 'expo.out', delay: 0.12 })
      links[0]?.focus({ preventScroll: true })
    }
  }
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'))
  links.forEach(a => a.addEventListener('click', () => set(false)))
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') {
      set(false)
      btn.focus()
    }
  })
  matchMedia('(min-width: 900px)').addEventListener('change', e => e.matches && set(false))
}

/** 深浅色切换：支持 View Transitions 时以按钮为圆心做圆形揭示 */
export function initTheme(animate: boolean, onChange: () => void) {
  const btn = qs<HTMLButtonElement>('.theme')
  if (!btn) return
  const root = document.documentElement
  const sync = () => {
    const dark = root.dataset.theme === 'dark'
    btn.setAttribute('aria-pressed', String(dark))
    btn.setAttribute('aria-label', dark ? '切换到浅色' : '切换到深色')
  }
  sync()
  btn.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark'
    const apply = () => {
      root.dataset.theme = next
      try {
        localStorage.setItem('theme', next)
      } catch {
        /* 隐私模式下忽略 */
      }
      sync()
      const paper = getComputedStyle(root).getPropertyValue('--paper').trim()
      document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute('content', paper))
      onChange()
    }
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } }
    if (!animate || !doc.startViewTransition) return apply()
    const r = btn.getBoundingClientRect()
    const x = r.left + r.width / 2
    const y = r.top + r.height / 2
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
    const t = doc.startViewTransition(apply)
    t.ready
      .then(() => {
        // 不是正圆：边缘带几道随时间流动、逐渐抚平的波纹，像墨迹在纸上漫开
        const N = 56
        const seed = Math.random() * 6
        const frames: Keyframe[] = []
        for (let k = 0; k <= 12; k++) {
          const t = k / 12
          const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
          const R = e * radius * 1.08
          const wob = Math.sin(t * Math.PI) * 0.09
          const pts: string[] = []
          for (let i = 0; i < N; i++) {
            const a = (i / N) * Math.PI * 2
            const r = R * (1 + wob * (Math.sin(a * 5 + seed + t * 5) * 0.6 + Math.sin(a * 9 - seed * 1.7 - t * 7) * 0.4))
            pts.push(`${(x + Math.cos(a) * r).toFixed(1)}px ${(y + Math.sin(a) * r).toFixed(1)}px`)
          }
          frames.push({ clipPath: `polygon(${pts.join(',')})`, offset: t })
        }
        document.documentElement.animate(frames, { duration: 900, easing: 'linear', pseudoElement: '::view-transition-new(root)' })
      })
      .catch(() => {})
  })
}
