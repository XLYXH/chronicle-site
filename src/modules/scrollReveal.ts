import { qsa } from '../lib/env'
import { scramble } from './scramble'

/**
 * v11 · 滚动入场（借鉴 lanrhyme.top 的做法，重新实现）：
 *  - 四种入场：自下（60px）、自左（-60px）、自右（50px）、放大（.92 → 1）
 *  - 时长很长（1.8–2.4s）、尾巴很长的 expo 缓出：元素是“慢慢落定”的，不是弹出来的
 *  - 可逆：元素完全回到视口下方之后复位（v13.1 加了迟滞，见下），下一次往下滚时再入场一次
 *  - 同组元素依次错开（stagger），列表沿对角线一个接一个滑入
 *  - 章节眉题入场时用随机字符“解码”出来
 * 只动 opacity 与独立的 translate / scale 属性，不碰 transform——GSAP（Flip、磁吸、速度拉伸）照常工作。
 */
type Kind = 'up' | 'left' | 'right' | 'scale' | 'cut'

const PLAN: Array<[string, Kind, number?]> = [
  ['.sec-top', 'left'],
  ['.sec-head', 'up'],
  // v12 · “剪切”：大块面沿一道斜线被裁开（灵感：千咲的共鸣能力“裁剪”），一道绯红的切线扫过
  ['.showcase__stage', 'cut'],
  // 项目本身的 opacity / transform 属于筛选动画，入场改由内部两列来做
  ['.project__no', 'right', 0],
  ['.project__info', 'right', 1],
  ['.lab__field', 'cut'],
  ['.about__left', 'left'],
  ['.interest', 'right'],
  ['.connect__main', 'up'],
  ['.connect__bottom', 'up'],
  ['.letter', 'scale'],
  ['.footer > *', 'up'],
]

export function initScrollReveal(animate: boolean) {
  if (!animate || !('IntersectionObserver' in window)) return
  const root = document.documentElement
  const items: HTMLElement[] = []
  // 被 clip-path 完全裁掉的元素在 IntersectionObserver 看来面积为 0，所以“剪切”入场改为观察它的父元素
  const owner = new Map<Element, HTMLElement>()
  PLAN.forEach(([sel, kind, step]) => {
    qsa(sel).forEach((el, i) => {
      el.dataset.rv = kind
      // 同一选择器下的元素依次错开；项目内的编号 / 正文再各自错开半拍
      const d = step === undefined ? i * 0.12 : i * 0.14 + step * 0.08
      el.style.setProperty('--rv-d', `${d.toFixed(2)}s`)
      if (kind === 'cut' && !el.querySelector(':scope > .cutline')) {
        const c = document.createElement('i')
        c.className = 'cutline'
        c.setAttribute('aria-hidden', 'true')
        el.append(c)
      }
      items.push(el)
    })
  })
  // 项目在列表里本身就有序号，错开量只按“同一项目内”的顺序算，避免第 3 项等太久
  qsa('.project').forEach((p, i) => {
    qsa<HTMLElement>('[data-rv]', p).forEach((el, j) => el.style.setProperty('--rv-d', `${(i * 0.16 + j * 0.1).toFixed(2)}s`))
  })
  root.classList.add('has-rv')

  const decode = (el: HTMLElement) => qsa('.eyebrow', el).forEach((e, i) => setTimeout(() => scramble(e, 900), 200 + i * 160))
  const io = new IntersectionObserver(
    entries => {
      entries.forEach(({ target, isIntersecting }) => {
        const el = owner.get(target) ?? (target as HTMLElement)
        if (isIntersecting) {
          if (el.classList.contains('is-in')) return
          el.classList.add('is-in')
          if (el.classList.contains('sec-top')) decode(el)
        }
      })
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' },
  )
  // v13.1 · 迟滞：入场线在视口底部上方 50px，复位线在视口底部下方 60px——中间隔着 110px 的“死区”，
  // 滚动抖动不会让元素反复复位 / 重播；复位只发生在元素完全看不见的时候，所以也不会有一闪而空。
  // 滚过头顶的保持原样，免得往回看时一片空白
  const out = new IntersectionObserver(
    entries => {
      entries.forEach(({ target, isIntersecting, boundingClientRect }) => {
        if (isIntersecting || boundingClientRect.top < 0) return
        owner.get(target)?.classList.remove('is-in')
      })
    },
    { threshold: 0, rootMargin: '0px 0px 60px 0px' },
  )
  items.forEach(el => {
    const watch = el.dataset.rv === 'cut' && el.parentElement ? el.parentElement : el
    owner.set(watch, el)
    io.observe(watch)
    out.observe(watch)
  })
  // 键盘跳到尚未入场的内容：立刻显示，不等动画
  document.addEventListener('focusin', e => {
    const host = (e.target as Element).closest<HTMLElement>('[data-rv]')
    if (host && !host.classList.contains('is-in')) {
      host.classList.add('is-in', 'rv-now')
      setTimeout(() => host.classList.remove('rv-now'), 60)
    }
  })
}
