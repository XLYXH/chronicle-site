# CHRONICLE — Chronicle-IRAS 的个人网站（v6）

> Ideas take shape. · 在代码与想象之间，让每一个念头，有形可见。

线上地址：<https://xlyxh.github.io/chronicle-site/>

v4 推翻了 v3 的「IRAS.OS」终端 / HUD 风格，重新设计成一套**自己的视觉语言**；内容**只取自原仓库 [Chronicle-IRAS/chronicle](https://github.com/Chronicle-IRAS/chronicle)**，不额外添加。

## v6：液态玻璃

v6 把整站的“液体”换成了**液态玻璃**（Apple 式 Liquid Glass），并重做了首屏。风格与内容不变（仍只取自原仓库），v5 的签名交互全部保留。

参考：
- [《液态玻璃导航栏》（muyudada）](https://muyudada.dpdns.org/posts/liquid-glass-navbar/)：核心思路照它来——玻璃画在 `::before` 上，`backdrop-filter` 取样后再用 `filter: url(#…)` 把这层结果“折射”；元素本身不加 `backdrop-filter`，避免成为 Backdrop Root，嵌套的玻璃仍能取到背景；`clip-path` 防止滤镜漏出直角；内阴影做边缘高光。
- [rainzt.cn（朝朝听雨）](https://rainzt.cn/)：借鉴它的完成度与几个交互点——顶栏拆成几座独立的玻璃“小岛”、圆形玻璃工具按钮与按压回弹、导航随滚动收缩、右下角带百分比的阅读进度环兼回到顶部。**没有使用**它的代码、图片、主题或品牌元素。

实现：
1. **折射引擎**（`src/lib/lens.ts` + `src/modules/glass.ts`）：教程用 `feTurbulence` 噪声当位移图；本站改为按每个元素的真实尺寸，用**圆角矩形 SDF** 在 canvas 里生成位移贴图——边缘一圈“弧面”向内取样（越靠边折射越强，像真实玻璃的倒角），透镜额外带中心放大；编码成 R/G 通道交给 `feImage → feDisplacementMap`，`ResizeObserver` 尺寸变化时重算（同尺寸缓存）。首屏透镜还做了 RGB 三通道不同位移量的**轻微色散**。纯函数有单元测试。
2. **玻璃顶栏**：品牌、导航、主题 / 菜单按钮是几座独立的玻璃岛；当前章节由一颗**玻璃液滴**指示——在导航项之间弹性滑动，移动时沿方向拉长、到位后回弹；向下阅读时导航收起中文小字，向上翻时展开。
3. **首屏：玻璃透镜**（取代 v5 的液体球）：一枚厚玻璃透镜压在标题的 ✳ 上，把背后的点阵、同心圆与标题折射、放大；鼠标在首屏时它带惯性追随指针并按速度拉伸（竖屏 / 触屏上轻点空白处它会漂过去）；向下滚动时透镜离开标题、漂到 “a fragment.” 上方把字放大，随后缩小并**分裂成三颗小水珠**，离开间奏后淡出。透镜下方有一团焦散投影。
4. **其它玻璃件**：作品展台上的计数 / 提示小签、右下角进度环、移动端菜单（一整片磨砂玻璃，从按钮处圆形展开）。

降级（在 `<html data-glass>` 上标记）：
- `refract`：Chromium（Chrome / Edge / 安卓 Chrome）——完整折射。
- `frost`：Safari、Firefox 等不能把 SVG 滤镜作用到 backdrop 结果上的浏览器——改为更柔的磨砂玻璃 + 同样的高光与边缘，透镜变成一颗磨砂玻璃珠。可用 `?glass=frost` 预览。
- `solid` / 不支持 `backdrop-filter`：更实的半透明底。高对比度 / 强制颜色模式下直接用实色与描边。
- 减少动态效果：透镜静止在首屏、随页面滚走，不追随、不分裂；液滴指示器瞬时到位。

踩过的坑（记下来以免回归）：玻璃件内部不能有 `mix-blend-mode` 子元素，透镜不能用 3D `translate3d`，否则 Chromium 不再把 backdrop 送进滤镜；色散的三通道合成会把半透明底色预乘成灰色，所以透镜本体不着色、首屏舞台用不透明底；构建压缩会把带 `var()` 的 `backdrop-filter` 与 `-webkit-` 前缀合并掉，所以这里只写字面量、并把 `-webkit-` 写在前面。

## v5：签名交互

v5 在 v4 的风格与内容不变的前提下，加入几处“记得住”的交互。灵感来自 B 站视频 [《你的个人网站、应该是什么样的？》（JIEJOE）](https://www.bilibili.com/video/BV1XkeF6VEpT)：个人网站需要一个**突破点**——一处让人记住的标志性交互，并且敢用 WebGL 的纵深与扭曲。视频里提到的 siena.film（滚动速度拖影 + 漏光）、stefanvitasovic.dev（列表悬停、笔刷遮罩切换预览）、cipher.tv（随鼠标倾斜的 3D 圆柱）、justinesoulie.fr（波浪扭曲）、paolovendramini.com（拖拽 + 拖拽光标）是参考方向；**全部代码为自写**，并统一成本站的“液体”语言。

1. **滚动速度的拖影与钴蓝漏光**（全页）：滚得越快，大标题与作品展台沿滚动方向拉长、斜切；一层四分之一分辨率的 WebGL 叠加在屏幕两侧泛起钴蓝漏光、掠过一道横向光斑（深色主题下用 screen 混合，像真的漏光）。（v5 时首屏液滴会被拖出尾巴；v6 起首屏改为玻璃透镜，由它自己的位移速度决定形变。）静止时叠加层完全透明并停止绘制。
2. **液体前沿的作品切换**（01 Selected obsessions）：作品改为“粘性展台 + 项目索引”。悬停、聚焦或滚动到某个项目时，一道钴蓝浪头带着起伏、带锯齿的液面从下往上（或从上往下）涌过展台，新插图紧跟在浪头之后被“灌”进来，旧插图缩小变淡。移动端展台吸顶，随滚动自动切换。
3. **水波扭曲**（作品展台）：每次切换时整块展台被位移滤镜扭一下；指针在展台上移动时按速度产生水波般的扭曲，停下即复原。点击展台直接打开当前项目仓库（光标显示 OPEN）。
4. **倾斜的 3D 轨道实验室**（02 A little chemistry）：八颗技术液滴排在一条倾斜的圆环上公转，近大远小、背面变淡；指针左右移动让环侧倾、上下移动改变俯仰；横向拖动拨转圆环（带惯性，光标显示 DRAG，触屏同样可拖）；点选一颗，它飞离轨道到中心，再点一颗，两颗在中心黏连融合，命中配方即变成仓库链接。键盘可用 Tab 选择、←/→ 拨转。

减少动态模式下：不拉伸、不漏光、不扭曲，切换为瞬时；轨道静止但可点选、可拖动/方向键拨转。无 WebGL 或软件渲染时，漏光退化为 CSS 渐变。

## 设计方向：瓷白 × 钴蓝的「液态」

主题是原站的标语 *Ideas take shape*——念头从一滴液体开始，聚合、分裂、再融合成新的东西。

- **配色**：瓷白纸色 `#F2F1ED` + 墨色 `#111216` + 唯一的强调色钴蓝 `#2B3DF5`；另有深色主题（`#0D0E12` / `#ECEDF1` / `#8592FF`），跟随系统并可手动切换，选择会被记住。
- **字体**：Bricolage Grotesque（标题，固定光学尺寸）+ Newsreader 斜体（强调词）+ Hanken Grotesk（正文）+ Spline Sans Mono（小标签）+ Noto Sans SC（中文）。全部**自托管、按页面实际用字子集化**（共约 130 KB），不请求 Google Fonts，国内可正常访问。
- **首屏**：v6 起是一枚折射标题的玻璃透镜（见上文）；v4–v5 是一团 WebGL metaball 钴蓝液体。
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

- **玻璃首屏**：入场时标题逐行从遮罩中升起，✳ 弹性旋入，透镜从一点弹性“凝结”成形；指针牵引透镜；滚动时透镜漂到间奏并分裂为水珠，首屏文字后退淡出。
- **磁吸光标**：钴蓝圆点带阻尼跟随，悬停可点元素变成圆环，作品卡片上显示 “GitHub” 标签；按钮、品牌标、拨盘、联系箭头被指针轻轻吸附。
- **悬停解码**：导航、品牌、项目标题、兴趣标题、页脚链接悬停 / 聚焦时字母轮换后还原。
- **流动导航**：顶部导航里有一颗随悬停与当前章节流动的玻璃液滴；右下角进度环（悬停变成回到顶部箭头）。
- **低语跑马灯**：缓慢横移，滚动越快推得越快；桌面端指针处出现一个“透镜”，把描边字变成钴蓝实心字。
- **作品**：All / Tools / Hardware / AI 筛选用 FLIP 平滑重排；每个项目配一张可交互概念图——Blueprint 的 TRANSFORM 节点跟随指针、连线随之弯曲；Monitor 的遥测波形离芯片越近增益越大；Proxy 的请求光点经过 EDGE 节点，悬停时流量加快。整张卡片可点击进入仓库。
- **A little chemistry**：八颗技术液滴（SVG goo 滤镜让它们真的“黏”在一起），拖动一颗到另一颗上、或依次点选两颗即原地融合；命中配方会变成通往对应仓库的链接并点亮徽章，否则显示 “A new possibility”；可 Split 拆回，Reset 复位。键盘可完整操作，状态通过 `role="status"` 播报。
- **关于**：手风琴一次展开一项；✳ 拨盘每点一次旋转 120° 并切到下一个维度，两者同步。
- **主题切换**：支持 View Transitions 的浏览器里以按钮为圆心做圆形揭示，玻璃的高光与色调同步切换。
- **移动端菜单**：一片磨砂玻璃从按钮处圆形展开，Esc 关闭并归还焦点。

## 可访问性与性能

- `prefers-reduced-motion`：关闭平滑滚动、解码、光标、循环动画与入场动画；首屏透镜静止，内容直接可见。
- 无 JS 时内容完整可读（手风琴全部展开）；语义化标题、跳到正文链接、可见焦点；解码只作用于 `aria-hidden` 的视觉层，读屏始终读到原文；拆词标题保留 `aria-label`。
- 降级：液态玻璃按 refract / frost / solid 三档自动选择（见 v6）；滚动漏光在软件渲染或无 WebGL 时退回 CSS 渐变，调试 / 截图可加 `?gl=force`。
- 作品概念图与实验区的动画只在可见时运行。
- favicon（ico / svg / 180 / 192 / 512）、manifest、Open Graph / Twitter 卡片、JSON-LD、robots、sitemap、独立 404 页（GitHub Pages 任意深度路径都可用，跟随深浅色）。

### Lighthouse

| 版本 | 桌面（性能 / 无障碍 / 最佳实践 / SEO） | 移动 |
| --- | --- | --- |
| v3 线上 | 100 / 100 / 100 / 100 | 96 / 100 / 100 / 100 |
| v4 线上（2026-11-13，UTC+8） | 100 / 100 / 100 / 100 | 98 / 100 / 100 / 100 |
| v5 线上（2026-11-12，UTC-5） | 100 / 100 / 100 / 100 | 98 / 100 / 100 / 100 |
| v6 线上（2026-11-13，UTC-5） | LH_D | LH_M |

## 本地开发

需要 Node.js 22（见 `.nvmrc`）。

```bash
npm ci
npm run dev       # http://127.0.0.1:5173
npm test          # Vitest：融合配方、解码帧、数学工具、玻璃位移贴图
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
  orbit.ts               倾斜圆环投影
  scramble.ts            解码帧
  lens.ts                液态玻璃位移贴图（圆角矩形 SDF）
  math.ts / motion.ts    工具与动效令牌
src/modules/
  glass.ts               液态玻璃：能力探测、SVG 滤镜生成与挂载
  heroLens.ts            首屏玻璃透镜：追随、拉伸、滚动分裂
  fx.ts                  标题拆词揭示、首屏入场、碎片间奏、跑马灯透镜
  showcase.ts            作品展台：液体前沿切换、水波扭曲、筛选（FLIP）
  work.ts                三张交互概念图
  velocity.ts            滚动速度拖影 + WebGL 漏光
  lab.ts                 A little chemistry 3D 轨道融合实验
  about.ts               兴趣手风琴 + ✳ 拨盘
  ui.ts                  玻璃顶栏、液滴导航、进度环、菜单、主题切换
  cursor.ts              圆点光标与磁吸
  scramble.ts            悬停解码（读屏安全）
  smoothScroll.ts        Lenis + ScrollTrigger
src/styles/              fonts / base / chrome / sections / showcase / glass
public/                  图标、og 图、manifest、404 与其字体
scripts/                 字体子集化、部署
```
