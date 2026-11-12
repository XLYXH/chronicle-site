import { FORKS, LANGUAGES, PROFILE, PROJECTS } from '../data'

export type Line = { text: string; tone?: 'muted' | 'ok' | 'err' | 'accent'; href?: string }
export type Result = { lines: Line[]; clear?: boolean; open?: string; goto?: string }

const COMMANDS: [string, string][] = [
  ['help', '列出可用命令'],
  ['whoami', '我是谁'],
  ['ls', '列出项目'],
  ['open <name>', '打开项目仓库，例如 open monitor'],
  ['stack', '语言与技术栈'],
  ['forks', '关注中的仓库'],
  ['goto <section>', '跳转：profile / projects / log'],
  ['date', '当前时间'],
  ['clear', '清屏'],
]

export function share(): [string, number][] {
  const total = LANGUAGES.reduce((s, [, v]) => s + v, 0)
  return LANGUAGES.map(([k, v]) => [k, v / total])
}

/** 纯函数：解析一行输入并返回输出，不触碰 DOM，方便测试 */
export function run(input: string, now: Date = new Date()): Result {
  const [cmd = '', ...args] = input.trim().split(/\s+/)
  const arg = args.join(' ').toLowerCase()
  switch (cmd.toLowerCase()) {
    case '':
      return { lines: [] }
    case 'help':
    case '?':
      return { lines: COMMANDS.map(([c, d]) => ({ text: `${c.padEnd(16)}${d}` })) }
    case 'whoami':
      return {
        lines: [
          { text: PROFILE.handle, tone: 'accent' },
          { text: `bio: "${PROFILE.bio}"` },
          { text: `repos: ${PROFILE.repos} (original ${PROFILE.original}) · commits: ${PROFILE.commits}+` },
          { text: '工具链、硬件与 Web；让 AI 写模块内部，人来把关。', tone: 'muted' },
        ],
      }
    case 'ls':
      return {
        lines: PROJECTS.map((p, i) => ({
          text: `${String(i + 1).padStart(2, '0')}  ${p.id.padEnd(24)}${p.kind.padEnd(13)}${p.year}`,
          href: p.url,
        })),
      }
    case 'open': {
      const p = PROJECTS.find(x => x.id === arg || x.name.toLowerCase() === arg || x.id.startsWith(arg))
      if (!arg || !p) return { lines: [{ text: `open: 找不到 "${arg}"，试试 ls`, tone: 'err' }] }
      return { lines: [{ text: `→ ${p.url}`, tone: 'ok', href: p.url }], open: p.url }
    }
    case 'stack':
      return {
        lines: share().map(([k, v]) => ({
          text: `${k.padEnd(11)}${'#'.repeat(Math.max(1, Math.round(v * 16))).padEnd(17)}${(v * 100).toFixed(1).padStart(5)}%`,
        })),
      }
    case 'forks':
      return { lines: FORKS.map(f => ({ text: `${f.name.padEnd(18)}${f.note}`, href: f.url })) }
    case 'goto': {
      const ok = ['profile', 'projects', 'log', 'top'].includes(arg)
      return ok ? { lines: [{ text: `→ #${arg}`, tone: 'ok' }], goto: arg } : { lines: [{ text: 'goto: profile / projects / log', tone: 'err' }] }
    }
    case 'date':
      return { lines: [{ text: now.toString() }] }
    case 'clear':
    case 'cls':
      return { lines: [], clear: true }
    case 'sudo':
      return { lines: [{ text: '权限不足：这台终端只读。', tone: 'err' }] }
    default:
      return { lines: [{ text: `${cmd}: command not found — 输入 help`, tone: 'err' }] }
  }
}
