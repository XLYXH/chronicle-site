/**
 * 首屏的“液态”舞台：几颗钴蓝液滴以 metaball 场融合成一团有光泽的液体，
 * 指针会牵出一颗小液滴；向下滚动时液体分裂成碎片（呼应 “a fragment.”）。
 * 原生 WebGL1，一个全屏三角形一次绘制，法线由场的解析梯度得到，无需导数扩展。
 * 降级：软件渲染 / 性能告警 / 上下文丢失 / 帧时过长 → 销毁并回退到 CSS 液滴。
 * 调试或截图可用 ?gl=force 跳过检测。
 */
const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`

const FRAG = `precision highp float;
uniform vec2 uRes;uniform float uTime;uniform vec2 uPtr;uniform float uPtrOn;uniform float uSplit;uniform float uIntro;
uniform vec3 uBg;uniform vec3 uA;uniform vec3 uDeep;uniform float uDark;uniform float uMobile;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec3 ball(int i,float t,float asp){
  float fi=float(i);
  float a=fi*2.39996+t*(.09+.03*mod(fi,3.));
  float r=(.085+.035*sin(fi*1.7+t*.45))*(1.-uSplit*.45);
  float spread=.17+.06*sin(t*.27+fi*1.3);
  vec2 c=vec2(cos(a)*1.15,sin(a*1.3))*spread;
  vec2 home=mix(vec2(asp*.7,.52),vec2(asp*.66,.79),uMobile);
  float ang=fi*.8976+.35+t*.03;
  float sy=sin(ang);
  vec2 far=vec2(asp*.5,.5)+vec2(cos(ang)*asp*mix(.4,.34,uMobile),sign(sy)*(.17+abs(sy)*.22));
  c=mix(home+c*mix(1.,.8,uMobile),far+c*.3,smoothstep(0.,1.,uSplit));
  return vec3(c,r*mix(1.,.62,uMobile)*uIntro);
}
// Wyvill 核：有界、光滑，没有中心奇点，液面因此平滑如镜
void add(vec2 p,vec2 c,float R,inout float f,inout vec2 g){
  vec2 d=p-c;float R2=R*R+1e-6;float q=dot(d,d)/R2;
  if(q<1.){float k=1.-q;f+=k*k*k;g+=-6.*k*k*d/R2;}
}
void field(vec2 p,float t,float asp,float grow,out float f,out vec2 g){
  f=0.;g=vec2(0.);
  for(int i=0;i<7;i++){vec3 b=ball(i,t,asp);add(p,b.xy,b.z*2.1*grow,f,g);}
  add(p,vec2(uPtr.x*asp,uPtr.y),.05*2.1*grow*uPtrOn*uIntro*(1.-uSplit*.4),f,g);
}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;
  float asp=uRes.x/uRes.y;
  vec2 p=vec2(uv.x*asp,uv.y);
  float t=uTime;
  float f;vec2 g;
  field(p,t,asp,1.,f,g);
  // 柔和投影：同一个场放大并偏移后取低阈值
  float fs;vec2 gs;
  field(p+vec2(-.018,.03),t,asp,1.5,fs,gs);
  const float T=.3;
  float shadow=smoothstep(.05,.45,fs)*(1.-smoothstep(T,T+.01,f));
  vec3 col=uBg*(1.-shadow*mix(.07,.35,uDark));
  float aa=length(g)*1.4/uRes.y+1e-4;
  float m=smoothstep(T-aa,T+aa,f);
  if(m>0.){
    // 以 sqrt(f-T) 作为高度场：边缘陡、中间圆润，像真实的液滴
    vec2 dh=g/(2.*sqrt(max(f-T,1e-4)));
    vec3 n=normalize(vec3(-dh*.075,1.));
    vec3 L=normalize(vec3(-.55,.65,.75));
    float dif=max(dot(n,L),0.);
    float rl=max(dot(reflect(-L,n),vec3(0.,0.,1.)),0.);
    float spec=pow(rl,48.)+pow(rl,7.)*.12;
    float spec2=pow(max(dot(reflect(-normalize(vec3(.6,-.4,.7)),n),vec3(0.,0.,1.)),0.),18.);
    float fres=pow(1.-n.z,2.2);
    // 假环境反射：一条“地平线”让液体像镜面
    float env=smoothstep(-.05,.25,n.y+.25*n.x)*smoothstep(.95,.35,n.z);
    vec3 c=mix(uDeep,uA,.35+.65*dif);
    c=mix(c,uBg,env*.28);
    c+=fres*mix(uA,vec3(1.),.45)*.35;
    c+=spec2*uA*.35;
    c+=spec*.95;
    col=mix(col,c,m);
  }
  col+=(h(gl_FragCoord.xy+fract(t*.37)*91.)-.5)*.035;
  gl_FragColor=vec4(col,1.);
}`

const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render|mesa offscreen/i

type RGB = [number, number, number]
export interface Palette {
  bg: RGB
  accent: RGB
  deep: RGB
  dark: boolean
}

export class LiquidGL {
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
  private inView = true
  private live = false
  private start = performance.now()
  ptr = { x: 0.7, y: 0.5, tx: 0.7, ty: 0.5, on: 0, ton: 0 }
  split = 0
  intro = 0
  palette: Palette

  static create(canvas: HTMLCanvasElement, opts: { animate: boolean; palette: Palette; onFail: () => void }): LiquidGL | null {
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
      return new LiquidGL(canvas, gl, opts)
    } catch {
      return null
    }
  }

  private constructor(
    private canvas: HTMLCanvasElement,
    gl: WebGLRenderingContext,
    private opts: { animate: boolean; palette: Palette; onFail: () => void },
  ) {
    this.gl = gl
    this.palette = opts.palette
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
    for (const k of ['uRes', 'uTime', 'uPtr', 'uPtrOn', 'uSplit', 'uIntro', 'uBg', 'uA', 'uDeep', 'uDark', 'uMobile'])
      this.u[k] = gl.getUniformLocation(prog, k)

    canvas.addEventListener('webglcontextlost', e => {
      e.preventDefault()
      this.fail()
    })
    window.addEventListener('resize', this.resize)
    document.addEventListener('visibilitychange', () => {
      this.visible = !document.hidden
      this.loop()
    })
    this.resize()
    this.loop()
  }

  /** 舞台滚出视口后停止绘制 */
  setInView(v: boolean) {
    this.inView = v
    this.loop()
  }

  private resize = () => {
    const coarse = matchMedia('(pointer: coarse)').matches
    const cap = (coarse ? 1.25 : 1.5) * this.quality
    let dpr = Math.min(window.devicePixelRatio || 1, cap)
    const w = window.innerWidth
    const h = window.innerHeight
    const maxPx = 2_200_000 * this.quality
    if (w * h * dpr * dpr > maxPx) dpr = Math.sqrt(maxPx / (w * h))
    this.canvas.width = Math.round(w * dpr)
    this.canvas.height = Math.round(h * dpr)
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    this.redraw()
  }

  /** 静态模式（减少动态）下由外部在参数变化时调用 */
  redraw() {
    if (!this.opts.animate) this.draw(8)
  }

  private loop = () => {
    cancelAnimationFrame(this.raf)
    if (this.dead || !this.visible || !this.inView || !this.opts.animate) return
    this.last = 0
    this.raf = requestAnimationFrame(this.tick)
  }

  private tick = (now: number) => {
    if (this.dead || !this.visible || !this.inView) return
    const dt = Math.min(0.1, (now - (this.last || now)) / 1000)
    this.last = now
    this.frameAcc += dt
    // 30fps 足够流畅，省一半 GPU
    if (this.frameAcc >= 1 / 32) {
      const t0 = performance.now()
      const k = 1 - Math.exp(-this.frameAcc * 5)
      this.frameAcc = 0
      this.ptr.x += (this.ptr.tx - this.ptr.x) * k
      this.ptr.y += (this.ptr.ty - this.ptr.y) * k
      this.ptr.on += (this.ptr.ton - this.ptr.on) * k
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
    // alpha:false 的画布在第一帧前是黑的：画出第一帧后再显示
    if (!this.live) {
      this.live = true
      requestAnimationFrame(() => this.canvas.classList.add('is-live'))
    }
    const p = this.palette
    const mobile = window.innerWidth / window.innerHeight < 1 ? 1 : 0
    gl.uniform2f(this.u.uRes!, this.canvas.width, this.canvas.height)
    gl.uniform1f(this.u.uTime!, time)
    gl.uniform2f(this.u.uPtr!, this.ptr.x, this.ptr.y)
    gl.uniform1f(this.u.uPtrOn!, this.ptr.on)
    gl.uniform1f(this.u.uSplit!, this.split)
    gl.uniform1f(this.u.uIntro!, this.intro)
    gl.uniform3f(this.u.uBg!, ...p.bg)
    gl.uniform3f(this.u.uA!, ...p.accent)
    gl.uniform3f(this.u.uDeep!, ...p.deep)
    gl.uniform1f(this.u.uDark!, p.dark ? 1 : 0)
    gl.uniform1f(this.u.uMobile!, mobile)
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
    this.gl.deleteProgram(this.prog)
    this.gl.getExtension('WEBGL_lose_context')?.loseContext()
    // 丢失上下文的画布会显示为黑色，直接移除，交给 CSS 回退
    this.canvas.remove()
  }
}

/** 从 CSS 变量读取主题色（#rrggbb）转成 0..1 */
export function readPalette(): Palette {
  const cs = getComputedStyle(document.documentElement)
  const rgb = (name: string): RGB => {
    const hex = cs.getPropertyValue(name).trim().replace('#', '')
    const n = parseInt(hex.length === 3 ? hex.replace(/./g, c => c + c) : hex, 16)
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
  }
  return { bg: rgb('--paper'), accent: rgb('--gl-a'), deep: rgb('--gl-deep'), dark: document.documentElement.dataset.theme === 'dark' }
}
