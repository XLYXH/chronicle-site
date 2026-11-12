import { gsap } from 'gsap'
import { qs } from '../lib/env'

/**
 * 字标故障：复制两层文字 + 一条反相扫描带，用随机 clip-path 条带横向错位。
 * 平时每隔几秒轻微抽搐一次；指针经过时强烈爆发；滚动速度越快越频繁。
 */
export function initGlitch(enabled: boolean) {
  const mark = qs('[data-glitch]')
  const word = mark ? qs('.mark__word', mark) : null
  if (!mark || !word) return { burst: () => {}, intro: (tl: gsap.core.Timeline) => tl }
  const html = word.innerHTML
  const a = document.createElement('span')
  const b = document.createElement('span')
  a.className = 'mark__ghost mark__ghost--a'
  b.className = 'mark__ghost mark__ghost--b'
  a.innerHTML = b.innerHTML = html
  a.setAttribute('aria-hidden', 'true')
  b.setAttribute('aria-hidden', 'true')
  const slab = document.createElement('i')
  slab.className = 'mark__slab'
  slab.setAttribute('aria-hidden', 'true')
  word.append(a, b, slab)

  const rand = gsap.utils.random
  let busy = false

  const burst = (power = 1) => {
    if (!enabled || busy) return
    busy = true
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set([a, b, slab], { opacity: 0, x: 0, clipPath: 'none' })
        gsap.set(word, { x: 0, skewX: 0 })
        busy = false
      },
    })
    const steps = Math.round(4 + power * 5)
    for (let i = 0; i < steps; i++) {
      const top = rand(0, 80, 1)
      const h = rand(6, 26, 1)
      const top2 = rand(0, 85, 1)
      tl.set(a, { opacity: 0.9, x: rand(-24, 24) * power, clipPath: `inset(${top}% 0 ${Math.max(0, 100 - top - h)}% 0)` }, i * 0.05)
        .set(b, { opacity: 0.8, x: rand(-40, 40) * power, clipPath: `inset(${top2}% 0 ${Math.max(0, 85 - top2)}% 0)` }, i * 0.05)
        .set(slab, { opacity: Math.random() < 0.35 * power ? 1 : 0, top: `${rand(10, 80, 1)}%`, height: `${rand(4, 18, 1)}%`, skewX: rand(-20, 20) }, i * 0.05)
        .set(word, { x: rand(-3, 3) * power, skewX: rand(-4, 4) * power }, i * 0.05)
    }
    tl.to({}, { duration: 0.05 })
  }

  if (enabled) {
    mark.addEventListener('pointerenter', () => burst(1.6))
    const loop = () => {
      gsap.delayedCall(rand(2.8, 6.5), () => {
        if (!document.hidden) burst(rand(0.35, 0.8))
        loop()
      })
    }
    loop()
  }

  /** 开场：字标闪烁着“接通” */
  const intro = (tl: gsap.core.Timeline) =>
    tl
      .fromTo(word, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'steps(5)' })
      .add(() => burst(2), '<0.15')
  return { burst, intro }
}
