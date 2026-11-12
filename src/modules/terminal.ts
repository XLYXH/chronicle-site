import { qs, qsa } from '../lib/env'
import { run, type Line } from '../lib/terminal'
import { scrollToElement } from './smoothScroll'

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

export function initTerminal(animate: boolean) {
  const out = qs('[data-term-out]')
  const form = qs<HTMLFormElement>('[data-term-form]')
  const input = form ? qs<HTMLInputElement>('input', form) : null
  if (!out || !form || !input) return
  const history: string[] = []
  let cursor = 0

  const print = (lines: Line[], cmd?: string) => {
    if (cmd !== undefined) {
      const p = document.createElement('p')
      p.className = 'cmd'
      p.textContent = cmd
      out.append(p)
    }
    lines.forEach((line, i) => {
      const p = document.createElement('p')
      if (line.tone) p.className = line.tone
      p.innerHTML = line.href
        ? `<a href="${esc(line.href)}" target="_blank" rel="noopener">${esc(line.text)}</a>`
        : esc(line.text)
      if (animate) {
        p.style.opacity = '0'
        setTimeout(() => {
          p.style.opacity = ''
          out.scrollTop = out.scrollHeight
        }, 28 * (i + 1))
      }
      out.append(p)
    })
    out.scrollTop = out.scrollHeight
  }

  const exec = (raw: string) => {
    const cmd = raw.trim()
    if (cmd) {
      history.push(cmd)
      cursor = history.length
    }
    const res = run(cmd)
    if (res.clear) {
      out.innerHTML = ''
      return
    }
    print(res.lines, cmd)
    if (res.open) window.open(res.open, '_blank', 'noopener')
    if (res.goto) {
      const el = document.getElementById(res.goto)
      if (el) scrollToElement(el)
    }
  }

  form.addEventListener('submit', e => {
    e.preventDefault()
    exec(input.value)
    input.value = ''
  })
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp' && history.length) {
      e.preventDefault()
      cursor = Math.max(0, cursor - 1)
      input.value = history[cursor] ?? ''
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      cursor = Math.min(history.length, cursor + 1)
      input.value = history[cursor] ?? ''
    } else if (e.key === 'Tab' && input.value && !e.shiftKey) {
      const words = ['help', 'whoami', 'ls', 'open ', 'stack', 'forks', 'goto ', 'date', 'clear']
      const hit = words.find(w => w.startsWith(input.value))
      if (hit) {
        e.preventDefault()
        input.value = hit
      }
    }
  })
  qsa<HTMLButtonElement>('[data-cmd]').forEach(btn =>
    btn.addEventListener('click', () => exec(btn.dataset.cmd ?? '')),
  )
}
