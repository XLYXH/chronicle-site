import { gsap } from 'gsap'

/**
 * v12/v13 · 飘落的花瓣（灵感：穗波市里“粉色花瓣像云一样飘过天空”）。
 * v13：更多、更大、更饱和，并且有景深——远处的小而清晰，近处的大而虚化。
 * 为了不在每帧里做模糊，先把三种颜色 × 三档虚化的花瓣各画成一张小贴图，
 * 帧循环里只做 drawImage + 旋转 + 压扁（模拟三维翻滚）。
 * 滚动会把花瓣往反方向“吹”，指针附近的花瓣会被拨开。
 * 页面空闲后才启动；标签页隐藏时停；减弱动效时不创建。
 */
type Petal = { x: number; y: number; z: number; r: number; spin: number; flip: number; vf: number; vx: number; vy: number; tex: number }

export function initPetals(animate: boolean, fine: boolean) {
  if (!animate) return
  const start = () => run(fine)
  const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
  // 等首屏入场结束、页面空闲之后再开始，不和首屏渲染抢主线程
  setTimeout(() => (ric ? ric(start, { timeout: 2000 }) : start()), 2600)
}

const COLORS = ['#ff5f9e', '#ff8fbd', '#ffd0e2']
const BLURS = [0, 2.5, 6]
const BASE = 22

function sprite(color: string, blur: number): HTMLCanvasElement {
  const pad = Math.ceil(blur * 2.5) + 2
  const c = document.createElement('canvas')
  c.width = c.height = BASE * 2 + pad * 2
  const g = c.getContext('2d')!
  g.translate(c.width / 2, c.height / 2)
  if (blur) g.filter = `blur(${blur}px)`
  const s = BASE
  g.beginPath()
  g.moveTo(0, -s)
  g.bezierCurveTo(s * 0.95, -s * 0.9, s * 0.8, s * 0.5, 0, s)
  g.bezierCurveTo(-s * 0.8, s * 0.5, -s * 0.95, -s * 0.9, 0, -s)
  g.lineTo(0, -s * 0.6)
  g.closePath()
  const grad = g.createLinearGradient(0, -s, 0, s)
  grad.addColorStop(0, '#fff2f7')
  grad.addColorStop(0.35, color)
  grad.addColorStop(1, color)
  g.fillStyle = grad
  g.fill()
  return c
}

function run(fine: boolean) {
  const canvas = document.createElement('canvas')
  canvas.className = 'petals'
  canvas.setAttribute('aria-hidden', 'true')
  document.body.append(canvas)
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const tex = BLURS.flatMap(b => COLORS.map(c => sprite(c, b)))
  let W = 0
  let H = 0
  const S = Math.min(1.25, devicePixelRatio || 1)
  const resize = () => {
    W = innerWidth
    H = innerHeight
    canvas.width = Math.round(W * S)
    canvas.height = Math.round(H * S)
  }
  resize()
  window.addEventListener('resize', resize)

  const count = W < 720 ? 30 : 64
  const mk = (top = false): Petal => {
    // 景深：z 越大越近；近处的少、大、虚
    const z = Math.random() ** 1.8 * 1.6 + 0.25
    const layer = z > 1.25 ? 2 : z > 0.8 ? 1 : 0
    return {
      x: Math.random() * W,
      y: top ? -40 - Math.random() * 80 : Math.random() * H,
      z,
      r: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 1.6,
      flip: Math.random() * Math.PI * 2,
      vf: 1.2 + Math.random() * 2.2,
      vx: 16 + Math.random() * 30,
      vy: 22 + Math.random() * 26,
      tex: layer * COLORS.length + Math.floor(Math.random() * COLORS.length),
    }
  }
  const petals = Array.from({ length: count }, () => mk()).sort((a, b) => a.z - b.z)

  let lastY = scrollY
  let wind = 0
  let px = -999
  let py = -999
  if (fine)
    window.addEventListener(
      'pointermove',
      e => {
        px = e.clientX
        py = e.clientY
      },
      { passive: true },
    )

  let on = true
  document.addEventListener('visibilitychange', () => (on = !document.hidden))
  gsap.ticker.add((_t, dtMs) => {
    if (!on) return
    const dt = Math.min(0.05, dtMs / 1000)
    const dy = scrollY - lastY
    lastY = scrollY
    wind += (Math.max(-60, Math.min(60, dy)) * 6 - wind) * (1 - Math.exp(-dt * 4))
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (const p of petals) {
      p.flip += p.vf * dt
      p.r += p.spin * dt
      p.x += (p.vx + Math.sin(p.flip * 0.5) * 18) * p.z * dt
      p.y += (p.vy * p.z - wind * 0.08 * p.z) * dt
      const ddx = p.x - px
      const ddy = p.y - py
      const d2 = ddx * ddx + ddy * ddy
      if (d2 < 14000) {
        const k = (1 - d2 / 14000) * 300 * dt
        const d = Math.sqrt(d2) || 1
        p.x += (ddx / d) * k
        p.y += (ddy / d) * k
      }
      if (p.y > H + 60 || p.x > W + 60 || p.y < -160) Object.assign(p, mk(true), { x: Math.random() * W * 0.9 - W * 0.2, z: p.z, tex: p.tex })
      const t = tex[p.tex]!
      const size = (t.width / BASE) * 7 * p.z
      const f = Math.cos(p.flip)
      ctx.setTransform(S, 0, 0, S, p.x * S, p.y * S)
      ctx.rotate(p.r)
      ctx.scale(1, 0.22 + 0.78 * Math.abs(f))
      ctx.globalAlpha = f > 0 ? 0.95 : 0.78
      ctx.drawImage(t, -size / 2, -size / 2, size, size)
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
  })
}
