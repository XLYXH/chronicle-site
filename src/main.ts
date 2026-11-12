import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './styles/main.css'
import { env, onMotionPreferenceChange, qs } from './lib/env'
import { initCursor, initMagnetic } from './modules/cursor'
import { HeroGL } from './modules/heroGL'
import { runLoader } from './modules/loader'
import { initChapters, initChrome, initMenu } from './modules/navigation'
import { heroIntro, heroScroll, initFields, initMarquee, initReveals, initSignal, initTimeline, initWork } from './modules/sections'
import { initSmoothScroll } from './modules/smoothScroll'

gsap.registerPlugin(ScrollTrigger)
gsap.defaults({ ease: 'expo.out' })

const reducedMotion = env.reducedMotion
document.documentElement.classList.toggle('reduced-motion', reducedMotion)
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
window.scrollTo(0, 0)

const img = qs<HTMLImageElement>('.hero__img')
const canvas = qs<HTMLCanvasElement>('.hero__gl')
const imageReady = img ? (img.complete ? img.decode().catch(() => undefined) : new Promise(r => img.addEventListener('load', r, { once: true }))) : Promise.resolve()
const fontsReady = Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2500))])
const ready = Promise.all([imageReady, fontsReady])

let gl: HeroGL | null = null

initSmoothScroll(!reducedMotion)
initChrome()
initMenu(reducedMotion)
if (env.finePointer && !reducedMotion) {
  initCursor()
  initMagnetic()
}

ready.then(() => {
  if (!reducedMotion && img && canvas) {
    gl = HeroGL.create(canvas, img)
    if (gl) document.documentElement.classList.add('has-gl')
  }
  // 顺序很重要：先创建会 pin 的触发器，后面的触发器才能算对位置
  heroScroll(gl, reducedMotion)
  initWork()
  initReveals(reducedMotion)
  initTimeline(reducedMotion)
  initFields(reducedMotion)
  initMarquee(reducedMotion)
  initSignal(reducedMotion)
  initChapters(reducedMotion)
  ScrollTrigger.refresh()
})

runLoader({
  reducedMotion,
  ready,
  onReveal: tl => ready.then(() => heroIntro(tl, gl, reducedMotion)),
})

onMotionPreferenceChange(() => window.location.reload())
window.addEventListener('load', () => ScrollTrigger.refresh())
