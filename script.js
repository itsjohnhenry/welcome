const canvas = document.getElementById("c");
const gl = canvas.getContext("webgl");
if (!gl) alert("WebGL not supported");

// === CONFIG: Breakpoints and Settings === //
const BREAKPOINTS = {
  mobile: 600,
  tablet: 1024
};

const SETTINGS = {
  desktop: {
    numBlobs: 300,
    gravity: 0.05,
    minBlobRadius: 1,
    maxBlobRadius: 30,
    mouseRange: 250,
    mouseForce: 10
  },
  tablet: {
    numBlobs: 200,
    gravity: 0.06,
    minBlobRadius: 5,
    maxBlobRadius: 35,
    mouseRange: 200,
    mouseForce: 8
  },
  mobile: {
    numBlobs: 100,
    gravity: 0.1,
    minBlobRadius: 1,
    maxBlobRadius: 40,
    mouseRange: 150,
    mouseForce: 6
  }
};

// === Runtime state === //
let width = canvas.width = window.innerWidth;
let height = canvas.height = window.innerHeight;
let scrollVelocity = 0;
let lastScrollY = window.scrollY;
let mouse = { x: width / 2, y: height / 2, active: false };

// Dynamic settings based on screen size
let config = {};
let blobs = [];

// === Helper: Random number in range === //
function rand(min, max) {
  return Math.random() * (max - min) + min;
}

// === Resize-aware config setter === //
function updateSettings() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;

  if (width <= BREAKPOINTS.mobile) {
    config = SETTINGS.mobile;
  } else if (width <= BREAKPOINTS.tablet) {
    config = SETTINGS.tablet;
  } else {
    config = SETTINGS.desktop;
  }

  blobs = [];
  for (let i = 0; i < config.numBlobs; i++) {
    blobs.push(new Blob());
  }
}

// === Blob class === //
class Blob {
  constructor() {
    this.x = rand(100, width - 100);
    this.y = rand(100, height - 100);
    this.vx = rand(-1, 1);
    this.vy = rand(-1, 1);
    this.r = rand(config.minBlobRadius, config.maxBlobRadius);
  }

  update() {
    const gravity = config.gravity * (this.r / 10);
    this.vy += gravity;

    const angle = Math.random() * Math.PI * 2;
    this.vx += Math.cos(angle) * scrollVelocity * 0.5;
    this.vy += Math.sin(angle) * scrollVelocity * 0.5;

    if (mouse.active) {
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const dist2 = dx * dx + dy * dy;
      if (dist2 < config.mouseRange * config.mouseRange) {
        const force = config.mouseForce / (dist2 + 1);
        this.vx += dx * force;
        this.vy += dy * force;
      }
    }

    this.x += this.vx;
    this.y += this.vy;

    // Containment
    if (this.x - this.r < 0) {
      this.x = this.r;
      this.vx *= -0.5;
    } else if (this.x + this.r > width) {
      this.x = width - this.r;
      this.vx *= -0.5;
    }

    if (this.y - this.r < 0) {
      this.y = this.r;
      this.vy *= -0.5;
    } else if (this.y + this.r > height) {
      this.y = height - this.r;
      this.vy *= -0.5;
    }

    this.vx *= 0.9;
    this.vy *= 0.9;
  }
}

// === WebGL Shaders === //
const vertexSrc = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0, 1);
  }
`;

const fragmentSrc = `
  precision mediump float;
  uniform vec2 u_resolution;
  uniform vec3 u_blobs[300]; // Max blob count
  const vec3 blobColor = vec3(0.0, 0.0, 0.0); // Black

  void main() {
    vec2 uv = gl_FragCoord.xy;
    float sum = 0.0;

    for (int i = 0; i < 300; i++) {
      vec3 b = u_blobs[i];
      float dx = uv.x - b.x;
      float dy = uv.y - b.y;
      float d2 = dx * dx + dy * dy + 1.0;
      sum += (b.z * b.z) / d2;
    }

    if (sum > 1.0) {
      gl_FragColor = vec4(blobColor, 1.0);
    } else {
      discard;
    }
  }
`;

// === Shader setup === //
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

// === WebGL Buffers === //
const quad = new Float32Array([
  -1, -1, 1, -1, -1, 1,
  -1, 1, 1, -1, 1, 1
]);
const positionLoc = gl.getAttribLocation(program, "a_position");
const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
gl.enableVertexAttribArray(positionLoc);
gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

const resolutionLoc = gl.getUniformLocation(program, "u_resolution");
const blobsLoc = gl.getUniformLocation(program, "u_blobs");

// === Render Loop === //
function render() {
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.clearColor(0.22, 0.2, 0.2, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  for (const blob of blobs) blob.update();

  const blobData = [];
  for (let i = 0; i < blobs.length; i++) {
    blobData.push(blobs[i].x, height - blobs[i].y, blobs[i].r);
  }

  gl.uniform2f(resolutionLoc, width, height);
  gl.uniform3fv(blobsLoc, new Float32Array(blobData));
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  scrollVelocity *= 0.9;
  requestAnimationFrame(render);
}

requestAnimationFrame(render);

// === Input Events === //
window.addEventListener("mousemove", e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  mouse.active = true;
});
window.addEventListener("mouseleave", () => {
  mouse.active = false;
});
window.addEventListener("touchmove", e => {
  if (e.touches.length > 0) {
    mouse.x = e.touches[0].clientX;
    mouse.y = e.touches[0].clientY;
    mouse.active = true;
  }
}, { passive: true });
window.addEventListener("touchend", () => {
  mouse.active = false;
});
window.addEventListener("scroll", () => {
  const currentY = window.scrollY;
  scrollVelocity = currentY - lastScrollY;
  lastScrollY = currentY;
});
window.addEventListener("resize", () => {
  updateSettings();
});

// === Init === //
updateSettings();
