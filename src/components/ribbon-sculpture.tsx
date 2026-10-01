import { useEffect, useRef } from "react";

/**
 * A ribbed, twisting ribbon in soft pinks, drawn with plain WebGL (no library).
 * It drifts on its own and turns a little as the page scrolls. Where WebGL is
 * missing, or the person prefers reduced motion, it draws one still frame or
 * nothing, and the CSS behind it carries the look.
 */

const NU = 200; // steps along the ribbon
const NV = 16; // steps across it
const RIBS = 34;

const VERT = `
attribute vec3 aPos; attribute vec3 aNor; attribute vec3 aTan; attribute vec2 aUv;
uniform mat4 uProj; uniform mat4 uView; uniform mat3 uRot;
varying vec3 vN; varying vec3 vT; varying vec3 vP; varying vec2 vUv;
void main(){
  vec3 p = uRot * aPos;
  vP = p; vN = uRot * aNor; vT = uRot * aTan; vUv = aUv;
  gl_Position = uProj * uView * vec4(p, 1.0);
}`;

const FRAG = `
precision mediump float;
varying vec3 vN; varying vec3 vT; varying vec3 vP; varying vec2 vUv;
uniform vec3 uEye;
void main(){
  vec3 n = normalize(vN);
  bool front = gl_FrontFacing;
  if(!front) n = -n;
  float ph = 6.2831853 * vUv.x * ${RIBS}.0;
  float ridge = 0.5 + 0.5 * sin(ph);
  vec3 t = normalize(vT);
  vec3 nb = normalize(n + 0.85 * cos(ph) * t);
  vec3 L = normalize(vec3(-0.5, 0.85, 0.65));
  float diff = clamp(dot(nb, L) * 0.5 + 0.5, 0.0, 1.0);
  vec3 V = normalize(uEye - vP);
  float fres = pow(1.0 - max(dot(nb, V), 0.0), 2.4);
  float spec = pow(max(dot(reflect(-L, nb), V), 0.0), 26.0);
  vec3 c0 = vec3(1.0, 0.91, 0.90);
  vec3 c1 = vec3(0.96, 0.64, 0.68);
  vec3 c2 = vec3(0.70, 0.16, 0.27);
  float k = clamp(0.18 + 0.95 * (1.0 - diff) + 0.30 * (vUv.y - 0.5) + 0.12 * sin(vUv.x * 12.566), 0.0, 1.0);
  vec3 col = k < 0.5 ? mix(c0, c1, k * 2.0) : mix(c1, c2, (k - 0.5) * 2.0);
  col *= mix(0.82, 1.0, ridge);
  col += fres * vec3(1.0, 0.84, 0.86) * 0.32 + spec * 0.32;
  if(!front) col *= 0.9;
  gl_FragColor = vec4(col, 1.0);
}`;

type V3 = [number, number, number];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

function curve(u: number, s: number): V3 {
  const f = Math.PI * 2 * u;
  const r = 1.3 + 0.42 * Math.cos(3 * f + 0.6 * s);
  return [r * Math.cos(f), 0.55 * Math.sin(2 * f + 0.8 * s) + 0.18 * Math.sin(5 * f), r * Math.sin(f)];
}

/** Fills the vertex arrays for the ribbon at time-phase s. */
function buildRibbon(s: number, pos: Float32Array, nor: Float32Array, tan: Float32Array) {
  const P: V3[] = new Array((NU + 1) * (NV + 1));
  const T: V3[] = new Array(NU + 1);
  const W: V3[] = new Array(NU + 1);
  const wid: number[] = new Array(NU + 1);
  const e = 1e-3;
  for (let i = 0; i <= NU; i++) {
    const u = i / NU;
    const f = Math.PI * 2 * u;
    const t = norm(sub(curve(u + e, s), curve(u - e, s)));
    const n = norm(cross(t, [0, 1, 0]));
    const b = cross(n, t);
    const th = 1.5 * f + 0.5 * Math.sin(2 * f + s);
    const c = Math.cos(th);
    const sn = Math.sin(th);
    T[i] = t;
    W[i] = [c * b[0] + sn * n[0], c * b[1] + sn * n[1], c * b[2] + sn * n[2]];
    wid[i] = 0.62 + 0.3 * Math.sin(2 * f + 1.2 + 0.7 * s);
    const C = curve(u, s);
    for (let j = 0; j <= NV; j++) {
      const v = j / NV - 0.5;
      P[i * (NV + 1) + j] = [C[0] + v * wid[i] * W[i][0], C[1] + v * wid[i] * W[i][1], C[2] + v * wid[i] * W[i][2]];
    }
  }
  for (let i = 0; i <= NU; i++) {
    for (let j = 0; j <= NV; j++) {
      const k = i * (NV + 1) + j;
      const ip = P[((i + 1) % NU || NU) * (NV + 1) + j];
      const im = P[((i - 1 + NU) % NU) * (NV + 1) + j];
      const du = sub(ip, im);
      const dv = sub(P[i * (NV + 1) + Math.min(j + 1, NV)], P[i * (NV + 1) + Math.max(j - 1, 0)]);
      const n = norm(cross(du, dv));
      const tg = norm(du);
      pos.set(P[k], k * 3);
      nor.set(n, k * 3);
      tan.set(tg, k * 3);
    }
  }
}

