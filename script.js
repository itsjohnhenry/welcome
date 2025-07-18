// === CONFIGURABLE CONSTANTS === //
const BASE_GRAVITY = 0.1;                 // Gravity strength (multiplied by blob mass)
const SCROLL_FORCE_MULTIPLIER = 0.6;    // How much scroll movement affects blobs
const SCROLL_DAMPING = 0.8;             // 0 = no scroll retained, 1 = forever retained
const SCROLL_MAX_FORCE = 0.5;           // Caps how intense the scroll jostle can be
const BLOB_DAMPING = 0.96;              // Velocity retention per frame (0–1)
const MOUSE_FORCE = 0.015;              // Attraction strength toward mouse
const MOUSE_RANGE = 0;                // Max range at which blobs are attracted
const EDGE_FORCE = 0.2;                   // How strongly blobs are repelled from edges
const RENDER_SCALE = 0.5;               // Lower = better performance, 1 = full resolution

// === CANVAS SETUP === //
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
canvas.style.width = "100%";
canvas.style.height = "100%";

let width = Math.floor(window.innerWidth * RENDER_SCALE);
let height = Math.floor(window.innerHeight * RENDER_SCALE);
canvas.width = width;
canvas.height = height;

let floorTop = height * (window.innerWidth < 600 ? 0.85 : 0.75);
const blobs = [];
const numBlobs = 12;
const lightDir = normalize({ x: 1, y: -1 });
let mouse = { x: width / 2, y: height / 2, active: false };
let lastScrollY = window.scrollY;
let scrollVelocity = 0;

function normalize(v) {
  const len = Math.sqrt(v.x * v.x + v.y * v.y) || 1;
  return { x: v.x / len, y: v.y / len };
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

class Blob {
  constructor(pinned = false) {
    const isMobile = window.innerWidth < 600;
    this.r = random(isMobile ? 25 : 45, isMobile ? 45 : 60) * RENDER_SCALE;
    this.x = random(this.r, width - this.r);
    this.y = random(this.r, floorTop - this.r - 20);
    this.vx = 0;
    this.vy = 0;
    this.pinned = pinned;
    this.mass = this.r * 0.02;
  }

  move() {
    if (this.pinned) return;

    this.vy += BASE_GRAVITY * this.mass;

    if (mouse.active) {
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MOUSE_RANGE * RENDER_SCALE) {
        const force = (MOUSE_RANGE * RENDER_SCALE - dist) / (MOUSE_RANGE * RENDER_SCALE);
        this.vx += dx * force * MOUSE_FORCE;
        this.vy += dy * force * MOUSE_FORCE;
      }
    }

    if (this.x < 0) this.vx += -this.x * EDGE_FORCE;
    if (this.x > width) this.vx -= (this.x - width) * EDGE_FORCE;
    if (this.y < 0) this.vy += -this.y * EDGE_FORCE;

    if (this.y + this.r > floorTop) {
      const overlap = (this.y + this.r) - floorTop;
      this.y -= overlap;
      this.vy = 0;
    }

    this.x += this.vx;
    this.y += this.vy;
    this.vx *= BLOB_DAMPING;
    this.vy *= BLOB_DAMPING;
  }
}

function init() {
  blobs.length = 0;
  for (let i = 0; i < numBlobs; i++) blobs.push(new Blob());
  const pinCount = Math.floor(width / 35);
  for (let i = 0; i <= pinCount; i++) {
    const b = new Blob(true);
    b.r = 50 * RENDER_SCALE;
    b.x = (i / pinCount) * width;
    b.y = floorTop;
    blobs.push(b);
  }
}

function draw() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);

  const topHeight = Math.ceil(floorTop);
  const image = ctx.createImageData(width, topHeight);
  const data = image.data;

  for (let y = 1; y < topHeight - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = (x + y * width) * 4;
      let field = 0;

      for (const blob of blobs) {
        const dx = x - blob.x;
        const dy = y - blob.y;
        field += (blob.r * blob.r) / (dx * dx + dy * dy + 0.0001);
      }

      if (field > 1) {
        let gradX = 0, gradY = 0;
        for (const blob of blobs) {
          const dx = x - blob.x;
          const dy = y - blob.y;
          const d2 = dx * dx + dy * dy + 0.001;
          const r2 = blob.r * blob.r;
          const base = -2 * r2 / (d2 * d2);
          gradY += base * dx;
          gradX += base * dy;
        }

        const gradMag = Math.sqrt(gradX * gradX + gradY * gradY) || 1;
        const nx = gradX / gradMag;
        const ny = gradY / gradMag;
        const dot = Math.max(0, nx * lightDir.x + ny * lightDir.y);
        const feather = Math.min(1.0, (field - 1) * 8);
        const h = Math.min(255, dot ** 1.5 * 80 * (1 - feather));

        data[index] = data[index + 1] = data[index + 2] = h;
        data[index + 3] = 255;
      }
    }
  }

  ctx.putImageData(image, 0, 0);

  scrollVelocity *= SCROLL_DAMPING;
  const amplified = -Math.sign(scrollVelocity) * Math.min(SCROLL_MAX_FORCE, Math.sqrt(Math.abs(scrollVelocity)));
  for (const blob of blobs) {
    if (!blob.pinned) blob.vy += amplified * SCROLL_FORCE_MULTIPLIER;
    blob.move();
  }

  requestAnimationFrame(draw);
}

init();
draw();

// === EVENTS === //
window.addEventListener("mousemove", e => {
  mouse.x = e.clientX * RENDER_SCALE;
  mouse.y = e.clientY * RENDER_SCALE;
  mouse.active = true;
});
window.addEventListener("mouseleave", () => {
  mouse.active = false;
  mouse.x = Infinity;
  mouse.y = Infinity;
});
window.addEventListener("touchmove", e => {
  if (e.touches.length > 0) {
    mouse.x = e.touches[0].clientX * RENDER_SCALE;
    mouse.y = e.touches[0].clientY * RENDER_SCALE;
    mouse.active = true;
  }
}, { passive: true });
window.addEventListener("touchend", () => {
  mouse.active = false;
  mouse.x = Infinity;
  mouse.y = Infinity;
});
window.addEventListener("resize", () => {
  width = Math.floor(window.innerWidth * RENDER_SCALE);
  height = Math.floor(window.innerHeight * RENDER_SCALE);
  canvas.width = width;
  canvas.height = height;
  floorTop = height * (window.innerWidth < 600 ? 0.85 : 0.75);
  init();
});
window.addEventListener("scroll", () => {
  const currentY = window.scrollY;
  scrollVelocity = currentY - lastScrollY;
  lastScrollY = currentY;
});
