(function () {
  'use strict';

  /* ---------- 封面接缝（SeamTransitions · mist，WebGL 移植） ---------- */
  var seamEl = document.querySelector('.seam');
  if (!seamEl) return;
  var heroEl = document.querySelector('.hero');
  var heroContent = document.querySelector('.hero-content');
  var heroScroll = document.querySelector('.hero-scroll');

  var VERT = "#version 300 es\n" +
    "uniform vec2 uSize;\n" +
    "out vec2 vPx;\n" +
    "void main() {\n" +
    "  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));\n" +
    "  vPx = vec2(p.x, 1.0 - p.y) * uSize;\n" +
    "  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);\n" +
    "}";

  var FRAG = "#version 300 es\n" +
    "precision highp float;\n" +
    "uniform float uEdge;\n" +
    "uniform float uTravel;\n" +
    "uniform float uProgress;\n" +
    "uniform vec3 uPaper;\n" +
    "in vec2 vPx;\n" +
    "out vec4 outColor;\n" +
    "float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }\n" +
    "float noise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1,0)), u.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y); }\n" +
    "float fbm(vec2 p){ float v = 0.0; float a = 0.5; for(int i=0;i<5;i++){ v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return v / 0.97; }\n" +
    "void main() {\n" +
    "  if (uProgress <= 0.0) { outColor = vec4(0.0); return; }\n" +
    "  vec2 px = vPx;\n" +
    "  float h = (uEdge - px.y) / uEdge;\n" +
    "  float rise = smoothstep(0.0, 0.85, uProgress);\n" +
    "  float clear = 1.0;\n" +
    "  for (int i = 0; i < 3; i++) {\n" +
    "    float layer = float(i);\n" +
    "    float size = 260.0 - layer * 70.0;\n" +
    "    vec2 q = (px + vec2(0.15, 0.6) * uTravel * (1.0 - layer * 0.3)) / size + layer * 13.1;\n" +
    "    vec2 fold = vec2(fbm(q), fbm(q + vec2(5.2, 1.3)));\n" +
    "    float wisp = fbm(q + 1.6 * fold);\n" +
    "    float reach = rise * 1.4 - 0.25 - h * (1.1 + layer * 0.35);\n" +
    "    float fog = smoothstep(0.0, 0.45, wisp + reach - 0.3) * (1.0 - layer * 0.25);\n" +
    "    clear *= 1.0 - fog;\n" +
    "  }\n" +
    "  float wisps = (1.0 - clear) * smoothstep(1.0, 0.7, h) * smoothstep(0.0, 0.04, uProgress);\n" +
    "  float bank = (20.0 + 70.0 * fbm(vec2(px.x / 180.0 + uTravel / 900.0, 2.0))) * sqrt(rise);\n" +
    "  float ground = 1.0 - smoothstep(0.0, max(bank, 0.001), uEdge - px.y);\n" +
    "  float a = 1.0 - (1.0 - wisps) * (1.0 - ground);\n" +
    "  if (px.y >= uEdge) a = 1.0;\n" +
    "  outColor = vec4(uPaper * a, a);\n" +
    "}";

  var canvas = document.createElement('canvas');
  seamEl.appendChild(canvas);
  var gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: false });
  var program = null;
  var loc = {};
  var uniforms = { uTravel: 0, uProgress: 0, uPaper: [0.980, 0.984, 0.961] };
  var above = 0, below = 2, MARGIN = 24;

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('shader:', gl.getShaderInfoLog(s)); return null; }
    return s;
  }

  if (gl) {
    var vs = compile(gl.VERTEX_SHADER, VERT);
    var fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (vs && fs) {
      program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) program = null;
    }
  }

  function resize() {
    var hero = heroEl.offsetHeight || window.innerHeight;
    var textBottom = heroContent.offsetTop + heroContent.offsetHeight;
    above = Math.max(80, hero - textBottom - MARGIN);
    seamEl.style.setProperty('--above', above + 'px');
    seamEl.style.setProperty('--below', below + 'px');
    var w = seamEl.clientWidth || window.innerWidth;
    var h = above + below;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    uniforms.uSize = [w, h];
    uniforms.uEdge = above;
    render();
  }

  function render() {
    if (!program) return;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(program);
    for (var name in uniforms) {
      var at = loc[name];
      if (at === undefined) at = loc[name] = gl.getUniformLocation(program, name);
      if (at === null || at === undefined) continue;
      var v = uniforms[name];
      if (typeof v === 'number') gl.uniform1f(at, v);
      else gl['uniform' + v.length + 'fv'](at, v);
    }
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  if (program) { resize(); window.addEventListener('resize', resize); }
  else { seamEl.style.display = 'none'; }

  var heroH = window.innerHeight;
  var lastY = 0, lastT = performance.now(), velocity = 0, travel = 0, progress = 0;
  function tick(now) {
    var y = window.scrollY || 0;
    var dt = Math.max((now - lastT) / 1000, 1 / 120);
    var speed = (y - lastY) / dt;
    lastY = y; lastT = now;
    velocity += (speed - velocity) * 0.3;
    if (Math.abs(velocity) < 2) velocity = 0;
    heroH = heroEl.offsetHeight || window.innerHeight;
    travel = y + window.innerHeight - heroH;
    progress = Math.max(0, Math.min(1, travel / window.innerHeight));
    uniforms.uTravel = travel;
    uniforms.uProgress = progress;
    var top = heroH - above - y;
    var bottom = heroH + below - y;
    if (program && top < window.innerHeight && bottom > 0) render();
    if (heroScroll) heroScroll.style.opacity = Math.max(0, 1 - y / 30);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
