import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { qs, qsa } from '../lib/env'
import { scrollToY } from './smoothScroll'
import { splitElement } from './splitText'
import type { HeroGL } from './heroGL'

const EASE = 'expo.out'

/** 英雄区：入场（接在加载幕布之后）与滚动退场 */
export function heroIntro(tl: gsap.core.Timeline, gl: HeroGL | null, reducedMotion: boolean) {
  const chars = qsa<HTMLElement>('.hero__title .line').flatMap(line => splitElement(line, 'chars'))
  if (reducedMotion) {
    if (gl) gl.state.reveal = 1
    gsap.set('.hero [data-reveal]', { autoAlpha: 1, y: 0 })
    return
  }
  const at = tl.duration() > 0 ? tl.duration() - 0.75 : 0
  if (gl) tl.to(gl.state, { reveal: 1, duration: 2.6, ease: 'power2.out', onUpdate: () => gl.setScroll(gl.state.scroll) }, at)
  else tl.fromTo('.hero__img', { scale: 1.12, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 2, ease: EASE }, at)
  tl.fromTo(chars, { yPercent: 115, rotate: 6 }, { yPercent: 0, rotate: 0, duration: 1.4, ease: EASE, stagger: 0.035 }, at + 0.15)
    .fromTo('.hero__spark', { scale: 0, rotate: -180 }, { scale: 1, rotate: 0, duration: 1.6, ease: 'elastic.out(1, 0.5)' }, at + 0.6)
    .fromTo('.hero [data-reveal]', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1.2, ease: EASE, stagger: 0.08 }, at + 0.55)
    .fromTo('.header', { yPercent: -100, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1.2, ease: EASE }, at + 0.7)
    .fromTo('.chapter', { autoAlpha: 0 }, { autoAlpha: 1, duration: 1 }, at + 1)
}

export function heroScroll(gl: HeroGL | null, reducedMotion: boolean) {
  if (reducedMotion) return
  const hero = qs('.hero')
  if (!hero) return
  ScrollTrigger.create({
    trigger: hero,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: self => gl?.setScroll(self.progress),
  })
  const tl = gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom bottom', scrub: 0.6 } })
  const fragment = qs('.hero__fragment-line')
  const fragChars = fragment ? splitElement(fragment, 'chars') : []
  qs('.hero__fragment')?.classList.add('is-split')
  // 时间轴总长 1：0–0.45 标题散开退场，0.4–0.8 「碎片」文案升起，0.9–1 轻微上移交接下一章
  tl.to('.hero__title', { yPercent: -30, ease: 'none', duration: 0.5 }, 0)
    .to('.hero__title .line', { xPercent: (i: number) => (i - 1) * -10, ease: 'none', duration: 0.5 }, 0)
    .to('.hero__content, .hero__meta', { autoAlpha: 0, ease: 'power1.in', duration: 0.35 }, 0.05)
    .fromTo('.hero__fragment-kicker', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.2, ease: 'power2.out' }, 0.42)
    .fromTo(fragChars, { yPercent: 110, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.25, stagger: 0.012, ease: 'power3.out' }, 0.46)
    .fromTo('.hero__fragment-cn', { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.2, ease: 'power2.out' }, 0.62)
    .to('.hero__fragment', { yPercent: -12, duration: 0.15, ease: 'none' }, 0.85)
  if (!gl) tl.to('.hero__img', { scale: 1.15, autoAlpha: 0.15, ease: 'none', duration: 0.6 }, 0)
}

