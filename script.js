const canvas = document.getElementById("c");
const gl = canvas.getContext("webgl");

if (!gl) alert("WebGL not supported");

// === BREAKPOINTS === //
const SCREEN_SIZES = {
  mobileMax: 767,
  tabletMax: 1024
};

// === DEVICE CONFIGS === //
const CONFIG = {
  mobile: {
    NUM_BLOBS: 80,
    BASE_GRAVITY: 0.08,
    SCROLL_FORCE: 0.2,
    MIN_RADIUS: 1,
    MAX_RADIUS: 35,
    MOUSE_FORCE: 20,
    MOUSE_RANGE: 120
  },
  tablet: {
    NUM_BLOBS: 160,
    BASE_GRAVITY: 0.06,
    SCROLL_FORCE: 0.5,
    MIN_RADIUS: 1,
    MAX_RADIUS: 35,
    MOUSE_FORCE: 20,
    MOUSE_RANGE: 180
  },
  desktop: {
    NUM_BLOBS: 200,
    BASE_GRAVITY: 0.05,
    SCROLL_FORCE: 0.6,
    MIN_RADIUS: 0.5,
    MAX_RADIUS: 45,
    MOUSE_FORCE: 20,
    MOUSE_RANGE: 250
  }
};

// === FIXED CONSTANTS === //
const BLOB_DAMPING = 0.9;
const BLOB_COLOR = [0.0, 0.0, 0.0]; // RGB black

// === STATE === //
let width = canvas.width = window.innerWidth;
let height = canvas.height = window.innerHeight;
let mouse = { x: width / 2, y: height / 2, active: false };
let scrollVelocity = 0;
let lastScrollY = window.scrollY;
let currentDevice = "";

// === DYNAMIC CONFIG VARIABLES === //
let NUM_BLOBS, BASE_GRAVITY, SCROLL_FORCE, MIN_RADIUS, MAX_RADIUS, MOUSE_FORCE, MOUSE_RANGE;

// === BLOBS ARRAY === //
let blobs = [];

// === RESPONSIVE SETTINGS === //
function applyResponsiveSettings() {
  const w = window.innerWidth;
  let newDevice;

  if (w <= SCREEN_SIZES.mobileMax) {
    newDevice = "mobile";
  } else if (w <= SCREEN_SIZES.tabletMax) {
    newDevice = "tablet";
  } else {
    newDevice = "desktop";
  }

  // Only apply changes if device category changed
  if (newDevice !== currentDevice) {
    currentDevice = newDevice;
    const conf = CONFIG[newDevice];
    ({ NUM_BLOBS, BASE_GRAVITY, SCROLL_FORCE, MIN_RADIUS, MAX_RADIUS, MOUSE_FORCE, MOUSE_RANGE } = conf);
    initBlobs();
    setFontVars(newDevice);
  }
}

// === FONT SCALING === //
function setFontVars(device) {
  const root = document.documentElement;
  if (device === "mobile") {
    root.style.setProperty("--font-size", "4.5vw");
    root.style.setProperty("--line-height", "1.3");
    root.style.setProperty("--letter-spacing", "-0.5px");
  } else if (device === "tablet") {
    root.style.setProperty("--font-size", "5.5vw");
    root.style.setProperty("--line-height", "1.2");
    root.style.setProperty("--letter-spacing", "-0.6px");
  } else {
    root.style.setProperty("--font-size", "6vw");
    root.style.setProperty("--line-height", "1.1");
    root.style.setProperty("--letter-spacing", "-0.7px");
  }
}

// === RANDOM UTILITY === //
function rand(min, max) {
  return Math.random() * (max - min) + min;
}

// === BLOB CLASS === //
class Blob {
  constructor() {
    this.x = rand(100, width - 100);
    this.y = rand(100, height - 100);
    this.vx = rand(-1, 1);
    this.vy = rand(-1, 1);
    this.r = rand(MIN_RADIUS, MAX_RADIUS);
  }

