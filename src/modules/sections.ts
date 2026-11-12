import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { qs, qsa } from '../lib/env'
import { DUR, EASE, STAGGER } from '../lib/motion'
import { scrollToY } from './smoothScroll'
import { splitElement } from './splitText'
import type { HeroGL } from './heroGL'

/* ------------------------------------------------------------------ */
/* 00 Origin                                                           */
/* ------------------------------------------------------------------ */

/** 英雄区入场：接在加载幕布之后，与幕布上卷重叠 0.75s，避免“空一拍” */
export function heroIntro(tl: gsap.core.Timeline, gl: HeroGL | null, reducedMotion: boolean) {
  const chars = qsa<HTMLElement>('.hero__title .line').flatMap(line => splitElement(line, 'chars'))
  if (reducedMotion) {
    gl?.setReveal(1)
    gsap.set('.hero [data-reveal]', { opacity: 1, y: 0 })
    return
  }
  const at = tl.duration() > 0 ? tl.duration() - 0.75 : 0
  if (gl) {
    const state = { v: 0 }
    tl.to(state, { v: 1, duration: 2.6, ease: 'power2.out', onUpdate: () => gl.setReveal(state.v) }, at - 0.2)
  } else {
    tl.fromTo('.hero__img', { scale: 1.12 }, { scale: 1, duration: 2.4, ease: EASE.out }, at - 0.2)
  }
  tl.fromTo(chars, { yPercent: 118, rotate: 7 }, { yPercent: 0, rotate: 0, duration: DUR.lg, ease: EASE.out, stagger: STAGGER.chars }, at + 0.1)
    .fromTo('.hero__spark', { scale: 0, rotate: -180 }, { scale: 1, rotate: 0, duration: 1.8, ease: 'elastic.out(1, 0.5)' }, at + 0.55)
    .fromTo('.hero [data-reveal]', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: DUR.md, ease: EASE.out, stagger: STAGGER.items }, at + 0.5)
    .set('.header', { autoAlpha: 1 }, 0)
    .fromTo('.header > :not(.brand)', { yPercent: -120, opacity: 0 }, { yPercent: 0, opacity: 1, duration: DUR.md, ease: EASE.out, stagger: 0.06 }, at + 0.55)
    .fromTo('.brand__name', { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: DUR.md, ease: EASE.out }, at + 0.7)
    .fromTo('.chapter', { autoAlpha: 0, x: -12 }, { autoAlpha: 1, x: 0, duration: DUR.md, ease: EASE.out }, at + 0.9)
}

/**
 * 英雄区滚动（230svh 的粘性舞台，时间轴总长 1）：
 * 0–0.5 标题散开、肖像碎裂 → 0.42–0.75「碎片」幕间升起 → 0.84–1 幕间收束，序章接手
 */
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
  const fragment = qs('.hero__fragment-line')
  const fragChars = fragment ? splitElement(fragment, 'chars') : []
  qs('.hero__fragment')?.classList.add('is-split')
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom bottom', scrub: 0.6 },
  })
  tl.to('.hero__title', { yPercent: -30, duration: 0.5 }, 0)
    .to('.hero__title .line', { xPercent: (i: number) => (i - 1) * -10, duration: 0.5 }, 0)
    .to('.hero__content, .hero__meta', { opacity: 0, ease: 'power1.in', duration: 0.32 }, 0.05)
    .fromTo('.hero__img', { scale: 1, opacity: 1 }, { scale: 1.14, opacity: 0, duration: 0.6 }, 0)
    .fromTo('.hero__fragment-kicker', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.18, ease: 'power2.out' }, 0.42)
    .fromTo(fragChars, { yPercent: 110, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.22, stagger: 0.012, ease: 'power3.out' }, 0.46)
    .fromTo('.hero__fragment-cn', { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.18, ease: 'power2.out' }, 0.6)
    .to('.hero__fragment', { yPercent: -18, scale: 0.94, opacity: 0, duration: 0.16, ease: 'power1.in' }, 0.84)
}

/* ------------------------------------------------------------------ */
/* 通用揭示                                                             */
/* ------------------------------------------------------------------ */

