/**
 * 倾斜圆环上的一点：θ 为方位角，rx 为水平半径，pitch 为俯仰（0 = 侧视成一条线，π/2 = 俯视成正圆），
 * roll 让整个环随指针轻微侧倾。返回屏幕偏移、深度（-1 远 … 1 近）和透视缩放。
 */
export function orbitPoint(theta: number, rx: number, pitch: number, roll = 0) {
  const x0 = Math.cos(theta) * rx
  const z = Math.sin(theta)
  const y0 = z * rx * Math.sin(pitch)
  const c = Math.cos(roll)
  const s = Math.sin(roll)
  return {
    x: x0 * c - y0 * s,
    y: x0 * s + y0 * c,
    z,
    scale: 0.66 + 0.34 * ((z + 1) / 2),
  }
}

/** 角度归一到 [-π, π) */
export function wrapAngle(a: number) {
  const t = Math.PI * 2
  return ((((a + Math.PI) % t) + t) % t) - Math.PI
}