/** 通用：淡入上移、标题线条展开、逐词滚动着色、计数器 */
export function initReveals(reducedMotion: boolean) {
  const items = qsa('[data-reveal]').filter(el => !el.closest('.hero'))
  if (reducedMotion) {
    gsap.set(items, { autoAlpha: 1, y: 0 })
    gsap.set('.section-head__rule', { scaleX: 1 })
    return
  }
  gsap.set(items, { autoAlpha: 0, y: 40 })
  ScrollTrigger.batch(items, {
    start: 'top 88%',
    once: true,
    onEnter: batch => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 1.2, ease: EASE, stagger: 0.1, overwrite: true }),
  })

  qsa('.section-head').forEach(head => {
    const title = qs('.section-head__title', head)
    const chars = title ? splitElement(title, 'chars') : []
    const tl = gsap.timeline({ scrollTrigger: { trigger: head, start: 'top 85%', once: true } })
    tl.fromTo(chars, { yPercent: 110 }, { yPercent: 0, duration: 1.1, ease: EASE, stagger: 0.025 })
      .fromTo(qs('.section-head__num', head), { autoAlpha: 0, x: -12 }, { autoAlpha: 1, x: 0, duration: 0.9, ease: EASE }, 0.1)
      .fromTo(qs('.section-head__rule', head), { scaleX: 0 }, { scaleX: 1, duration: 1.6, ease: 'expo.inOut' }, 0)
  })

  const scrub = qs('[data-scrub-words]')
  if (scrub) {
    const words = splitElement(scrub, 'words')
    gsap.fromTo(
      words,
      { opacity: 0.14 },
      { opacity: 1, ease: 'none', stagger: 0.1, scrollTrigger: { trigger: scrub, start: 'top 78%', end: 'bottom 45%', scrub: 0.4 } },
    )
  }

  qsa('[data-count]').forEach(el => {
    const target = Number(el.dataset.count) || 0
    const state = { v: 0 }
    gsap.to(state, {
      v: target,
      duration: 1.6,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: () => (el.textContent = String(Math.round(state.v)).padStart(2, '0')),
    })
  })
}

/** 作品：桌面端固定 + 横向滚动；其余情况退化为纵向列表 */
export function initWork() {
  const section = qs('.work')
  const track = qs('.work__track')
  if (!section || !track) return
  const mm = gsap.matchMedia()

  mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
    const distance = () => track.scrollWidth - window.innerWidth
    const scroller = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        pin: '.work__pin',
        start: 'top top',
        end: () => `+=${distance()}`,
        scrub: 0.8,
        invalidateOnRefresh: true,
      },
    })
    qsa('.project').forEach(project => {
      const art = qs('.art', project)
      const body = qs('.project__body', project)
      gsap.fromTo(art, { xPercent: 8 }, {
        xPercent: -8,
        ease: 'none',
        scrollTrigger: { trigger: project, containerAnimation: scroller, start: 'left right', end: 'right left', scrub: true },
      })
      gsap.fromTo(project, { clipPath: 'inset(8% 0% 8% 20%)', autoAlpha: 0.3 }, {
        clipPath: 'inset(0% 0% 0% 0%)',
        autoAlpha: 1,
        ease: 'power2.out',
        scrollTrigger: { trigger: project, containerAnimation: scroller, start: 'left 95%', end: 'left 45%', scrub: true },
      })
      if (body) {
        gsap.fromTo(body.children, { y: 40, autoAlpha: 0 }, {
          y: 0,
          autoAlpha: 1,
          stagger: 0.08,
          ease: 'power2.out',
          scrollTrigger: { trigger: project, containerAnimation: scroller, start: 'left 80%', end: 'left 40%', scrub: true },
        })
      }
      ScrollTrigger.create({
        trigger: project,
        containerAnimation: scroller,
        start: 'left 70%',
        end: 'right 30%',
        toggleClass: 'is-inview',
      })
    })
    // 键盘 Tab 到画面外的项目时，把页面滚到对应的横向位置，而不是让容器自己横向滚动
    const pin = qs('.work__pin')
    const onFocus = (event: FocusEvent) => {
      const item = (event.target as Element | null)?.closest<HTMLElement>('.project, .work__outro')
      const st = scroller.scrollTrigger
      if (!item || !st || !pin) return
      pin.scrollLeft = 0
      const x = gsap.utils.clamp(0, distance(), item.offsetLeft - (window.innerWidth - item.offsetWidth) / 2)
      const y = st.start + x
      scrollToY(y)
    }
    track.addEventListener('focusin', onFocus)
    return () => {
      track.removeEventListener('focusin', onFocus)
      qsa('.project').forEach(p => p.classList.remove('is-inview'))
    }
  })

  mm.add('(max-width: 899px), (prefers-reduced-motion: reduce)', () => {
    qsa('.project').forEach(project => {
      ScrollTrigger.create({ trigger: project, start: 'top 75%', end: 'bottom 25%', toggleClass: 'is-inview' })
    })
  })
  mm.add('(max-width: 899px) and (prefers-reduced-motion: no-preference)', () => {
    qsa('.project').forEach(project => {
      gsap.fromTo(qs('.project__cover', project), { clipPath: 'inset(12% 6% 12% 6%)', scale: 1.04 }, {
        clipPath: 'inset(0% 0% 0% 0%)',
        scale: 1,
        ease: 'power2.out',
        scrollTrigger: { trigger: project, start: 'top 90%', end: 'top 40%', scrub: true },
      })
    })
  })

  // 指针在封面上时的 3D 倾斜
  qsa('.project__link').forEach(link => {
    const cover = qs('.project__cover', link)
    if (!cover) return
    link.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse') return
      const r = cover.getBoundingClientRect()
      const x = (event.clientX - r.left) / r.width - 0.5
      const y = (event.clientY - r.top) / r.height - 0.5
      gsap.to(cover, { rotateY: x * 8, rotateX: -y * 8, duration: 0.8, ease: 'power3.out', overwrite: 'auto' })
      cover.style.setProperty('--gx', `${(x + 0.5) * 100}%`)
      cover.style.setProperty('--gy', `${(y + 0.5) * 100}%`)
    })
    link.addEventListener('pointerleave', () => gsap.to(cover, { rotateX: 0, rotateY: 0, duration: 1.2, ease: 'elastic.out(1, 0.5)' }))
  })
}

