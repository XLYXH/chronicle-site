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

/** 可复现的伪随机数（同一份布局每次都一样） */
function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
}

/**
 * v12 · 球体里的城市（灵感：《鸣潮》2.8 穗波市——被封存在索诺拉里、反复重置的都市）：
 * 三层远近不同的玻璃高楼剪影 + 正中一座带天线环的高塔（呼应“虹音塔”），
 * 地平线以下是被海水淹没的街道，楼群倒映在水里。全部是程序生成的原创 SVG。
 */
function city(): string {
  const r = rng(7)
  const H = 64 // 地平线（viewBox 0..100）
  const layer = (n: number, minH: number, maxH: number, cls: string) => {
    let d = ''
    let x = -2
    while (x < 102) {
      const w = 2 + r() * (n === 0 ? 3 : 5)
      const h = minH + r() * (maxH - minH)
      // 离塔越近越高，像城市中心
      const boost = Math.max(0, 1 - Math.abs(x + w / 2 - 50) / 34) * (maxH - minH) * 0.6
      const top = H - h - boost
      d += r() > 0.75 ? `M${x} ${H}V${top + 1.4}L${x + w / 2} ${top}L${x + w} ${top + 1.4}V${H}Z` : `M${x} ${H}V${top}H${x + w}V${H}Z`
      x += w + r() * 0.8
    }
    return `<path class="${cls}" d="${d}"/>`
  }
  const windows = (() => {
    let d = ''
    for (let i = 0; i < 70; i++) {
      const x = 8 + r() * 84
      const y = H - 3 - r() * 22 * Math.max(0.25, 1 - Math.abs(x - 50) / 45)
      d += `M${x.toFixed(1)} ${y.toFixed(1)}h0.6`
    }
    return `<path class="bd__win" d="${d}"/>`
  })()
  const tower = `<g class="bd__tower"><path d="M49.2 ${H}L49.6 16H50.4L50.8 ${H}Z"/><path d="M48 ${H}L49.4 36H50.6L52 ${H}Z"/><path class="bd__mast" d="M50 16V7"/><ellipse cx="50" cy="22" rx="3.2" ry="0.8"/><ellipse cx="50" cy="29" rx="4.4" ry="1.1"/><circle class="bd__beacon" cx="50" cy="7" r="0.7"/></g>`
  const sky = `${layer(0, 6, 14, 'bd__far')}${layer(1, 4, 22, 'bd__mid')}${tower}${layer(2, 2, 10, 'bd__near')}${windows}`
  return `<svg class="bd__city" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="bd-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="s0"/><stop offset=".45" class="s1"/><stop offset=".64" class="s2"/><stop offset=".64" class="s3"/><stop offset="1" class="s4"/></linearGradient></defs><rect width="100" height="100" fill="url(#bd-sky)"/><g class="bd__sky">${sky}</g><g class="bd__reflect" transform="translate(0 ${H * 2}) scale(1 -1)">${sky}</g><path class="bd__ripple" d="${ripples(H, r)}"/><g class="bd__pulse"><circle cx="50" cy="7" r="3"/><circle cx="50" cy="7" r="3"/><circle cx="50" cy="7" r="3"/></g></svg>`
}
function ripples(H: number, r: () => number) {
  let d = ''
  for (let i = 0; i < 26; i++) {
    const y = H + 1.5 + r() * 32
    const x = r() * 90
    d += `M${x.toFixed(1)} ${y.toFixed(1)}h${(3 + r() * 12).toFixed(1)}`
  }
  return d
}

/** 声波等高线：一组相位渐变的正弦线，像官网背景那层细密的“波”纹（Wuthering *Waves*） */
function waves(): string {
  let d = ''
  for (let k = 0; k < 18; k++) {
    let line = ''
    for (let x = 0; x <= 1440; x += 24) {
      const y = 640 + k * 18 + Math.sin(x / 140 + k * 0.42) * (18 + k * 1.6) + Math.sin(x / 61 + k) * 4
      line += `${x === 0 ? 'M' : 'L'}${x} ${y.toFixed(1)}`
    }
    d += line
  }
  return `<svg class="bd__waves" viewBox="0 0 1440 1000" preserveAspectRatio="xMidYMax slice"><path d="${d}"/></svg>`
}

