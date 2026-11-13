import { gsap } from 'gsap'
import { qsa } from '../lib/env'

/**
 * 滚动速度的“签名”效果：
 * 1. 速度越快，大标题与展台沿滚动方向被拉长、轻微斜切（像镜头的方向性拖影，不做 RGB 分离）；
 * 2. 一层低分辨率 WebGL 叠加：屏幕两侧泛起钴蓝漏光，中间掠过一道横向光斑；静止时完全透明并停止绘制；
 * 3. 速度同时传给首屏液体，让液滴被拖出“滴落”的尾巴。
 * 软件渲染或无 WebGL 时，漏光退化为两条 CSS 渐变。
 */
const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`
const FRAG = `precision mediump float;
uniform vec2 uRes;uniform float uT;uniform float uV;uniform vec3 uC;uniform float uDark;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;
  float a=smoothstep(.04,.9,abs(uV));
  float dir=sign(uV);
  // 沿滚动方向流动的竖向条纹
  float streak=n(vec2(uv.x*18.,uv.y*1.6+uT*2.2*dir))*.6+n(vec2(uv.x*55.,uv.y*3.+uT*4.*dir))*.4;
  float edge=pow(1.-uv.x,9.)+pow(uv.x,9.)*.85;
  float leak=edge*(.45+.8*streak);
  // 横向光斑：位置随时间漂移
  float fy=.5+.32*sin(uT*.7);
  float flare=exp(-pow((uv.y-fy)*uRes.y/(uRes.y*.012),2.))*smoothstep(.75,.0,abs(uv.x-.5))*.5;
  float al=clamp((leak*.85+flare)*a,0.,1.)*mix(.5,.75,uDark);
  vec3 col=mix(uC,vec3(1.),flare*.6*uDark);
  gl_FragColor=vec4(col*al,al);
}`
const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render|mesa offscreen/i

export function initVelocity(animate: boolean, onVel: (v: number) => void) {
  if (!animate) return
  const stretch = qsa('.sec-title, .connect__title, .hero__title, [data-stage]')
  const canvas = document.createElement('canvas')
  canvas.className = 'leak'
  canvas.setAttribute('aria-hidden', 'true')
  document.body.append(canvas)
  const force = new URLSearchParams(location.search).get('gl') === 'force'
  let gl: WebGLRenderingContext | null = canvas.getContext('webgl', {
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    powerPreference: 'low-power',
    failIfMajorPerformanceCaveat: !force,
  })
  if (gl && !force) {
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    if (info && SOFTWARE.test(String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)))) gl = null
  }
  const u: Record<string, WebGLUniformLocation | null> = {}
  if (gl) {
    try {
      const g = gl
      const sh = (t: number, src: string) => {
        const s = g.createShader(t)!
        g.shaderSource(s, src)
        g.compileShader(s)
        if (!g.getShaderParameter(s, g.COMPILE_STATUS)) throw new Error('shader')
        return s
      }
      const prog = g.createProgram()!
      g.attachShader(prog, sh(g.VERTEX_SHADER, VERT))
      g.attachShader(prog, sh(g.FRAGMENT_SHADER, FRAG))
      g.linkProgram(prog)
      g.useProgram(prog)
      const buf = g.createBuffer()
      g.bindBuffer(g.ARRAY_BUFFER, buf)
      g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), g.STATIC_DRAW)
      g.enableVertexAttribArray(0)
      g.vertexAttribPointer(0, 2, g.FLOAT, false, 0, 0)
      for (const k of ['uRes', 'uT', 'uV', 'uC', 'uDark']) u[k] = g.getUniformLocation(prog, k)
      canvas.addEventListener('webglcontextlost', () => {
        gl = null
        canvas.classList.add('is-css')
      })
    } catch {
      gl = null
    }
  }
  if (!gl) canvas.classList.add('is-css')

  const resize = () => {
    // 漏光很柔和，四分之一分辨率足够
    canvas.width = Math.max(64, Math.round(innerWidth * 0.25))
    canvas.height = Math.max(64, Math.round(innerHeight * 0.25))
    gl?.viewport(0, 0, canvas.width, canvas.height)
  }
  resize()
  window.addEventListener('resize', resize)

  let lastY = scrollY
  let v = 0
  let shown = 0
  let cleared = true
  const t0 = performance.now()
  let accent: [number, number, number] = [0.17, 0.24, 0.96]
  const readAccent = () => {
    const hex = getComputedStyle(document.documentElement).getPropertyValue('--gl-a').trim().replace('#', '')
    const n = parseInt(hex, 16)
    accent = [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
  }
  readAccent()
  new MutationObserver(readAccent).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

  gsap.ticker.add((_t, dtMs) => {
    const dt = Math.max(0.001, dtMs / 1000)
    const y = scrollY
    const raw = (y - lastY) / dt
    lastY = y
    v += (Math.max(-1, Math.min(1, raw / 3200)) - v) * (1 - Math.exp(-dt * 7))
    if (Math.abs(v) < 0.002) v = 0
    if (Math.abs(v - shown) > 0.003 || (v === 0 && shown !== 0)) {
      shown = v
      const a = Math.abs(v)
      stretch.forEach(el =>
        gsap.set(el, { skewY: -v * 3.2, scaleY: 1 + a * 0.16, transformOrigin: v > 0 ? '50% 0%' : '50% 100%' }),
      )
      onVel(v)
      if (canvas.classList.contains('is-css')) canvas.style.setProperty('--leak', a.toFixed(3))
    }
    if (!gl) return
    if (Math.abs(v) < 0.01) {
      if (!cleared) {
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)
        cleared = true
      }
      return
    }
    cleared = false
    gl.uniform2f(u.uRes!, canvas.width, canvas.height)
    gl.uniform1f(u.uT!, (performance.now() - t0) / 1000)
    gl.uniform1f(u.uV!, v)
    gl.uniform3f(u.uC!, ...accent)
    gl.uniform1f(u.uDark!, document.documentElement.dataset.theme === 'dark' ? 1 : 0)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  })
}
