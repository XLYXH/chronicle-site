import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { qs, qsa } from '../lib/env'
import { scramble } from './scramble'
import { scrambleFrame } from '../lib/scramble'

/**
 * v12 · 让页面“满”起来的 HUD 细节（数据全部取自原仓库已有的内容）：
 *  - 底部的系统读数：版本行、当前章节、本地时钟、整页进度（0.00 / 1.00）
 *  - 章节分隔线上的刻度尺
 *  - 作品展台：边缘刻度、准星，以及当前仓库路径
 *  - 作品行：悬停时 HUD 角框扣上、仓库路径解码
 *  - 关于：数字指标在入场时滚动计数
 */
export function initHud(animate: boolean) {
  rules()
  stageHud()
  clock()
  if (!animate) return
  readouts()
  projectHover()
  counters()
}

/** 每章一块竖排招牌：用导航里已有的中文章节名（作品 / 实验 / 关于 / 联系），像穗波街头的店招 */
function signs() {
  ;['work', 'play', 'about', 'connect'].forEach((id, i) => {
    const sec = document.getElementById(id)
    const word = document.querySelector(`.nav a[href="#${id}"] em, .menu a[href="#${id}"] em`)?.textContent?.trim()
    if (!sec || !word || sec.querySelector('.sign')) return
    const s = document.createElement('span')
    s.className = 'sign'
    s.setAttribute('aria-hidden', 'true')
    s.innerHTML = `<b>${word}</b><small>${String(i + 1).padStart(2, '0')}</small>`
    sec.append(s)
  })
  if (!('IntersectionObserver' in window)) return
  const io = new IntersectionObserver(
    es =>
      es.forEach(({ target, isIntersecting, boundingClientRect }) => {
        if (isIntersecting) target.classList.add('is-lit')
        else if (boundingClientRect.top > innerHeight * 0.8) target.classList.remove('is-lit')
      }),
    { threshold: 0.6 },
  )
  qsa('.sign').forEach(s => io.observe(s))
}

function rules() {
  signs()
  qsa('.sec-top').forEach(t => {
    if (t.querySelector('.sec-top__rule')) return
    const r = document.createElement('i')
    r.className = 'sec-top__rule'
    r.setAttribute('aria-hidden', 'true')
    t.lastElementChild?.before(r)
  })
}

function clock() {
  const el = qs('[data-hud-clock]')
  if (!el) return
  const pad = (n: number) => String(n).padStart(2, '0')
  const tick = () => {
    const d = new Date()
    el.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    setTimeout(tick, 1000 - (Date.now() % 1000) + 5)
  }
  tick()
}

function readouts() {
  const no = qs('[data-hud-no]')
  const sec = qs('[data-hud-sec]')
  const pos = qs('[data-hud-pos]')
  const ids = ['top', 'work', 'play', 'about', 'connect']
  const names = ids.map(id => {
    if (id === 'top') return sec?.textContent ?? ''
    const e = document.getElementById(id)?.querySelector('.sec-top .eyebrow')
    return (e?.textContent ?? '')
      .replace(/^\s*\d+\s*/, '')
      .trim()
      .toUpperCase()
  })
  let current = 0
  let raf = 0
  ids.forEach((id, i) => {
    const el = document.getElementById(id)
    if (!el) return
    ScrollTrigger.create({
      trigger: el,
      start: 'top 55%',
      end: 'bottom 55%',
      onToggle: self => {
        if (!self.isActive || i === current || !sec || !no) return
        current = i
        no.textContent = String(i).padStart(2, '0')
        const target = names[i] ?? ''
        cancelAnimationFrame(raf)
        const t0 = performance.now()
        const step = (now: number) => {
          const p = Math.min(1, (now - t0) / 700)
          sec.textContent = scrambleFrame(target, p)
          if (p < 1) raf = requestAnimationFrame(step)
        }
        raf = requestAnimationFrame(step)
      },
    })
  })
  let max = 1
  const measure = () => (max = Math.max(1, document.documentElement.scrollHeight - innerHeight))
  measure()
  ScrollTrigger.addEventListener('refresh', measure)
  let last = ''
  gsap.ticker.add(() => {
    const v = `${Math.min(1, Math.max(0, scrollY / max)).toFixed(2)} / 1.00`
    if (v !== last && pos) pos.textContent = last = v
  })
}

/** 展台：刻度尺 + 准星 + 当前仓库路径（随作品切换） */
function stageHud() {
  const stage = qs<HTMLElement>('.showcase__stage')
  if (!stage) return
  const hud = document.createElement('div')
  hud.className = 'showcase__hud'
  hud.setAttribute('aria-hidden', 'true')
  hud.innerHTML =
    '<i class="showcase__ticks showcase__ticks--x"></i><i class="showcase__ticks showcase__ticks--y"></i><i class="showcase__cross"></i><span class="showcase__repo"></span>'
  stage.append(hud)
  const repo = qs<HTMLElement>('.showcase__repo', hud)!
  const repoOf = (key: string) => qs(`.project[data-key="${key}"] .project__title a`)?.getAttribute('href')?.replace('https://github.com/', '') ?? ''
  const sync = () => {
    const v = repoOf(stage.dataset.active ?? 'blueprint')
    if (repo.dataset.v === v) return
    repo.dataset.v = v
    repo.textContent = v
  }
  sync()
  new MutationObserver(sync).observe(stage, { attributes: true, attributeFilter: ['data-active'] })
}

function projectHover() {
  qsa('.project').forEach(p => {
    const repo = p.querySelector<HTMLElement>('.project__repo')
    p.addEventListener('pointerenter', e => {
      if (e.pointerType === 'mouse' && repo) scramble(repo, 600)
    })
  })
}

/** 指标：入场时从 0 数到目标值（可逆：离开视口下方后复位） */
function counters() {
  const nums = qsa<HTMLElement>('[data-count]')
  nums.forEach(n => {
    const target = Number(n.dataset.count)
    const state = { v: 0 }
    ScrollTrigger.create({
      trigger: n,
      start: 'top 88%',
      onEnter: () =>
        gsap.fromTo(
          state,
          { v: 0 },
          { v: target, duration: 1.6, ease: 'expo.out', onUpdate: () => (n.textContent = String(Math.round(state.v)).padStart(2, '0')) },
        ),
      onLeaveBack: () => (n.textContent = '00'),
    })
  })
}
