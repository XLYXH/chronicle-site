import { buildLensMap, type LensSpec } from '../lib/lens'

/**
 * 液态玻璃（参考 muyudada《液态玻璃导航栏》的做法并加以改造）：
 *  - 玻璃画在元素的 ::before 上：backdrop-filter 取到背后内容，再用 filter:url(#…) 把这层结果“折射”；
 *    元素本身不加 backdrop-filter，避免成为 Backdrop Root，嵌套的玻璃（导航里的液滴）仍能取样。
 *  - 位移贴图不用随机噪声，而是按元素实际尺寸，用圆角矩形 SDF 在 canvas 里生成：边缘弧面向内折射，
 *    透镜额外带中心放大；可选 RGB 三通道不同位移量，形成轻微色散。
 *  - 只有 Chromium 能把 SVG filter 作用在 backdrop 结果上：其余浏览器（Safari / Firefox）退化为磨砂玻璃，
 *    不支持 backdrop-filter 时再退化为更实的半透明底。
 */
export type GlassMode = 'refract' | 'frost' | 'solid'

export function detectGlass(): GlassMode {
  const css = window.CSS
  const bf = css?.supports?.('backdrop-filter', 'blur(2px)') || css?.supports?.('-webkit-backdrop-filter', 'blur(2px)')
  if (!bf) return 'solid'
  const brands = (navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } }).userAgentData?.brands
  const chromium = !!brands?.some(b => /Chromium|Google Chrome|Microsoft Edge/.test(b.brand))
  const q = new URLSearchParams(location.search).get('glass')
  if (q === 'frost' || q === 'solid') return q
  return chromium ? 'refract' : 'frost'
}

export interface GlassOptions {
  /** 边缘弧面宽度：数值或按尺寸计算 */
  bezel: number | ((w: number, h: number) => number)
  /** 边缘位移 px */
  edge: number | ((w: number, h: number) => number)
  magnify?: number
  /** 色散：0 关闭；0.08 表示 B 通道位移比 R 少 8% */
  dispersion?: number
  /** 叠加的轻微模糊（px，作用在折射前的取样上由 CSS 控制，这里只是贴图平滑） */
  smooth?: number
  /** 手动指定圆角；默认读取计算样式 */
  radius?: (w: number, h: number) => number
}

let defs: SVGSVGElement | null = null
let uid = 0
const NS = 'http://www.w3.org/2000/svg'
const cache = new Map<string, { href: string; scale: number }>()
let scratch: HTMLCanvasElement | null = null

function ensureDefs() {
  if (defs) return defs
  defs = document.createElementNS(NS, 'svg')
  defs.setAttribute('aria-hidden', 'true')
  defs.setAttribute('width', '0')
  defs.setAttribute('height', '0')
  defs.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden'
  document.body.append(defs)
  return defs
}

/** 位移场很平滑：按一半分辨率生成，再由 feImage 拉伸回原尺寸（主线程开销约为 1/4） */
const MAP_SCALE = 0.5

function mapFor(spec: LensSpec) {
  const key = `${spec.w}|${spec.h}|${spec.r}|${spec.bezel}|${spec.edge}|${spec.magnify ?? 0}`
  const hit = cache.get(key)
  if (hit) return hit
  const k = MAP_SCALE
  const w = Math.max(2, Math.round(spec.w * k))
  const h = Math.max(2, Math.round(spec.h * k))
  const m = buildLensMap({ ...spec, w, h, r: spec.r * k, bezel: spec.bezel * k, edge: spec.edge * k })
  scratch ??= document.createElement('canvas')
  scratch.width = w
  scratch.height = h
  const ctx = scratch.getContext('2d')!
  ctx.putImageData(new ImageData(m.data as Uint8ClampedArray<ArrayBuffer>, w, h), 0, 0)
  const out = { href: scratch.toDataURL('image/png'), scale: m.scale / k }
  cache.set(key, out)
  return out
}

/** 把贴图生成推迟到空闲时段，不和首屏渲染、入场动画抢主线程 */
const idle = (fn: () => void) => {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }
  if (w.requestIdleCallback) w.requestIdleCallback(fn, { timeout: 900 })
  else setTimeout(fn, 120)
}

const el = <K extends string>(tag: K, attrs: Record<string, string | number>) => {
  const n = document.createElementNS(NS, tag)
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v))
  return n
}

export interface Glass {
  update(): void
  destroy(): void
}

