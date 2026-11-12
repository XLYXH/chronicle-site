const pad = (n: number, d = 2) => String(Math.floor(n)).padStart(d, '0')

/** 毫秒时长 -> "123D 04:05:06" */
export function formatUptime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const d = Math.floor(s / 86400)
  return `${d}D ${pad((s % 86400) / 3600)}:${pad((s % 3600) / 60)}:${pad(s % 60)}`
}

/** 本地时间 -> "07:30:05.371" */
export function formatClock(date: Date, withMs = true): string {
  const base = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  return withMs ? `${base}.${pad(date.getMilliseconds(), 3)}` : base
}

/** 当年已过去的比例 0..1 */
export function yearProgress(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1).getTime()
  const end = new Date(date.getFullYear() + 1, 0, 1).getTime()
  return (date.getTime() - start) / (end - start)
}

/** 当天已过去的比例 0..1 */
export function dayProgress(date: Date): number {
  return (date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds() + date.getMilliseconds() / 1000) / 86400
}

/** 生成月历：返回按周分组的日期（0 表示空格），周一为一周第一天 */
export function monthGrid(year: number, month: number): number[][] {
  const first = (new Date(year, month, 1).getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  const cells = [...Array<number>(first).fill(0), ...Array.from({ length: days }, (_, i) => i + 1)]
  while (cells.length % 7) cells.push(0)
  const weeks: number[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}
