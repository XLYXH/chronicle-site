import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

let lenis: Lenis | null = null

/** Lenis 与 GSAP ticker 共用一个时钟，避免两套 rAF 互相抖动 */
export function initSmoothScroll(enabled: boolean) {
  if (enabled) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 1, smoothWheel: true, syncTouch: false })
    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add(time => lenis?.raf(time * 1000))
    gsap.ticker.lagSmoothing(0)
    ;(window as Window & { __lenis?: Lenis }).__lenis = lenis
  }

  document.addEventListener('click', event => {
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]')
    if (!link) return
    const id = link.getAttribute('href')?.slice(1)
    const target = id ? document.getElementById(id) : null
    if (!target) return
    event.preventDefault()
    scrollToElement(target)
    history.replaceState(null, '', `#${id}`)
  })
}

export function scrollToElement(target: HTMLElement) {
  const focus = () => {
    const focusable = target.matches('main, section') ? target : null
    if (focusable) {
      if (!focusable.hasAttribute('tabindex')) focusable.setAttribute('tabindex', '-1')
      focusable.focus({ preventScroll: true })
    }
  }
  if (lenis) {
    lenis.scrollTo(target, { duration: 1.6, easing: t => 1 - Math.pow(1 - t, 4), onComplete: focus })
  } else {
    target.scrollIntoView({ behavior: 'auto' })
    focus()
  }
}

export function scrollToY(y: number) {
  if (lenis) lenis.scrollTo(y, { duration: 0.9 })
  else window.scrollTo(0, y)
}

export function lockScroll(locked: boolean) {
  if (locked) lenis?.stop()
  else lenis?.start()
  document.documentElement.classList.toggle('is-locked', locked)
}

/** 布局突变（如筛选）后：让 Lenis 重新量尺寸，并把内部目标值对齐到真实滚动位置，避免下一次滚轮“弹回” */
export function resyncScroll() {
  if (!lenis) return
  lenis.resize()
  lenis.scrollTo(window.scrollY, { immediate: true, force: true })
}

/** 立即平移滚动位置（无动画），用于保持锚点在视口中的位置 */
export function jumpBy(dy: number) {
  const y = window.scrollY + dy
  if (lenis) {
    lenis.resize()
    lenis.scrollTo(y, { immediate: true, force: true })
  } else window.scrollTo(0, y)
}
