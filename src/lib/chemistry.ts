/** 实验区的数据与配方，全部来自原 chronicle 仓库（stack-composer 的 composition.ts / initialNodes.ts） */
export interface Tech {
  id: string
  label: string
}

export const TECHS: Tech[] = [
  { id: 'react', label: 'React' },
  { id: 'vue', label: 'Vue' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'esp32', label: 'ESP32' },
  { id: 'nodejs', label: 'Node.js' },
  { id: 'ai', label: 'AI' },
  { id: 'cpp', label: 'C++' },
  { id: 'qt', label: 'Qt' },
]

export interface Recipe {
  key: string
  title: string
  badge: string
  href: string
}

export const RECIPES: Recipe[] = [
  { key: 'esp32+vue', title: 'ESP32 Monitor', badge: 'Monitor', href: 'https://github.com/Chronicle-IRAS/monitor' },
  { key: 'cpp+qt', title: 'Qt Blueprint Generator', badge: 'Blueprint', href: 'https://github.com/Chronicle-IRAS/qt-blueprint-generator' },
  { key: 'ai+typescript', title: 'PaLM Netlify Proxy', badge: 'PaLM Proxy', href: 'https://github.com/Chronicle-IRAS/palm-netlify-proxy' },
]

export const UNKNOWN_TITLE = 'A new possibility'

/** 组合键与顺序无关：按 id 排序后用 + 连接 */
export const pairKey = (a: string, b: string): string => [a, b].sort().join('+')

export function fuse(a: string, b: string): Recipe | null {
  if (a === b) return null
  const key = pairKey(a, b)
  return RECIPES.find(r => r.key === key) ?? null
}
