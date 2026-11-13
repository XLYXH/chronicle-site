import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { qs, qsa } from "../lib/env";

/**
 * v8 · 签名交互（都不新增文案）：
 *  1. 变形光标：靠近按钮 / 导航 / 筛选等“实体”控件时，光标化成一片贴合控件形状的玻璃框，并随指针轻微视差
 *  2. 字重场：章节大标题按指针距离实时“加粗”（可变字体 wght 轴），触屏则在入场时走一道字重波
 *  3. 墨滴：按下时一圈钴蓝墨环扩散，并甩出几颗受重力影响的小墨珠（Canvas，空闲时不绘制）
 *  4. 景深展台：指针在作品舞台上时，舞台按透视倾斜，插图、标题、高光分层视差
 */
export function initSignature(animate: boolean, fine: boolean) {
  if (!animate) return;
  if (fine) {
    morphCursor();
    depthStage();
  }
  weightField(fine);
  ink();
}

/* ---------- 1. 变形光标 ---------- */
const SOLID =
  ".nav a, .filters button, .theme, .menu-btn, .totop, .pill, .chip, .dial, .brand, .footer__links a, .interest button, .connect__bottom .link, .hero__cta .link";

function morphCursor() {
  const cur = qs(".cursor");
  if (!cur) return;
  // 放在 body 下：.cursor 自身被 transform 跟随指针，会成为 fixed 子元素的包含块
  const frame = document.createElement("i");
  frame.className = "cursor__frame";
  frame.setAttribute("aria-hidden", "true");
  document.body.append(frame);
  let target: HTMLElement | null = null;
  let px = 0;
  let py = 0;
  const st = { x: 0, y: 0, w: 0, h: 0, r: 0 };
  let running = false;
  const tick = () => {
    if (!target) return;
    const b = target.getBoundingClientRect();
    const cs = getComputedStyle(target);
    const pad = 6;
    const cx = b.left + b.width / 2;
    const cy = b.top + b.height / 2;
    // 框跟着控件走（磁吸会移动控件），并向指针偏一点点，像被手指按住的玻璃
    const tx = cx + (px - cx) * 0.14;
    const ty = cy + (py - cy) * 0.14;
    const k = 0.32;
    st.x += (tx - st.x) * k;
    st.y += (ty - st.y) * k;
    st.w += (b.width + pad * 2 - st.w) * k;
    st.h += (b.height + pad * 2 - st.h) * k;
    const rr = parseFloat(cs.borderTopLeftRadius) || 12;
    st.r += (Math.min(rr + pad, st.h / 2) - st.r) * k;
    frame.style.transform = `translate(${(st.x - st.w / 2).toFixed(1)}px, ${(st.y - st.h / 2).toFixed(1)}px)`;
    frame.style.width = `${st.w.toFixed(1)}px`;
    frame.style.height = `${st.h.toFixed(1)}px`;
    frame.style.borderRadius = `${st.r.toFixed(1)}px`;
  };
  const start = () => {
    if (running) return;
    running = true;
    gsap.ticker.add(tick);
  };
  const stop = () => {
    running = false;
    gsap.ticker.remove(tick);
  };
  window.addEventListener(
    "pointermove",
    (e) => {
      px = e.clientX;
      py = e.clientY;
    },
    { passive: true },
  );
  document.addEventListener("pointerover", (e) => {
    if ((e as PointerEvent).pointerType !== "mouse") return;
    const t = (e.target as Element).closest<HTMLElement>(SOLID);
    if (!t || t === target) return;
    const fromNone = !target;
    target = t;
    if (fromNone) {
      // 从光标点处“长”出来，而不是从上一个控件飞过来
      st.x = px;
      st.y = py;
      st.w = 10;
      st.h = 10;
      st.r = 5;
    }
    cur.classList.add("is-framed");
    frame.classList.add("is-on");
    start();
  });
  document.addEventListener("pointerout", (e) => {
    if (!target) return;
    const to = (e.relatedTarget as Element | null)?.closest<HTMLElement>(SOLID);
    if (to === target) return;
    if (!to) {
      target = null;
      cur.classList.remove("is-framed");
      frame.classList.remove("is-on");
      stop();
    }
  });
  addEventListener(
    "scroll",
    () => {
      if (!target || target.matches(":hover")) return;
      target = null;
      cur.classList.remove("is-framed");
      frame.classList.remove("is-on");
      stop();
    },
    { passive: true },
  );
}

