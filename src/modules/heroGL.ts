import { gsap } from 'gsap'
import { coverScale, damp } from '../lib/math'

const VERT = /* glsl */ `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uTex;
uniform vec2 uScale;     // cover 适配缩放
uniform vec2 uFocus;     // 构图焦点（窄屏把人物保持在画面内）
uniform vec2 uAspect;    // 视口宽高比，用于圆形笔刷
uniform vec2 uMouse;     // 阻尼后的指针位置 (0..1)
uniform float uVel;      // 指针速度
uniform float uLens;     // 透镜强度：指针移动时出现，静止后淡出
uniform float uTime;
uniform float uScroll;   // 0..1 英雄区滚动进度：碎裂
uniform float uReveal;   // 0..1 开场显影
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 hash2(vec2 p) { return vec2(hash(p), hash(p + 19.19)); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }

vec2 cover(vec2 uv) { return uv * uScale + (1.0 - uScale) * uFocus; }

void main() {
  vec2 uv = vUv;

  // 1. 呼吸：极轻的流场扭曲
  float t = uTime * 0.06;
  uv += (vec2(fbm(uv * 3.0 + t), fbm(uv * 3.0 - t + 4.0)) - 0.5) * 0.006;

  // 2. 指针透镜：径向推开，速度越快越强
  vec2 d = (uv - uMouse) * uAspect;
  float dist = length(d);
  float lens = smoothstep(0.26, 0.0, dist) * uLens;
  uv -= normalize(d + 1e-5) * lens * lens * (0.012 + uVel * 0.035);

  // 3. 滚动碎裂：旋转后的三角网格，每块按随机阈值滑落、旋出、淡出
  const float ANG = 0.42;
  mat2 rot = mat2(cos(ANG), -sin(ANG), sin(ANG), cos(ANG));
  vec2 grid = rot * ((uv - 0.5) * vec2(uAspect.x, 1.0)) * 5.5;
  vec2 cell = floor(grid);
  vec2 f = fract(grid);
  float tri = step(f.x, f.y);
  vec2 id = cell + tri * 0.5;
  float r = hash(id);
  float k = smoothstep(r * 0.55, r * 0.55 + 0.45, uScroll * 1.15);
  vec2 dir = hash2(id) - 0.5;
  vec2 suv = uv + dir * k * 0.2 + vec2(0.0, k * k * 0.16);
  float scale = 1.0 + uScroll * 0.12;
  suv = (suv - 0.5) / scale + 0.5;

  // 色散只在红色通道偏移，保持红黑调性，不出现彩虹边
  vec2 tuv = cover(suv);
  float ca = 0.0008 + lens * (0.002 + uVel * 0.008) + k * 0.004;
  vec3 col = texture2D(uTex, tuv).rgb;
  col.r = mix(col.r, texture2D(uTex, tuv + vec2(ca, 0.0)).r, 0.85);

  // 碎片边缘高光（只在碎裂过程中出现）
  float edge = min(min(f.x, f.y), min(1.0 - f.x, abs(f.x - f.y) * 0.7071));
  float rim = (1.0 - smoothstep(0.0, 0.018, edge)) * smoothstep(0.02, 0.2, k) * (1.0 - smoothstep(0.35, 0.7, k));
  col += vec3(0.94, 0.14, 0.24) * rim * 0.45;
  // 正在剥离的碎片略微提亮，像玻璃反光
  col *= 1.0 + k * (1.0 - k) * 1.2;

  // 透镜内轻微提亮并偏红
  col += vec3(0.32, 0.03, 0.06) * lens * 0.22;

  // 碎块淡出
  col *= 1.0 - smoothstep(0.55, 1.0, k);

  // 4. 开场：噪声显影 + 曝光爬升
  float n = fbm(vUv * 2.5 + 3.0);
  float reveal = smoothstep(n - 0.15, n + 0.15, uReveal * 1.3 - 0.15);
  col *= reveal * (0.6 + 0.4 * uReveal);

  // 5. 暗角
  vec2 v = vUv - vec2(0.6, 0.5);
  col *= 1.0 - dot(v, v) * 0.9;

  gl_FragColor = vec4(col, 1.0);
}`

type Uniforms = Record<
  'uTex' | 'uScale' | 'uFocus' | 'uAspect' | 'uMouse' | 'uVel' | 'uLens' | 'uTime' | 'uScroll' | 'uReveal',
  WebGLUniformLocation | null
