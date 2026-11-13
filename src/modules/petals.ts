import { gsap } from 'gsap'

/**
 * v12 · 飘落的花瓣（灵感：穗波市里“粉色花瓣像云一样飘过天空”）。
 * 一张低分辨率 2D 画布，几十片花瓣：翻转（用 cos 压扁模拟三维翻滚）、随风横移；
 * 滚动会把花瓣往反方向“吹”一下，指针附近的花瓣会被拨开。
 * 页面空闲后才启动；标签页隐藏时停；减弱动效时不创建。
 */
type Petal = { x: number; y: number; z: number; r: number; spin: number; flip: number; vf: number; vx: number; vy: number; hue: number }

export function initPetals(animate: boolean, fine: boolean) {
  if (!animate) return
  const start = () => run(fine)
  const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
  // 等首屏入场结束、页面空闲之后再开始，不和首屏渲染抢主线程
  setTimeout(() => (ric ? ric(start, { timeout: 2000 }) : start()), 2600)
}

function run(fine: boolean) {
  const canvas = document.createElement('canvas')
  canvas.className = 'petals'
  canvas.setAttribute('aria-hidden', 'true')
  document.body.append(canvas)
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  let W = 0
  let H = 0
  const S = Math.min(1.5, devicePixelRatio || 1)
  const resize = () => {
    W = innerWidth
    H = innerHeight
    canvas.width = Math.round(W * S)
    canvas.height = Math.round(H * S)
  }
  resize()
  window.addEventListener('resize', resize)

  const count = W < 720 ? 16 : 34
  const mk = (top = false): Petal => ({
    x: Math.random() * W,
    y: top ? -20 - Math.random() * 60 : Math.random() * H,
    z: 0.45 + Math.random() * 0.9,
    r: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 1.6,
    flip: Math.random() * Math.PI * 2,
    vf: 1.2 + Math.random() * 2.2,
    vx: 14 + Math.random() * 26,
    vy: 18 + Math.random() * 22,
    hue: Math.random(),
  })
  const petals = Array.from({ length: count }, () => mk())

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

  const draw = (p: Petal) => {
    const s = 7 * p.z
    const f = Math.cos(p.flip)
    ctx.save()
    ctx.translate(p.x * S, p.y * S)
    ctx.rotate(p.r)
    ctx.scale(S, S * (0.25 + 0.75 * Math.abs(f)))
    // 一片带缺口的樱花瓣
    ctx.beginPath()
    ctx.moveTo(0, -s)
    ctx.bezierCurveTo(s * 0.9, -s * 0.9, s * 0.8, s * 0.5, 0, s)
    ctx.bezierCurveTo(-s * 0.8, s * 0.5, -s * 0.9, -s * 0.9, 0, -s)
    ctx.lineTo(0, -s * 0.62)
    ctx.closePath()
    const light = f > 0 ? 0.85 : 0.7
    ctx.fillStyle =
      p.hue > 0.82 ? `rgba(255, 222, 236, ${light})` : `rgba(255, ${150 + Math.round(p.hue * 40)}, ${190 + Math.round(p.hue * 20)}, ${light * 0.9})`
    ctx.fill()
    ctx.restore()
  }

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
      if (d2 < 12000) {
        const k = (1 - d2 / 12000) * 260 * dt
        const d = Math.sqrt(d2) || 1
        p.x += (ddx / d) * k
        p.y += (ddy / d) * k
      }
      if (p.y > H + 30 || p.x > W + 30 || p.y < -120) Object.assign(p, mk(true), { x: Math.random() * W * 0.9 - W * 0.2 })
      draw(p)
    }
  })
}