  update() {
    this.vy += BASE_GRAVITY * (this.r / 10);

    const angle = Math.random() * Math.PI * 2;
    this.vx += Math.cos(angle) * scrollVelocity * SCROLL_FORCE;
    this.vy += Math.sin(angle) * scrollVelocity * SCROLL_FORCE;

    if (mouse.active) {
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const dist2 = dx * dx + dy * dy;
      if (dist2 < MOUSE_RANGE * MOUSE_RANGE) {
        const force = MOUSE_FORCE / (dist2 + 1);
        this.vx += dx * force;
        this.vy += dy * force;
      }
    }

    this.x += this.vx;
    this.y += this.vy;

    if (this.x - this.r < 0 || this.x + this.r > width) {
      this.vx *= -0.5;
      this.x = Math.max(this.r, Math.min(width - this.r, this.x));
    }
    if (this.y - this.r < 0 || this.y + this.r > height) {
      this.vy *= -0.5;
      this.y = Math.max(this.r, Math.min(height - this.r, this.y));
    }

    this.vx *= BLOB_DAMPING;
    this.vy *= BLOB_DAMPING;
  }
}

// === SHADERS === //
const vertexSrc = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0, 1);
  }
`;

const fragmentSrc = `
  precision mediump float;
  uniform vec2 u_resolution;
  uniform vec3 u_blobs[${CONFIG.desktop.NUM_BLOBS}];
  const vec3 blobColor = vec3(${BLOB_COLOR.join(", ")});

  void main() {
    vec2 uv = gl_FragCoord.xy;
    float sum = 0.0;
    for (int i = 0; i < ${CONFIG.desktop.NUM_BLOBS}; i++) {
      vec3 b = u_blobs[i];
      float dx = uv.x - b.x;
      float dy = uv.y - b.y;
      float d2 = dx * dx + dy * dy + 1.0;
      sum += pow(b.z, 2.5) / pow(d2, 1.1);
    }
    if (sum > 1.0) {
      gl_FragColor = vec4(blobColor, 1.0);
    } else {
      discard;
    }
  }
`;

// === SHADER SETUP === //
function compileShader(type, src) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
  }
  return shader;
}

const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSrc);
const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSrc);
const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
gl.useProgram(program);

// === BUFFERS === //
const quad = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
const positionLoc = gl.getAttribLocation(program, "a_position");
const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
gl.enableVertexAttribArray(positionLoc);
gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

// === UNIFORMS === //
const resolutionLoc = gl.getUniformLocation(program, "u_resolution");
const blobsLoc = gl.getUniformLocation(program, "u_blobs");

// === INIT BLOBS === //
function initBlobs() {
  blobs = [];
  for (let i = 0; i < NUM_BLOBS; i++) {
    blobs.push(new Blob());
  }
}

// === RENDER LOOP === //
function render() {
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.clearColor(0.22, 0.2, 0.2, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  blobs.forEach(blob => blob.update());

  const blobData = [];
  for (const b of blobs) blobData.push(b.x, height - b.y, b.r);

  gl.uniform2f(resolutionLoc, width, height);
  gl.uniform3fv(blobsLoc, new Float32Array(blobData));
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  scrollVelocity *= 0.9;
  requestAnimationFrame(render);
}

// === EVENTS === //
window.addEventListener("mousemove", e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  mouse.active = true;
});
window.addEventListener("mouseleave", () => (mouse.active = false));
window.addEventListener("touchmove", e => {
  if (e.touches.length > 0) {
    mouse.x = e.touches[0].clientX;
    mouse.y = e.touches[0].clientY;
    mouse.active = true;
  }
}, { passive: true });
window.addEventListener("touchend", () => (mouse.active = false));
window.addEventListener("scroll", () => {
  const currentY = window.scrollY;
  scrollVelocity = currentY - lastScrollY;
  lastScrollY = currentY;
});
window.addEventListener("resize", () => {
  const prevWidth = width;
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;

  if (window.innerWidth !== prevWidth) {
    applyResponsiveSettings();
  }
});



// === INITIALISE === //
applyResponsiveSettings();
requestAnimationFrame(render);