>

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('createShader failed')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`shader compile failed: ${log ?? ''}`)
  }
  return shader
}

const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render|mesa offscreen/i

function isSoftwareRenderer(gl: WebGLRenderingContext): boolean {
  const ext = gl.getExtension('WEBGL_debug_renderer_info')
  const renderer = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? '')
  return SOFTWARE_RENDERER.test(renderer)
}

/**
 * 英雄区唯一的 WebGL 画布：肖像显影、指针透镜、滚动碎裂。
 * - 按需渲染：只在显影、滚动、指针活动期间跑帧，静止后自动休眠
 * - 自适应画质：帧时过长时逐级降低渲染分辨率，仍然吃力就回退到静态图
 * - 软件渲染 / 上下文丢失 / 编译失败：回退到 <img>
 */
export class HeroGL {
  readonly state = { reveal: 0, scroll: 0 }
  private gl: WebGLRenderingContext
  private uniforms: Uniforms
  private mouse = { x: 0.62, y: 0.5, tx: 0.62, ty: 0.5, vel: 0, lens: 0, lastMove: -10 }
  private image: { w: number; h: number }
  private visible = true
  private running = false
  private dead = false
  private time = 0
  private awakeUntil = 0
  private quality = 1
  private samples: number[] = []
  private resizeObserver: ResizeObserver
  private io: IntersectionObserver
  private coarse = window.matchMedia('(pointer: coarse)').matches

  /** ?gl=force 跳过软件渲染检测（仅用于无 GPU 环境下截图调试） */
  static create(canvas: HTMLCanvasElement, img: HTMLImageElement, onFail: () => void): HeroGL | null {
    const force = new URLSearchParams(location.search).get('gl') === 'force'
    try {
      const gl = canvas.getContext('webgl', {
        antialias: false,
        alpha: false,
        depth: false,
        stencil: false,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: !force,
      })
      if (!gl || (!force && isSoftwareRenderer(gl))) return null
      return new HeroGL(canvas, gl, img, onFail)
    } catch (error) {
      console.warn('[hero] WebGL unavailable, using static image', error)
      return null
    }
  }

