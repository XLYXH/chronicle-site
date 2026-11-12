import { scrambleFrame } from '../lib/scramble'
import { qsa } from '../lib/env'

/**
 * 把元素的第一段文字拆成「读屏用的原文 + 只做视觉的动画层」，
 * 动画过程中读屏和搜索引擎始终读到原文。
 */
function prepare(el: HTMLElement): HTMLElement | null {
  const existing = el.querySelector<HTMLElement>('[data-s]')
  if (existing) return existing
  const node = Array.from(el.childNodes).find(n => n.nodeType === Node.TEXT_NODE && n.textContent?.trim())
  if (!node) return null
  const text = node.textContent ?? ''
  const sr = document.createElement('span')
  sr.className = 'sr'
  sr.textContent = text
  const vis = document.createElement('span')
  vis.setAttribute('aria-hidden', 'true')
  vis.dataset.s = text
  vis.textContent = text
  node.replaceWith(sr, vis)
  return vis
}

const running = new WeakMap<HTMLElement, number>()

export function scramble(el: HTMLElement, duration = 450) {
  const vis = prepare(el)
  if (!vis) return
  const target = vis.dataset.s ?? ''
  cancelAnimationFrame(running.get(vis) ?? 0)
  const start = performance.now()
  const tick = (now: number) => {
    const p = Math.min(1, (now - start) / duration)
    vis.textContent = scrambleFrame(target, p * p * (3 - 2 * p))
    if (p < 1) running.set(vis, requestAnimationFrame(tick))
  }
  running.set(vis, requestAnimationFrame(tick))
}

export function initScramble(enabled: boolean) {
  if (!enabled) return
  qsa('[data-scramble]').forEach(el => {
    prepare(el)
    const go = () => scramble(el)
    el.addEventListener('pointerenter', go)
    el.addEventListener('focus', go)
  })
  qsa('[data-decode]').forEach(el => prepare(el))
}
