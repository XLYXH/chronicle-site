/**
 * 背景舞台：一只“光圈”——纯黑的圆盘、由噪声流动构成的光晕、稀疏下落的信号线与颗粒。
 * 原生 WebGL1，一个全屏三角形一次绘制。
 * 降级策略：软件渲染 / 性能告警 / 上下文丢失 / 帧时过长 → 销毁并回退到 CSS 渐变。
 * 调试或截图可用 ?gl=force 跳过检测。
 */
const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`

const FRAG = `precision mediump float;
uniform vec2 uRes;uniform float uTime;uniform vec2 uPtr;uniform float uScroll;uniform float uVel;uniform float uIntro;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;
  float asp=uRes.x/uRes.y;
  vec2 c=vec2(.5*asp,asp<1.?.58:.5);
  // 光圈随滚动在画面中缓慢游移，给每个章节不同的构图
  c.x+=sin(uScroll*6.2832)*(asp<1.?.08:.16)*asp;
  c.y+=sin(uScroll*3.1416)*.06;
  vec2 p=vec2(uv.x*asp,uv.y)-c;
  p-=uPtr*.025;
  float base=asp<1.?.40*asp+.06:.36;
  float R=base*(.86+.14*uIntro)*(1.+uScroll*.55);
  float d=length(p);
  vec2 dir=p/max(d,1e-4);
  float t=uTime;
  // 光晕：沿径向流动的噪声条纹，角度用方向向量采样避免接缝
  float flow=fbm(dir*2.2+vec2(d*5.-t*.12,t*.03));
  float fine=fbm(dir*9.+vec2(d*18.-t*.4,0.));
  float out_=max(d-R,0.);
  float halo=exp(-out_*7.)*(.32+.68*flow)*(.75+.25*fine);
  halo+=exp(-out_*38.)*.55;
  // 指针附近的光晕被“点亮”
  vec2 pp=vec2(uPtr.x*asp*.5,uPtr.y*.5);
  halo*=1.+.9*exp(-length(p-pp+uPtr*.025)*5.);
  float disc=smoothstep(R-.002,R+.004,d);
  // 离开首屏后光晕减弱，保证正文可读
  float calm=mix(1.,.42,smoothstep(.02,.14,uScroll));
  float col=halo*disc*.5*uIntro*calm;
  // 稀疏下落的信号线，滚动越快越密越长
  float cx=floor(uv.x*uRes.x/3.);
  float hc=h(vec2(cx,7.));
  float sp=.12+hc*.35+uVel*.8;
  float y=fract(uv.y*(.6+hc)+t*sp+hc*13.);
  float len=.985-uVel*.05;
  float rain=smoothstep(len,1.,y)*step(.93-uVel*.08,hc)*disc;
  col+=rain*.22*uIntro;
  // 颗粒与暗角
  col+=(h(gl_FragCoord.xy+fract(t)*91.)-.5)*.045;
  col*=1.-.55*smoothstep(.45,1.1,length((uv-.5)*vec2(asp,1.)));
  gl_FragColor=vec4(vec3(col*.96,col*.97,col),1.);
}`

const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render|mesa offscreen/i

export class StageGL {
  private gl: WebGLRenderingContext
  private prog: WebGLProgram
  private u: Record<string, WebGLUniformLocation | null> = {}
  private raf = 0
  private last = 0
  private frameAcc = 0
  private samples: number[] = []
  private quality = 1
  private dead = false
  private visible = true
  private start = performance.now()
  ptr = { x: 0, y: 0, tx: 0, ty: 0 }
  scroll = 0
  vel = 0
  intro = 0

  static create(canvas: HTMLCanvasElement, opts: { animate: boolean; onFail: () => void }): StageGL | null {
    const force = new URLSearchParams(location.search).get('gl') === 'force'
    const gl = canvas.getContext('webgl', {
      antialias: false,
      alpha: false,
      depth: false,
      powerPreference: 'low-power',
      failIfMajorPerformanceCaveat: !force,
    })
    if (!gl) return null
    if (!force) {
      const info = gl.getExtension('WEBGL_debug_renderer_info')
      const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : ''
      if (SOFTWARE.test(renderer)) return null
    }
    try {
      return new StageGL(canvas, gl, opts)
    } catch {
      return null
    }
  }

  private constructor(
    private canvas: HTMLCanvasElement,
    gl: WebGLRenderingContext,
    private opts: { animate: boolean; onFail: () => void },
  ) {
    this.gl = gl
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader')
      return s
    }
    const prog = gl.createProgram()!
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link')
    this.prog = prog
    gl.useProgram(prog)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    for (const k of ['uRes', 'uTime', 'uPtr', 'uScroll', 'uVel', 'uIntro']) this.u[k] = gl.getUniformLocation(prog, k)

    canvas.addEventListener('webglcontextlost', e => {
      e.preventDefault()
      this.fail()
    })
    window.addEventListener('resize', this.resize)
    document.addEventListener('visibilitychange', () => {
      this.visible = !document.hidden
      if (this.visible) this.loop()
    })
    this.resize()
    this.loop()
  }

  private resize = () => {
    const coarse = matchMedia('(pointer: coarse)').matches
    const cap = (coarse ? 1 : 1.25) * this.quality
    let dpr = Math.min(window.devicePixelRatio || 1, cap)
    const w = window.innerWidth
    const h = window.innerHeight
    const maxPx = 2_000_000
    if (w * h * dpr * dpr > maxPx) dpr = Math.sqrt(maxPx / (w * h))
    this.canvas.width = Math.round(w * dpr)
    this.canvas.height = Math.round(h * dpr)
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    if (!this.opts.animate) this.draw(0)
  }

  /** 静态模式（减少动态）下由外部在参数变化时调用 */
  redraw() {
    if (!this.opts.animate) this.draw(0)
  }

  private loop = () => {
    if (this.dead || !this.visible || !this.opts.animate) return
    cancelAnimationFrame(this.raf)
    this.raf = requestAnimationFrame(this.tick)
  }

  private tick = (now: number) => {
    if (this.dead || !this.visible) return
    const dt = Math.min(0.1, (now - (this.last || now)) / 1000)
    this.last = now
    this.frameAcc += dt
    // 背景只需 30fps：隔帧绘制，省一半 GPU
    if (this.frameAcc >= 1 / 32) {
      const t0 = performance.now()
      this.frameAcc = 0
      const k = 1 - Math.exp(-dt * 4)
      this.ptr.x += (this.ptr.tx - this.ptr.x) * k
      this.ptr.y += (this.ptr.ty - this.ptr.y) * k
      this.draw((now - this.start) / 1000)
      this.watch(performance.now() - t0, dt)
    }
    this.raf = requestAnimationFrame(this.tick)
  }

  private watch(cpu: number, dt: number) {
    this.samples.push(Math.max(cpu, dt * 1000 * 0.5))
    if (this.samples.length < 40) return
    const avg = this.samples.reduce((a, b) => a + b, 0) / this.samples.length
    this.samples.length = 0
    if (avg > 34) {
      this.quality *= 0.7
      if (this.quality < 0.4) return this.fail()
      this.resize()
    }
  }

  private draw(time: number) {
    const gl = this.gl
    gl.uniform2f(this.u.uRes!, this.canvas.width, this.canvas.height)
    gl.uniform1f(this.u.uTime!, time)
    gl.uniform2f(this.u.uPtr!, this.ptr.x, this.ptr.y)
    gl.uniform1f(this.u.uScroll!, this.scroll)
    gl.uniform1f(this.u.uVel!, this.vel)
    gl.uniform1f(this.u.uIntro!, this.intro)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  fail() {
    if (this.dead) return
    this.destroy()
    this.opts.onFail()
  }

  destroy() {
    this.dead = true
    cancelAnimationFrame(this.raf)
    window.removeEventListener('resize', this.resize)
    this.gl.getExtension('WEBGL_lose_context')?.loseContext()
    this.gl.deleteProgram(this.prog)
  }
}
