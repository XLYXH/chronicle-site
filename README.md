# CHRONICLE — Chronicle-IRAS 的个人网站（v4）

> Ideas take shape. · 在代码与想象之间，让每一个念头，有形可见。

线上地址：<https://xlyxh.github.io/chronicle-site/>

v4 推翻了 v3 的「IRAS.OS」终端 / HUD 风格，重新设计成一套**自己的视觉语言**；内容**只取自原仓库 [Chronicle-IRAS/chronicle](https://github.com/Chronicle-IRAS/chronicle)**，不额外添加。

## 设计方向：瓷白 × 钴蓝的「液态」

主题是原站的标语 *Ideas take shape*——念头从一滴液体开始，聚合、分裂、再融合成新的东西。

- **配色**：瓷白纸色 `#F2F1ED` + 墨色 `#111216` + 唯一的强调色钴蓝 `#2B3DF5`；另有深色主题（`#0D0E12` / `#ECEDF1` / `#8592FF`），跟随系统并可手动切换，选择会被记住。
- **字体**：Bricolage Grotesque（标题，固定光学尺寸）+ Newsreader 斜体（强调词）+ Hanken Grotesk（正文）+ Spline Sans Mono（小标签）+ Noto Sans SC（中文）。全部**自托管、按页面实际用字子集化**（共约 130 KB），不请求 Google Fonts，国内可正常访问。
- **首屏**：一团有光泽的钴蓝液体（原生 WebGL metaball：Wyvill 核 + 解析梯度法线 + 假环境反射 + 柔和投影），指针会从液体里牵出一颗小液滴；向下滚动到 “a fragment.” 时液体分裂成环绕文字的碎片。
- **克制的版式**：大字号标题、细分隔线、大量留白，图形只有圆与细线。没有边框式系统栏、扫描线、取景框、角色卡之类的装饰。

### 参考

- [lanrhyme.top](https://lanrhyme.top)：**只参考交互点**（悬停文字解码、磁吸光标、平滑显现），视觉风格不模仿；解码在本站改为同大小写字母轮换，光标是一颗钴蓝圆点。
- 代码、图形、图标、og 图全部原创；**未使用**原站的肖像、配色或旧视觉资产。

## 内容来源（全部来自 Chronicle-IRAS/chronicle）

| 本站区块 | 原仓库出处 |
| --- | --- |
| 标题、描述、og 文案 | `index.html` 的 title / description |
| 首屏：CHRONICLE — A personal universe、Ideas take ✳ shape.、中文标语、DEVELOPER · BUILDER · EXPLORER、两个 CTA、Nothing starts whole… | `src/app/OnePage.tsx` 首屏 |
| 间奏：Everything begins with a fragment. / Assembling fragments into new worlds. | 同上，过渡段 |
| 低语跑马灯：build things ✦ break patterns ✦ stay curious ✦ explore worlds | 同上 |
| 01 Selected obsessions：三个项目（名称、分类、短名、副标题、描述、技术栈、仓库链接）与 All/Tools/Hardware/AI 筛选 | 同上 + 各项目数据 |
| 02 A little chemistry：8 种技术与 3 个配方（ESP32+Vue → ESP32 Monitor，C++ + Qt → Qt Blueprint Generator，AI + TypeScript → PaLM Netlify Proxy，其余为 “A new possibility”），以及 Blueprint / Monitor / PaLM Proxy 发现徽章 | `src/features/stack-composer`（`composition.ts`、`initialNodes.ts`） |
| 03 More than one thing：自我介绍、CURRENT FOCUS、三个兴趣维度（标题、副标题、正文、标签）、01 / 03 拨盘 | `OnePage.tsx` 关于部分 |
| 04 Let's make something matter：联系文案、github.com/Chronicle-IRAS | `OnePage.tsx` 联系部分 |
| 结尾信：Every ending leaves room for another beginning… / Until the next idea. Keep making room for wonder. | `src/data/siteContent.ts` 的 goodbye |
| 页脚：CHRONICLE·、Source code ↗、Back to top ↑ | `OnePage.tsx` 页脚 |

取舍：原站的人物肖像（`CHRONICLE_PORTRAIT.png`）属于生成的装饰性角色图，不是本人照片，因此不使用；交互说明文字按本站的实现方式改写（拖动或点选两颗液滴融合），原意不变。v3 加入的仓库目录、终端、提交日志、时钟 / 日历、语言占比、统计数字全部移除。

## 交互一览

- **液体首屏**：入场时液体从无到有生长，标题逐行从遮罩中升起，✳ 弹性旋入；指针牵引小液滴；滚动时液体分裂为碎片，首屏文字后退淡出。
- **磁吸光标**：钴蓝圆点带阻尼跟随，悬停可点元素变成圆环，作品卡片上显示 “GitHub” 标签；按钮、品牌标、拨盘、联系箭头被指针轻轻吸附。
- **悬停解码**：导航、品牌、项目标题、兴趣标题、页脚链接悬停 / 聚焦时字母轮换后还原。
- **流动导航**：顶部导航里有一颗随悬停与当前章节流动的墨色胶囊；顶部细进度条。
- **低语跑马灯**：缓慢横移，滚动越快推得越快；桌面端指针处出现一个“透镜”，把描边字变成钴蓝实心字。
- **作品**：All / Tools / Hardware / AI 筛选用 FLIP 平滑重排；每个项目配一张可交互概念图——Blueprint 的 TRANSFORM 节点跟随指针、连线随之弯曲；Monitor 的遥测波形离芯片越近增益越大；Proxy 的请求光点经过 EDGE 节点，悬停时流量加快。整张卡片可点击进入仓库。
- **A little chemistry**：八颗技术液滴（SVG goo 滤镜让它们真的“黏”在一起），拖动一颗到另一颗上、或依次点选两颗即原地融合；命中配方会变成通往对应仓库的链接并点亮徽章，否则显示 “A new possibility”；可 Split 拆回，Reset 复位。键盘可完整操作，状态通过 `role="status"` 播报。
- **关于**：手风琴一次展开一项；✳ 拨盘每点一次旋转 120° 并切到下一个维度，两者同步。
- **主题切换**：支持 View Transitions 的浏览器里以按钮为圆心做圆形揭示，液体着色器同步换色。
- **移动端菜单**：从按钮处圆形展开，Esc 关闭并归还焦点。

## 可访问性与性能

- `prefers-reduced-motion`：关闭平滑滚动、解码、光标、循环动画与入场动画，WebGL 只按滚动位置绘制静态帧，内容直接可见。
- 无 JS 时内容完整可读（手风琴全部展开）；语义化标题、跳到正文链接、可见焦点；解码只作用于 `aria-hidden` 的视觉层，读屏始终读到原文；拆词标题保留 `aria-label`。
- WebGL 降级：检测到软件渲染或 `failIfMajorPerformanceCaveat` 时回退到 CSS 液滴（同样用 goo 滤镜）；30fps 封顶、标签页隐藏或滚出首屏后停止绘制；DPR 与总像素上限；帧时过长自动降分辨率，仍不够就退回 CSS。调试 / 截图可加 `?gl=force`。
- 作品概念图与实验区的动画只在可见时运行。
- favicon（ico / svg / 180 / 192 / 512）、manifest、Open Graph / Twitter 卡片、JSON-LD、robots、sitemap、独立 404 页（GitHub Pages 任意深度路径都可用，跟随深浅色）。

### Lighthouse

| 版本 | 桌面（性能 / 无障碍 / 最佳实践 / SEO） | 移动 |
| --- | --- | --- |
| v3 线上 | 100 / 100 / 100 / 100 | 96 / 100 / 100 / 100 |
| v4 线上（2026-11-13，UTC+8） | LH_DESKTOP | LH_MOBILE |

## 本地开发

需要 Node.js 22（见 `.nvmrc`）。

```bash
npm ci
npm run dev       # http://127.0.0.1:5173
npm test          # Vitest：融合配方、解码帧、数学工具
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

可选的 Actions 工作流模板在 `docs/deploy-pages.workflow.yml`。`vite.config.ts` 使用相对 `base: './'`。

## 目录

```
index.html               全部内容与结构
src/main.ts              启动与编排
src/lib/
  chemistry.ts           技术与配方（来自原仓库）
  scramble.ts            解码帧
  math.ts / motion.ts    工具与动效令牌
src/modules/
  liquidGL.ts            首屏液体着色器（含降级）
  fx.ts                  标题拆词揭示、首屏入场、碎片间奏、跑马灯透镜
  work.ts                作品筛选（FLIP）与三张交互概念图
  lab.ts                 A little chemistry 融合实验
  about.ts               兴趣手风琴 + ✳ 拨盘
  ui.ts                  顶栏、流动导航、进度条、菜单、主题切换
  cursor.ts              圆点光标与磁吸
  scramble.ts            悬停解码（读屏安全）
  smoothScroll.ts        Lenis + ScrollTrigger
src/styles/              fonts / base / chrome / sections
public/                  图标、og 图、manifest、404 与其字体
scripts/                 字体子集化、部署
```