/** 编年：章节转场到亮色、脊线随滚动绘制、年份滚动、条目点亮 */
export function initTimeline(reducedMotion: boolean) {
  const section = qs('.timeline')
  const list = qs('.timeline__list')
  if (!section || !list) return
  const root = document.documentElement

  const dark = { '--bg': '#070605', '--fg': '#ece6dc', '--muted': '#8d857a', '--line': 'rgba(236, 230, 220, 0.14)' }
  const light = { '--bg': '#ece6dc', '--fg': '#100e0c', '--muted': '#6c655c', '--line': 'rgba(16, 14, 12, 0.16)' }
  if (reducedMotion) {
    ScrollTrigger.create({
      trigger: section,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: self => gsap.set(root, self.isActive ? light : dark),
    })
  } else {
    gsap.timeline({ scrollTrigger: { trigger: section, start: 'top 65%', end: 'top 35%', scrub: 0.4 } }).fromTo(root, dark, { ...light, ease: 'none' })
    gsap.timeline({ scrollTrigger: { trigger: section, start: 'bottom 65%', end: 'bottom 35%', scrub: 0.4 } }).fromTo(root, light, { ...dark, ease: 'none', immediateRender: false })
  }

  if (!reducedMotion) {
    gsap.fromTo(list, { '--spine': 0 }, { '--spine': 1, ease: 'none', scrollTrigger: { trigger: list, start: 'top 60%', end: 'bottom 60%', scrub: true } })
  }

  const yearBox = qs('.timeline__year-roll')
  let currentYear = '2025'
  const setYear = (year: string, dir: number) => {
    if (!yearBox || year === currentYear) return
    currentYear = year
    const prev = yearBox.querySelector('b')
    const next = document.createElement('b')
    next.textContent = year
    yearBox.append(next)
    if (reducedMotion) return prev?.remove()
    gsap.fromTo(next, { yPercent: 100 * dir }, { yPercent: 0, duration: 0.9, ease: EASE })
    if (prev) gsap.to(prev, { yPercent: -100 * dir, duration: 0.9, ease: EASE, onComplete: () => prev.remove() })
  }

  qsa('.entry', list).forEach((entry, index, all) => {
    if (!reducedMotion) {
      gsap.fromTo(entry, { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 1.2, ease: EASE, scrollTrigger: { trigger: entry, start: 'top 88%', once: true } })
    }
    ScrollTrigger.create({
      trigger: entry,
      start: 'top 60%',
      end: 'bottom 60%',
      onToggle: self => {
        if (self.isActive) entry.classList.add('is-active')
        if (self.isActive) setYear(entry.dataset.year ?? '', self.direction)
      },
      onLeaveBack: () => {
        entry.classList.remove('is-active')
        const prev = all[index - 1]
        if (prev) setYear(prev.dataset.year ?? '', -1)
      },
    })
  })
}

