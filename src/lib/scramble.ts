export const GLYPHS = '!<>-_\\/[]{}=+*^?#%&01'

/**
 * 解码动画的单帧：progress 0..1，已“解出”的字符保持原样，其余替换为随机符号。
 * 空格与标点保持不动，避免排版跳动；rand 可注入，便于测试。
 */
export function scrambleFrame(target: string, progress: number, rand: () => number = Math.random): string {
  const chars = Array.from(target)
  const solved = Math.floor(chars.length * Math.min(1, Math.max(0, progress)))
  return chars
    .map((ch, i) => {
      if (i < solved || /[\s.,:/·()>_-]/.test(ch)) return ch
      return GLYPHS[Math.floor(rand() * GLYPHS.length)] ?? ch
    })
    .join('')
}
