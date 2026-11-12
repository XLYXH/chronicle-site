import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { qs, qsa } from '../lib/env'
import { DUR, EASE } from '../lib/motion'
import { scramble } from './scramble'

/** 进入视口时显现；同一批进入的元素错峰 */
export function initReveals(animate: boolean) {
  const items = qsa('[data-reveal]')
  if (!animate) {
    items.forEach(el => el.classList.add('is-in'))
    return
  }
  ScrollTrigger.batch(items, {
    start: 'top 90%',
    once: true,
    onEnter: batch =>
      batch.forEach((el, i) => {
        ;(el as HTMLElement).style.transitionDelay = `${i * 0.07}s`
        el.classList.add('is-in')
        el.querySelectorAll<HTMLElement>('[data-decode]').forEach(d => scramble(d, 900))
        if (el.matches('.loglist li')) {
          const t = el.querySelector<HTMLElement>('time')
          if (t) {
            t.dataset.scramble = ''
            setTimeout(() => scramble(t, 600), i * 70)
          }
        }
      }),
  })
  // 悬停项目行时副标题重新“解码”
  qsa('.entry__link').forEach(link => {
    const sub = link.querySelector<HTMLElement>('.entry__sub')
    if (sub) link.addEventListener('pointerenter', () => scramble(sub, 520))
  })
  // Tab 聚焦到尚未显现的元素时立即显示
  document.addEventListener('focusin', e => {
    ;(e.target as Element).closest('[data-reveal]')?.classList.add('is-in')
  })
  qsa('[data-decode]').forEach(el => {
    if (el.closest('[data-reveal]')) return
    ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => scramble(el, 900) })
  })
}

/** 开场：系统栏、点阵、字标与两侧信息依次接通 */
export function heroIntro(tl: gsap.core.Timeline, glitchIntro: (tl: gsap.core.Timeline) => void) {
  tl.fromTo('.bar', { clipPath: 'inset(0 50% 0 50%)', opacity: 0 }, { clipPath: 'inset(0 0% 0 0%)', opacity: 1, duration: DUR.lg, ease: EASE.inOut }, 0)
    .fromTo('.frame i', { scale: 2.4, opacity: 0 }, { scale: 1, opacity: 1, duration: DUR.md, ease: EASE.out, stagger: 0.06 }, 0.1)
    .fromTo('.rail, .track', { opacity: 0 }, { opacity: 1, duration: DUR.sm }, 0.5)
  tl.add(() => {
    const sub = gsap.timeline()
    glitchIntro(sub)
  }, 0.15)
  tl.fromTo('.hero__kicker', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: DUR.md, ease: EASE.out }, 0.6)
    .add(() => {
      const k = qs('.hero__kicker')
      if (k) scramble(k, 900)
    }, 0.6)
    .fromTo(
      '.hero__left > *, .hero__quote',
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: DUR.md, ease: EASE.out, stagger: 0.08 },
      0.75,
    )
    .fromTo('.hero__cue', { opacity: 0 }, { opacity: 1, duration: DUR.md }, 1.1)
  return tl
}

/** 滚动驱动：字标随滚动后退，幽灵大字横向漂移 */
export function initScrollFx() {
  const mm = gsap.matchMedia()
  mm.add('(min-width: 900px)', () => {
    gsap
      .timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
      .to('.hero__center', { yPercent: -28, scale: 0.86, opacity: 0, ease: 'none' }, 0)
      .to('.hero__left, .hero__quote', { y: -80, opacity: 0, ease: 'none' }, 0)
  })
  mm.add('(max-width: 899px)', () => {
    gsap.to('.hero__center', {
      yPercent: -18,
      opacity: 0.2,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
    })
  })
  qsa('.head__ghost').forEach(el => {
    gsap.fromTo(
      el,
      { xPercent: 8 },
      { xPercent: -8, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } },
    )
  })
}