  private constructor(
    private canvas: HTMLCanvasElement,
    gl: WebGLRenderingContext,
    img: HTMLImageElement,
    private onFail: () => void,
  ) {
    this.gl = gl
    this.image = { w: img.naturalWidth || 1536, h: img.naturalHeight || 1024 }

    const program = gl.createProgram()
    if (!program) throw new Error('createProgram failed')
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT))
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('link failed')
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(program, 'aPos')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const names = ['uTex', 'uScale', 'uFocus', 'uAspect', 'uMouse', 'uVel', 'uLens', 'uTime', 'uScroll', 'uReveal'] as const
    this.uniforms = Object.fromEntries(names.map(n => [n, gl.getUniformLocation(program, n)])) as Uniforms

    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img)
    gl.uniform1i(this.uniforms.uTex, 0)

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(canvas)
    this.resize()

    this.io = new IntersectionObserver(([entry]) => {
      this.visible = Boolean(entry?.isIntersecting)
      this.toggle()
    })
    this.io.observe(canvas)
    canvas.addEventListener('webglcontextlost', this.onContextLost)
    document.addEventListener('visibilitychange', this.toggle)
    window.addEventListener('pointermove', this.onPointer, { passive: true })
    window.addEventListener('pointerdown', this.onPointer, { passive: true })
    this.wake(1)
  }

  private onContextLost = (event: Event) => {
    event.preventDefault()
    this.fail('context lost')
  }

  private onPointer = (event: PointerEvent) => {
    const rect = this.canvas.getBoundingClientRect()
    if (event.clientY > rect.bottom || event.clientY < rect.top) return
    this.mouse.tx = (event.clientX - rect.left) / rect.width
    this.mouse.ty = 1 - (event.clientY - rect.top) / rect.height
    // 触屏点按：透镜直接出现在手指处，像水面被点了一下
    if (event.type === 'pointerdown' && event.pointerType !== 'mouse') {
      this.mouse.x = this.mouse.tx
      this.mouse.y = this.mouse.ty
      this.mouse.vel = 1.2
    }
    this.mouse.lastMove = this.time
    this.wake(3.5)
  }

  private resize() {
    const { gl, canvas } = this
    const cw = Math.max(1, canvas.clientWidth)
    const ch = Math.max(1, canvas.clientHeight)
    // 触屏设备 DPR 上限 1，桌面 1.5；再限制总像素约 240 万，最后乘自适应画质系数
    const base = Math.min(window.devicePixelRatio || 1, this.coarse ? 1 : 1.5, Math.sqrt(2.4e6 / (cw * ch)))
    const dpr = base * this.quality
    const w = Math.max(1, Math.round(cw * dpr))
    const h = Math.max(1, Math.round(ch * dpr))
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
      gl.viewport(0, 0, w, h)
    }
    const [sx, sy] = coverScale(cw, ch, this.image.w, this.image.h)
    gl.uniform2f(this.uniforms.uScale, sx, sy)
    // 竖屏时焦点偏向人物（原图右侧）
    gl.uniform2f(this.uniforms.uFocus, cw < ch ? 0.66 : 0.5, 0.5)
    gl.uniform2f(this.uniforms.uAspect, cw / ch, 1)
    this.draw()
  }

  private tick = (_time: number, deltaMs: number) => {
    this.measure(deltaMs)
    if (this.dead) return
    const dt = Math.min(deltaMs / 1000, 0.05)
    this.time += dt
    const m = this.mouse
    const px = m.x
    const py = m.y
    m.x = damp(m.x, m.tx, 6, dt)
    m.y = damp(m.y, m.ty, 6, dt)
    const speed = Math.hypot(m.x - px, m.y - py) / Math.max(dt, 1e-3)
    m.vel = damp(m.vel, Math.min(speed, 2), 4, dt)
    const active = this.time - m.lastMove < 1.2
    m.lens = damp(m.lens, active ? 1 : 0, active ? 3 : 1.2, dt)
    this.draw()
    if (performance.now() > this.awakeUntil && m.lens < 0.002) this.sleep()
  }

  /** 连续帧的平均帧时 > 30ms 就降一档分辨率；降到 45% 仍吃力则放弃 WebGL */
  private measure(deltaMs: number) {
    if (deltaMs > 250) return
    this.samples.push(deltaMs)
    if (this.samples.length < 45) return
    const avg = this.samples.slice(10).reduce((a, b) => a + b, 0) / (this.samples.length - 10)
    this.samples = []
    if (avg <= 30) return
    this.quality *= 0.72
    if (this.quality < 0.45) this.fail(`too slow (${avg.toFixed(1)}ms/frame)`)
    else this.resize()
  }

  private draw() {
    if (this.dead) return
    const { gl, uniforms: u } = this
    gl.uniform2f(u.uMouse, this.mouse.x, this.mouse.y)
    gl.uniform1f(u.uVel, this.mouse.vel)
    gl.uniform1f(u.uLens, this.mouse.lens)
    gl.uniform1f(u.uTime, this.time)
    gl.uniform1f(u.uScroll, this.state.scroll)
    gl.uniform1f(u.uReveal, this.state.reveal)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  private canRun() {
    return !this.dead && this.visible && !document.hidden && this.state.scroll < 0.999
  }

  private toggle = () => {
    if (this.canRun() && performance.now() < this.awakeUntil) this.start()
    else this.sleep()
  }

  private start() {
    if (this.running || !this.canRun()) return
    this.samples = []
    gsap.ticker.add(this.tick)
    this.running = true
  }

  private sleep() {
    if (!this.running) return
    gsap.ticker.remove(this.tick)
    this.running = false
  }

  /** 保持渲染至少 seconds 秒 */
  wake(seconds: number) {
    this.awakeUntil = Math.max(this.awakeUntil, performance.now() + seconds * 1000)
    this.start()
  }

  setScroll(progress: number) {
    this.state.scroll = progress
    this.wake(0.4)
    if (!this.running) this.draw()
  }

  setReveal(progress: number) {
    this.state.reveal = progress
    this.wake(0.4)
  }

  private fail(reason: string) {
    if (this.dead) return
    console.warn(`[hero] falling back to static image: ${reason}`)
    this.destroy()
    this.onFail()
  }

  destroy() {
    this.dead = true
    this.sleep()
    this.resizeObserver.disconnect()
    this.io.disconnect()
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost)
    document.removeEventListener('visibilitychange', this.toggle)
    window.removeEventListener('pointermove', this.onPointer)
    window.removeEventListener('pointerdown', this.onPointer)
  }
}
