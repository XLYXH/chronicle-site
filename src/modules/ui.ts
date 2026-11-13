import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { qs, qsa } from '../lib/env'
import { lockScroll } from './smoothScroll'

/** 顶栏：滚动后收成毛玻璃；当前章节高亮；一颗“液滴”指示器在导航项之间流动 */
export function initHeader(animate: boolean) {
  const header = qs('.header')
  const nav = qs('.nav')
  if (!header || !nav) return
  const blob = document.createElement('i')
  blob.className = 'nav__blob'
  blob.setAttribute('aria-hidden', 'true')
  nav.prepend(blob)
  const links = qsa<HTMLAnchorElement>('a', nav)
  let active: HTMLAnchorElement | null = null

  const moveTo = (a: HTMLAnchorElement | null) => {
    links.forEach(l => l.classList.toggle('is-lit', l === a))
    if (!a) {
      gsap.to(blob, { opacity: 0, scale: 0.6, duration: 0.3 })
      return
    }
    const r = a.getBoundingClientRect()
    const nr = nav.getBoundingClientRect()
    gsap.to(blob, {
      x: r.left - nr.left,
      width: r.width,
      opacity: 1,
      scale: 1,
      duration: animate ? 0.7 : 0,
      ease: 'elastic.out(1, 0.7)',
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
  window.addEventListener('resize', () => moveTo(active))

  ScrollTrigger.create({
    start: 40,
    end: 'max',
    onToggle: self => header.classList.toggle('is-scrolled', self.isActive),
  })

  const bar = qs('.progress i')
  if (bar) {
    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: self => gsap.set(bar, { scaleX: self.progress }),
    })
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
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 750, easing: 'cubic-bezier(.7,0,.2,1)', pseudoElement: '::view-transition-new(root)' },
        )
      })
      .catch(() => {})
  })
}