export function initReveals(reducedMotion: boolean) {
  const items = qsa('[data-reveal]').filter(el => !el.closest('.hero'))
  if (reducedMotion) {
    gsap.set('.section-head__rule', { scaleX: 1 })
    return
  }
  // 只动 opacity，不动 visibility：未揭示的按钮依然能被键盘聚焦
  gsap.set(items, { opacity: 0, y: 40 })
  const reveal = (targets: Element[]) => gsap.to(targets, { opacity: 1, y: 0, duration: DUR.md, ease: EASE.out, stagger: STAGGER.items, overwrite: true })
  ScrollTrigger.batch(items, { start: 'top 88%', once: true, onEnter: reveal })
  document.addEventListener('focusin', event => {
    const host = (event.target as Element | null)?.closest('[data-reveal]')
    if (host && Number(gsap.getProperty(host, 'opacity')) < 1) reveal([host])
  })

  qsa('.section-head').forEach(head => {
    const title = qs('.section-head__title', head)
    const chars = title ? splitElement(title, 'chars') : []
    const tl = gsap.timeline({ scrollTrigger: { trigger: head, start: 'top 85%', once: true } })
    tl.fromTo(chars, { yPercent: 110 }, { yPercent: 0, duration: DUR.md, ease: EASE.out, stagger: STAGGER.chars })
      .fromTo(qs('.section-head__num', head), { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: DUR.sm, ease: EASE.out }, 0.1)
      .fromTo(qs('.section-head__rule', head), { scaleX: 0 }, { scaleX: 1, duration: DUR.lg, ease: EASE.inOut }, 0)
  })

  // 序章逐词点亮。暗色起始态只在段落接近视口时才施加，
  // 页面初始时文字保持完整对比度（读屏、搜索与对比度检测都读得到正常文本）。
  const scrub = qs('[data-scrub-words]')
  if (scrub) {
    const words = splitElement(scrub, 'words')
    const tl = gsap.timeline({ paused: true })
    tl.fromTo(words, { opacity: 0.16 }, { opacity: 1, ease: 'none', stagger: 0.1, duration: 0.6 })
    ScrollTrigger.create({
      trigger: scrub,
      start: 'top bottom',
      end: 'bottom 45%',
      onUpdate: self => {
        // 前 25% 的距离只是“压暗”，之后才开始逐词点亮
        tl.progress(gsap.utils.clamp(0, 1, (self.progress - 0.25) / 0.75))
      },
      onLeaveBack: () => gsap.set(words, { clearProps: 'opacity' }),
    })
  }

  qsa('[data-count]').forEach(el => {
    const target = Number(el.dataset.count) || 0
    const state = { v: 0 }
    gsap.to(state, {
      v: target,
      duration: DUR.lg,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: () => (el.textContent = String(Math.round(state.v)).padStart(2, '0')),
    })
  })
}

/** 章节幕布：工作区与终章都以同一种“圆角卡片展开成整页”的方式登场 */
function chapterCurtain(target: string, from = 'inset(10% 4% 0% 4% round 40px)') {
  gsap.fromTo(target, { clipPath: from }, {
    clipPath: 'inset(0% 0% 0% 0% round 0px)',
    ease: 'none',
    scrollTrigger: { trigger: target, start: 'top bottom', end: 'top 15%', scrub: 0.5 },
  })
}

/* ------------------------------------------------------------------ */
/* 02 Work                                                             */
/* ------------------------------------------------------------------ */

