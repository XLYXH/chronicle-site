import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { qs, qsa } from '../lib/env'

/** 把标题拆成逐词遮罩（保留 em / br），用于“从下方升起”的揭示 */
export function splitWords(el: HTMLElement) {
  if (el.dataset.splitDone) return
  el.dataset.splitDone = '1'
  const label = el.textContent?.replace(/\s+/g, ' ').trim()
  if (label && !el.hasAttribute('aria-label')) el.setAttribute('aria-label', label)
  const walk = (node: Node, into: Node) => {
    node.childNodes.forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        const parts = (child.textContent ?? '').split(/(\s+)/)
        parts.forEach(part => {
          if (!part) return
          if (/^\s+$/.test(part)) return into.appendChild(document.createTextNode(' '))
          const w = document.createElement('span')
          w.className = 'w'
          w.setAttribute('aria-hidden', 'true')
          const inner = document.createElement('span')
          inner.className = 'w__in'
          inner.textContent = part
          w.append(inner)
          into.appendChild(w)
        })
      } else if (child instanceof HTMLElement && child.tagName !== 'BR') {
        const clone = child.cloneNode(false) as HTMLElement
        walk(child, clone)
        into.appendChild(clone)
      } else {
        into.appendChild(child.cloneNode(true))
      }
    })
  }
  const frag = document.createDocumentFragment()
  walk(el, frag)
  el.replaceChildren(frag)
}

export function initReveals(animate: boolean) {
  const titles = qsa('[data-split]')
  if (!animate) return
  titles.forEach(splitWords)
  titles.forEach(t => {
    gsap.set(qsa('.w__in', t), { yPercent: 110 })
    ScrollTrigger.create({
      trigger: t,
      start: 'top 88%',
      once: true,
      onEnter: () => gsap.to(qsa('.w__in', t), { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.06 }),
    })
  })
  const items = qsa('[data-reveal]')
  gsap.set(items, { opacity: 0, y: 36 })
  ScrollTrigger.batch(items, {
    start: 'top 92%',
    once: true,
    onEnter: batch => gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08, overwrite: true }),
  })
  // 键盘跳到尚未揭示的内容时立即显示
  document.addEventListener('focusin', e => {
    const host = (e.target as Element).closest<HTMLElement>('[data-reveal]')
    if (host && Number(getComputedStyle(host).opacity) < 1) gsap.to(host, { opacity: 1, y: 0, duration: 0.3, overwrite: true })
    const t = (e.target as Element).closest<HTMLElement>('[data-split]') ?? host?.querySelector<HTMLElement>('[data-split]')
    if (t) gsap.to(qsa('.w__in', t), { yPercent: 0, duration: 0.3, overwrite: true })
  })
}

/** 首屏入场：标题逐行升起、✳ 旋入、液体从无到有 */
export function heroIntro(animate: boolean, onIntro: (v: number) => void) {
  const root = document.documentElement
  root.classList.add('is-ready')
  if (!animate) {
    onIntro(1)
    return
  }
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
  const state = { v: 0 }
  tl.to(state, { v: 1, duration: 2.4, ease: 'power2.out', onUpdate: () => onIntro(state.v) }, 0)
  tl.from('.hero__title .line__in', { yPercent: 115, duration: 1.4, stagger: 0.09 }, 0.15)
  tl.from('.hero__title .spark', { rotate: -180, scale: 0.2, duration: 1.6, ease: 'elastic.out(1, 0.55)' }, 0.45)
  tl.from('.hero__edition, .hero__story, .hero__cta, .hero__note', { opacity: 0, y: 24, duration: 1.2, stagger: 0.08 }, 0.55)
  tl.from('.header', { opacity: 0, y: -16, duration: 1.2 }, 0.4)
}

/** 碎片间奏：液体随滚动分裂；文字缓缓放大升起；舞台离开后淡出 */
export function initFragment(animate: boolean, onSplit: (v: number) => void, onStage: (inView: boolean) => void) {
  const sec = qs('.fragment')
  const stage = qs('.hero__stage')
  if (!sec || !stage) return
  ScrollTrigger.create({
    trigger: sec,
    start: 'top bottom',
    end: 'bottom 30%',
    scrub: animate ? 0.6 : false,
    onUpdate: self => onSplit(self.progress),
  })
  ScrollTrigger.create({
    trigger: sec,
    start: 'bottom 30%',
    onToggle: self => {
      stage.classList.toggle('is-gone', self.isActive)
      onStage(!self.isActive)
    },
  })
  if (!animate) return
  gsap.fromTo(
    '.fragment__word',
    { scale: 0.82, yPercent: 18 },
    { scale: 1, yPercent: 0, ease: 'none', scrollTrigger: { trigger: sec, start: 'top 85%', end: 'center 55%', scrub: 0.6 } },
  )
  gsap.fromTo('.hero__inner', { yPercent: 0, opacity: 1 }, {
    yPercent: -12,
    opacity: 0,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 20%', scrub: 0.4 },
  })
}

/** 低语跑马灯：持续缓行，滚动速度会推它一把；指针处的“透镜”显出实心的另一层 */
export function initWhisper(animate: boolean, fine: boolean) {
  const el = qs('.whisper')
  if (!el) return
  const tracks = qsa('.whisper__track', el)
  tracks.forEach(t => (t.innerHTML += t.innerHTML))
  if (!animate) return
  const tween = gsap.to(tracks, { xPercent: -50, duration: 38, ease: 'none', repeat: -1 })
  let boost = 0
  ScrollTrigger.create({
    trigger: el,
    start: 'top bottom',
    end: 'bottom top',
    onUpdate: self => {
      boost = Math.min(6, Math.abs(self.getVelocity()) / 400)
    },
    onToggle: self => (self.isActive ? tween.play() : tween.pause()),
  })
  gsap.ticker.add(() => {
    boost *= 0.92
    tween.timeScale(1 + boost)
  })
  if (!fine) return
  const xTo = gsap.quickTo(el, '--lx', { duration: 0.5, ease: 'power3.out' })
  const yTo = gsap.quickTo(el, '--ly', { duration: 0.5, ease: 'power3.out' })
  const rTo = gsap.quickTo(el, '--lr', { duration: 0.6, ease: 'expo.out' })
  el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect()
    xTo(e.clientX - r.left)
    yTo(e.clientY - r.top)
  })
  el.addEventListener('pointerenter', () => rTo(110))
  el.addEventListener('pointerleave', () => rTo(0))
}
