/**
 * 液态玻璃的位移贴图（纯函数，便于测试）。
 *
 * feDisplacementMap 的规则：P'(x,y) = P(x + scale·(R−0.5), y + scale·(G−0.5))。
 * 这里不用噪声，而是按圆角矩形的有向距离场（SDF）算出每个像素“应该从哪里取样”：
 *  - 边缘一圈（bezel）向内取样：像真实玻璃的圆弧边，把背后的内容压缩、弯折；
 *  - 可选的整体放大（magnify）：向中心取样，形成透镜的放大感。
 * 结果编码为 RGBA：R/G = 0.5 + v/2，B 固定 0.5，A 不透明。
 */
export interface LensSpec {
  /** 贴图宽高（CSS px） */
  w: number
  h: number
  /** 圆角半径（px），会被限制在短边一半以内 */
  r: number
  /** 边缘弧面宽度（px） */
  bezel: number
  /** 边缘处最大位移（px） */
  edge: number
  /** 中心放大强度，0 表示不放大；0.2 约等于 1.25 倍 */
  magnify?: number
}

export interface LensMap {
  data: Uint8ClampedArray
  /** 应写入 feDisplacementMap 的 scale */
  scale: number
}

/** 圆角矩形 SDF：返回有向距离（内部为负）与向外的单位法线 */
export function roundRectSDF(x: number, y: number, hw: number, hh: number, r: number) {
  const ax = Math.abs(x)
  const ay = Math.abs(y)
  const qx = ax - (hw - r)
  const qy = ay - (hh - r)
  const ox = Math.max(qx, 0)
  const oy = Math.max(qy, 0)
  const outside = Math.hypot(ox, oy)
  const d = outside + Math.min(Math.max(qx, qy), 0) - r
  let nx: number
  let ny: number
  if (qx > 0 && qy > 0) {
    nx = ox / outside
    ny = oy / outside
  } else if (qx > qy) {
    nx = 1
    ny = 0
  } else {
    nx = 0
    ny = 1
  }
  return { d, nx: nx * Math.sign(x || 1), ny: ny * Math.sign(y || 1) }
}

/** 边缘弧面的位移曲线：t=0 在边上、t=1 在弧面内侧；用圆弧（球冠）近似，越靠边折射越强 */
export const bezelCurve = (t: number) => {
  const u = Math.min(1, Math.max(0, t))
  return 1 - Math.sqrt(1 - (1 - u) * (1 - u))
}

/** 计算每个像素的位移向量（px），供编码或测试 */
export function lensVector(px: number, py: number, s: LensSpec): [number, number] {
  const hw = s.w / 2
  const hh = s.h / 2
  const r = Math.min(s.r, hw, hh)
  const x = px - hw
  const y = py - hh
  const { d, nx, ny } = roundRectSDF(x, y, hw, hh, r)
  if (d > 0) return [0, 0]
  const bez = Math.max(1, s.bezel)
  const k = bezelCurve(-d / bez) * s.edge
  let vx = -nx * k
  let vy = -ny * k
  const m = s.magnify ?? 0
  if (m) {
    vx -= x * m
    vy -= y * m
  }
  return [vx, vy]
}

export function buildLensMap(s: LensSpec): LensMap {
  const w = Math.max(1, Math.round(s.w))
  const h = Math.max(1, Math.round(s.h))
  const vec = new Float32Array(w * h * 2)
  let max = 0.001
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const [vx, vy] = lensVector(i + 0.5, j + 0.5, { ...s, w, h })
      const o = (j * w + i) * 2
      vec[o] = vx
      vec[o + 1] = vy
      max = Math.max(max, Math.abs(vx), Math.abs(vy))
    }
  }
  const data = new Uint8ClampedArray(w * h * 4)
  for (let p = 0, q = 0; p < vec.length; p += 2, q += 4) {
    data[q] = Math.round(127.5 + ((vec[p] ?? 0) / max) * 127.5)
    data[q + 1] = Math.round(127.5 + ((vec[p + 1] ?? 0) / max) * 127.5)
    data[q + 2] = 128
    data[q + 3] = 255
  }
  return { data, scale: max * 2 }
}
