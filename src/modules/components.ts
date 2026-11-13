/**
 * v10 · 组件手感：
 *  - 玻璃件的高光跟随指针（在 ::after 的高光层上移动一个柔光点），让玻璃像被灯照着
 *  - 实验区“已发现”的清单项：发现时打勾的那一笔重新画一遍
 * 其余全部是 CSS（components.css）。
 */
export function initComponents(animate: boolean, fine: boolean) {
  if (!animate || !fine) return
  const glass = Array.from(document.querySelectorAll<HTMLElement>('.lg'))
  glass.forEach(g => {
    g.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return
      const r = g.getBoundingClientRect()
      g.style.setProperty('--gx', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`)
      g.style.setProperty('--gy', `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`)
      g.classList.add('is-lit')
    })
    g.addEventListener('pointerleave', () => g.classList.remove('is-lit'))
  })
}