export function initWork() {
  const section = qs('.work')
  const track = qs('.work__track')
  if (!section || !track) return
  const mm = gsap.matchMedia()

  // 桌面：固定 + 横向滚动，封面带视差、裁切展开与速度倾斜
  mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
    chapterCurtain('.work__pin', 'inset(8% 3% 0% 3% round 32px)')
    const distance = () => track.scrollWidth - window.innerWidth
    const covers = qsa('.project__cover')
    const skewTo = covers.map(c => gsap.quickTo(c, 'skewX', { duration: 0.6, ease: EASE.soft }))
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
        onUpdate: self => {
          const skew = gsap.utils.clamp(-5, 5, self.getVelocity() / -320)
          skewTo.forEach(fn => fn(skew))
        },
        onScrubComplete: () => skewTo.forEach(fn => fn(0)),
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
      gsap.fromTo(project, { clipPath: 'inset(8% 0% 8% 22%)', opacity: 0.35 }, {
        clipPath: 'inset(0% 0% 0% 0%)',
        opacity: 1,
        ease: 'power2.out',
        scrollTrigger: { trigger: project, containerAnimation: scroller, start: 'left 96%', end: 'left 46%', scrub: true },
      })
      if (body) {
        gsap.fromTo(body.children, { y: 40, opacity: 0 }, {
          y: 0,
          opacity: 1,
          stagger: 0.08,
          ease: 'power2.out',
          scrollTrigger: { trigger: project, containerAnimation: scroller, start: 'left 82%', end: 'left 42%', scrub: true },
        })
      }
      ScrollTrigger.create({ trigger: project, containerAnimation: scroller, start: 'left 70%', end: 'right 30%', toggleClass: 'is-inview' })
    })

    // 键盘 Tab 到画面外的项目时，把页面滚到对应的横向位置，而不是让容器自己横向滚动
    const pin = qs('.work__pin')
    const onFocus = (event: FocusEvent) => {
      const item = (event.target as Element | null)?.closest<HTMLElement>('.project, .work__outro')
      const st = scroller.scrollTrigger
      if (!item || !st || !pin) return
      pin.scrollLeft = 0
      const x = gsap.utils.clamp(0, distance(), item.offsetLeft - (window.innerWidth - item.offsetWidth) / 2)
      scrollToY(st.start + x)
    }
    track.addEventListener('focusin', onFocus)
    return () => {
      track.removeEventListener('focusin', onFocus)
      qsa('.project').forEach(p => p.classList.remove('is-inview'))
    }
  })

  // 窄屏：原生横向滑动（scroll-snap），不劫持滚动；页码与进度条跟随
  mm.add('(max-width: 899px)', () => {
    const rail = qs('.work__rail')
    const num = qs('.work__pager-num')
    const bar = qs('.work__pager-bar i')
    const cards = qsa('.project')
    if (!rail) return
    let raf = 0
    const update = () => {
      raf = 0
      const max = rail.scrollWidth - rail.clientWidth
      const p = max > 0 ? rail.scrollLeft / max : 0
      if (bar) bar.style.transform = `scaleX(${0.25 + p * 0.75})`
      let best = 0
      let bestDist = Infinity
      cards.forEach((card, i) => {
        const d = Math.abs(card.offsetLeft - rail.scrollLeft - parseFloat(getComputedStyle(rail).paddingLeft))
        if (d < bestDist) {
          bestDist = d
          best = i
        }
        card.classList.toggle('is-inview', Math.abs(card.getBoundingClientRect().left) < window.innerWidth * 0.5)
      })
      if (num) num.textContent = String(best + 1).padStart(2, '0')
    }
    const onScroll = () => (raf ||= requestAnimationFrame(update))
    rail.addEventListener('scroll', onScroll, { passive: true })
    update()
    const io = ScrollTrigger.create({ trigger: rail, start: 'top 80%', once: true, onEnter: () => rail.classList.add('is-entered') })
    return () => {
      rail.removeEventListener('scroll', onScroll)
      io.kill()
    }
  })

  mm.add('(prefers-reduced-motion: reduce) and (min-width: 900px)', () => {
    qsa('.project').forEach(project => {
      ScrollTrigger.create({ trigger: project, start: 'top 75%', end: 'bottom 25%', toggleClass: 'is-inview' })
    })
  })

  // 指针在封面上时的 3D 倾斜与光斑
  qsa('.project__link').forEach(link => {
    const cover = qs('.project__cover', link)
    if (!cover) return
    const tilt = (x: number, y: number) =>
      gsap.to(cover, { rotateY: x, rotateX: y, duration: 0.8, ease: EASE.soft, overwrite: 'auto' })
    link.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse') return
      const r = cover.getBoundingClientRect()
      const x = (event.clientX - r.left) / r.width - 0.5
      const y = (event.clientY - r.top) / r.height - 0.5
      tilt(x * 8, -y * 8)
      cover.style.setProperty('--gx', `${(x + 0.5) * 100}%`)
      cover.style.setProperty('--gy', `${(y + 0.5) * 100}%`)
    })
    link.addEventListener('pointerleave', () => tilt(0, 0))
  })
}

