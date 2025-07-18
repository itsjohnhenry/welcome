const canvas = document.getElementById("c");
const regl = createREGL({ canvas });

let width = window.innerWidth;
let height = window.innerHeight;
canvas.width = width;
canvas.height = height;

const isMobile = width < 600;
const floorTop = height * (isMobile ? 0.85 : 0.75);
const blobs = [];
const numBlobs = 12;

let scrollVelocity = 0;
let lastScrollY = window.scrollY;

function random(min, max) {
  return Math.random() * (max - min) + min;
}

class Blob {
  constructor(pinned = false) {
    this.r = random(isMobile ? 15 : 20, isMobile ? 35 : 60);
    this.x = random(this.r, width - this.r);
    this.y = random(this.r, floorTop - this.r - 20);
    this.vx = 0;
    this.vy = 0;
    this.mass = this.r * 0.02;
    this.pinned = pinned;
  }

  move() {
    if (this.pinned) return;

    this.vy += 2.5 * this.mass;

    // Apply scroll-based influence
    this.vy -= scrollVelocity * 0.03;

    this.x += this.vx;
    this.y += this.vy;

    // Contain within canvas
    if (this.x < this.r) this.x = this.r;
    if (this.x > width - this.r) this.x = width - this.r;
    if (this.y < this.r) this.y = this.r;
    if (this.y + this.r > floorTop) {
      this.y = floorTop - this.r;
      this.vy = 0;
    }

    this.vx *= 0.98;
    this.vy *= 0.98;
  }
}

function initBlobs() {
  blobs.length = 0;

  for (let i = 0; i < numBlobs; i++) {
    blobs.push(new Blob());
  }

  const pinCount = Math.floor(width / 35);
  for (let i = 0; i <= pinCount; i++) {
    const b = new Blob(true);
    b.r = 50;
    b.x = (i / pinCount) * width;
    b.y = floorTop;
    blobs.push(b);
  }
}

initBlobs();

const draw = regl({
  frag: `
  precision mediump float;
  varying vec2 uv;
  uniform vec2 resolution;
  uniform float floorTop;

  void main () {
    vec2 st = gl_FragCoord.xy / resolution;
    if (gl_FragCoord.y > floorTop) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }
    float blob = 0.0;
    ${blobs.map((_, i) => `
      vec2 p${i} = vec2(${_.x.toFixed(1)}, ${_.y.toFixed(1)});
      float r${i} = ${_.r.toFixed(1)};
      blob += r${i} * r${i} / distance(gl_FragCoord.xy, p${i});
    `).join('')}
    float v = smoothstep(500.0, 800.0, blob);
    gl_FragColor = vec4(vec3(v), 1.0);
  }`,

  vert: `
  precision mediump float;
  attribute vec2 position;
  varying vec2 uv;
  void main () {
    uv = 0.5 * (position + 1.0);
    gl_Position = vec4(position, 0, 1);
  }`,

  attributes: {
    position: [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1]
    ]
  },

  elements: [
    [0, 1, 2],
    [2, 3, 0]
  ],

  uniforms: {
    resolution: () => [width, height],
    floorTop: () => floorTop
  }
});

regl.frame(() => {
  scrollVelocity *= 0.9;

  blobs.forEach(blob => {
    blob.move();
  });

  draw();
});

// Events
window.addEventListener("scroll", () => {
  const currentY = window.scrollY;
  scrollVelocity = currentY - lastScrollY;
  lastScrollY = currentY;
});

window.addEventListener("resize", () => {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  initBlobs();
});
