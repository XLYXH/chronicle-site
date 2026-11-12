import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './styles/main.css'
import { env, onMotionPreferenceChange, qs } from './lib/env'
import { initCursor, initMagnetic } from './modules/cursor'
import { HeroGL } from './modules/heroGL'
import { runLoader } from './modules/loader'
import { initChapters, initChrome, initMenu } from './modules/navigation'
import { heroIntro, heroScroll, initFields, initMarquee, initReveals, initSignal, initTimeline, initWork } from './modules/sections'
import { initSmoothScroll, scrollToElement } from './modules/smoothScroll'

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
    gl = HeroGL.create(canvas, img, () => {
      // 运行中降级：上下文丢失或帧率过低时无缝切回静态肖像
      gl = null
      document.documentElement.classList.remove('has-gl')
    })
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

const initialHash = location.hash.slice(1)

runLoader({
  reducedMotion,
  ready,
  onReveal: tl => ready.then(() => {
    heroIntro(tl, gl, reducedMotion)
    // 带锚点访问（如 /#work）：幕布落下后平滑滚到目标章节
    const target = initialHash ? document.getElementById(initialHash) : null
    if (target) tl.add(() => scrollToElement(target), '-=0.6')
  }),
})

onMotionPreferenceChange(() => window.location.reload())
window.addEventListener('load', () => ScrollTrigger.refresh())
