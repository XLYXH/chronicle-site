import { gsap } from 'gsap'
import { qs, qsa } from '../lib/env'
import { fuse, TECHS, UNKNOWN_TITLE, type Recipe, type Tech } from '../lib/chemistry'

/**
 * “A little chemistry”：八颗技术液滴。拖动一颗到另一颗上，或依次点选两颗，
 * 它们在原地融合（SVG goo 滤镜让边缘真的“黏”在一起）；
 * 组合命中原仓库里的配方时，液滴变成通往对应仓库的链接，否则是 “A new possibility”。
 * 视觉层（被滤镜处理的圆）与交互层（清晰的按钮文字）分开，保证文字锐利、可聚焦。
 */
interface Drop {
  tech: Tech
  blob: HTMLElement
  btn: HTMLButtonElement
  nx: number
  ny: number
  x: number
  y: number
  r: number
  used: boolean
}
interface Fusion {
  a: Drop
  b: Drop
  recipe: Recipe | null
  blob: HTMLElement
  node: HTMLElement
}

// 归一化初始位置：桌面与竖屏各一套，避免拥挤
const LAYOUT_WIDE: [number, number][] = [
  [0.1, 0.32], [0.26, 0.68], [0.4, 0.28], [0.55, 0.7], [0.66, 0.3], [0.8, 0.66], [0.9, 0.3], [0.13, 0.78],
]
const LAYOUT_TALL: [number, number][] = [
  [0.24, 0.1], [0.74, 0.2], [0.3, 0.33], [0.74, 0.44], [0.26, 0.57], [0.72, 0.7], [0.3, 0.84], [0.76, 0.93],
]

