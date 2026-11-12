const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
const fineQuery = window.matchMedia('(hover: hover) and (pointer: fine)')

export const env = {
  get reducedMotion() {
    return reducedQuery.matches
  },
  get finePointer() {
    return fineQuery.matches
  },
}

/** 偏好变化时整页重载最稳妥：所有时间线都按新偏好重新构建 */
export function onMotionPreferenceChange(callback: () => void) {
  reducedQuery.addEventListener('change', callback)
}

export const qs = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) =>
  root.querySelector<T>(selector)

export const qsa = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T>(selector))
