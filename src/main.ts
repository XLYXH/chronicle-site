import './styles/main.css'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { env, onMotionPreferenceChange, qs } from './lib/env'
import { initSmoothScroll, scrollToElement } from './modules/smoothScroll'
import { runBoot } from './modules/boot'
import { StageGL } from './modules/stageGL'
import { initGlitch } from './modules/glitch'
import { initScramble } from './modules/scramble'
import { initMenu, initRail, initReadouts } from './modules/hud'
import { initWidgets } from './modules/widgets'
import { initTerminal } from './modules/terminal'
import { initReticle } from './modules/cursor'
import { heroIntro, initReveals, initScrollFx } from './modules/fx'

gsap.registerPlugin(ScrollTrigger)
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

const animate = !env.reducedMotion
const root = document.documentElement

initSmoothScroll(animate)
initScramble(animate)
initMenu()
initReadouts(animate)
initTerminal(animate)
initWidgets(animate)
const glitch = initGlitch(animate)
if (animate && env.finePointer) initReticle()

// 背景光圈
const canvas = qs<HTMLCanvasElement>('.stage__gl')
const stage = canvas
  ? StageGL.create(canvas, {
      animate,
      onFail: () => root.classList.remove('has-gl'),
    })
  : null
if (stage) root.classList.add('has-gl')
else canvas?.remove()

if (stage) {
  window.addEventListener(
    'pointermove',
    e => {
      stage.ptr.tx = (e.clientX / innerWidth) * 2 - 1
      stage.ptr.ty = -((e.clientY / innerHeight) * 2 - 1)
    },
    { passive: true },
  )
  const vel = { v: 0 }
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: self => {
      stage.scroll = self.progress
      vel.v = Math.min(1, Math.abs(self.getVelocity()) / 4000)
      stage.redraw()
    },
  })
  // 滚动速度衰减
  gsap.ticker.add(() => {
    stage.vel += (vel.v - stage.vel) * 0.08
    vel.v *= 0.92
  })
}

initRail()
initReveals(animate)
if (animate) initScrollFx()

// 滚动越快，字标越容易“抽搐”
if (animate) {
  let last = 0
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: self => {
      const v = Math.abs(self.getVelocity())
      const now = performance.now()
      if (v > 2600 && now - last > 600 && self.scroll() < innerHeight) {
        last = now
        glitch.burst(0.9)
      }
    },
  })
}

const ready = Promise.all([document.fonts.ready, new Promise(r => requestAnimationFrame(() => r(null)))])

runBoot(ready, animate).then(() => {
  ScrollTrigger.refresh()
  if (animate) {
    const tl = gsap.timeline()
    heroIntro(tl, glitch.intro)
    if (stage) gsap.to(stage, { intro: 1, duration: 2.4, ease: 'expo.out' })
  } else if (stage) {
    stage.intro = 1
    stage.redraw()
  }
  const id = location.hash.slice(1)
  const target = id ? document.getElementById(id) : null
  if (target) setTimeout(() => scrollToElement(target), 200)
})

if (!animate && stage) {
  stage.intro = 1
  stage.redraw()
}

onMotionPreferenceChange(() => location.reload())