export function mountGlass(target: HTMLElement, opts: GlassOptions): Glass {
  const id = `lg-${++uid}`
  const svg = ensureDefs()
  const filter = el('filter', {
    id,
    x: 0,
    y: 0,
    width: '100%',
    height: '100%',
    'color-interpolation-filters': 'sRGB',
  })
  const image = el('feImage', { x: 0, y: 0, width: 1, height: 1, preserveAspectRatio: 'none', result: 'map' })
  filter.append(image)
  const disp: SVGElement[] = []
  const disperse = opts.dispersion ?? 0
  if (disperse) {
    const keep = ['1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0', '0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0', '0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0']
    keep.forEach((values, i) => {
      const d = el('feDisplacementMap', { in: 'SourceGraphic', in2: 'map', scale: 0, xChannelSelector: 'R', yChannelSelector: 'G', result: `d${i}` })
      disp.push(d)
      filter.append(d, el('feColorMatrix', { in: `d${i}`, type: 'matrix', values, result: `c${i}` }))
    })
    filter.append(
      el('feBlend', { in: 'c0', in2: 'c1', mode: 'screen', result: 'rg' }),
      el('feBlend', { in: 'rg', in2: 'c2', mode: 'screen' }),
    )
  } else {
    const d = el('feDisplacementMap', { in: 'SourceGraphic', in2: 'map', scale: 0, xChannelSelector: 'R', yChannelSelector: 'G' })
    disp.push(d)
    filter.append(d)
  }
  svg.append(filter)

  let last = ''
  let queued = false
  let ready = false
  const schedule = () => {
    if (queued) return
    queued = true
    idle(() => {
      queued = false
      compute()
    })
  }
  const compute = () => {
    const w = Math.round(target.offsetWidth)
    const h = Math.round(target.offsetHeight)
    if (w < 2 || h < 2) return
    const cs = getComputedStyle(target)
    const r = Math.round(opts.radius ? opts.radius(w, h) : Math.min(parseFloat(cs.borderTopLeftRadius) || 0, w / 2, h / 2))
    const bezel = Math.round(typeof opts.bezel === 'function' ? opts.bezel(w, h) : opts.bezel)
    const edge = Math.round(typeof opts.edge === 'function' ? opts.edge(w, h) : opts.edge)
    const spec: LensSpec = { w, h, r, bezel, edge, magnify: opts.magnify }
    const key = `${w}|${h}|${r}|${bezel}|${edge}`
    if (key === last) return
    last = key
    const m = mapFor(spec)
    image.setAttribute('width', String(w))
    image.setAttribute('height', String(h))
    image.setAttribute('href', m.href)
    disp.forEach((d, i) => d.setAttribute('scale', (m.scale * (1 - disperse * i)).toFixed(2)))
    if (!ready) {
      // 第一张贴图就绪后才挂滤镜，避免空贴图造成的整体偏移
      ready = true
      target.style.setProperty('--lg-filter', `url(#${id})`)
      target.classList.add('lg-on')
    }
  }
  const ro = new ResizeObserver(schedule)
  ro.observe(target)
  return {
    update: schedule,
    destroy() {
      ro.disconnect()
      filter.remove()
      target.style.removeProperty('--lg-filter')
      target.classList.remove('lg-on')
    },
  }
}

/** 页面级初始化：标记降级模式，并为常驻的玻璃件挂上折射 */
export function initGlass(): GlassMode {
  const mode = detectGlass()
  const root = document.documentElement
  root.dataset.glass = mode
  if (mode !== 'refract') return mode
  const pill = (w: number, h: number) => Math.min(w, h) / 2
  document.querySelectorAll<HTMLElement>('[data-lg]').forEach(n => {
    const kind = n.dataset.lg
    if (kind === 'bar') mountGlass(n, { bezel: (_w, h) => h * 0.42, edge: (_w, h) => h * 0.32, radius: pill })
    else if (kind === 'round') mountGlass(n, { bezel: (w, h) => Math.min(w, h) * 0.36, edge: (w, h) => Math.min(w, h) * 0.26, magnify: 0.06, radius: pill })
    else if (kind === 'chip') mountGlass(n, { bezel: (_w, h) => h * 0.4, edge: (_w, h) => h * 0.24, radius: pill })
    // v10：卡片级玻璃（圆角 20px），边缘倒角更宽、位移更轻，透出背后的点阵
    else if (kind === 'card') mountGlass(n, { bezel: () => 18, edge: () => 10, radius: () => 20 })
  })
  return mode
}
