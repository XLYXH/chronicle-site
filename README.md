# IRAS.OS — Chronicle-IRAS 的个人网站 v3

> Wiring AI into dev tools, cameras & the web. · Everything is AI.

线上地址：<https://xlyxh.github.io/chronicle-site/>

v3 **从零重做**：旧站（Chronicle-IRAS/chronicle）的肖像、罗盘徽章、墨黑 / 骨白 / 朱红配色、「编年史五章」概念与 og 图全部弃用。旧仓库和 GitHub 资料只用来收集**信息**：账号简介、5 个原创仓库的 README、语言字节数、创建与提交时间、关注（fork）的仓库。所有视觉资产（WebGL 光圈、SVG 印记、项目示意图、图标、og 图）都是这次新做的。

## 设计方向：一台「个人操作系统」

把网站做成一台正在运行的终端系统 **IRAS.OS**（取自用户名 Chronicle-**IRAS**）：开机自检 → 系统桌面 → 目录 → 日志 → 可以输入命令的终端。

- **单色 + 一点磷光绿**：近黑 `#050506`、亮白 `#F2F2F0`、灰阶层次，只有状态灯用磷光绿 `#8DFFB8`。
- **字体**：Fraunces 斜体（字标与章节标题，固定光学尺寸 96）+ IBM Plex Mono（系统界面）+ Geist（正文）+ Noto Sans SC（中文）。全部**自托管并按实际用字子集化**，不请求 Google Fonts，国内可正常访问。
- **自制视觉**：
  - 背景是一只 WebGL「光圈」：纯黑圆盘、沿径向流动的噪声光晕、稀疏下落的信号线与颗粒；会随滚动放大并在画面中游移，离开首屏后自动减弱以保证可读。
  - 头像换成由用户名哈希生成的 5×5 像素印记（同时用作 favicon）。
  - 每个项目配一张手绘的 SVG 流程示意图（蓝图流水线、摄像头矩阵 + 心电波形、文章版式、请求链路）。

### 主要参考：[lanrhyme.top](https://lanrhyme.top)

用户点名喜欢这个站的交互、布局和风格，v3 以它为主要参考，**代码、图片、文案、品牌均为原创**，没有复制其源码或素材。采用的模式：

| lanrhyme.top 的模式 | 在本站的实现 |
| --- | --- |
| 框线式系统顶栏（状态灯、用户、实时时钟、`SYS.` / `DIR.` 前缀导航、一项不停跳动的乱码） | `.bar`：SYS.ONLINE、USER、内存读数、10Hz 时钟；导航悬停字符解码；乱码项 |
| 视口四角取景框、扫描线 / 暗角 | `.frame` + `.stage__scan` |
| 居中的巨型衬线斜体字标 + 故障错位 | `IRAS.` 字标：两层切片 + 反相扫描带的随机故障，悬停 / 快速滚动时爆发 |
| 首屏左下标语（下划线关键词）+ 系统读数；右下引文碎片；中间 DESCEND 提示 | 标语、AGENT / REPOS / 在线时长读数、`// DECODED_FRAGMENT` 引文 |
| 大圆形暗盘与光晕背景 | 原创 WebGL 光圈着色器（原站为另一套实现） |
| 左侧点阵进度 + 数字，右侧细滚动轨；移动端点阵移到底部、左下方块菜单键 | `.rail` / `.track` / `.menu-btn` |
| RPG 式角色卡（等级、属性行、EXEC_ 按钮） | 资料卡：DESIGNATION / PRIMARY / FIELD / GITHUB_NET，EXEC_GITHUB 等按钮 |
| 时钟模块、日历、年度进度小部件 | 毫秒时钟 + 当日进度、月历、年度进度、语言占比条 |
| `> Works.` 式衬线目录 + 编号 + 背景描边大字 | `> Projects.` 项目索引，`ARCHIVE_NODE` 等描边大字随滚动漂移 |
| RECENT_LOG 与 CYCLE_END 结尾 | `Recent_log.` 提交日志、`SESSION_END · Awaiting the next commit_` |
| 开场警告 / 预加载画面 | 开机自检（进度跟随真实加载），CRT 式收束揭幕 |
| 方形准星光标 | 准星吸附到链接 / 按钮并显示 OPEN ↗ / GOTO / EXEC |

