import { gsap } from 'gsap'
import { qs, qsa } from '../lib/env'

/** 三个维度：手风琴一次只开一个；“✳ 拨盘”轮转到下一个维度，两者保持同步 */
export function initAbout(animate: boolean) {
  const items = qsa('.interest')
  const dial = qs<HTMLButtonElement>('[data-dial]')
  const num = qs('[data-dial-num]')
  const star = dial ? qs('b', dial) : null
  let current = 0
  let turns = 0

  const open = (index: number) => {
    current = index
    items.forEach((it, i) => {
      const btn = qs<HTMLButtonElement>('button', it)!
      const panel = qs('.interest__panel', it)!
      const on = i === index
      if (btn.getAttribute('aria-expanded') === String(on)) return
      btn.setAttribute('aria-expanded', String(on))
      it.dataset.open = String(on)
      if (!animate) {
        panel.style.height = on ? 'auto' : '0px'
        return
      }
      if (on) {
        gsap.fromTo(panel, { height: panel.offsetHeight }, { height: 'auto', duration: 0.8, ease: 'expo.out' })
        gsap.fromTo(qs('div', panel), { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'expo.out', delay: 0.08 })
      } else {
        gsap.to(panel, { height: 0, duration: 0.6, ease: 'expo.out' })
      }
    })
    if (num) num.textContent = `${String(index + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`
  }

  items.forEach((it, i) => {
    const panel = qs('.interest__panel', it)!
    panel.style.height = it.dataset.open === 'true' ? 'auto' : '0px'
    qs('button', it)?.addEventListener('click', () => {
      // 再次点击已展开项时收起，按钮语义与 aria-expanded 一致
      if (current === i && it.dataset.open === 'true') {
        it.dataset.open = 'false'
        qs('button', it)!.setAttribute('aria-expanded', 'false')
        if (animate) gsap.to(panel, { height: 0, duration: 0.6, ease: 'expo.out' })
        else panel.style.height = '0px'
        current = -1
        return
      }
      open(i)
    })
  })

  dial?.addEventListener('click', () => {
    turns += 1
    if (star) gsap.to(star, { rotate: turns * 120, duration: animate ? 0.9 : 0, ease: 'elastic.out(1, 0.6)' })
    open((Math.max(current, 0) + (current === -1 ? 0 : 1)) % items.length)
  })
}