/* ---------- 2. 字重场 ---------- */
function weightField(fine: boolean) {
  // 首屏之外的标题，接近视口时才拆字与挂监听：不占启动时的主线程
  const io = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        setup(e.target as HTMLElement);
      }),
    { rootMargin: "300px 0px" },
  );
  qsa(".sec-title, .connect__title").forEach((t) => io.observe(t));
  const setup = (t: HTMLElement) => {
    const chars: { el: HTMLElement; base: number; x: number; y: number }[] = [];
    qsa(".w__in", t).forEach((w) => {
      const text = w.textContent ?? "";
      const serif = !!w.closest("em");
      w.textContent = "";
      for (const c of text) {
        const s = document.createElement("span");
        s.className = "ch";
        s.textContent = c;
        w.append(s);
        chars.push({ el: s, base: serif ? 300 : 500, x: 0, y: 0 });
      }
    });
    if (!chars.length) return;
    chars.forEach((c) => c.el.style.setProperty("--wg", String(c.base)));
    const measure = () => {
      chars.forEach((c) => {
        const r = c.el.getBoundingClientRect();
        c.x = r.left + r.width / 2 + scrollX;
        c.y = r.top + r.height / 2 + scrollY;
      });
    };
    const cur = chars.map((c) => c.base);
    const goal = chars.map((c) => c.base);
    let raf = 0;
    let measured = false;
    const step = () => {
      let moving = false;
      chars.forEach((c, i) => {
        const d = goal[i]! - cur[i]!;
        if (Math.abs(d) > 0.5) {
          cur[i] = cur[i]! + d * 0.16;
          moving = true;
        } else cur[i] = goal[i]!;
        c.el.style.setProperty("--wg", cur[i]!.toFixed(0));
      });
      raf = moving ? requestAnimationFrame(step) : 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(step);
    };
    if (fine) {
      const zone = t.closest("section, .connect__main") ?? t;
      zone.addEventListener("pointermove", (e) => {
        const pe = e as PointerEvent;
        if (pe.pointerType !== "mouse") return;
        if (!measured) {
          measure();
          measured = true;
        }
        const x = pe.clientX + scrollX;
        const y = pe.clientY + scrollY;
        const R = Math.max(140, t.getBoundingClientRect().height * 1.1);
        chars.forEach((c, i) => {
          const dist = Math.hypot(c.x - x, (c.y - y) * 1.4);
          const f = Math.max(0, 1 - dist / R);
          const ease = f * f * (3 - 2 * f);
          goal[i] = c.base + ease * (c.base === 300 ? 360 : 280);
        });
        kick();
      });
      zone.addEventListener("pointerleave", () => {
        chars.forEach((c, i) => (goal[i] = c.base));
        kick();
      });
      ScrollTrigger.addEventListener("refresh", () => (measured = false));
      addEventListener("resize", () => (measured = false));
      addEventListener("scroll", () => (measured = false), { passive: true });
    }
    // 入场时一道字重波从左到右扫过（触屏上这就是它的“交互版本”）
    ScrollTrigger.create({
      trigger: t,
      start: "top 75%",
      once: true,
      onEnter: () => {
        const tl = gsap.timeline({ delay: 0.5 });
        chars.forEach((c, i) => {
          const peak = c.base + (c.base === 300 ? 300 : 240);
          const o = { w: c.base };
          tl.to(
            o,
            {
              w: peak,
              duration: 0.35,
              ease: "sine.out",
              onUpdate: () => c.el.style.setProperty("--wg", o.w.toFixed(0)),
            },
            i * 0.035,
          );
          tl.to(
            o,
            {
              w: c.base,
              duration: 0.6,
              ease: "sine.inOut",
              onUpdate: () => c.el.style.setProperty("--wg", o.w.toFixed(0)),
            },
            i * 0.035 + 0.35,
          );
        });
      },
    });
  };
}

/* ---------- 3. 墨滴 ---------- */
function ink() {
  let fire: ((e: PointerEvent) => void) | null = null;
  addEventListener(
    "pointerdown",
    (e) => {
      // 第一次按下时才建画布
      if (!fire) fire = inkLayer();
      fire?.(e);
    },
    { passive: true },
  );
}

