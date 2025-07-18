const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

let width = window.innerWidth;
let height = window.innerHeight;
let scale = width < 600 ? 0.5 : 1;
canvas.width = width * scale;
canvas.height = height * scale;
ctx.scale(scale, scale);

const blobs = [];
const numBlobs = width < 600 ? 6 : 12;

let floorTop = height * (width < 600 ? 0.85 : 0.75);
const lightDir = normalize({ x: 1, y: -1 });

let mouse = { x: width / 2, y: height / 2, active: false };
let lastScrollY = window.scrollY;
let scrollVelocity = 0;

let lastWidth = window.innerWidth;

function normalize(v) {
  const len = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / len, y: v.y / len };
}
function random(min, max) {
  return Math.random() * (max - min) + min;
}

class Blob {
  constructor(pinned = false) {
    this.r = random(width < 600 ? 15 : 20, width < 600 ? 35 : 60);
    this.x = random(this.r, width - this.r);
    this.y = random(this.r, floorTop - this.r - 20);
    this.vx = 0; this.vy = 0;
    this.pinned = pinned;
    this.mass = this.r * 0.02;
  }
  move() {
    if (this.pinned) return;
    this.vy += 2.5 * this.mass;
    this.vy -= scrollVelocity * 0.03;

    if (mouse.active) {
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 150) {
        const f = (150 - dist) / 150;
        this.vx += dx * f * 0.005;
        this.vy += dy * f * 0.005;
      }
    }

    // edge containment
    this.x = Math.max(this.r, Math.min(width - this.r, this.x + this.vx));
    this.y += this.vy;

    if (this.y + this.r > floorTop) {
      this.y = floorTop - this.r;  // no bounce
      this.vy = 0;
    }

    this.vx *= 0.98;
    this.vy *= 0.98;
  }
}

function init() {
  blobs.length = 0;
  for (let i = 0; i < numBlobs; i++) blobs.push(new Blob());
  const pinCount = Math.floor(width / 35);
  for (let i = 0; i <= pinCount; i++) {
    const b = new Blob(true);
    b.r = 50;
    b.x = (i / pinCount) * width;
    b.y = floorTop;
    blobs.push(b);
  }
}

function draw() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);

  const topH = Math.ceil(floorTop);
  const img = ctx.createImageData(width, topH);
  const d = img.data;

  for (let y = 1; y < topH - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (x + y * width) * 4;
      let field = 0;
      for (const b of blobs) {
        const dx = x - b.x;
        const dy = y - b.y;
        field += (b.r * b.r) / (dx * dx + dy * dy + 0.0001);
      }
      if (field > 1) {
        let gx = 0, gy = 0;
        for (const b of blobs) {
          const dx = x - b.x;
          const dy = y - b.y;
          const d2 = dx * dx + dy * dy + 0.001;
          const r2 = b.r * b.r;
          const base = -2 * r2 / (d2 * d2);
          gx += base * dx;
          gy += base * dy;
        }
        const mag = Math.hypot(gx, gy) || 1;
        const nx = gx / mag, ny = gy / mag;
        const dot = Math.max(0, nx * lightDir.x + ny * lightDir.y);
        const feather = Math.min(1, (field - 1) * 8);
        const h = Math.min(255, dot ** 1.5 * 80 * (1 - feather));
        d[idx] = d[idx+1] = d[idx+2] = h;
        d[idx+3] = 255;
      }
    }
  }

  ctx.putImageData(img, 0, 0);
  scrollVelocity *= 0.85;

  for (const b of blobs) b.move();
  requestAnimationFrame(draw);
}

init();
draw();


/* --- EVENTS --- */

window.addEventListener("mousemove", e => {
  mouse = { x: e.clientX, y: e.clientY, active: true };
});
window.addEventListener("mouseleave", () => {
  mouse = { x: Infinity, y: Infinity, active: false };
});
window.addEventListener("touchmove", e => {
  if (e.touches[0]) {
    mouse = { x: e.touches[0].clientX, y: e.touches[0].clientY, active: true };
  }
}, { passive: true });
window.addEventListener("touchend", () => {
  mouse = { x: Infinity, y: Infinity, active: false };
});

window.addEventListener("scroll", () => {
  const y = window.scrollY;
  scrollVelocity = y - lastScrollY;
  lastScrollY = y;
});

window.addEventListener("resize", () => {
  if (Math.abs(window.innerWidth - lastWidth) > 10) {
    lastWidth = window.innerWidth;
    width = canvas.width = lastWidth;
    height = canvas.height = Math.ceil(window.innerHeight);
    scale = width < 600 ? 0.5 : 1;
    ctx.scale(scale, scale);
    floorTop = height * (width < 600 ? 0.85 : 0.75);
    init();
  }
});

function normalize(v) {
  const len = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / len, y: v.y / len };
}