/* ------------------------------------------------------------------ */
/* 03 Chronicle                                                        */
/* ------------------------------------------------------------------ */

export function initTimeline(reducedMotion: boolean) {
  const section = qs('.timeline')
  const list = qs('.timeline__list')
  if (!section || !list) return
  const root = document.documentElement

  const dark = { '--bg': '#070605', '--fg': '#ece6dc', '--muted': '#8d857a', '--line': 'rgba(236, 230, 220, 0.14)' }
  const light = { '--bg': '#ece6dc', '--fg': '#100e0c', '--muted': '#625b52', '--line': 'rgba(16, 14, 12, 0.16)' }
  if (reducedMotion) {
    ScrollTrigger.create({
      trigger: section,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: self => gsap.set(root, self.isActive ? light : dark),
    })
  } else {
    // 墨 → 骨白：在工作区解除固定之后的一屏内完成，像翻到一页新纸
    gsap.timeline({ scrollTrigger: { trigger: section, start: 'top 70%', end: 'top 30%', scrub: 0.4 } }).fromTo(root, dark, { ...light, ease: 'none' })
    gsap.timeline({ scrollTrigger: { trigger: section, start: 'bottom 70%', end: 'bottom 30%', scrub: 0.4 } }).fromTo(root, light, { ...dark, ease: 'none', immediateRender: false })
    gsap.fromTo(list, { '--spine': 0 }, { '--spine': 1, ease: 'none', scrollTrigger: { trigger: list, start: 'top 60%', end: 'bottom 60%', scrub: 0.3 } })
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
    gsap.fromTo(next, { yPercent: 100 * dir }, { yPercent: 0, duration: DUR.md, ease: EASE.out })
    if (prev) gsap.to(prev, { yPercent: -100 * dir, duration: DUR.md, ease: EASE.out, onComplete: () => prev.remove() })
  }

  qsa('.entry', list).forEach((entry, index, all) => {
    if (!reducedMotion) {
      gsap.fromTo(entry, { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: DUR.md, ease: EASE.out, scrollTrigger: { trigger: entry, start: 'top 88%', once: true } })
    }
    ScrollTrigger.create({
      trigger: entry,
      start: 'top 60%',
      end: 'bottom 60%',
      onToggle: self => {
        if (!self.isActive) return
        entry.classList.add('is-active')
        setYear(entry.dataset.year ?? '', self.direction)
      },
      onLeaveBack: () => {
        entry.classList.remove('is-active')
        const prev = all[index - 1]
        if (prev) setYear(prev.dataset.year ?? '', -1)
      },
    })
  })
}

/* ------------------------------------------------------------------ */
/* 04 Fields                                                           */
/* ------------------------------------------------------------------ */

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
        duration: reducedMotion ? 0 : DUR.sm,
        ease: EASE.out,
        overwrite: true,
        onComplete: () => ScrollTrigger.refresh(),
      })
      const inner = qs('.field__panel-inner', panel)
      if (inner && next && !reducedMotion) {
        gsap.fromTo(inner.children, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: DUR.sm, ease: EASE.out, stagger: STAGGER.words, delay: 0.08 })
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

/* ------------------------------------------------------------------ */
/* 05 Signal                                                           */
/* ------------------------------------------------------------------ */

export function initSignal(reducedMotion: boolean) {
  const title = qs('.signal__title')
  if (!title) return
  const chars = qsa<HTMLElement>('.line', title).flatMap(line => splitElement(line, 'chars'))
  if (reducedMotion) return
  chapterCurtain('.signal', 'inset(12% 4% 0% 4% round 48px)')
  gsap.fromTo(chars, { yPercent: 118, rotate: 6 }, {
    yPercent: 0,
    rotate: 0,
    duration: DUR.lg,
    ease: EASE.out,
    stagger: STAGGER.chars,
    scrollTrigger: { trigger: title, start: 'top 80%', once: true },
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
