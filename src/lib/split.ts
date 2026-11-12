export type Token = { type: 'word'; chars: string[] } | { type: 'space' }

const CJK = /[\u3000-\u303f\u3400-\u9fff\uff00-\uffef]/

/**
 * 把文本拆成「词 → 字符」两级，空白单独成 token。
 * 中日韩字符逐字成词，以便自然换行；拉丁字母按空格分词，避免单词被拆断。
 */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  let word: string[] = []
  const flush = () => {
    if (word.length) tokens.push({ type: 'word', chars: word })
    word = []
  }
  for (const ch of Array.from(text)) {
    if (/\s/.test(ch)) {
      flush()
      if (tokens.at(-1)?.type !== 'space') tokens.push({ type: 'space' })
    } else if (CJK.test(ch)) {
      flush()
      tokens.push({ type: 'word', chars: [ch] })
    } else {
      word.push(ch)
    }
  }
  flush()
  while (tokens[0]?.type === 'space') tokens.shift()
  while (tokens.at(-1)?.type === 'space') tokens.pop()
  return tokens
}