在此之上新增：**可输入的终端**（`help`、`whoami`、`ls`、`open <项目>`、`stack`、`forks`、`goto`、`clear`，支持历史与 Tab 补全）。

其他参考：Awwwards SOTD 的 Guillaume Colombel（单一物体贯穿全站、四角极简信息）、Jesper Landberg（克制的 chrome 让作品成为主角），以及 ittybitty 的 topography 着色器的性能做法（30fps、离屏暂停、DPR 上限）。

## 交互一览

- 开机自检 → 「ACCESS GRANTED」→ 白线收束揭幕 → 顶栏从中间展开、四角取景框归位、字标闪烁接通、读数依次出现。
- Lenis 平滑滚动；字标随滚动后退；章节标题字符解码，分隔线从左向右扫出；描边大字横向视差。
- 项目行悬停：行高展开显示说明与示意图（示意图连线持续流动），副标题重新解码，准星吸附。
- 背景光圈跟随指针偏移并局部提亮；滚动速度越快，信号线越密越长。
- 终端：命令输出逐行出现，`open` 直接打开仓库，`goto` 平滑滚动到章节。

## 可访问性与性能

- `prefers-reduced-motion`：不显示开机画面，关闭平滑滚动、故障、解码、准星与所有循环动画，WebGL 只绘制一帧静态画面。
- 无 JS 时内容完整可读；语义化标题、跳到正文链接、可见焦点；解码动画只作用于 `aria-hidden` 的视觉层，读屏始终读到原文；终端输出 `role="log"` + `aria-live`；移动端菜单 `inert`、Esc 关闭并归还焦点。
- WebGL 降级：检测到软件渲染（SwiftShader / llvmpipe 等）或 `failIfMajorPerformanceCaveat` 时直接用 CSS 渐变回退；30fps 封顶、标签页隐藏时停止；DPR 上限触屏 1、桌面 1.25，总像素 ≤ 200 万；帧时过长自动降分辨率，仍不够就退回 CSS。调试 / 截图可加 `?gl=force`。
- 开机期间页面本体 `visibility: hidden`，字体替换不会产生布局偏移。
- favicon（ico / svg / 180 / 192 / 512）、manifest、Open Graph / Twitter 卡片、JSON-LD、robots、sitemap、独立 404 页（GitHub Pages 任意深度路径都可用）。

Lighthouse（线上，2026-11-13，UTC+8）：见下方「检测结果」。

## 内容来源

`src/data.ts` 汇总了全部信息（截至 2026-11-13）：账号创建于 2025-11-16，公开仓库 9 个（原创 5 个），原创仓库共 210+ 次提交；语言字节数来自 GitHub languages 接口。项目介绍改写自各仓库 README。

## 本地开发

需要 Node.js 22（见 `.nvmrc`）。

```bash
npm ci
npm run dev       # http://127.0.0.1:5173
npm test          # Vitest：解码帧、时间 / 日历、终端命令
npm run build     # 类型检查 + 生产构建
npm run preview
```

改了页面文字后重新生成字体子集（需要 Python 3 + `fonttools` + `brotli`）：

```bash
pip install fonttools brotli
python3 scripts/fetch-fonts.py
```

## 部署

GitHub Pages，`gh-pages` 分支：

```bash
npm run deploy    # 构建并把 dist/ 推送到 gh-pages
```

可选的 Actions 工作流模板在 `docs/deploy-pages.workflow.yml`（推送工作流需要带 `workflow` 权限的令牌）。`vite.config.ts` 使用相对 `base: './'`。

## 目录

```
index.html               全部内容与结构
src/data.ts              个人信息、项目、语言统计
src/main.ts              启动与编排
src/modules/
  boot.ts                开机自检与揭幕
  stageGL.ts             背景 WebGL 光圈（含降级）
  glitch.ts              字标故障
  scramble.ts            字符解码（读屏安全）
  hud.ts                 顶栏读数、进度点阵、导航、菜单
  widgets.ts             时钟、日历、年度进度、语言占比
  terminal.ts            可输入终端
  cursor.ts              准星光标
  fx.ts                  显现、开场与滚动效果
  smoothScroll.ts        Lenis + ScrollTrigger
src/lib/                 纯函数与单元测试
src/styles/              fonts / base / hud / sections
public/                  图标、og 图、manifest、404、404 用字体
scripts/                 字体子集化、部署
```