/** 领域：手风琴（一次只展开一个），高度用 GSAP 过渡 */
export function initFields(reducedMotion: boolean) {
  const items = qsa('.field')
  const panels = items.map(item => qs('.field__panel', item))
  const toggles = items.map(item => qs<HTMLButtonElement>('.field__toggle', item))

  const setOpen = (index: number) => {
    items.forEach((item, i) => {
      const next = i === index ? item.dataset.open !== 'true' : false
      if (String(next) === item.dataset.open) return
      const panel = panels[i]
      const toggle = toggles[i]
      if (!panel || !toggle) return
      item.dataset.open = String(next)
      toggle.setAttribute('aria-expanded', String(next))
      gsap.to(panel, {
        height: next ? 'auto' : 0,
        duration: reducedMotion ? 0 : 0.9,
        ease: 'expo.out',
        overwrite: true,
        onComplete: () => ScrollTrigger.refresh(),
      })
      const inner = qs('.field__panel-inner', panel)
      if (inner && next && !reducedMotion) {
        gsap.fromTo(inner.children, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, ease: EASE, stagger: 0.06, delay: 0.1 })
      }
    })
  }

  items.forEach((item, i) => {
    item.dataset.open = 'false'
    const panel = panels[i]
    if (panel) gsap.set(panel, { height: 0 })
    toggles[i]?.addEventListener('click', () => setOpen(i))
  })
  setOpen(0)
}

/** 跑马灯：基础速度 + 滚动速度加成与倾斜，速度在 ticker 中自然衰减 */
export function initMarquee(reducedMotion: boolean) {
  const track = qs('.marquee__track')
  if (!track || reducedMotion) return
  const loop = gsap.to(track, { xPercent: -50, ease: 'none', duration: 32, repeat: -1, paused: true })
  let dir = 1
  let boost = 0
  let skew = 0
  const tick = () => {
    boost *= 0.92
    const target = gsap.utils.clamp(-10, 10, -boost * dir * 1.4)
    skew += (target - skew) * 0.15
    loop.timeScale(dir * (1 + boost))
    gsap.set(track, { skewX: skew })
  }
  ScrollTrigger.create({
    trigger: '.marquee',
    start: 'top bottom',
    end: 'bottom top',
    onToggle: self => {
      if (self.isActive) {
        loop.play()
        gsap.ticker.add(tick)
      } else {
        loop.pause()
        gsap.ticker.remove(tick)
      }
    },
    onUpdate: self => {
      dir = self.direction
      boost = Math.max(boost, Math.min(Math.abs(self.getVelocity()) / 400, 6))
    },
  })
}

/** 终章：大字逐字升起、底部大字随滚动推出 */
export function initSignal(reducedMotion: boolean) {
  const title = qs('.signal__title')
  if (!title) return
  const chars = qsa<HTMLElement>('.line', title).flatMap(line => splitElement(line, 'chars'))
  if (reducedMotion) return
  gsap.fromTo(chars, { yPercent: 115 }, {
    yPercent: 0,
    duration: 1.3,
    ease: EASE,
    stagger: 0.03,
    scrollTrigger: { trigger: title, start: 'top 80%', once: true },
  })
  gsap.fromTo('.signal', { clipPath: 'inset(14% 5% 0% 5% round 48px)' }, {
    clipPath: 'inset(0% 0% 0% 0% round 0px)',
    ease: 'none',
    scrollTrigger: { trigger: '.signal', start: 'top bottom', end: 'top 20%', scrub: 0.5 },
  })
  const word = qs('.footer__word')
  if (word) {
    const letters = splitElement(word, 'chars')
    gsap.fromTo(letters, { yPercent: 100 }, {
      yPercent: 0,
      ease: 'none',
      stagger: 0.05,
      scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: 0.6 },
    })
  }
}