/** 虹光结晶：球体边缘几块会闪光的晶片（原创多边形 + 虹彩渐变） */
function shards(): string {
  const r = rng(11)
  let g = ''
  for (let i = 0; i < 16; i++) {
    // v13：更多、更大，绕满整圈（上半圈更密）
    const a = i < 11 ? -2.9 + (i / 11) * 2.7 + r() * 0.2 : 0.4 + ((i - 11) / 5) * 2.2 + r() * 0.3
    const rad = 48 + r() * 9
    const cx = 50 + Math.cos(a) * rad
    const cy = 50 + Math.sin(a) * rad
    const s = 2 + r() * 4.4
    const pts = [
      [0, -s * 1.6],
      [s * 0.7, -s * 0.2],
      [s * 0.3, s * 1.2],
      [-s * 0.6, s * 0.4],
    ]
      .map(([x, y]) => `${(cx + x!).toFixed(2)},${(cy + y!).toFixed(2)}`)
      .join(' ')
    g += `<polygon points="${pts}" style="--i:${i}"/>`
  }
  return `<svg class="bd__shards" viewBox="0 0 100 100"><defs><linearGradient id="bd-irid" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8fe9ff"/><stop offset=".35" stop-color="#b9a8ff"/><stop offset=".65" stop-color="#ff9fd0"/><stop offset="1" stop-color="#ffe6a8"/></linearGradient></defs>${g}</svg>`
}

/** 刻度环：120 道刻度，每 10 道一根长的 */
function ticks(): string {
  let d = ''
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2
    const r1 = 44.2
    const r0 = i % 10 === 0 ? 41.6 : i % 5 === 0 ? 42.8 : 43.5
    const f = (n: number) => n.toFixed(2)
    d += `M${f(50 + Math.cos(a) * r0)} ${f(50 + Math.sin(a) * r0)}L${f(50 + Math.cos(a) * r1)} ${f(50 + Math.sin(a) * r1)}`
  }
  return `<svg class="bd__ticks" viewBox="0 0 100 100"><path d="${d}"/></svg>`
}

/**
 * 技术节点图：三个项目各自的技术栈（取自作品列表）各成一簇，簇内相连、簇心连向中央。
 * 两个景深层随滚动以不同速度视差；展台当前的项目那一簇会被点亮。
 */
const CLUSTERS: Array<{ key: string; hub: [number, number]; depth: 0 | 1; nodes: Array<[string, number, number]> }> = [
  {
    key: 'blueprint',
    hub: [250, 230],
    depth: 0,
    nodes: [
      ['C++17', 120, 150],
      ['Qt 6', 330, 120],
      ['Visual AST', 160, 340],
      ['Node Graph', 360, 300],
    ],
  },
  {
    key: 'monitor',
    hub: [1180, 260],
    depth: 1,
    nodes: [
      ['Vue', 1290, 140],
      ['ESP32', 1060, 160],
      ['Telemetry', 1300, 360],
    ],
  },
  {
    key: 'proxy',
    hub: [1040, 720],
    depth: 0,
    nodes: [
      ['TypeScript', 1220, 790],
      ['Edge', 900, 820],
      ['AI Proxy', 1180, 620],
    ],
  },
  {
    key: 'site',
    hub: [330, 700],
    depth: 1,
    nodes: [
      ['GSAP', 180, 780],
      ['WebGL', 430, 820],
      ['Three.js', 210, 600],
    ],
  },
]
function graph(): string {
  const layer = (depth: 0 | 1) =>
    CLUSTERS.filter(c => c.depth === depth)
      .map(c => {
        const [hx, hy] = c.hub
        const lines = c.nodes.map(([, x, y]) => `M${hx} ${hy}L${x} ${y}`).join('')
        const nodes = c.nodes.map(([t, x, y]) => `<rect x="${x - 3}" y="${y - 3}" width="6" height="6"/><text x="${x + 10}" y="${y + 4}">${t}</text>`).join('')
        return `<g class="bd__cl" data-cl="${c.key}"><path class="bd__spoke" d="M${hx} ${hy}L720 470"/><path d="${lines}"/><circle cx="${hx}" cy="${hy}" r="4"/>${nodes}</g>`
      })
      .join('')
  return `<svg class="bd__graph" viewBox="0 0 1440 940" preserveAspectRatio="xMidYMid slice"><g class="bd__layer bd__layer--0">${layer(0)}</g><g class="bd__layer bd__layer--1">${layer(1)}</g></svg>`
}