export function initLab(animate: boolean) {
  const field = qs('[data-lab-field]')
  const goo = qs('[data-lab-goo]')
  const labels = qs('[data-lab-labels]')
  const status = qs('[data-lab-status]')
  const reset = qs<HTMLButtonElement>('[data-lab-reset]')
  if (!field || !goo || !labels || !status) return

  const say = (msg: string) => (status.textContent = msg)
  const drops: Drop[] = []
  const fusions: Fusion[] = []
  let selected: Drop | null = null
  let w = 0
  let h = 0

  TECHS.forEach(tech => {
    const blob = document.createElement('i')
    blob.className = 'lab__blob'
    goo.append(blob)
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'lab__drop'
    btn.textContent = tech.label
    btn.setAttribute('aria-pressed', 'false')
    labels.append(btn)
    drops.push({ tech, blob, btn, nx: 0, ny: 0, x: 0, y: 0, r: 0, used: false })
  })

  const place = (d: Drop) => {
    gsap.set([d.blob, d.btn], { x: d.x - d.r, y: d.y - d.r, width: d.r * 2, height: d.r * 2 })
  }

  const layout = () => {
    w = field.clientWidth
    h = field.clientHeight
    const tall = w < 700
    const L = tall ? LAYOUT_TALL : LAYOUT_WIDE
    const r = Math.max(34, Math.min(54, w * 0.042))
    drops.forEach((d, i) => {
      const [nx, ny] = L[i]!
      d.nx = nx
      d.ny = ny
      d.r = r * (d.tech.label.length > 6 ? 1.12 : 1)
      d.x = nx * w
      d.y = ny * h
      if (!d.used) place(d)
    })
    fusions.forEach(f => placeFusion(f, false))
  }

  const fusionSize = () => Math.max(58, Math.min(92, w * 0.07))
  const placeFusion = (f: Fusion, anim: boolean) => {
    const R = fusionSize()
    const cx = Math.min(w - R - 8, Math.max(R + 8, (f.a.x + f.b.x) / 2))
    const cy = Math.min(h - R - 8, Math.max(R + 8, (f.a.y + f.b.y) / 2))
    const v = { x: cx - R, y: cy - R, width: R * 2, height: R * 2 }
    if (anim) {
      gsap.fromTo(f.blob, { ...v, scale: 0.2 }, { scale: 1, duration: 0.9, ease: 'elastic.out(1, 0.55)', delay: 0.15 })
      gsap.fromTo(f.node, { ...v, opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'expo.out', delay: 0.35 })
    } else {
      gsap.set([f.blob, f.node], v)
    }
  }

  const select = (d: Drop | null) => {
    selected = d
    drops.forEach(x => x.btn.setAttribute('aria-pressed', String(x === d)))
    if (d) say(`${d.tech.label} selected — pick another drop to fuse.`)
  }

  const doFuse = (a: Drop, b: Drop) => {
    select(null)
    a.used = b.used = true
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
    const f: Fusion = { a, b, recipe, blob, node }
    fusions.push(f)
    a.btn.hidden = b.btn.hidden = true
    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2
    if (animate) {
      gsap.to([a.blob, b.blob], {
        x: mx - a.r,
        y: my - a.r,
        scale: 0.3,
        duration: 0.55,
        ease: 'power3.in',
        onComplete: () => gsap.set([a.blob, b.blob], { opacity: 0 }),
      })
    } else {
      gsap.set([a.blob, b.blob], { opacity: 0 })
    }
    placeFusion(f, animate)
    qs('.lab__split', node)?.addEventListener('click', () => split(f, true))
    if (recipe) {
      qs(`[data-found-key="${recipe.key}"]`)?.classList.add('is-found')
      say(`${a.tech.label} + ${b.tech.label} = ${recipe.title}. Open its repository.`)
    } else {
      say(`${a.tech.label} + ${b.tech.label} = ${UNKNOWN_TITLE}.`)
    }
    ;(qs('a', node) ?? qs('button', node))?.focus({ preventScroll: true })
  }

  const split = (f: Fusion, focus: boolean) => {
    fusions.splice(fusions.indexOf(f), 1)
    f.blob.remove()
    f.node.remove()
    for (const d of [f.a, f.b]) {
      d.used = false
      d.btn.hidden = false
      d.x = d.nx * w
      d.y = d.ny * h
      gsap.set(d.blob, { opacity: 1 })
      if (animate) {
        gsap.to([d.blob, d.btn], { x: d.x - d.r, y: d.y - d.r, scale: 1, duration: 0.9, ease: 'elastic.out(1, 0.6)' })
      } else place(d)
    }
    if (focus) f.a.btn.focus({ preventScroll: true })
    say(`Split back into ${f.a.tech.label} and ${f.b.tech.label}.`)
  }

  // 拖拽：拖动时检测最近的未使用液滴，足够近就高亮，松手即融合
  drops.forEach(d => {
    let sx = 0
    let sy = 0
    let ox = 0
    let oy = 0
    let dragging = false
    let target: Drop | null = null
    d.btn.addEventListener('pointerdown', e => {
      if (e.button !== 0) return
      d.btn.setPointerCapture(e.pointerId)
      sx = e.clientX
      sy = e.clientY
      ox = d.x
      oy = d.y
      dragging = false
    })
    d.btn.addEventListener('pointermove', e => {
      if (!d.btn.hasPointerCapture(e.pointerId)) return
      const dx = e.clientX - sx
      const dy = e.clientY - sy
      if (!dragging && Math.hypot(dx, dy) < 6) return
      dragging = true
      field.classList.add('is-dragging')
      d.x = Math.min(w - d.r, Math.max(d.r, ox + dx))
      d.y = Math.min(h - d.r, Math.max(d.r, oy + dy))
      gsap.set([d.blob, d.btn], { x: d.x - d.r, y: d.y - d.r, scale: 1.06 })
      target = null
      let best = Infinity
      for (const o of drops) {
        if (o === d || o.used) continue
        const dist = Math.hypot(o.x - d.x, o.y - d.y)
        if (dist < (o.r + d.r) * 1.15 && dist < best) {
          best = dist
          target = o
        }
      }
      drops.forEach(o => o.btn.classList.toggle('is-target', o === target))
    })
    const end = (e: PointerEvent) => {
      if (!d.btn.hasPointerCapture(e.pointerId)) return
      d.btn.releasePointerCapture(e.pointerId)
      field.classList.remove('is-dragging')
      drops.forEach(o => o.btn.classList.remove('is-target'))
      gsap.to([d.blob, d.btn], { scale: 1, duration: 0.3 })
      if (dragging) {
        // 抑制拖拽结束后的 click
        d.btn.dataset.dragged = '1'
        setTimeout(() => delete d.btn.dataset.dragged, 0)
        if (target) doFuse(d, target)
        else {
          // 没融合：记住新位置，作为它的“家”
          d.nx = d.x / w
          d.ny = d.y / h
        }
      }
      dragging = false
      target = null
    }
    d.btn.addEventListener('pointerup', end)
    d.btn.addEventListener('pointercancel', end)
    d.btn.addEventListener('click', () => {
      if (d.btn.dataset.dragged) return
      if (!selected) return select(d)
      if (selected === d) {
        select(null)
        return say('Selection cleared.')
      }
      doFuse(selected, d)
    })
  })

  reset?.addEventListener('click', () => {
    ;[...fusions].forEach(f => split(f, false))
    qsa('.lab__found li').forEach(li => li.classList.remove('is-found'))
    select(null)
    layout()
    drops.forEach(d => place(d))
    say('Field reset. Drag or tap two drops to fuse them.')
  })

  // 空闲时液滴轻轻漂浮（只改视觉层，交互层随之移动）
  if (animate) {
    let on = false
    let raf = 0
    const t0 = performance.now()
    const float = (now: number) => {
      const t = (now - t0) / 1000
      drops.forEach((d, i) => {
        if (d.used || field.classList.contains('is-dragging')) return
        d.x = d.nx * w + Math.sin(t * 0.6 + i * 1.7) * 7
        d.y = d.ny * h + Math.cos(t * 0.5 + i * 2.3) * 7
        gsap.set([d.blob, d.btn], { x: d.x - d.r, y: d.y - d.r })
      })
      if (on) raf = requestAnimationFrame(float)
    }
    new IntersectionObserver(([en]) => {
      on = !!en?.isIntersecting
      cancelAnimationFrame(raf)
      if (on) raf = requestAnimationFrame(float)
    }).observe(field)
  }

  new ResizeObserver(layout).observe(field)
  layout()
}
