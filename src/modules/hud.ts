import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { qs, qsa } from '../lib/env'
import { formatClock, formatUptime } from '../lib/time'
import { GLYPHS } from '../lib/scramble'
import { PROFILE } from '../data'
import { lockScroll } from './smoothScroll'

const DOTS = 12

/** 页眉时钟、在线时长、内存读数与导航噪声：都挂在一个 10Hz 定时器上 */
export function initReadouts(animate: boolean) {
  const clock = qs('[data-clock]')
  const uptime = qs('[data-uptime]')
  const mem = qs('[data-mem]')
  const noise = qs('[data-noise]')
  const since = Date.parse(PROFILE.since)
  let n = 0
  const tick = () => {
    const now = new Date()
    if (clock) clock.textContent = formatClock(now).slice(0, 10)
    if (uptime && n % 10 === 0) uptime.textContent = formatUptime(now.getTime() - since)
    if (animate && n % 4 === 0) {
      if (mem) mem.textContent = `MEM 0x${Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, '0')}`
      if (noise) noise.textContent = Array.from({ length: 8 }, () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]).join('')
    }
    n++
  }
  tick()
  setInterval(tick, animate ? 100 : 1000)
}

/** 左侧点阵（滚动进度）+ 右侧细滚动轨 + 导航当前项 */
export function initRail() {
  const dots = qs('.rail__dots')
  const num = qs('.rail__num')
  const thumb = qs<HTMLElement>('.track i')
  const pct = qs('.track span')
  if (dots) dots.innerHTML = '<li></li>'.repeat(DOTS)
  const items = dots ? Array.from(dots.children) : []
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: self => {
      const p = self.progress
      const on = Math.round(p * (DOTS - 1))
      items.forEach((li, i) => {
        li.classList.toggle('on', i <= on)
        li.classList.toggle('cur', i === on)
      })
      if (num) num.textContent = String(Math.round(p * 99)).padStart(2, '0')
      if (thumb) thumb.style.transform = `translateY(${p * 455}%)`
      if (pct) pct.textContent = String(Math.round(p * 100)).padStart(3, '0')
    },
  })

  const links = qsa<HTMLAnchorElement>('[data-nav]')
  qsa('main > section').forEach(section => {
    ScrollTrigger.create({
      trigger: section,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: self => {
        if (!self.isActive) return
        links.forEach(a => a.setAttribute('aria-current', String(a.dataset.nav === section.id)))
      },
    })
  })
}

export function initMenu() {
  const btn = qs<HTMLButtonElement>('.menu-btn')
  const menu = qs('#menu')
  if (!btn || !menu) return
  const label = qs('.sr', btn)
  const set = (open: boolean) => {
    document.documentElement.classList.toggle('menu-open', open)
    btn.setAttribute('aria-expanded', String(open))
    if (label) label.textContent = open ? '关闭菜单' : '打开菜单'
    menu.toggleAttribute('inert', !open)
    lockScroll(open)
    if (open) qs<HTMLAnchorElement>('a', menu)?.focus({ preventScroll: true })
  }
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'))
  menu.addEventListener('click', e => {
    if ((e.target as Element).closest('a')) set(false)
  })
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') {
      set(false)
      btn.focus()
    }
  })
}
