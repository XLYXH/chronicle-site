import { qs, qsa } from '../lib/env'
import { fuse, TECHS, UNKNOWN_TITLE, type Recipe, type Tech } from '../lib/chemistry'
import { orbitPoint } from '../lib/orbit'

/**
 * “A little chemistry” —— 轨道版。
 * 八颗技术液滴排在一条倾斜的 3D 圆环上缓慢公转；指针左右移动让环侧倾、上下移动改变俯仰；
 * 在场地里横向拖动可以拨转圆环（带惯性）。点选一颗，它离开轨道飞向中心；再点一颗，两颗在中心融合
 * （SVG goo 滤镜让边缘真的黏在一起），命中原仓库里的配方就变成通往仓库的链接，否则是 “A new possibility”。
 * 视觉层（被滤镜处理的圆）与交互层（清晰的按钮）分开，按钮可聚焦、可键盘操作。
 */
type Mode = 'ring' | 'held' | 'fused'
interface Drop {
  tech: Tech
  blob: HTMLElement
  btn: HTMLButtonElement
  phase: number
  mode: Mode
  x: number
  y: number
  s: number
  z: number
}
interface Fusion {
  a: Drop
  b: Drop
  recipe: Recipe | null
  blob: HTMLElement
  node: HTMLElement
  grow: number
}

