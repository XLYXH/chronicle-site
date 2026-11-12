import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { qs, qsa } from '../lib/env'
import { lockScroll } from './smoothScroll'

/** 滚动条、页眉显隐、当前章节指示（数字滚动切换） */
export function initChrome(reducedMotion: boolean) {
  const header = qs('.header')
  const bar = qs('.progress i')
  if (bar) {
    gsap.to(bar, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } })
  }

  if (header) {
    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: self => {
        const y = self.scroll()
        header.classList.toggle('is-scrolled', y > 40)
        const menuOpen = document.documentElement.classList.contains('menu-open')
        header.classList.toggle('is-hidden', !menuOpen && y > 240 && self.direction === 1)
      },
    })
    header.addEventListener('focusin', () => header.classList.remove('is-hidden'))
  }

  const num = qs('.chapter__num .chapter__roll')
  const name = qs('.chapter__name .chapter__roll')
  let current = '00'
  const roll = (box: HTMLElement | null, text: string, dir: number) => {
    if (!box) return
    const prev = box.querySelector('b')
    const next = document.createElement('b')
    next.textContent = text
    box.append(next)
    if (reducedMotion) {
      prev?.remove()
      return
    }
    gsap.fromTo(next, { yPercent: 100 * dir }, { yPercent: 0, duration: 0.7, ease: 'expo.out' })
    if (prev) gsap.to(prev, { yPercent: -100 * dir, duration: 0.7, ease: 'expo.out', onComplete: () => prev.remove() })
  }

  qsa<HTMLElement>('[data-chapter]').forEach(section => {
    ScrollTrigger.create({
      trigger: section,
      start: 'top 55%',
      end: 'bottom 55%',
      onToggle: self => {
        if (!self.isActive) return
        const code = section.dataset.chapter ?? '00'
        if (code === current) return
        const dir = Number(code) > Number(current) ? 1 : -1
        current = code
        roll(num, code, dir)
        roll(name, section.dataset.chapterName ?? '', dir)
        qsa('.nav a').forEach(a => a.toggleAttribute('aria-current', a.getAttribute('href') === `#${section.id}`))
      },
    })
  })
}

/** 移动端全屏菜单：遮罩从顶部卷下，链接逐行升起；Esc 关闭并归还焦点 */
export function initMenu(reducedMotion: boolean) {
  const toggle = qs<HTMLButtonElement>('.menu-toggle')
  const menu = qs('.menu')
  if (!toggle || !menu) return
  const links = qsa<HTMLAnchorElement>('a', menu)
  const label = toggle.querySelector('.visually-hidden')
  let open = false
  let tl: gsap.core.Timeline | null = null

  const setOpen = (next: boolean) => {
    open = next
    toggle.setAttribute('aria-expanded', String(open))
    if (label) label.textContent = open ? '关闭菜单' : '打开菜单'
    menu.setAttribute('aria-hidden', String(!open))
    menu.toggleAttribute('inert', !open)
    document.documentElement.classList.toggle('menu-open', open)
    lockScroll(open)
    tl?.kill()
    if (reducedMotion) {
      gsap.set(menu, { autoAlpha: open ? 1 : 0, clipPath: 'inset(0% 0% 0% 0%)' })
      if (open) links[0]?.focus()
      return
    }
    tl = gsap.timeline()
    if (open) {
      tl.set(menu, { autoAlpha: 1 })
        .fromTo(menu, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, ease: 'expo.inOut' })
        .fromTo(links, { yPercent: 120, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.8, ease: 'expo.out', stagger: 0.06 }, '-=0.35')
        .add(() => links[0]?.focus({ preventScroll: true }))
    } else {
      tl.to(links, { yPercent: -60, autoAlpha: 0, duration: 0.35, ease: 'power2.in', stagger: 0.03 })
        .to(menu, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.7, ease: 'expo.inOut' }, '-=0.15')
        .set(menu, { autoAlpha: 0 })
    }
  }

  menu.toggleAttribute('inert', true)
  toggle.addEventListener('click', () => setOpen(!open))
  links.forEach(link => link.addEventListener('click', () => open && setOpen(false)))
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && open) {
      setOpen(false)
      toggle.focus()
    }
  })
  window.matchMedia('(min-width: 900px)').addEventListener('change', e => e.matches && open && setOpen(false))
}
