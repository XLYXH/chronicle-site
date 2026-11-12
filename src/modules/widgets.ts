import { gsap } from 'gsap'
import { qs } from '../lib/env'
import { dayProgress, formatClock, monthGrid, yearProgress } from '../lib/time'
import { share } from '../lib/terminal'

/** 资料区的小部件：大时钟、日历、年度进度、语言占比 */
export function initWidgets(animate: boolean) {
  const big = qs('[data-clock-big]')
  const day = qs<HTMLElement>('[data-day]')
  const dayNum = qs('[data-day-num]')
  let visible = false
  const io = new IntersectionObserver(([e]) => {
    visible = !!e?.isIntersecting
    if (visible) frame()
  })
  if (big) io.observe(big)
  const frame = () => {
    const now = new Date()
    if (big) big.textContent = formatClock(now)
    const p = dayProgress(now)
    if (day) day.style.transform = `scaleX(${p})`
    if (dayNum) dayNum.textContent = `${(p * 100).toFixed(2)}%`
    if (visible && animate) requestAnimationFrame(frame)
  }
  frame()
  if (!animate) setInterval(frame, 1000)

  // 日历
  const now = new Date()
  const cal = qs('[data-cal] tbody')
  const title = qs('[data-cal-title]')
  if (title) title.textContent = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`
  if (cal) {
    cal.innerHTML = monthGrid(now.getFullYear(), now.getMonth())
      .map(
        w =>
          `<tr>${w
            .map(d => {
              if (!d) return '<td></td>'
              const cls = d === now.getDate() ? ' class="today"' : d < now.getDate() ? ' class="past"' : ''
              const cur = d === now.getDate() ? ' aria-current="date"' : ''
              return `<td${cls}${cur}><span>${d}</span></td>`
            })
            .join('')}</tr>`,
      )
      .join('')
  }
  const year = qs('[data-year]')
  if (year) year.textContent = `${(yearProgress(now) * 100).toFixed(3)}%`

  // 语言占比：单色条，透明度区分
  const bar = qs('[data-lang-bar]')
  const list = qs('[data-lang-list]')
  const data = share()
  const alpha = (i: number) => 1 - i * 0.13
  if (bar) {
    bar.innerHTML = data.map(([k, v], i) => `<i title="${k}" style="flex:${v};opacity:${alpha(i)}"></i>`).join('')
    bar.setAttribute('role', 'img')
    bar.setAttribute('aria-label', data.map(([k, v]) => `${k} ${(v * 100).toFixed(1)}%`).join('，'))
    if (animate) {
      gsap.from(bar.children, {
        scaleX: 0,
        duration: 1.2,
        ease: 'expo.out',
        stagger: 0.06,
        scrollTrigger: { trigger: bar, start: 'top 85%' },
      })
    }
  }
  if (list) {
    list.innerHTML = data
      .map(([k, v], i) => `<li><i style="opacity:${alpha(i)}"></i>${k} <b>${(v * 100).toFixed(1)}%</b></li>`)
      .join('')
  }
}
