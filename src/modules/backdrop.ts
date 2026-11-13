import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { env, qs, qsa } from '../lib/env'
import { scrambleFrame } from '../lib/scramble'

/**
 * v11 · 背景（借鉴 lanrhyme.top 的分层，重新实现成瓷白 / 钴蓝）：
 *  - 一枚很大的“日蚀”圆，外圈一道虚线轨道；随滚动缓慢放大、轨道转动，轨道上的小方块标出读到哪
 *  - 版心 12 栏的发丝网格 + 四角 HUD 角标 + 极淡的颗粒
 *  - 当前章节的字样以超大空心字压在最底层（字样取自页面已有的章节标题，不新增文案），换章节时解码切换
 *  - 左侧一列节点：每个章节一个点，读过的点被填实，点与点之间的虚线随进度画出
 *  - 页面级的斜向虚线：从每一章右侧的眉题连到下一章的编号，随滚动一段段画出来
 * 背景全部 aria-hidden；减弱动效时只保留静态的圆、网格和角标。
 */
const SECTIONS = ['top', 'work', 'play', 'about', 'connect']

function ghostWord(id: string): string {
  if (id === 'top') return qs('.hero__edition')?.textContent?.trim().split(/\s+/)[0] ?? ''
  const sec = document.getElementById(id)
  const eyebrow = sec?.querySelector('.sec-top .eyebrow')
  const words = (eyebrow?.textContent ?? '')
    .replace(/^\s*\d+\s*/, '')
    .trim()
    .split(/\s+/)
  return (words.sort((a, b) => b.length - a.length)[0] ?? '').replace(/[^\w&]/g, '')
}

export function initBackdrop(animate: boolean) {
  const bd = document.createElement('div')
  bd.className = 'bd'
  bd.setAttribute('aria-hidden', 'true')
  bd.innerHTML = `
    <div class="bd__grid"></div>
    <div class="bd__orb"><i class="bd__disc"></i><svg class="bd__orbit" viewBox="0 0 100 100"><circle cx="50" cy="50" r="49.6" pathLength="360"/></svg><i class="bd__node"></i></div>
    <p class="bd__ghost"></p>
    <i class="bd__grain"></i>
    <i class="bd__c bd__c--tl"></i><i class="bd__c bd__c--tr"></i><i class="bd__c bd__c--bl"></i><i class="bd__c bd__c--br"></i>`
  document.body.prepend(bd)

  const rail = document.createElement('div')
  rail.className = 'rail'
  rail.setAttribute('aria-hidden', 'true')
  rail.innerHTML = `<i class="rail__line"><b></b></i>${SECTIONS.map(() => '<i class="rail__dot"></i>').join('')}`
  document.body.append(rail)

  const ghost = qs<HTMLElement>('.bd__ghost', bd)!
  const words = SECTIONS.map(ghostWord)
  ghost.textContent = (words[0] ?? '').toUpperCase()

  if (!animate) return
  const dots = qsa('.rail__dot', rail)
  const fill = qs<HTMLElement>('.rail__line b', rail)!

  // 换章节：空心字从随机字符解码成新字样
  let current = 0
  let raf = 0
  const setSection = (i: number) => {
    if (i === current) return
    current = i
    dots.forEach((d, j) => d.classList.toggle('is-on', j <= i))
    const target = (words[i] ?? '').toUpperCase()
    cancelAnimationFrame(raf)
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 900)
      ghost.textContent = scrambleFrame(target, p)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  }
  dots[0]?.classList.add('is-on')
  SECTIONS.forEach((id, i) => {
    const sec = document.getElementById(id)
    if (!sec) return
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 55%',
      end: 'bottom 55%',
      onToggle: self => self.isActive && setSection(i),
    })
  })

  // 整页进度 → 圆的缩放、轨道转角、节点位置；章节内进度 → 空心字的视差
  // 只写在背景层自己身上，且只在数值变化时写：写到 :root 会让整页重算样式
  let max = 1
  const measure = () => (max = Math.max(1, document.documentElement.scrollHeight - innerHeight))
  measure()
  ScrollTrigger.addEventListener('refresh', measure)
  let last = ''
  gsap.ticker.add(() => {
    const p = Math.min(1, Math.max(0, scrollY / max)).toFixed(4)
    if (p === last) return
    last = p
    bd.style.setProperty('--bp', p)
    fill.style.transform = `scaleY(${p})`
  })

  // 指针让圆轻轻偏一点（只在精确指针上）
  if (env.finePointer) {
    const xTo = gsap.quickTo(bd, '--px', { duration: 1.6, ease: 'expo.out' })
    const yTo = gsap.quickTo(bd, '--py', { duration: 1.6, ease: 'expo.out' })
    window.addEventListener(
      'pointermove',
      e => {
        if (e.pointerType !== 'mouse') return
        xTo((e.clientX / innerWidth - 0.5) * 2)
        yTo((e.clientY / innerHeight - 0.5) * 2)
      },
      { passive: true },
    )
  }

  links()
}

