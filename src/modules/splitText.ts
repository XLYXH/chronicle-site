import { tokenize } from '../lib/split'

/**
 * 只替换文本节点，保留 <em>/<span> 等内联元素。
 * mode = chars：生成 .word > .char；mode = words：只生成 .word。
 */
export function splitElement(el: HTMLElement, mode: 'chars' | 'words'): HTMLElement[] {
  if (el.dataset.splitDone) return Array.from(el.querySelectorAll<HTMLElement>(mode === 'chars' ? '.char' : '.word'))
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  const textNodes: Text[] = []
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text)

  for (const node of textNodes) {
    const raw = node.textContent ?? ''
    if (!raw.trim()) continue
    const frag = document.createDocumentFragment()
    if (/^\s/.test(raw)) frag.append(' ')
    for (const token of tokenize(raw)) {
      if (token.type === 'space') {
        frag.append(' ')
        continue
      }
      const word = document.createElement('span')
      word.className = 'word'
      // 逐字拆分会打断读屏，标题的可读文本由父级 aria-label 提供
      if (mode === 'chars') word.setAttribute('aria-hidden', 'true')
      if (mode === 'chars') {
        for (const ch of token.chars) {
          const char = document.createElement('span')
          char.className = 'char'
          char.textContent = ch
          word.append(char)
        }
      } else {
        word.textContent = token.chars.join('')
      }
      frag.append(word)
    }
    if (/\s$/.test(raw)) frag.append(' ')
    node.replaceWith(frag)
  }
  el.dataset.splitDone = 'true'
  return Array.from(el.querySelectorAll<HTMLElement>(mode === 'chars' ? '.char' : '.word'))
}
