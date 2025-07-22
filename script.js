const canvas = document.getElementById("c");
const gl = canvas.getContext("webgl");

// === CONFIGURABLE CONSTANTS === //
const NUM_BLOBS = 12;
const BLOB_RADIUS = 0.08; // Radius of the blobs in clip space
const BLOB_DAMPING = 0.98; // Movement damping per frame
const BASE_GRAVITY = 0.0015; // ↓ Gravity strength
const MOUSE_FORCE = 0.005;   // ←→ Strength of mouse attraction
const MOUSE_RANGE = 0.4;     // Mouse influence radius
const SCROLL_FORCE = 0.05;   // ↑↓ Scroll force on blobs

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
gl.viewport(0, 0, canvas.width, canvas.height);

gl.clearColor(1, 1, 1, 1);
gl.clear(gl.COLOR_BUFFER_BIT);

let mouse = { x: 0, y: 0, active: false };
let lastScrollY = window.scrollY;
let scrollVelocity = 0;

// Convert pixel to clip space
function toClip(x, y) {
  return {
    x: (x / canvas.width) * 2 - 1,
    y: -((y / canvas.height) * 2 - 1)
  };
}

// === BLOB SETUP === //
class Blob {
  constructor() {
    this.x = Math.random() * 2 - 1;
    this.y = Math.random() * 1.5 - 1;
    this.vx = 0;
    this.vy = 0;
  }

  update() {
    // Gravity
    this.vy -= BASE_GRAVITY;

    // Mouse interaction
    if (mouse.active) {
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MOUSE_RANGE) {
        const force = (MOUSE_RANGE - dist) / MOUSE_RANGE;
        this.vx += dx * force * MOUSE_FORCE;
        this.vy += dy * force * MOUSE_FORCE;
      }
    }

    // Scroll force
    this.vy += scrollVelocity * SCROLL_FORCE;

    // Apply velocity
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= BLOB_DAMPING;
    this.vy *= BLOB_DAMPING;

    // Boundary wrap
    if (this.x < -1) this.x = 1;
    if (this.x > 1) this.x = -1;
    if (this.y < -1) this.y = 1;
    if (this.y > 1) this.y = -1;
  }
}

const blobs = Array.from({ length: NUM_BLOBS }, () => new Blob());

// === SHADER SETUP === //
const vertexShaderSource = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0, 1);
}`;

const fragmentShaderSource = `
precision mediump float;
uniform vec2 uBlobs[${NUM_BLOBS}];

void main() {
  float field = 0.0;
  for (int i = 0; i < ${NUM_BLOBS}; i++) {
    vec2 diff = gl_FragCoord.xy / vec2(${canvas.width.toFixed(1)}, ${canvas.height.toFixed(1)}) * 2.0 - 1.0 - uBlobs[i];
    float d = dot(diff, diff);
    field += ${BLOB_RADIUS * BLOB_RADIUS} / (d + 0.001);
  }

  if (field > 1.0) {
    gl_FragColor = vec4(0.2, 0.5, 0.8, 1.0); // Blob colour
  } else {
    discard;
  }
}`;

function createShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

const program = gl.createProgram();
gl.attachShader(program, createShader(gl.VERTEX_SHADER, vertexShaderSource));
gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, fragmentShaderSource));
gl.linkProgram(program);
gl.useProgram(program);

// Quad covering entire screen
const vertices = new Float32Array([
  -1, -1, 1, -1, -1, 1,
   1, -1, 1,  1, -1, 1
]);

const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

const position = gl.getAttribLocation(program, "position");
gl.enableVertexAttribArray(position);
gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

const uBlobs = gl.getUniformLocation(program, "uBlobs");

// === ANIMATION LOOP === //
function draw() {
  scrollVelocity *= 0.9;
  gl.clear(gl.COLOR_BUFFER_BIT);

  blobs.forEach(b => b.update());
  const blobData = [];
  blobs.forEach(b => blobData.push(b.x, b.y));
  gl.uniform2fv(uBlobs, new Float32Array(blobData));

  gl.drawArrays(gl.TRIANGLES, 0, 6);
  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);

// === EVENTS === //
window.addEventListener("mousemove", e => {
  const clip = toClip(e.clientX, e.clientY);
  mouse.x = clip.x;
  mouse.y = clip.y;
  mouse.active = true;
});

window.addEventListener("mouseleave", () => {
  mouse.active = false;
});

window.addEventListener("touchmove", e => {
  if (e.touches.length > 0) {
    const clip = toClip(e.touches[0].clientX, e.touches[0].clientY);
    mouse.x = clip.x;
    mouse.y = clip.y;
    mouse.active = true;
  }
}, { passive: true });

window.addEventListener("touchend", () => {
  mouse.active = false;
});

window.addEventListener("scroll", () => {
  const y = window.scrollY;
  scrollVelocity = y - lastScrollY;
  lastScrollY = y;
});

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
});