function inkLayer(): ((e: PointerEvent) => void) | null {
  const cv = document.createElement("canvas");
  cv.className = "ink-layer";
  cv.setAttribute("aria-hidden", "true");
  document.body.append(cv);
  const ctx = cv.getContext("2d");
  if (!ctx) return null;
  const dpr = Math.min(1.5, devicePixelRatio || 1);
  const size = () => {
    cv.width = Math.round(innerWidth * dpr);
    cv.height = Math.round(innerHeight * dpr);
  };
  size();
  addEventListener("resize", size);
  type Ring = { x: number; y: number; t: number };
  type Drop = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    t: number;
  };
  const rings: Ring[] = [];
  const drops: Drop[] = [];
  let color = "#2b3df5";
  let on = false;
  let last = 0;
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i]!;
      r.t += dt / 0.7;
      if (r.t >= 1) {
        rings.splice(i, 1);
        continue;
      }
      const e = 1 - Math.pow(1 - r.t, 3);
      ctx.globalAlpha = (1 - r.t) * 0.55;
      ctx.lineWidth = 2.2 * (1 - r.t) + 0.4;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 4 + e * 38, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i]!;
      d.t += dt / 0.65;
      if (d.t >= 1) {
        drops.splice(i, 1);
        continue;
      }
      d.vy += 900 * dt;
      d.vx *= 0.985;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      ctx.globalAlpha = (1 - d.t) * 0.85;
      // 速度方向上拉长一点，像甩出去的液滴
      const sp = Math.hypot(d.vx, d.vy);
      const a = Math.atan2(d.vy, d.vx);
      ctx.beginPath();
      ctx.ellipse(
        d.x,
        d.y,
        d.r * (1 + Math.min(1.6, sp / 500)),
        d.r,
        a,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (rings.length || drops.length) requestAnimationFrame(frame);
    else {
      on = false;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
    }
  };
  return (e: PointerEvent) => {
    const t = e.target as Element;
    // 拖拽类区域（实验区轨道、表单）不打扰
    if (t.closest(".lab__field, input, textarea, select")) return;
    color =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--accent")
        .trim() || color;
    rings.push({ x: e.clientX, y: e.clientY, t: 0 });
    const n = 5 + Math.round(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3;
      const sp = 160 + Math.random() * 260;
      drops.push({
        x: e.clientX,
        y: e.clientY,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        r: 1.4 + Math.random() * 2,
        t: Math.random() * 0.2,
      });
    }
    if (rings.length > 6) rings.shift();
    if (drops.length > 48) drops.splice(0, drops.length - 48);
    if (!on) {
      on = true;
      last = performance.now();
      requestAnimationFrame(frame);
    }
  };
}

/* ---------- 4. 景深展台 ---------- */
function depthStage() {
  const stage = qs("[data-stage]");
  if (!stage) return;
  const sheen = document.createElement("i");
  sheen.className = "showcase__sheen";
  sheen.setAttribute("aria-hidden", "true");
  stage.append(sheen);
  const rx = gsap.quickTo(stage, "rotationX", {
    duration: 0.9,
    ease: "expo.out",
  });
  const ry = gsap.quickTo(stage, "rotationY", {
    duration: 0.9,
    ease: "expo.out",
  });
  gsap.set(stage, { transformPerspective: 1400 });
  // 分层视差用 CSS 独立的 translate 属性（见 signature.css），不碰 showcase 切换动画所用的 transform
  const cur = { x: 0, y: 0 };
  const goal = { x: 0, y: 0 };
  let running = false;
  const tick = () => {
    cur.x += (goal.x - cur.x) * 0.1;
    cur.y += (goal.y - cur.y) * 0.1;
    stage.style.setProperty("--dx", cur.x.toFixed(3));
    stage.style.setProperty("--dy", cur.y.toFixed(3));
    if (
      Math.abs(goal.x - cur.x) < 0.002 &&
      Math.abs(goal.y - cur.y) < 0.002 &&
      !goal.x &&
      !goal.y
    ) {
      gsap.ticker.remove(tick);
      running = false;
    }
  };
  const move = (x: number, y: number) => {
    rx(-y * 5);
    ry(x * 7);
    goal.x = x;
    goal.y = y;
    if (!running) {
      running = true;
      gsap.ticker.add(tick);
    }
  };
  stage.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    const r = stage.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    move(x * 2, y * 2);
    stage.style.setProperty("--sx", `${((x + 0.5) * 100).toFixed(1)}%`);
    stage.style.setProperty("--sy", `${((y + 0.5) * 100).toFixed(1)}%`);
    stage.classList.add("is-tilting");
  });
  stage.addEventListener("pointerleave", () => {
    move(0, 0);
    stage.classList.remove("is-tilting");
  });
}
