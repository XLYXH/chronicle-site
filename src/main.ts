import './styles/main.css'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { env, onMotionPreferenceChange } from './lib/env'
import { initSmoothScroll, scrollToElement } from './modules/smoothScroll'
import { initScramble } from './modules/scramble'
import { initCursor } from './modules/cursor'
import { initHeader, initMenu, initTheme } from './modules/ui'
import { initArt } from './modules/work'
import { initShowcase } from './modules/showcase'
import { initAbout } from './modules/about'
import { initLab } from './modules/lab'
import { heroIntro, initFragment, initReveals, initWhisper } from './modules/fx'
import { initGlass } from './modules/glass'
import { initHeroLens } from './modules/heroLens'
import { initVelocity } from './modules/velocity'
import { initCraft } from './modules/craft'
import { initSignature } from './modules/signature'
import { initMotifs } from './modules/motifs'
import { initComponents } from './modules/components'

gsap.registerPlugin(ScrollTrigger)
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

const animate = !env.reducedMotion

initSmoothScroll(animate)
initScramble(animate)
initMenu(animate)
// 液态玻璃：先探测能力（折射 / 磨砂 / 实色），再挂到各个玻璃件上
const glass = initGlass()
initHeader(animate, glass)
if (animate && env.finePointer) initCursor()

// 首屏：玻璃透镜
const lens = initHeroLens(animate, glass)

initTheme(animate, () => {})
initShowcase(animate)
initVelocity(animate, () => {})
initArt(animate)
initAbout(animate)
initLab(animate)
initWhisper(animate, env.finePointer)
initReveals(animate)
initFragment(animate)
initCraft(animate)
initSignature(animate, env.finePointer)
initMotifs(animate, env.finePointer)
initComponents(animate, env.finePointer)

const start = () => heroIntro(animate, v => lens?.intro(v))
// 等字体就绪再入场，避免换字体时的跳动；最多等 1.2s
Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1200))]).then(() => {
  start()
  ScrollTrigger.refresh()
  const id = location.hash.slice(1)
  const target = id ? document.getElementById(id) : null
  if (target) requestAnimationFrame(() => scrollToElement(target))
})

onMotionPreferenceChange(() => location.reload())