export function initLab(animate: boolean) {
  const field = qs('[data-lab-field]')
  const goo = qs('[data-lab-goo]')
  const labels = qs('[data-lab-labels]')
  const status = qs('[data-lab-status]')
  const reset = qs<HTMLButtonElement>('[data-lab-reset]')
  const ring = qs<SVGEllipseElement>('[data-lab-ring] ellipse')
  if (!field || !goo || !labels || !status) return

  const say = (msg: string) => (status.textContent = msg)
  const drops: Drop[] = []
  let fusion: Fusion | null = null
  const held: Drop[] = []
  let w = 0
  let h = 0
  let r = 40

  TECHS.forEach((tech, i) => {
    const blob = document.createElement('i')
    blob.className = 'lab__blob'
    goo.append(blob)
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'lab__drop'
    btn.textContent = tech.label
    btn.setAttribute('aria-pressed', 'false')
    btn.dataset.cursor = 'Pick'
    labels.append(btn)
    drops.push({ tech, blob, btn, phase: (i / TECHS.length) * Math.PI * 2, mode: 'ring', x: 0, y: 0, s: 1, z: 0 })
  })

  // ---- 轨道状态 ----
  const orbit = { angle: 0, vel: animate ? 0.16 : 0, pitch: 0.42, roll: -0.06, tPitch: 0.42, tRoll: -0.06 }
  const AUTO = 0.16
  let dragging = false
  let lastX = 0
  let lastT = 0
  let moved = 0

  // 竖屏场地更高：环抬得更“俯视”，液滴间距更大
  let pitch0 = 0.42
  const size = () => {
    w = field.clientWidth
    h = field.clientHeight
    r = Math.max(28, Math.min(50, w * 0.04))
    pitch0 = h / w > 1 ? 0.95 : 0.42
    orbit.tPitch = orbit.pitch = pitch0
  }

  const target = (d: Drop) => {
    const cx = w / 2
    const cy = h / 2
    if (d.mode === 'ring') {
      const rx = Math.min(w * (h / w > 1 ? 0.42 : 0.4), 520)
      const p = orbitPoint(orbit.angle + d.phase, rx, orbit.pitch, orbit.roll)
      return { x: cx + p.x, y: cy + p.y, s: p.scale, z: p.z }
    }
    if (d.mode === 'held') {
      const i = held.indexOf(d)
      return { x: cx + (i === 0 ? -r * 0.9 : r * 0.9), y: cy, s: 1.1, z: 2 }
    }
    return { x: cx, y: cy, s: 0.4, z: 2 }
  }

  const render = (snap: boolean) => {
    const k = snap ? 1 : 0.16
    drops.forEach(d => {
      const t = target(d)
      d.x += (t.x - d.x) * k
      d.y += (t.y - d.y) * k
      d.s += (t.s - d.s) * k
      d.z = t.z
      const R = r * d.s * (d.tech.label.length > 6 ? 1.14 : 1)
      const tr = `translate3d(${(d.x - R).toFixed(1)}px, ${(d.y - R).toFixed(1)}px, 0)`
      d.blob.style.transform = tr
      d.blob.style.width = d.blob.style.height = `${(R * 2).toFixed(1)}px`
      d.btn.style.transform = tr
      d.btn.style.width = d.btn.style.height = `${(R * 2).toFixed(1)}px`
      d.btn.style.zIndex = String(Math.round((d.z + 1) * 10))
      // 背面的液滴变淡、文字缩小，前面的清晰
      const depth = (d.z + 1) / 2
      d.btn.style.opacity = d.mode === 'fused' ? '0' : String(0.35 + 0.65 * Math.min(1, depth * 1.4))
      d.btn.style.fontSize = `${(11 + 3 * Math.min(1, d.s)).toFixed(1)}px`
    })
    if (ring) {
      const rx = Math.min(w * (h / w > 1 ? 0.42 : 0.4), 520)
      ring.setAttribute('cx', String(w / 2))
      ring.setAttribute('cy', String(h / 2))
      ring.setAttribute('rx', rx.toFixed(1))
      ring.setAttribute('ry', (rx * Math.sin(orbit.pitch)).toFixed(1))
      ring.setAttribute('transform', `rotate(${((orbit.roll * 180) / Math.PI).toFixed(2)} ${w / 2} ${h / 2})`)
    }
    if (fusion) {
      fusion.grow += ((animate ? 1 : 1) - fusion.grow) * (snap ? 1 : 0.12)
      const R = Math.max(62, Math.min(96, w * 0.075)) * fusion.grow
      const v = `translate3d(${(w / 2 - R).toFixed(1)}px, ${(h / 2 - R).toFixed(1)}px, 0)`
      fusion.blob.style.transform = v
      fusion.blob.style.width = fusion.blob.style.height = `${(R * 2).toFixed(1)}px`
      fusion.node.style.transform = v
      fusion.node.style.width = fusion.node.style.height = `${(R * 2).toFixed(1)}px`
      fusion.node.style.opacity = String(Math.max(0, (fusion.grow - 0.6) / 0.4))
    }
  }

  const sync = () =>
    drops.forEach(d => d.btn.setAttribute('aria-pressed', String(d.mode === 'held')))

  const doFuse = (a: Drop, b: Drop) => {
    a.mode = b.mode = 'fused'
    held.length = 0
    sync()
    const recipe = fuse(a.tech.id, b.tech.id)
    const blob = document.createElement('i')
    blob.className = 'lab__blob lab__blob--fused' + (recipe ? ' is-match' : '')
    goo.append(blob)
    const node = document.createElement('div')
    node.className = 'lab__fused' + (recipe ? ' is-match' : '')
    const title = recipe ? recipe.title : UNKNOWN_TITLE
    const parts = `<span class="lab__fused-k">${a.tech.label} + ${b.tech.label}</span>`
    node.innerHTML = recipe
      ? `${parts}<a href="${recipe.href}" target="_blank" rel="noopener">${title}<svg aria-hidden="true"><use href="#arrow" /></svg></a><button type="button" class="lab__split" aria-label="Split ${title}">Split</button>`
      : `${parts}<strong>${title}</strong><button type="button" class="lab__split" aria-label="Split">Split</button>`
    labels.append(node)
    fusion = { a, b, recipe, blob, node, grow: animate ? 0.15 : 1 }
    a.btn.hidden = b.btn.hidden = true
    qs('.lab__split', node)?.addEventListener('click', () => split(true))
    if (recipe) {
      qs(`[data-found-key="${recipe.key}"]`)?.classList.add('is-found')
      say(`${a.tech.label} + ${b.tech.label} = ${recipe.title}. Open its repository.`)
    } else say(`${a.tech.label} + ${b.tech.label} = ${UNKNOWN_TITLE}.`)
    setTimeout(() => (qs('a', node) ?? qs('button', node))?.focus({ preventScroll: true }), animate ? 450 : 0)
    if (!animate) render(true)
  }

  const split = (focus: boolean) => {
    if (!fusion) return
    const f = fusion
    fusion = null
    f.blob.remove()
    f.node.remove()
    for (const d of [f.a, f.b]) {
      d.mode = 'ring'
      d.btn.hidden = false
    }
    sync()
    if (focus) f.a.btn.focus({ preventScroll: true })
    say(`Split back into ${f.a.tech.label} and ${f.b.tech.label}.`)
    if (!animate) render(true)
  }

  const pick = (d: Drop) => {
    if (d.mode === 'held') {
      held.splice(held.indexOf(d), 1)
      d.mode = 'ring'
      sync()
      say('Selection cleared.')
    } else {
      if (fusion) split(false)
      d.mode = 'held'
      held.push(d)
      sync()
      if (held.length === 2) {
        const [a, b] = held as [Drop, Drop]
        if (animate) setTimeout(() => doFuse(a, b), 520)
        else doFuse(a, b)
      } else say(`${d.tech.label} pulled to the core — pick another drop to fuse.`)
    }
    if (!animate) render(true)
  }

  drops.forEach(d =>
    d.btn.addEventListener('click', () => {
      if (moved > 6) return
      if (held.length >= 2) return
      pick(d)
    }),
  )

  // ---- 拖动拨转圆环 ----
  field.addEventListener('pointerdown', e => {
    if ((e.target as Element).closest('.lab__fused')) return
    dragging = true
    moved = 0
    lastX = e.clientX
    lastT = performance.now()
    field.classList.add('is-dragging')
  })
  window.addEventListener('pointermove', e => {
    if (dragging) {
      const dx = e.clientX - lastX
      const now = performance.now()
      moved += Math.abs(dx)
      const da = (dx / Math.max(1, w)) * Math.PI * 1.6
      orbit.angle += da
      orbit.vel = (da / Math.max(1, now - lastT)) * 1000 * 0.6
      lastX = e.clientX
      lastT = now
      if (!animate) render(true)
    }
    if (!animate || e.pointerType !== 'mouse') return
    const b = field.getBoundingClientRect()
    if (e.clientY < b.top - 200 || e.clientY > b.bottom + 200) return
    const nx = ((e.clientX - b.left) / b.width) * 2 - 1
    const ny = ((e.clientY - b.top) / b.height) * 2 - 1
    orbit.tRoll = Math.max(-1, Math.min(1, nx)) * 0.14
    orbit.tPitch = pitch0 + Math.max(-1, Math.min(1, ny)) * 0.16
  })
  const end = () => {
    if (!dragging) return
    dragging = false
    field.classList.remove('is-dragging')
    // click 事件在 pointerup 之后触发：稍后再清零移动量
    setTimeout(() => (moved = 0), 0)
  }
  window.addEventListener('pointerup', end)
  window.addEventListener('pointercancel', end)

  // 键盘：左右方向键拨转
  field.addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    orbit.angle += (e.key === 'ArrowLeft' ? -1 : 1) * (Math.PI / 4)
    if (!animate) render(true)
  })

  reset?.addEventListener('click', () => {
    split(false)
    held.splice(0).forEach(d => (d.mode = 'ring'))
    sync()
    qsa('.lab__found li').forEach(li => li.classList.remove('is-found'))
    say('Orbit reset. Tap two drops to fuse them.')
    if (!animate) render(true)
  })

  // ---- 帧循环：只在可见时运行 ----
  let on = false
  let raf = 0
  let last = 0
  const tick = (now: number) => {
    const dt = Math.min(0.05, (now - (last || now)) / 1000)
    last = now
    if (!dragging) {
      orbit.vel += (AUTO - orbit.vel) * (1 - Math.exp(-dt * 1.6))
      orbit.angle += orbit.vel * dt
    }
    orbit.pitch += (orbit.tPitch - orbit.pitch) * (1 - Math.exp(-dt * 3))
    orbit.roll += (orbit.tRoll - orbit.roll) * (1 - Math.exp(-dt * 3))
    render(false)
    if (on) raf = requestAnimationFrame(tick)
  }
  if (animate) {
    new IntersectionObserver(([en]) => {
      on = !!en?.isIntersecting
      cancelAnimationFrame(raf)
      last = 0
      if (on) raf = requestAnimationFrame(tick)
    }).observe(field)
  }

  new ResizeObserver(() => {
    size()
    render(true)
  }).observe(field)
  size()
  render(true)
}
