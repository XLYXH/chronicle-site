# CHRONICLE — 个人网站 v2

> Ideas take shape. 在代码与想象之间，让每一个念头，有形可见。

[Chronicle-IRAS](https://github.com/Chronicle-IRAS) 的个人网站，从零重做。内容（文案、项目、链接、肖像与徽章）沿用原仓库 [Chronicle-IRAS/chronicle](https://github.com/Chronicle-IRAS/chronicle)，设计、结构和代码全部重写。

## 设计方向：「编年史」

把个人网站当成一本**按章节翻阅的编年史**来做。滚动就是翻页，每一章都有自己的节奏：

| 章 | 内容 | 关键交互 |
| --- | --- | --- |
| 00 Origin | 肖像 + 超大标题 + 「碎片」间奏 | WebGL 肖像：噪声显影入场、指针透镜（触屏为手指位置）、滚动时碎裂成三角碎片，碎片中浮现 “a *fragment.*” 间奏后整体上卷进入序章 |
| 01 Prologue | 自我介绍 | 逐词随滚动「点亮」，数字计数 |
| 02 Work | 4 个开源项目 | 桌面端：固定 + 横向滚动画廊，滚动速度驱动封面倾斜、视差、裁切展开、3D 倾斜与光斑；移动端：原生 scroll-snap 滑动画廊 + 页码进度条，不做固定 |
| 03 Chronicle | 由真实仓库时间整理的时间线 | 页面从墨黑过渡到骨白，红色脊线随滚动绘制，粘性年份滚动切换 |
| 04 Fields | 三个兴趣方向 | 速度感应跑马灯（随滚动加速、倾斜），手风琴展开 |
| 05 Signal | 联系 | 整屏朱红，大字逐字升起，磁吸圆形按钮，底部巨型字标随滚动推出 |

- **克制的配色**：墨黑 `#070605`、骨白 `#ECE6DC`、朱红 `#F0233C`（取自原有罗盘徽章）。去掉旧版的 HUD、遥测面板和满屏特效，把注意力还给内容。
- **字体**：Inter Tight（大字号无衬线，负字距）+ Instrument Serif 斜体（强调词）+ JetBrains Mono（元信息）+ 思源宋体 Noto Serif SC（中文）。**全部自托管、按实际用字子集化**（拉丁字体只保留 ASCII + 用到的符号；思源宋体只含页面里出现的 ~340 个汉字，约 58 KB），不依赖 Google Fonts，国内访问不受影响。
- **动效语言**：`src/lib/motion.ts` 统一缓动（expo.out / expo.inOut / power3）、时长（0.45 / 0.8 / 1.2 / 1.6s）与错峰节奏，所有章节共用；章节之间用同一种「幕布」裁切转场衔接（Work、Signal）。Lenis 平滑滚动 + GSAP ScrollTrigger 驱动所有滚动时间线；开场：加载计数（跟随真实加载进度）→ 罗盘星从加载器飞入页眉 Logo → 幕布上卷 → 标题逐字升起；滚动速度会让作品封面与跑马灯产生倾斜；双层自定义光标（悬停展开标签）、磁吸按钮、文字翻滚链接、章节指示器数字滚动、移动端菜单卷帘转场。
- **WebGL 点到为止、优雅降级**：全站只有英雄区一块画布，原生 WebGL、无 three.js。
  - 按需渲染：只在显影、滚动、指针移动时出帧，静止后自动休眠；离屏或切到后台即停止。
  - DPR 上限：触屏 1、桌面 1.5，且总像素 ≤ 240 万；帧时过长时自动降分辨率，仍不够快就整体退回静态图片。
  - 检测到软件渲染（SwiftShader / llvmpipe 等）、`failIfMajorPerformanceCaveat` 或上下文丢失时，直接使用静态 WebP 肖像。
  - 调试/截图可加 `?gl=force` 强制开启。

### 参考

- [Cyd Stumpel — Portfolio 2025](https://www.awwwards.com/sites/cyd-stumpel-portfolio-2025)（Awwwards SOTD）：克制配色 + 滚动驱动动画 + 页面转场，且可访问性评分高。
- [Jesper Landberg](https://www.awwwards.com/sites/jesper-landberg-2)（Awwwards SOTD）：横向滚动的作品画廊与 WebGL 细节。
- [©Design by Dylan](https://www.awwwards.com/sites/c-design-by-dylan)（Awwwards SOTD）：加载开场、大字排版、页脚视差。
- [Thomas Monavon — Portfolio 24'](https://www.awwwards.com/sites/thomas-monavon-portfolio-24)（Awwwards SOTD）：黑白极简 + 指针驱动的 WebGL 字体效果。
- [Lenis](https://lenis.darkroom.engineering/)：平滑滚动方案本身也是参考。

## 可访问性与性能

- 尊重 `prefers-reduced-motion`：关闭平滑滚动、WebGL、横向固定、光标与所有入场动画，内容直接可读；偏好切换时自动重建。
- 无 JS 时内容完整可见；语义化标题层级、跳到正文链接、可见的键盘焦点、手风琴使用 `aria-expanded` / `aria-controls`，移动端菜单 `inert` + Esc 关闭并归还焦点。
- 每帧数值不进 DOM 属性以外的任何状态；光标、透镜、跑马灯都在 GSAP ticker 中统一调度，与 Lenis 共用一个时钟。
- 肖像压缩为 WebP（640 / 960 / 1536 三档 `srcset`），首屏图片 `fetchpriority="high"`；关键字体 `preload`，`font-display: swap`。
- 序章「逐词点亮」用颜色而非透明度压暗，暗态仍保持 ≥ 3:1 对比度。
- 触屏设备关闭颗粒动画与自定义光标；移动端不做任何滚动固定。
- 完整的 favicon（ico / svg 随深浅色变化 / 180 / 192 / 512）、`site.webmanifest`、Open Graph / Twitter 卡片、JSON-LD、`robots.txt`、`sitemap.xml`，以及独立的 404 页面（罗盘指针跟随鼠标）。

Lighthouse（线上地址，2026-11-12）：

| | 性能 | 无障碍 | 最佳实践 | SEO |
| --- | --- | --- | --- | --- |
| 桌面（改版前 → 现在） | 51 → **100** | 96 → **100** | 100 → **100** | 100 → **100** |
| 移动（改版前 → 现在） | 61 → **96** | 96 → **100** | 100 → **100** | 100 → **100** |

剩余提示主要是 GitHub Pages 固定的缓存时长（无法在仓库内配置）。

## 本地开发

需要 Node.js 22（见 `.nvmrc`）。

```bash
npm ci          # 安装依赖
npm run dev     # 开发服务器 http://127.0.0.1:5173
npm run typecheck
npm test        # Vitest 单元测试（数学工具、分词）
npm run build   # 类型检查 + 生产构建，输出到 dist/
npm run preview # 本地预览生产构建
```

字体子集需要 Python 3 + `fonttools` + `brotli`。改了页面中文文案后重新生成：

```bash
pip install fonttools brotli
python3 scripts/fetch-fonts.py   # 下载并子集化到 src/assets/fonts/ 与 public/fonts/
```

## 部署

线上地址：<https://xlyxh.github.io/chronicle-site/>

当前使用 **gh-pages 分支**发布（Settings → Pages → Deploy from a branch → `gh-pages` / root）：

```bash
npm run deploy  # 构建并把 dist/ 推送到 gh-pages 分支
```

如果想改用 GitHub Actions 自动部署：把 `docs/deploy-pages.workflow.yml` 移到 `.github/workflows/deploy.yml`，并把 Pages 来源改为 **GitHub Actions**。推送工作流文件需要带 `workflow` 权限的令牌。

`vite.config.ts` 使用相对 `base: './'`，部署在任何子路径下都能正常加载资源。

## 目录

```
index.html              语义化页面结构与全部内容
src/main.ts             启动与模块编排
src/modules/
  heroGL.ts             英雄区 WebGL（显影 / 透镜 / 碎裂）
  loader.ts             开场计数与幕布
  smoothScroll.ts       Lenis + ScrollTrigger 同步、锚点滚动
  navigation.ts         页眉、阅读进度、章节指示器、移动端菜单
  sections.ts           各章节的滚动时间线与交互
  cursor.ts             自定义光标与磁吸
  splitText.ts          文本拆分（保留内联元素）
src/lib/                纯函数工具、动效令牌 motion.ts 与单元测试
src/styles/             fonts / base / chrome / sections 样式
public/                 favicon、manifest、404.html、404 用字体
scripts/fetch-fonts.py  字体下载与子集化
scripts/deploy.mjs      发布到 gh-pages
docs/                   可选的 Actions 部署工作流模板
```