function perspective(fov: number, aspect: number, near: number, far: number) {
  const f = 1 / Math.tan(fov / 2);
  const nf = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
}

function rotation(ay: number, ax: number, az: number) {
  const cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax), cz = Math.cos(az), sz = Math.sin(az);
  // Rz * Rx * Ry, column-major 3x3
  const ry = [cy, 0, -sy, 0, 1, 0, sy, 0, cy];
  const rx = [1, 0, 0, 0, cx, sx, 0, -sx, cx];
  const rz = [cz, sz, 0, -sz, cz, 0, 0, 0, 1];
  const mul = (a: number[], b: number[]) => {
    const o = new Array(9).fill(0);
    for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) o[c * 3 + r] += a[k * 3 + r] * b[c * 3 + k];
    return o;
  };
  return new Float32Array(mul(rz, mul(rx, ry)));
}

export function RibbonSculpture({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Decoration must never break the page: any failure just leaves the CSS backdrop.
    try {
      return start();
    } catch {
      return undefined;
    }
    function start() {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const gl = canvas.getContext("webgl", { antialias: true, alpha: true, premultipliedAlpha: true });
    if (!gl) return undefined;

    if (gl.isContextLost()) return undefined;
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return undefined;
    const prog = gl.createProgram();
    if (!prog) return undefined;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return undefined;
    gl.useProgram(prog);

    const count = (NU + 1) * (NV + 1);
    const pos = new Float32Array(count * 3);
    const nor = new Float32Array(count * 3);
    const tan = new Float32Array(count * 3);
    const uv = new Float32Array(count * 2);
    for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) uv.set([i / NU, j / NV], (i * (NV + 1) + j) * 2);
    const idx = new Uint16Array(NU * NV * 6);
    let q = 0;
    for (let i = 0; i < NU; i++)
      for (let j = 0; j < NV; j++) {
        const a = i * (NV + 1) + j, b = a + 1, c = a + NV + 1, d = c + 1;
        idx.set([a, c, b, b, c, d], q);
        q += 6;
      }

    const attr = (name: string, data: Float32Array, size: number, dynamic: boolean) => {
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, data, dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
      return buf;
    };
    const bPos = attr("aPos", pos, 3, true);
    const bNor = attr("aNor", nor, 3, true);
    const bTan = attr("aTan", tan, 3, true);
    attr("aUv", uv, 2, false);
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);

    const uProj = gl.getUniformLocation(prog, "uProj");
    const uView = gl.getUniformLocation(prog, "uView");
    const uRot = gl.getUniformLocation(prog, "uRot");
    const uEye = gl.getUniformLocation(prog, "uEye");
    const eye: V3 = [0, 0.3, 5.2];
    gl.uniform3fv(uEye, eye);
    // View: camera at the eye looking down -z.
    gl.uniformMatrix4fv(uView, false, new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -eye[0], -eye[1], -eye[2], 1]));
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let visible = true;
    let w = 0, h = 0;
    const t0 = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.5 : 2);
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width * dpr));
      h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.uniformMatrix4fv(uProj, false, perspective((38 * Math.PI) / 180, w / h, 0.1, 30));
    };

    const draw = (now: number) => {
      const time = reduce.matches ? 2.4 : (now - t0) / 1000;
      const s = time * 0.3;
      buildRibbon(s, pos, nor, tan);
      gl.bindBuffer(gl.ARRAY_BUFFER, bPos);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, pos);
      gl.bindBuffer(gl.ARRAY_BUFFER, bNor);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, nor);
      gl.bindBuffer(gl.ARRAY_BUFFER, bTan);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, tan);
      const scroll = reduce.matches ? 0 : window.scrollY;
      gl.uniformMatrix3fv(uRot, false, rotation(time * 0.1 + scroll * 0.0016, 0.5 + Math.sin(time * 0.2) * 0.08, -0.18));
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
    };

    const loop = (now: number) => {
      raf = 0;
      if (!visible) return;
      draw(now);
      if (!reduce.matches) raf = requestAnimationFrame(loop);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };

    const ro = new ResizeObserver(() => {
      resize();
      if (reduce.matches) draw(performance.now());
    });
    ro.observe(canvas);
    resize();
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) kick();
    });
    io.observe(canvas);
    kick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
    }
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
