import './styles/main.css'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { env, onMotionPreferenceChange, qs } from './lib/env'
import { initSmoothScroll, scrollToElement } from './modules/smoothScroll'
import { initScramble } from './modules/scramble'
import { initCursor } from './modules/cursor'
import { initHeader, initMenu, initTheme } from './modules/ui'
import { initArt, initFilter } from './modules/work'
import { initAbout } from './modules/about'
import { initLab } from './modules/lab'
import { heroIntro, initFragment, initReveals, initWhisper } from './modules/fx'
import { LiquidGL, readPalette } from './modules/liquidGL'

gsap.registerPlugin(ScrollTrigger)
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

const animate = !env.reducedMotion
const root = document.documentElement

initSmoothScroll(animate)
initScramble(animate)
initMenu(animate)
initHeader(animate)
if (animate && env.finePointer) initCursor()

// 首屏液体
const canvas = qs<HTMLCanvasElement>('.hero__gl')
const liquid = canvas
  ? LiquidGL.create(canvas, { animate, palette: readPalette(), onFail: () => root.classList.remove('has-gl') })
  : null
if (liquid) root.classList.add('has-gl')
else canvas?.remove()

initTheme(animate, () => {
  if (!liquid) return
  liquid.palette = readPalette()
  liquid.redraw()
})

if (liquid && animate) {
  window.addEventListener(
    'pointermove',
    e => {
      liquid.ptr.tx = e.clientX / innerWidth
      liquid.ptr.ty = 1 - e.clientY / innerHeight
      liquid.ptr.ton = e.pointerType === 'mouse' ? 1 : 0
    },
    { passive: true },
  )
  document.documentElement.addEventListener('pointerleave', () => (liquid.ptr.ton = 0))
}

initFilter(animate)
initArt(animate)
initAbout(animate)
initLab(animate)
initWhisper(animate, env.finePointer)
initReveals(animate)
initFragment(
  animate,
  v => {
    if (!liquid) return
    liquid.split = v
    liquid.redraw()
  },
  v => liquid?.setInView(v),
)

const start = () =>
  heroIntro(animate, v => {
    if (!liquid) return
    liquid.intro = v
    liquid.redraw()
  })
// 等字体就绪再入场，避免换字体时的跳动；最多等 1.2s
Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1200))]).then(() => {
  start()
  ScrollTrigger.refresh()
  const id = location.hash.slice(1)
  const target = id ? document.getElementById(id) : null
  if (target) requestAnimationFrame(() => scrollToElement(target))
})

onMotionPreferenceChange(() => location.reload())
