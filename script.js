// === CONFIGURATION === //
const BASE_GRAVITY = 0.15;
const SCROLL_FORCE_MULTIPLIER = 0.2;
const SCROLL_MAX_FORCE = 1;
const SCROLL_MAX_UPWARD_FORCE = 0.4;
const SCROLL_EASING = 0.1;

const BLOB_DAMPING = 0.96;
const MOUSE_FORCE = 0.015;
const MOUSE_RANGE = 200;

const EDGE_FORCE = 0.02;
const RENDER_SCALE = 0.5;

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
let mouse = { x: width / 2, y: height / 2, active: false };

let lastScrollY = window.scrollY;
let scrollVelocity = 0;
let targetScrollVelocity = 0;

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

    if (this.y - this.r < 0) {
      this.y = this.r;
      if (this.vy < 0) this.vy = 0;
    }

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
  ctx.clearRect(0, 0, width, height);

  scrollVelocity += (targetScrollVelocity - scrollVelocity) * SCROLL_EASING;
  let amplified = -Math.sign(scrollVelocity) * Math.min(SCROLL_MAX_FORCE, Math.sqrt(Math.abs(scrollVelocity)));
  if (amplified > 0) amplified = Math.min(amplified, SCROLL_MAX_UPWARD_FORCE);

  for (const blob of blobs) {
    if (!blob.pinned) blob.vy += amplified * SCROLL_FORCE_MULTIPLIER;
    blob.move();

    // Draw blob as solid black circle
    ctx.beginPath();
    ctx.arc(blob.x, blob.y, blob.r, 0, Math.PI * 2);
    ctx.fillStyle = "#000";
    ctx.fill();
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

let lastWidth = window.innerWidth;
window.addEventListener("resize", () => {
  const newWidth = window.innerWidth;
  if (newWidth !== lastWidth) {
    lastWidth = newWidth;
    width = canvas.width = Math.floor(window.innerWidth * RENDER_SCALE);
    height = canvas.height = Math.floor(window.innerHeight * RENDER_SCALE);
    floorTop = height * (window.innerWidth < 600 ? 0.85 : 0.75);
    init();
  }
});

window.addEventListener("scroll", () => {
  const currentY = window.scrollY;
  targetScrollVelocity = currentY - lastScrollY;
  lastScrollY = currentY;
});