/** 页面级斜向虚线：每章右侧眉题 → 下一章编号，随读线（视口 60%）画出 */
function links() {
  const main = qs<HTMLElement>('main')
  if (!main) return
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.classList.add('links')
  svg.setAttribute('aria-hidden', 'true')
  main.prepend(svg)
  type Seg = { line: SVGLineElement; a: SVGRectElement; b: SVGRectElement; x1: number; y1: number; x2: number; y2: number }
  let segs: Seg[] = []
  const build = () => {
    svg.replaceChildren()
    segs = []
    const tops = qsa('.sec-top')
    // 用 offset 链量位置：不受入场位移（translate）和 GSAP transform 影响
    const pos = (el: HTMLElement) => {
      let x = 0
      let y = 0
      let n: HTMLElement | null = el
      while (n && n !== main) {
        x += n.offsetLeft
        y += n.offsetTop
        n = n.offsetParent as HTMLElement | null
      }
      return { left: x, top: y, right: x + el.offsetWidth, bottom: y + el.offsetHeight }
    }
    svg.setAttribute('width', String(main.offsetWidth))
    svg.setAttribute('height', String(main.offsetHeight))
    for (let i = 0; i < tops.length - 1; i++) {
      const from = tops[i]?.lastElementChild as HTMLElement | null
      const to = tops[i + 1]?.querySelector<HTMLElement>('.eyebrow b')
      if (!from || !to) continue
      const fr = pos(from)
      const tr = pos(to)
      const s: Seg = {
        line: document.createElementNS('http://www.w3.org/2000/svg', 'line'),
        a: document.createElementNS('http://www.w3.org/2000/svg', 'rect'),
        b: document.createElementNS('http://www.w3.org/2000/svg', 'rect'),
        x1: fr.right,
        y1: fr.bottom + 18,
        x2: tr.left - 14,
        y2: tr.top - 18,
      }
      for (const [r, x, y] of [
        [s.a, s.x1, s.y1],
        [s.b, s.x2, s.y2],
      ] as const) {
        r.setAttribute('x', String(x - 2.5))
        r.setAttribute('y', String(y - 2.5))
        r.setAttribute('width', '5')
        r.setAttribute('height', '5')
      }
      s.line.setAttribute('x1', String(s.x1))
      s.line.setAttribute('y1', String(s.y1))
      svg.append(s.line, s.a, s.b)
      segs.push(s)
    }
    draw()
  }
  const draw = () => {
    const read = scrollY + innerHeight * 0.6 - (main.getBoundingClientRect().top + scrollY)
    segs.forEach(s => {
      const p = Math.min(1, Math.max(0, (read - s.y1) / (s.y2 - s.y1)))
      s.line.setAttribute('x2', String(s.x1 + (s.x2 - s.x1) * p))
      s.line.setAttribute('y2', String(s.y1 + (s.y2 - s.y1) * p))
      s.a.classList.toggle('is-on', p > 0)
      s.b.classList.toggle('is-on', p >= 1)
    })
  }
  ScrollTrigger.addEventListener('refresh', build)
  ScrollTrigger.create({ trigger: main, start: 'top bottom', end: 'bottom top', onUpdate: draw })
  build()
}
