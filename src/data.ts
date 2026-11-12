/**
 * 站点内容：全部取自 GitHub 上的公开信息（Chronicle-IRAS 的资料与仓库），统计截至 2026-11-13。
 * 终端命令、语言占比等交互都从这里读数据，HTML 中的静态内容与之保持一致。
 */
export const PROFILE = {
  handle: 'Chronicle-IRAS',
  bio: 'Everything is AI',
  github: 'https://github.com/Chronicle-IRAS',
  /** GitHub 账号创建时间（UTC），用于“在线时长”计时 */
  since: '2025-11-16T08:04:11Z',
  repos: 9,
  original: 5,
  commits: 210,
}

export interface Project {
  id: string
  name: string
  kind: string
  year: string
  stack: string
  url: string
  summary: string
}

export const PROJECTS: Project[] = [
  {
    id: 'qt-blueprint-generator',
    name: 'Qt Blueprint Generator',
    kind: 'TOOLS',
    year: '2026.09',
    stack: 'C++17 · Qt 6 · CMake · TypeScript',
    url: 'https://github.com/Chronicle-IRAS/qt-blueprint-generator',
    summary: '蓝图驱动的 Qt 6 可视化开发平台：节点描述模块与连接，AI 生成候选代码，人工审核后再构建、导出。',
  },
  {
    id: 'monitor',
    name: 'Monitor',
    kind: 'HARDWARE',
    year: '2026.06',
    stack: 'Vue 3 · TypeScript · Node.js · ffmpeg',
    url: 'https://github.com/Chronicle-IRAS/monitor',
    summary: 'ESP32-S3 摄像头集群的监控中台：多路实时预览、历史录像、节点启停与访客 / 管理员双角色。',
  },
  {
    id: 'deskbox-blog',
    name: 'DeskBox Blog',
    kind: 'WRITING',
    year: '2026.10',
    stack: 'Astro · MDX · Pagefind · Playwright',
    url: 'https://github.com/Chronicle-IRAS/deskbox-blog',
    summary: '基于 Astro 的个人博客：自带设计系统、站内搜索、CSP 哈希与端到端测试。',
  },
  {
    id: 'chronicle',
    name: 'Chronicle',
    kind: 'INTERACTIVE',
    year: '2026.10',
    stack: 'TypeScript · CSS',
    url: 'https://github.com/Chronicle-IRAS/chronicle',
    summary: '一次滚动驱动的交互式网页实验，用 TypeScript 手写的叙事动效。',
  },
  {
    id: 'palm-netlify-proxy',
    name: 'PaLM Netlify Proxy',
    kind: 'EDGE',
    year: '2026.03',
    stack: 'TypeScript · Netlify Edge',
    url: 'https://github.com/Chronicle-IRAS/palm-netlify-proxy',
    summary: '部署在 Netlify Edge 上的 Google PaLM API 反向代理。',
  },
]

/** 仓库代码量（字节），来自 GitHub languages 接口，合并 5 个原创仓库 */
export const LANGUAGES: [string, number][] = [
  ['C++', 1378134],
  ['TypeScript', 810187],
  ['CSS', 204649],
  ['JavaScript', 137086],
  ['Astro', 96989],
  ['Vue', 64750],
  ['CMake', 37166],
]

export const FORKS = [
  { name: 'pocketjs', note: '可移植的组件运行时', url: 'https://github.com/Chronicle-IRAS/pocketjs' },
  { name: 'wandao', note: '多平台知识库 Markdown 导入导出', url: 'https://github.com/Chronicle-IRAS/wandao' },
  { name: 'FlowerSea-Blog', note: '博客', url: 'https://github.com/Chronicle-IRAS/FlowerSea-Blog' },
  { name: 'web-interview', note: '前端面试题库', url: 'https://github.com/Chronicle-IRAS/web-interview' },
]
