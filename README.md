# CHRONICLE — Chronicle-IRAS 的个人网站（v9）

> Ideas take shape. · 在代码与想象之间，让每一个念头，有形可见。

线上地址：<https://xlyxh.github.io/chronicle-site/>

v4 推翻了 v3 的「IRAS.OS」终端 / HUD 风格，重新设计成一套**自己的视觉语言**；内容**只取自原仓库 [Chronicle-IRAS/chronicle](https://github.com/Chronicle-IRAS/chronicle)**，不额外添加。

## v9：JIEJOE 教程手法

灵感来自 B 站 UP 主 [JIEJOE_轻敲代码](https://space.bilibili.com/3546390319860710) 的网页交互教程及其开源仓库 [JIEJOE-WEB-Tutorial](https://github.com/JIEJOE-WEB-Tutorial)（另见视频《你的网站或许离高级，，还差一个跳转动画？》BV1Nk4y1Q7pk、《你的个人网站、应该是什么样的？》BV1XkeF6VEpT）。只借鉴手法，代码按本站的瓷白 / 墨色 / 钴蓝液态玻璃语言重写，不新增文案（`src/modules/motifs.ts` + `src/styles/motifs.css`）：

| 教程 | 本站的用法 |
| --- | --- |
| 019 斩切开屏（slash loading） | 每个会话首次进入时，一道钴蓝刃光沿对角线斜切过墨色幕布，幕布沿切口上下分离露出首屏；没有文字，不影响 LCP；带锚点直达、减少动态效果时不出现；任意点击 / 按键可跳过；JS 失效时 2.6s 后 CSS 自动隐藏。 |
| 006 页面跳转动画 + 020 百叶窗 | 导航 / 锚点跳转距离超过约 1.6 屏时，7 片高度按指数递增的百叶片依次合上 → 瞬移到目标并移交焦点 → 自下而上打开；近距离仍是平滑滚动。 |
| 016 SVG 波浪线条 | 联系区背后一片钴蓝细竖线，被指针（触屏为手指）速度“拨动”，弹簧回位；离开视口或静止后停止绘制。 |
| 011-03 SVG 描边按钮 | 主按钮、GitHub 链接、实验区按钮悬停时，一段光沿圆角轮廓追逐并闭合（`pathLength` + `stroke-dasharray` 过渡）。 |

## v8：签名交互

v8 在 v6 / v7 的液态玻璃 + 瓷白 / 墨色 / 钴蓝体系上加了五个“高级”交互，全部不新增文案，集中在 `src/modules/signature.ts` + `src/styles/signature.css`：

1. **变形光标**（精确指针）：靠近按钮、导航、筛选、主题 / 菜单 / 回顶按钮等实体控件时，钴蓝小圆点“长”成一片贴合控件形状与圆角的玻璃框，跟着磁吸的控件走，并向指针轻微偏移；离开时缩回圆点。
2. **字重场**：章节大标题与联系标题拆成单字，按指针距离实时调节可变字体的 `wght` 轴（Bricolage 500→780，Newsreader 斜体 300→660），平滑回落；触屏上标题入场时有一道从左到右扫过的字重波。只在标题接近视口时才拆字。
3. **墨滴**：按下任意位置，一圈钴蓝墨环扩散，并甩出几颗受重力影响、沿速度方向拉长的小墨珠（Canvas，首次按下才创建，空闲时不绘制；实验区拖拽不触发）。触屏同样有效。
4. **景深展台**：指针在作品舞台上时，舞台按透视倾斜，插图、封面大字、玻璃签分三层视差，一道柔光跟随指针。视差走 CSS 独立的 `translate` 属性，不干扰 v7 的筛选 / 切换动画。
5. **液态主题切换**：View Transitions 的揭示不再是正圆，而是一团边缘起伏、逐渐抚平的墨迹从按钮处漫开；不支持的浏览器直接切换。

减少动态效果时以上全部关闭；无 JS 时内容不受影响。v7 的作品区筛选回归测试（四种宽度 × 13 次组合 × 上下滚动）全部通过。

## v7：作品区筛选修复 + 手感层

### 修掉的 bug（作品区 · 点击 All / Tools / Hardware / AI 之后）

1. **舞台显示的项目和列表对不上**：原来每个项目各有一个 `ScrollTrigger`（`onToggle`），筛选后只在一帧之后 `refresh()`，而那时 Flip（`absolute: true`）还把列表项绝对定位着，触发器量到的是动画中途的位置；`onToggle` 又只在“跨线”时触发，停在区间里就永远不会补同步。结果切回 All 时舞台常停在 Connected / Beyond，而读线上明明是 Blueprint。
   → 改为整张列表**一个**触发器，每次更新按视口 58% 读线实时求当前项（`onUpdate / onToggle / onRefresh` 都走同一个 `sync()`），被筛掉的项不参与，结果天然被夹取在可见项里。
2. **筛选动画和布局互相打架**：`absolute: true` 让项目脱离文档流，新进入的项从错误的位置（视口上方）飞进来、几项叠在一起，同时页面高度跳变。
   → 改成固定顺序：旧项淡出 → 一次性切换 `hidden`（布局只变这一次）→ 以筛选栏为锚补偿滚动、并让 Lenis 重新量尺寸、对齐内部目标值（避免下一次滚轮“弹回”）→ 立刻按读线选出当前项并同步舞台、计数 → 留下的项用**不脱离文档流**的 Flip 滑到新位置、新项依次升入 → 全部落定后再 `ScrollTrigger.refresh()` 并再同步一次。连点时把上一轮快进到底再开始。
3. **插图卡在半透明**：快速切换时，上一张插图“退场”补间（`opacity: 0.4 / scale: 0.94`）没有被杀掉，`onComplete` 里的复位被它覆盖，再切回这张时就停在 0.4 透明度。→ 每次切换先清掉所有面板上遗留的补间。
4. **悬停锁死舞台**：滚动时内容从静止的光标下滑过，浏览器会派发 `pointerenter`，被当成“悬停”，舞台就停在光标下的项目、不再跟随滚动。→ 只认真实的指针移动（`pointermove` 且有位移），并且一旦滚动就由滚动重新接管。
5. **CSS 过渡叠在 GSAP 上**：`.project` 自身有 `transition: opacity`，GSAP 写进去的透明度会被再“缓”一遍，筛选后项目长时间停在 0.99。→ 悬停压暗改到子元素上。
6. 其它：吸顶的舞台不再参与滚动速度拉伸（消除吸顶时的轻微抖动）；展台玻璃签被后加载的 `.lg { position: relative }` 挤出画面，已找回；计数改为“当前 / 筛选后总数”；移动端舞台吸顶时用纸色遮住它与页眉之间的缝，列表文字不再从缝里漏出来。

测试：Playwright 在 1440 / 1920 / 768 / 390 宽度下按序点完 13 次筛选组合（含反复回到 All），每次之后用小步 / 大步滚轮上下滚动，逐步比对“读线上的项目 / 列表高亮 / 舞台面板 / 插图透明度”，以及连点、筛选中途改窗口尺寸、切换深浅色、锚点跳出再跳回、减少动态效果模式，全部一致、滚动位置零跳动。

### 手感层（`src/modules/craft.ts` + `src/styles/craft.css`，不新增任何文案）

- **每个项目一点自己的色相**：都从钴蓝出发，Monitor 偏青、Proxy 偏紫，用在舞台液体浪头、高亮线、编号与技术栈上。
- **展台玻璃签**：左上角显示当前项目的类别（取自项目自己的 meta），切换时上下翻动。
- **列表悬停**：一张很淡的玻璃卡从左侧铺开，标题右移、编号上浮、衬线小字显出。
- **筛选：墨色液滴**在按钮间滑动，途中竖向收紧、落定回弹。
- **章节开场**：分隔线从左向右画出，眉题从遮罩中升起。
- **信笺逐词写出**：随滚动一词一词“上墨”，落款下方一笔手写下划线画出。
- **联系 CTA**：钴蓝玻璃球（内高光跟随指针），悬停时墨色从底部涨满，标题下划线展开。
- 统一的按压反馈；全部在减少动态效果时关闭或瞬时完成。

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
| v6 线上（2026-11-12 21:57，UTC-5） | 100 / 100 / 100 / 100 | 97 / 100 / 100 / 100 |
| v7 线上（2026-11-13 11:34，UTC+8） | 100 / 100 / 100 / 100 | 97–99 / 100 / 100 / 100（三次中有一次 89，TBT 波动） |
| v8 线上（2026-11-13 11:53，UTC+8） | 100 / 100 / 100 / 100 | 98–99 / 100 / 100 / 100（三次中有一次 91，TBT 波动） |
| v9 线上（2026-11-13 13:23，UTC+8） | 100 / 100 / 100 / 100 | 97 / 100 / 100 / 100（三次中有一次 92，TBT 波动） |

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
  showcase.ts            作品展台：液体前沿切换、水波扭曲、读线同步、稳健的筛选序列
  craft.ts               v7 手感层：筛选液滴、章节开场、信笺书写、玻璃球 CTA
  signature.ts           v8 签名交互：变形光标、字重场、墨滴、景深展台
  motifs.ts              v9 JIEJOE 教程手法：斩切开屏、百叶窗跳转、波浪线条、描边按钮
  work.ts                三张交互概念图
  velocity.ts            滚动速度拖影 + WebGL 漏光
  lab.ts                 A little chemistry 3D 轨道融合实验
  about.ts               兴趣手风琴 + ✳ 拨盘
  ui.ts                  玻璃顶栏、液滴导航、进度环、菜单、主题切换
  cursor.ts              圆点光标与磁吸
  scramble.ts            悬停解码（读屏安全）
  smoothScroll.ts        Lenis + ScrollTrigger
src/styles/              fonts / base / chrome / sections / showcase / glass / craft / signature / motifs
public/                  图标、og 图、manifest、404 与其字体
scripts/                 字体子集化、部署
```
