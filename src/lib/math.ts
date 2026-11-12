export const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value))

export const lerp = (from: number, to: number, t: number): number => from + (to - from) * t

/** 帧率无关的阻尼插值：dt 以秒计，lambda 越大追得越快 */
export const damp = (from: number, to: number, lambda: number, dt: number): number =>
  lerp(from, to, 1 - Math.exp(-lambda * dt))

export const mapRange = (value: number, inMin: number, inMax: number, outMin: number, outMax: number): number => {
  if (inMax === inMin) return outMin
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin)
}

/** 把 0..1 的进度格式化为固定位数的计数，例如 0.42 -> "042" */
export const formatCount = (progress: number, digits = 3): string =>
  String(Math.round(clamp(progress) * 100)).padStart(digits, '0')

/** 计算 cover 适配时纹理坐标的缩放，保证图片铺满且不变形 */
export const coverScale = (viewW: number, viewH: number, imageW: number, imageH: number): [number, number] => {
  const viewRatio = viewW / viewH
  const imageRatio = imageW / imageH
  return viewRatio > imageRatio ? [1, imageRatio / viewRatio] : [viewRatio / imageRatio, 1]
}
