import { gsap } from 'gsap'
import { formatCount } from '../lib/math'
import { qs } from '../lib/env'

type Options = { reducedMotion: boolean; ready: Promise<unknown>; onReveal: (tl: gsap.core.Timeline) => void }

/**
 * 开场：真实加载进度（字体 + 肖像）驱动计数，至少停留 minDuration，
 * 然后幕布上卷，把同一条时间线交给 onReveal 继续编排英雄区入场。
 */
export function runLoader({ reducedMotion, ready, onReveal }: Options) {
  const root = qs('.loader')
  const num = qs('.loader__num')
  const bar = qs('.loader__bar i')
  if (!root || !num || !bar) return

  const finish = () => {
    root.remove()
    document.documentElement.classList.add('is-ready')
  }

  if (reducedMotion) {
    gsap.to(root, { autoAlpha: 0, duration: 0.3, onComplete: finish })
    onReveal(gsap.timeline())
    return
  }

  const repeat = sessionStorage.getItem('chronicle:visited') === '1'
  sessionStorage.setItem('chronicle:visited', '1')
  const minDuration = repeat ? 0.4 : 1.3
  const progress = { value: 0 }
  let loaded = false
  ready.finally(() => (loaded = true))

  gsap.from('.loader__star', { rotate: -180, scale: 0.6, autoAlpha: 0, duration: 1.2, ease: 'expo.out' })
  gsap.from('.loader__title span', { yPercent: 110, duration: 1, ease: 'expo.out', delay: 0.1 })

  const start = performance.now()
  const update = () => {
    const elapsed = (performance.now() - start) / 1000
    // 未加载完时最多走到 90%，加载完后追到 100%
    const cap = loaded ? 1 : 0.9
    const target = Math.min(cap, elapsed / minDuration)
    progress.value += (target - progress.value) * 0.16
    if (loaded && elapsed >= minDuration && progress.value > 0.985) progress.value = 1
    num.textContent = formatCount(progress.value)
    bar.style.transform = `scaleX(${progress.value})`
    if (progress.value >= 1) {
      gsap.ticker.remove(update)
      exit()
    }
  }
  gsap.ticker.add(update)

  const exit = () => {
    const tl = gsap.timeline({ onComplete: finish })
    flyStarToBrand(tl)
    tl.to('.loader__title, .loader__count', { yPercent: -120, autoAlpha: 0, duration: 0.5, ease: 'power3.in', stagger: 0.04 }, 0)
      .to('.loader__bar', { scaleY: 0, duration: 0.4, ease: 'power2.in' }, '<')
      .to(root, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1, ease: 'expo.inOut' }, '-=0.2')
    onReveal(tl)
  }
}

/** 加载器里的罗盘星飞向页眉 Logo 并落位：开场与导航之间的一根“线” */
function flyStarToBrand(tl: gsap.core.Timeline) {
  const star = qs<SVGSVGElement & HTMLElement>('.loader__star')
  const brand = qs<SVGSVGElement & HTMLElement>('.brand__star')
  if (!star || !brand) return
  const from = star.getBoundingClientRect()
  const to = brand.getBoundingClientRect()
  if (!to.width || !from.width) return
  const fly = star.cloneNode(true) as SVGSVGElement & HTMLElement
  fly.classList.add('loader__fly')
  Object.assign(fly.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` })
  document.body.append(fly)
  star.style.visibility = 'hidden'
  gsap.set(brand, { opacity: 0 })
  tl.to(fly, {
    x: to.left - from.left + (to.width - from.width) / 2,
    y: to.top - from.top + (to.height - from.height) / 2,
    scale: to.width / from.width,
    rotate: 225,
    duration: 1.35,
    ease: 'expo.inOut',
  }, 0.1)
    .set(brand, { opacity: 1 })
    .to(fly, { opacity: 0, duration: 0.2, onComplete: () => fly.remove() })
}
