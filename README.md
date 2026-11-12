# CHRONICLE — 个人网站 v2

> Ideas take shape. 在代码与想象之间，让每一个念头，有形可见。

[Chronicle-IRAS](https://github.com/Chronicle-IRAS) 的个人网站，从零重做。内容（文案、项目、链接、肖像与徽章）沿用原仓库 [Chronicle-IRAS/chronicle](https://github.com/Chronicle-IRAS/chronicle)，设计、结构和代码全部重写。

## 设计方向：「编年史」

把个人网站当成一本**按章节翻阅的编年史**来做。滚动就是翻页，每一章都有自己的节奏：

| 章 | 内容 | 关键交互 |
| --- | --- | --- |
| 00 Origin | 肖像 + 超大标题 | WebGL 肖像：噪声显影入场、指针透镜（径向推移 + 色散）、滚动时碎裂成三角碎片 |
| 01 Prologue | 自我介绍 | 逐词随滚动「点亮」，数字计数 |
| 02 Work | 4 个开源项目 | 桌面端固定 + 横向滚动画廊，封面视差、裁切展开、3D 倾斜与光斑跟随 |
| 03 Chronicle | 由真实仓库时间整理的时间线 | 页面从墨黑过渡到骨白，红色脊线随滚动绘制，粘性年份滚动切换 |
| 04 Fields | 三个兴趣方向 | 速度感应跑马灯（随滚动加速、倾斜），手风琴展开 |
| 05 Signal | 联系 | 整屏朱红，大字逐字升起，磁吸圆形按钮，底部巨型字标随滚动推出 |

- **克制的配色**：墨黑 `#070605`、骨白 `#ECE6DC`、朱红 `#F0233C`（取自原有罗盘徽章）。去掉旧版的 HUD、遥测面板和满屏特效，把注意力还给内容。
- **字体**：Inter Tight（大字号无衬线，负字距）+ Instrument Serif 斜体（强调词）+ JetBrains Mono（元信息）+ 思源宋体 Noto Serif SC（中文）。
- **动效**：Lenis 平滑滚动 + GSAP ScrollTrigger 驱动所有滚动时间线；加载计数 → 幕布上卷 → 标题逐字升起的开场；双层自定义光标（悬停展开标签）、磁吸按钮、文字翻滚链接、章节指示器数字滚动、移动端菜单卷帘转场。
- **WebGL 点到为止**：全站只有英雄区一块画布，原生 WebGL、无 three.js；离屏或切到后台即停止渲染，DPR 上限 1.5；不支持 WebGL 时自动回退为静态图片。

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
- 肖像压缩为 WebP（960 / 1536 两档 `srcset`），首屏图片 `fetchpriority="high"`。

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

## 部署

`.github/workflows/deploy.yml` 会在推送到 `main` 时测试、构建并发布到 GitHub Pages。首次使用需要在仓库 **Settings → Pages → Source** 选择 **GitHub Actions**。`vite.config.ts` 使用相对 `base: './'`，部署在任何子路径下都能正常加载资源。

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
src/lib/                纯函数工具与单元测试
src/styles/             base / chrome / sections 三层样式
```
