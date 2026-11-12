import { gsap } from 'gsap'
import { qs } from '../lib/env'
import { EASE } from '../lib/motion'

const LINES = [
  'IRAS.OS 3.0 · cold boot',
  'mount /dev/github/Chronicle-IRAS',
  'index repos ........ 9 (original 5)',
  'load qt-blueprint-generator · monitor · deskbox-blog',
  'link fonts ......... fraunces / plex-mono / noto-sans-sc',
  'calibrate aperture · signal field',
  'spawn tty1',
]

/**
 * 开机自检：进度跟随真实就绪（字体 + 首帧），最短时长保证节奏；
 * 本次会话再次访问时缩短。任意键 / 点击可跳过。返回值在画面即将揭开时 resolve。
 */
export function runBoot(ready: Promise<unknown>, enabled: boolean): Promise<void> {
  const root = qs('.boot')
  if (!enabled || !root) {
    root?.remove()
    document.documentElement.classList.remove('is-booting')
    return Promise.resolve()
  }
  document.documentElement.classList.add('is-booting')
  const log = qs<HTMLOListElement>('.boot__log', root)!
  const bar = qs('.boot__bar i', root)!
  const pct = qs('.boot__pct', root)!
  const repeat = sessionStorage.getItem('iras-booted') === '1'
  sessionStorage.setItem('iras-booted', '1')
  const minTime = repeat ? 0.5 : 1.7

  return new Promise(resolve => {
    const state = { p: 0 }
    let done = false
    let shown = 0
    const render = () => {
      const p = state.p
      bar.style.transform = `scaleX(${p})`
      pct.textContent = String(Math.round(p * 100)).padStart(3, '0')
      const want = Math.min(LINES.length, Math.floor(p * (LINES.length + 0.6)))
      while (shown < want) {
        const li = document.createElement('li')
        li.innerHTML = `<b>[ OK ]</b> ${LINES[shown]}`
        log.append(li)
        shown++
      }
    }
    const progress = gsap.to(state, { p: 0.86, duration: minTime, ease: 'power2.inOut', onUpdate: render })

    const finish = () => {
      if (done) return
      done = true
      progress.kill()
      window.removeEventListener('keydown', finish)
      root.removeEventListener('pointerdown', finish)
      gsap
        .timeline({
          onComplete: () => root.remove(),
        })
        .to(state, { p: 1, duration: 0.3, ease: EASE.soft, onUpdate: render })
        .add(() => {
          const li = document.createElement('li')
          li.innerHTML = '<b>&gt;&gt;</b> ACCESS GRANTED'
          log.append(li)
        })
        .to(root.firstElementChild, { opacity: 0, duration: 0.25, delay: 0.25 })
        // CRT 关机式收束：先压成一条亮线，再熄灭
        .to(root, { backgroundColor: '#e9e9e6', duration: 0.06 })
        .to(root, { scaleY: 0.004, duration: 0.32, ease: 'power4.in' })
        .add(() => {
          document.documentElement.classList.remove('is-booting')
          resolve()
        })
        .to(root, { scaleX: 0, opacity: 0, duration: 0.3, ease: 'power3.in' })
    }

    window.addEventListener('keydown', finish)
    root.addEventListener('pointerdown', finish)
    Promise.all([ready, new Promise(r => setTimeout(r, minTime * 1000))]).then(finish)
  })
}
