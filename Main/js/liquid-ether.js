/**
 * LiquidEther — vanilla-JS port (no React).
 * Depends on Three.js loaded via importmap.
 *
 * Usage:
 *   import { initLiquidEther } from './liquid-ether.js';
 *   initLiquidEther(document.getElementById('heroEther'), { colors: [...] });
 */
import * as THREE from 'three';

export function initLiquidEther(container, opts = {}) {
  if (!container) return;

  const cfg = {
    mouseForce: 20,
    cursorSize: 100,
    isViscous: false,
    viscous: 30,
    iterationsViscous: 32,
    iterationsPoisson: 32,
    dt: 0.014,
    BFECC: true,
    resolution: 0.5,
    isBounce: false,
    colors: ['#5227FF', '#FF9FFC', '#B497CF'],
    autoDemo: true,
    autoSpeed: 0.5,
    autoIntensity: 2.2,
    takeoverDuration: 0.25,
    autoResumeDelay: 3000,
    autoRampDuration: 0.6,
    revealImage: null,
    revealImages: null,
    revealInterval: 30000,
    ...opts
  };

  /* ── palette texture ── */
  function makePaletteTexture(stops) {
    let arr = Array.isArray(stops) && stops.length
      ? (stops.length === 1 ? [stops[0], stops[0]] : stops)
      : ['#ffffff', '#ffffff'];
    const w = arr.length;
    const data = new Uint8Array(w * 4);
    for (let i = 0; i < w; i++) {
      const c = new THREE.Color(arr[i]);
      data[i * 4] = Math.round(c.r * 255);
      data[i * 4 + 1] = Math.round(c.g * 255);
      data[i * 4 + 2] = Math.round(c.b * 255);
      data[i * 4 + 3] = 255;
    }
    const tex = new THREE.DataTexture(data, w, 1, THREE.RGBAFormat);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    return tex;
  }

  const paletteTex = makePaletteTexture(cfg.colors);
  const bgVec4 = new THREE.Vector4(0, 0, 0, 0);

  /* ── Common ── */
  const Common = {
    width: 0, height: 0, aspect: 1, pixelRatio: 1,
    renderer: null, clock: null, time: 0, delta: 0,
    init(el) {
      this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      this.resize(el);
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.autoClear = false;
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.setPixelRatio(this.pixelRatio);
      this.renderer.setSize(this.width, this.height);
      const cvs = this.renderer.domElement;
      cvs.style.width = '100%';
      cvs.style.height = '100%';
      cvs.style.display = 'block';
      this.clock = new THREE.Clock();
      this.clock.start();
    },
    resize(el) {
      const r = el.getBoundingClientRect();
      this.width = Math.max(1, Math.floor(r.width));
      this.height = Math.max(1, Math.floor(r.height));
      this.aspect = this.width / this.height;
      if (this.renderer) this.renderer.setSize(this.width, this.height, false);
    },
    update() {
      this.delta = this.clock.getDelta();
      this.time += this.delta;
    }
  };

  /* ── Mouse ── */
  const Mouse = {
    mouseMoved: false,
    coords: new THREE.Vector2(),
    coords_old: new THREE.Vector2(),
    diff: new THREE.Vector2(),
    timer: null,
    container: null,
    listenerTarget: null,
    isHoverInside: false,
    hasUserControl: false,
    isAutoActive: false,
    autoIntensity: cfg.autoIntensity,
    takeoverActive: false,
    takeoverStartTime: 0,
    takeoverDuration: cfg.takeoverDuration,
    takeoverFrom: new THREE.Vector2(),
    takeoverTo: new THREE.Vector2(),
    onInteract: null,

    init(el) {
      this.container = el;
      const win = window;
      this.listenerTarget = win;
      this._onMM = this._mouseMove.bind(this);
      this._onTS = this._touchStart.bind(this);
      this._onTM = this._touchMove.bind(this);
      this._onTE = this._touchEnd.bind(this);
      this._onML = this._mouseLeave.bind(this);
      win.addEventListener('mousemove', this._onMM);
      win.addEventListener('touchstart', this._onTS, { passive: true });
      win.addEventListener('touchmove', this._onTM, { passive: true });
      win.addEventListener('touchend', this._onTE);
      document.addEventListener('mouseleave', this._onML);
    },
    dispose() {
      if (!this.listenerTarget) return;
      this.listenerTarget.removeEventListener('mousemove', this._onMM);
      this.listenerTarget.removeEventListener('touchstart', this._onTS);
      this.listenerTarget.removeEventListener('touchmove', this._onTM);
      this.listenerTarget.removeEventListener('touchend', this._onTE);
      document.removeEventListener('mouseleave', this._onML);
    },
    _inside(cx, cy) {
      const r = this.container.getBoundingClientRect();
      return cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
    },
    _setCoords(x, y) {
      if (this.timer) clearTimeout(this.timer);
      const r = this.container.getBoundingClientRect();
      if (!r.width || !r.height) return;
      this.coords.set(((x - r.left) / r.width) * 2 - 1, -(((y - r.top) / r.height) * 2 - 1));
      this.mouseMoved = true;
      this.timer = setTimeout(() => { this.mouseMoved = false; }, 100);
    },
    setNormalized(nx, ny) { this.coords.set(nx, ny); this.mouseMoved = true; },
    _mouseMove(e) {
      this.isHoverInside = this._inside(e.clientX, e.clientY);
      if (!this.isHoverInside) return;
      if (this.onInteract) this.onInteract();
      if (this.isAutoActive && !this.hasUserControl && !this.takeoverActive) {
        const r = this.container.getBoundingClientRect();
        if (!r.width || !r.height) return;
        this.takeoverFrom.copy(this.coords);
        this.takeoverTo.set(((e.clientX - r.left) / r.width) * 2 - 1,
          -(((e.clientY - r.top) / r.height) * 2 - 1));
        this.takeoverStartTime = performance.now();
        this.takeoverActive = true;
        this.hasUserControl = true;
        this.isAutoActive = false;
        return;
      }
      this._setCoords(e.clientX, e.clientY);
      this.hasUserControl = true;
    },
    _touchStart(e) {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      this.isHoverInside = this._inside(t.clientX, t.clientY);
      if (!this.isHoverInside) return;
      if (this.onInteract) this.onInteract();
      this._setCoords(t.clientX, t.clientY);
      this.hasUserControl = true;
    },
    _touchMove(e) {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      this.isHoverInside = this._inside(t.clientX, t.clientY);
      if (!this.isHoverInside) return;
      if (this.onInteract) this.onInteract();
      this._setCoords(t.clientX, t.clientY);
    },
    _touchEnd() { this.isHoverInside = false; },
    _mouseLeave() { this.isHoverInside = false; },
    update() {
      if (this.takeoverActive) {
        const t = (performance.now() - this.takeoverStartTime) / (this.takeoverDuration * 1000);
        if (t >= 1) {
          this.takeoverActive = false;
          this.coords.copy(this.takeoverTo);
          this.coords_old.copy(this.coords);
          this.diff.set(0, 0);
        } else {
          const k = t * t * (3 - 2 * t);
          this.coords.copy(this.takeoverFrom).lerp(this.takeoverTo, k);
        }
      }
      this.diff.subVectors(this.coords, this.coords_old);
      this.coords_old.copy(this.coords);
      if (this.coords_old.x === 0 && this.coords_old.y === 0) this.diff.set(0, 0);
      if (this.isAutoActive && !this.takeoverActive) this.diff.multiplyScalar(this.autoIntensity);
    }
  };

  /* ── AutoDriver ── */
  class AutoDriver {
    constructor(mouse, mgr, o) {
      this.mouse = mouse; this.manager = mgr;
      this.enabled = o.enabled; this.speed = o.speed;
      this.resumeDelay = o.resumeDelay || 3000;
      this.rampDurationMs = (o.rampDuration || 0) * 1000;
      this.active = false;
      this.current = new THREE.Vector2();
      this.target = new THREE.Vector2();
      this.lastTime = performance.now();
      this.activationTime = performance.now();
      this.margin = 0.15;
      this._dir = new THREE.Vector2();
      this.burstDuration = 2800; // active fluid wave duration (ms)
      this.pauseDuration = 3200; // rest interval (ms)
      this.pickNewTarget();
    }
    pickNewTarget() {
      this.target.set((Math.random() * 2 - 1) * (1 - this.margin),
        (Math.random() * 2 - 1) * (1 - this.margin));
    }
    forceStop() { this.active = false; this.mouse.isAutoActive = false; }
    update() {
      if (!this.enabled) return;
      const now = performance.now();
      if (now - this.manager.lastUserInteraction < this.resumeDelay) {
        if (this.active) this.forceStop(); return;
      }
      if (this.mouse.isHoverInside) { if (this.active) this.forceStop(); return; }

      const totalCycle = this.burstDuration + this.pauseDuration;
      const cycleTime = (now - this.activationTime) % totalCycle;
      const inBurst = cycleTime < this.burstDuration;

      if (!inBurst) {
        if (this.active) {
          this.active = false;
          this.mouse.isAutoActive = false;
        }
        return;
      }

      if (!this.active) {
        this.active = true;
        this.current.copy(this.mouse.coords);
        this.lastTime = now;
        this.pickNewTarget();
      }

      this.mouse.isAutoActive = true;
      let dt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      if (dt > 0.2) dt = 0.016;

      const dir = this._dir.subVectors(this.target, this.current);
      const dist = dir.length();
      if (dist < 0.05) { this.pickNewTarget(); }
      dir.normalize();

      const moveSpeed = this.speed * 2.2;
      this.current.addScaledVector(dir, Math.min(moveSpeed * dt, dist));
      this.mouse.setNormalized(this.current.x, this.current.y);
    }
  }

  /* ── Shaders ── */
  const face_vert = `
attribute vec3 position;
uniform vec2 px;
uniform vec2 boundarySpace;
varying vec2 uv;
precision highp float;
void main(){
  vec3 pos = position;
  vec2 scale = 1.0 - boundarySpace * 2.0;
  pos.xy = pos.xy * scale;
  uv = vec2(0.5) + pos.xy * 0.5;
  gl_Position = vec4(pos, 1.0);
}`;
  const line_vert = `
attribute vec3 position;
uniform vec2 px;
precision highp float;
varying vec2 uv;
void main(){
  vec3 pos = position;
  uv = 0.5 + pos.xy * 0.5;
  vec2 n = sign(pos.xy);
  pos.xy = abs(pos.xy) - px * 1.0;
  pos.xy *= n;
  gl_Position = vec4(pos, 1.0);
}`;
  const mouse_vert = `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
uniform vec2 center;
uniform vec2 scale;
uniform vec2 px;
varying vec2 vUv;
void main(){
  vec2 pos = position.xy * scale * 2.0 * px + center;
  vUv = uv;
  gl_Position = vec4(pos, 0.0, 1.0);
}`;
  const advection_frag = `
precision highp float;
uniform sampler2D velocity;
uniform float dt;
uniform bool isBFECC;
uniform vec2 fboSize;
uniform vec2 px;
varying vec2 uv;
void main(){
  vec2 ratio = max(fboSize.x, fboSize.y) / fboSize;
  if(!isBFECC){
    vec2 vel = texture2D(velocity, uv).xy;
    vec2 uv2 = uv - vel * dt * ratio;
    gl_FragColor = vec4(texture2D(velocity, uv2).xy, 0.0, 0.0);
  } else {
    vec2 spot_new = uv;
    vec2 vel_old = texture2D(velocity, uv).xy;
    vec2 spot_old = spot_new - vel_old * dt * ratio;
    vec2 vel_new1 = texture2D(velocity, spot_old).xy;
    vec2 spot_new2 = spot_old + vel_new1 * dt * ratio;
    vec2 error = spot_new2 - spot_new;
    vec2 spot_new3 = spot_new - error / 2.0;
    vec2 vel_2 = texture2D(velocity, spot_new3).xy;
    vec2 spot_old2 = spot_new3 - vel_2 * dt * ratio;
    gl_FragColor = vec4(texture2D(velocity, spot_old2).xy, 0.0, 0.0);
  }
}`;
  const color_frag = `
precision highp float;
uniform sampler2D velocity;
uniform sampler2D palette;
uniform sampler2D revealTex;
uniform float hasReveal;
uniform vec4 bgColor;
varying vec2 uv;
void main(){
  vec2 vel = texture2D(velocity, uv).xy;
  float lenv = clamp(length(vel), 0.0, 1.0);
  vec3 palC = texture2D(palette, vec2(lenv, 0.5)).rgb;
  if (hasReveal > 0.5) {
    vec4 img = texture2D(revealTex, uv);
    float mask = smoothstep(0.0, 0.15, lenv);
    // boost saturation
    float luma = dot(img.rgb, vec3(0.299, 0.587, 0.114));
    vec3 saturated = mix(vec3(luma), img.rgb, 1.4);
    // boost contrast + brightness
    vec3 enhanced = (saturated - 0.5) * 1.3 + 0.5 + 0.06;
    enhanced = clamp(enhanced, 0.0, 1.0);
    vec3 outRGB = mix(bgColor.rgb, enhanced, mask);
    float outA = mix(bgColor.a, 1.0, mask);
    gl_FragColor = vec4(outRGB, outA);
  } else {
    vec3 outRGB = mix(bgColor.rgb, palC, lenv);
    float outA = mix(bgColor.a, 1.0, lenv);
    gl_FragColor = vec4(outRGB, outA);
  }
}`;
  const divergence_frag = `
precision highp float;
uniform sampler2D velocity;
uniform float dt;
uniform vec2 px;
varying vec2 uv;
void main(){
  float x0 = texture2D(velocity, uv-vec2(px.x,0.0)).x;
  float x1 = texture2D(velocity, uv+vec2(px.x,0.0)).x;
  float y0 = texture2D(velocity, uv-vec2(0.0,px.y)).y;
  float y1 = texture2D(velocity, uv+vec2(0.0,px.y)).y;
  gl_FragColor = vec4((x1-x0+y1-y0)/2.0/dt);
}`;
  const externalForce_frag = `
precision highp float;
uniform vec2 force;
uniform vec2 center;
uniform vec2 scale;
uniform vec2 px;
varying vec2 vUv;
void main(){
  vec2 circle = (vUv - 0.5) * 2.0;
  float d = 1.0 - min(length(circle), 1.0);
  d *= d;
  gl_FragColor = vec4(force * d, 0.0, 1.0);
}`;
  const poisson_frag = `
precision highp float;
uniform sampler2D pressure;
uniform sampler2D divergence;
uniform vec2 px;
varying vec2 uv;
void main(){
  float p0 = texture2D(pressure, uv+vec2(px.x*2.0,0.0)).r;
  float p1 = texture2D(pressure, uv-vec2(px.x*2.0,0.0)).r;
  float p2 = texture2D(pressure, uv+vec2(0.0,px.y*2.0)).r;
  float p3 = texture2D(pressure, uv-vec2(0.0,px.y*2.0)).r;
  float div = texture2D(divergence, uv).r;
  gl_FragColor = vec4((p0+p1+p2+p3)/4.0-div);
}`;
  const pressure_frag = `
precision highp float;
uniform sampler2D pressure;
uniform sampler2D velocity;
uniform vec2 px;
uniform float dt;
varying vec2 uv;
void main(){
  float p0 = texture2D(pressure, uv+vec2(px.x,0.0)).r;
  float p1 = texture2D(pressure, uv-vec2(px.x,0.0)).r;
  float p2 = texture2D(pressure, uv+vec2(0.0,px.y)).r;
  float p3 = texture2D(pressure, uv-vec2(0.0,px.y)).r;
  vec2 v = texture2D(velocity, uv).xy;
  vec2 gradP = vec2(p0-p1, p2-p3)*0.5;
  gl_FragColor = vec4(v - gradP*dt, 0.0, 1.0);
}`;
  const viscous_frag = `
precision highp float;
uniform sampler2D velocity;
uniform sampler2D velocity_new;
uniform float v;
uniform vec2 px;
uniform float dt;
varying vec2 uv;
void main(){
  vec2 old = texture2D(velocity, uv).xy;
  vec2 n0 = texture2D(velocity_new, uv+vec2(px.x*2.0,0.0)).xy;
  vec2 n1 = texture2D(velocity_new, uv-vec2(px.x*2.0,0.0)).xy;
  vec2 n2 = texture2D(velocity_new, uv+vec2(0.0,px.y*2.0)).xy;
  vec2 n3 = texture2D(velocity_new, uv-vec2(0.0,px.y*2.0)).xy;
  vec2 nv = 4.0*old + v*dt*(n0+n1+n2+n3);
  nv /= 4.0*(1.0+v*dt);
  gl_FragColor = vec4(nv, 0.0, 0.0);
}`;

  /* ── ShaderPass ── */
  class ShaderPass {
    constructor(p) { this.props = p || {}; this.uniforms = p.material?.uniforms; }
    init() {
      this.scene = new THREE.Scene();
      this.camera = new THREE.Camera();
      if (this.uniforms) {
        this.material = new THREE.RawShaderMaterial(this.props.material);
        this.geometry = new THREE.PlaneGeometry(2, 2);
        this.plane = new THREE.Mesh(this.geometry, this.material);
        this.scene.add(this.plane);
      }
    }
    update() {
      Common.renderer.setRenderTarget(this.props.output || null);
      Common.renderer.render(this.scene, this.camera);
      Common.renderer.setRenderTarget(null);
    }
  }

  /* ── Advection ── */
  class Advection extends ShaderPass {
    constructor(sp) {
      super({
        material: {
          vertexShader: face_vert, fragmentShader: advection_frag,
          uniforms: {
            boundarySpace: { value: sp.cellScale }, px: { value: sp.cellScale },
            fboSize: { value: sp.fboSize }, velocity: { value: sp.src.texture },
            dt: { value: sp.dt }, isBFECC: { value: true }
          }
        }, output: sp.dst
      });
      this.uniforms = this.props.material.uniforms;
      this.init();
    }
    init() {
      super.init();
      const bg = new THREE.BufferGeometry();
      bg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
        -1,-1,0, -1,1,0, -1,1,0, 1,1,0, 1,1,0, 1,-1,0, 1,-1,0, -1,-1,0
      ]), 3));
      this.line = new THREE.LineSegments(bg, new THREE.RawShaderMaterial({
        vertexShader: line_vert, fragmentShader: advection_frag, uniforms: this.uniforms
      }));
      this.scene.add(this.line);
    }
    update(o) {
      this.uniforms.dt.value = o.dt;
      this.line.visible = o.isBounce;
      this.uniforms.isBFECC.value = o.BFECC;
      super.update();
    }
  }

  /* ── ExternalForce ── */
  class ExternalForce extends ShaderPass {
    constructor(sp) {
      super({ output: sp.dst });
      super.init();
      this.mouse = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.RawShaderMaterial({
          vertexShader: mouse_vert, fragmentShader: externalForce_frag,
          blending: THREE.AdditiveBlending, depthWrite: false,
          uniforms: {
            px: { value: sp.cellScale },
            force: { value: new THREE.Vector2() },
            center: { value: new THREE.Vector2() },
            scale: { value: new THREE.Vector2(sp.cursor_size, sp.cursor_size) }
          }
        })
      );
      this.scene.add(this.mouse);
    }
    update(p) {
      const u = this.mouse.material.uniforms;
      u.force.value.set((Mouse.diff.x / 2) * p.mouse_force, (Mouse.diff.y / 2) * p.mouse_force);
      const csx = p.cursor_size * p.cellScale.x, csy = p.cursor_size * p.cellScale.y;
      u.center.value.set(
        Math.min(Math.max(Mouse.coords.x, -1 + csx + p.cellScale.x * 2), 1 - csx - p.cellScale.x * 2),
        Math.min(Math.max(Mouse.coords.y, -1 + csy + p.cellScale.y * 2), 1 - csy - p.cellScale.y * 2)
      );
      u.scale.value.set(p.cursor_size, p.cursor_size);
      super.update();
    }
  }

  /* ── Viscous ── */
  class Viscous extends ShaderPass {
    constructor(sp) {
      super({
        material: {
          vertexShader: face_vert, fragmentShader: viscous_frag,
          uniforms: {
            boundarySpace: { value: sp.boundarySpace },
            velocity: { value: sp.src.texture },
            velocity_new: { value: sp.dst_.texture },
            v: { value: sp.viscous }, px: { value: sp.cellScale }, dt: { value: sp.dt }
          }
        }, output: sp.dst, output0: sp.dst_, output1: sp.dst
      });
      this.init();
    }
    update(o) {
      let fi, fo;
      this.uniforms.v.value = o.viscous;
      for (let i = 0; i < o.iterations; i++) {
        fi = i % 2 === 0 ? this.props.output0 : this.props.output1;
        fo = i % 2 === 0 ? this.props.output1 : this.props.output0;
        this.uniforms.velocity_new.value = fi.texture;
        this.props.output = fo;
        this.uniforms.dt.value = o.dt;
        super.update();
      }
      return fo;
    }
  }

  /* ── Divergence ── */
  class Divergence extends ShaderPass {
    constructor(sp) {
      super({
        material: {
          vertexShader: face_vert, fragmentShader: divergence_frag,
          uniforms: {
            boundarySpace: { value: sp.boundarySpace },
            velocity: { value: sp.src.texture },
            px: { value: sp.cellScale }, dt: { value: sp.dt }
          }
        }, output: sp.dst
      });
      this.init();
    }
    update(o) { this.uniforms.velocity.value = o.vel.texture; super.update(); }
  }

  /* ── Poisson ── */
  class Poisson extends ShaderPass {
    constructor(sp) {
      super({
        material: {
          vertexShader: face_vert, fragmentShader: poisson_frag,
          uniforms: {
            boundarySpace: { value: sp.boundarySpace },
            pressure: { value: sp.dst_.texture },
            divergence: { value: sp.src.texture },
            px: { value: sp.cellScale }
          }
        }, output: sp.dst, output0: sp.dst_, output1: sp.dst
      });
      this.init();
    }
    update(o) {
      let pi, po;
      for (let i = 0; i < o.iterations; i++) {
        pi = i % 2 === 0 ? this.props.output0 : this.props.output1;
        po = i % 2 === 0 ? this.props.output1 : this.props.output0;
        this.uniforms.pressure.value = pi.texture;
        this.props.output = po;
        super.update();
      }
      return po;
    }
  }

  /* ── Pressure ── */
  class Pressure extends ShaderPass {
    constructor(sp) {
      super({
        material: {
          vertexShader: face_vert, fragmentShader: pressure_frag,
          uniforms: {
            boundarySpace: { value: sp.boundarySpace },
            pressure: { value: sp.src_p.texture },
            velocity: { value: sp.src_v.texture },
            px: { value: sp.cellScale }, dt: { value: sp.dt }
          }
        }, output: sp.dst
      });
      this.init();
    }
    update(o) {
      this.uniforms.velocity.value = o.vel.texture;
      this.uniforms.pressure.value = o.pressure.texture;
      super.update();
    }
  }

  /* ── Simulation ── */
  class Simulation {
    constructor() {
      this.options = {
        iterations_poisson: cfg.iterationsPoisson,
        iterations_viscous: cfg.iterationsViscous,
        mouse_force: cfg.mouseForce,
        resolution: cfg.resolution,
        cursor_size: cfg.cursorSize,
        viscous: cfg.viscous,
        isBounce: cfg.isBounce,
        dt: cfg.dt,
        isViscous: cfg.isViscous,
        BFECC: cfg.BFECC
      };
      this.fbos = {};
      this.fboSize = new THREE.Vector2();
      this.cellScale = new THREE.Vector2();
      this.boundarySpace = new THREE.Vector2();
      this._init();
    }
    _init() {
      this._calcSize();
      this._createFBO();
      this._createPasses();
    }
    _floatType() {
      return /(iPad|iPhone|iPod)/i.test(navigator.userAgent) ? THREE.HalfFloatType : THREE.FloatType;
    }
    _createFBO() {
      const o = {
        type: this._floatType(), depthBuffer: false, stencilBuffer: false,
        minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
        wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping
      };
      ['vel_0','vel_1','vel_viscous0','vel_viscous1','div','pressure_0','pressure_1']
        .forEach(k => { this.fbos[k] = new THREE.WebGLRenderTarget(this.fboSize.x, this.fboSize.y, o); });
    }
    _createPasses() {
      const cs = this.cellScale, bs = this.boundarySpace, f = this.fbos, o = this.options;
      this.advection = new Advection({ cellScale: cs, fboSize: this.fboSize, dt: o.dt, src: f.vel_0, dst: f.vel_1 });
      this.externalForce = new ExternalForce({ cellScale: cs, cursor_size: o.cursor_size, dst: f.vel_1 });
      this.viscous = new Viscous({ cellScale: cs, boundarySpace: bs, viscous: o.viscous, src: f.vel_1, dst: f.vel_viscous1, dst_: f.vel_viscous0, dt: o.dt });
      this.divergence = new Divergence({ cellScale: cs, boundarySpace: bs, src: f.vel_viscous0, dst: f.div, dt: o.dt });
      this.poisson = new Poisson({ cellScale: cs, boundarySpace: bs, src: f.div, dst: f.pressure_1, dst_: f.pressure_0 });
      this.pressure = new Pressure({ cellScale: cs, boundarySpace: bs, src_p: f.pressure_0, src_v: f.vel_viscous0, dst: f.vel_0, dt: o.dt });
    }
    _calcSize() {
      const w = Math.max(1, Math.round(this.options.resolution * Common.width));
      const h = Math.max(1, Math.round(this.options.resolution * Common.height));
      this.cellScale.set(1 / w, 1 / h);
      this.fboSize.set(w, h);
    }
    resize() {
      this._calcSize();
      for (const k in this.fbos) this.fbos[k].setSize(this.fboSize.x, this.fboSize.y);
    }
    update() {
      const o = this.options;
      o.isBounce ? this.boundarySpace.set(0, 0) : this.boundarySpace.copy(this.cellScale);
      this.advection.update({ dt: o.dt, isBounce: o.isBounce, BFECC: o.BFECC });
      this.externalForce.update({ cursor_size: o.cursor_size, mouse_force: o.mouse_force, cellScale: this.cellScale });
      let vel = this.fbos.vel_1;
      if (o.isViscous) vel = this.viscous.update({ viscous: o.viscous, iterations: o.iterations_viscous, dt: o.dt });
      this.divergence.update({ vel });
      const pr = this.poisson.update({ iterations: o.iterations_poisson });
      this.pressure.update({ vel, pressure: pr });
    }
  }

  /* ── Reveal texture loader ── */
  let revealTex = null;
  const hasRevealVal = { value: 0.0 };
  const loader = new THREE.TextureLoader();
  let revealTimerId = null;

  const mql = window.matchMedia('(max-width: 768px)');
  let isMobile = mql.matches;

  const desktopImages = cfg.revealImages || (cfg.revealImage ? [cfg.revealImage] : []);
  const mobileImages = cfg.revealImagesMobile || [
    'pics/PHONE/download.jpeg_2K_202608281038.webp',
    'pics/PHONE/download_(1).jpeg_2K_202608281039.webp'
  ];

  const getImageList = () => (isMobile && mobileImages.length ? mobileImages : desktopImages);

  let lastImgIdx = -1;

  function loadRevealTex(primaryUrl, fallbackUrl) {
    const tryLoad = (url, isFallback = false) => {
      loader.load(
        url,
        (tex) => {
          tex.minFilter = THREE.LinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.wrapS = THREE.ClampToEdgeWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          tex.generateMipmaps = false;
          if (revealTex) revealTex.dispose();
          revealTex = tex;
          hasRevealVal.value = 1.0;
        },
        undefined,
        () => {
          if (!isFallback && fallbackUrl) {
            tryLoad(fallbackUrl, true);
          }
        }
      );
    };
    tryLoad(primaryUrl);
  }

  function pickNextImage() {
    const list = getImageList();
    if (!list.length) return;
    const idx = list.length > 1 ? (lastImgIdx + 1) % list.length : 0;
    lastImgIdx = idx;
    const primary = list[idx];
    const fallback = desktopImages[idx % desktopImages.length] || primary;
    loadRevealTex(primary, fallback);
  }

  mql.addEventListener('change', (e) => {
    isMobile = e.matches;
    const list = getImageList();
    if (list.length) {
      const idx = lastImgIdx >= 0 ? lastImgIdx % list.length : 0;
      const primary = list[idx];
      const fallback = desktopImages[idx % desktopImages.length] || primary;
      loadRevealTex(primary, fallback);
    }
  });

  if (desktopImages.length || mobileImages.length) {
    pickNextImage();
    const activeList = getImageList();
    if (activeList.length > 1 && cfg.revealInterval > 0) {
      revealTimerId = setInterval(pickNextImage, cfg.revealInterval);
    }
  }

  /* ── Output ── */
  class Output {
    constructor() {
      this.simulation = new Simulation();
      this.scene = new THREE.Scene();
      this.camera = new THREE.Camera();
      const placeholderTex = new THREE.DataTexture(
        new Uint8Array([0,0,0,0]), 1, 1, THREE.RGBAFormat
      );
      placeholderTex.needsUpdate = true;
      this.outputUniforms = {
        velocity: { value: this.simulation.fbos.vel_0.texture },
        boundarySpace: { value: new THREE.Vector2() },
        palette: { value: paletteTex },
        revealTex: { value: placeholderTex },
        hasReveal: hasRevealVal,
        bgColor: { value: bgVec4 }
      };
      this.output = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.RawShaderMaterial({
          vertexShader: face_vert, fragmentShader: color_frag,
          transparent: true, depthWrite: false,
          uniforms: this.outputUniforms
        })
      );
      this.scene.add(this.output);
    }
    resize() { this.simulation.resize(); }
    render() {
      if (revealTex) this.outputUniforms.revealTex.value = revealTex;
      Common.renderer.setRenderTarget(null);
      Common.renderer.render(this.scene, this.camera);
    }
    update() { this.simulation.update(); this.render(); }
  }

  /* ── Manager ── */
  let rafId = null, running = false, isVisible = true;

  Common.init(container);
  Mouse.init(container);

  const lastUserInteraction = { value: performance.now() };
  Mouse.onInteract = () => {
    lastUserInteraction.value = performance.now();
    if (autoDriver) autoDriver.forceStop();
  };

  const mgr = { get lastUserInteraction() { return lastUserInteraction.value; } };
  const autoDriver = new AutoDriver(Mouse, mgr, {
    enabled: cfg.autoDemo, speed: cfg.autoSpeed,
    resumeDelay: cfg.autoResumeDelay, rampDuration: cfg.autoRampDuration
  });

  container.prepend(Common.renderer.domElement);
  const output = new Output();

  function loop() {
    if (!running) return;
    autoDriver.update();
    Mouse.update();
    Common.update();
    output.update();
    rafId = requestAnimationFrame(loop);
  }
  function start() { if (running) return; running = true; loop(); }
  function pause() { running = false; if (rafId) { cancelAnimationFrame(rafId); rafId = null; } }

  function resize() { Common.resize(container); output.resize(); }

  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    document.hidden ? pause() : (isVisible && start());
  });

  const io = new IntersectionObserver(es => {
    const vis = es[0].isIntersecting && es[0].intersectionRatio > 0;
    isVisible = vis;
    vis && !document.hidden ? start() : pause();
  }, { threshold: [0, 0.01, 0.1] });
  io.observe(container);

  const ro = new ResizeObserver(() => { requestAnimationFrame(resize); });
  ro.observe(container);

  start();

  return function dispose() {
    pause();
    io.disconnect();
    ro.disconnect();
    Mouse.dispose();
    const cvs = Common.renderer.domElement;
    if (cvs.parentNode) cvs.parentNode.removeChild(cvs);
    Common.renderer.dispose();
    Common.renderer.forceContextLoss();
  };
}