export function initBackdrop(animate: boolean) {
  const bd = document.createElement('div')
  bd.className = 'bd'
  bd.setAttribute('aria-hidden', 'true')
  bd.innerHTML = `
    <div class="bd__grid"></div>
    ${waves()}
    ${graph()}
    <i class="bd__cross bd__cross--x"></i><i class="bd__cross bd__cross--y"></i>
    <div class="bd__orb"><i class="bd__disc">${city()}<i class="bd__sweep"></i><i class="bd__spec"></i></i><i class="bd__rim"></i>${ticks()}<svg class="bd__orbit" viewBox="0 0 100 100"><circle cx="50" cy="50" r="49.6" pathLength="360"/><path id="bd-arc" d="M50 2.2a47.8 47.8 0 1 1 0 95.6a47.8 47.8 0 1 1 0-95.6" fill="none"/><text><textPath href="#bd-arc" startOffset="3%">3D FIELD // 01000011</textPath></text><text><textPath href="#bd-arc" startOffset="36%">06 / DESTINATIONS // ORBITAL INDEX</textPath></text><text><textPath href="#bd-arc" startOffset="71%">SIGNAL GAIN</textPath></text></svg><i class="bd__node"></i><i class="bd__center"></i>${shards()}</div>
    <p class="bd__ghost"></p>
    <i class="bd__grain"></i>
    <i class="bd__c bd__c--tl"></i><i class="bd__c bd__c--tr"></i><i class="bd__c bd__c--bl"></i><i class="bd__c bd__c--br"></i>`
  document.body.prepend(bd)

  // v13 · 章节转场：从塔尖发出的一圈广播波 + 一道斜贯全屏的绯红“裁剪”线
  const fx = document.createElement('div')
  fx.className = 'fx'
  fx.setAttribute('aria-hidden', 'true')
  fx.innerHTML = '<i class="fx__pulse"></i><i class="fx__pulse fx__pulse--2"></i><i class="fx__cut"></i>'
  document.body.append(fx)

  const rail = document.createElement('div')
  rail.className = 'rail'
  rail.setAttribute('aria-hidden', 'true')
  rail.innerHTML = `<i class="rail__line"><b></b></i>${SECTIONS.map(() => '<i class="rail__dot"></i>').join('')}`
  document.body.append(rail)

  // 展台当前的项目 → 点亮对应的那一簇节点
  const stage = qs<HTMLElement>('.showcase__stage')
  const syncCl = () => (bd.dataset.active = stage?.dataset.active ?? 'blueprint')
  syncCl()
  if (stage) new MutationObserver(syncCl).observe(stage, { attributes: true, attributeFilter: ['data-active'] })

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
    transition()
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
  function transition() {
    const b = qs('.bd__beacon', bd)?.getBoundingClientRect()
    if (b) {
      fx.style.setProperty('--fx', `${(b.left + b.width / 2).toFixed(0)}px`)
      fx.style.setProperty('--fy', `${(b.top + b.height / 2).toFixed(0)}px`)
    }
    fx.classList.remove('is-on')
    void fx.offsetWidth
    fx.classList.add('is-on')
  }
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
    // 离开首屏后球体向右侧让位（不再淡出），正文靠左侧的纸色遮罩和面板保证可读
    bd.style.setProperty('--hv', Math.min(1, scrollY / (innerHeight * 0.9)).toFixed(3))
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
