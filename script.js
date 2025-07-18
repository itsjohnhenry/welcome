const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

// === CONFIGURATION === //
const BASE_GRAVITY = 0.1;                  // Gravity strength (mass-based)
const SCROLL_FORCE_MULTIPLIER = 0.1;     // Scroll to blob force
const SCROLL_DAMPING = 0.6;              // Scroll velocity damping
const SCROLL_MAX_FORCE = 1;            // Max scroll force

const BLOB_DAMPING = 0.96;               // Blob velocity damping
const MOUSE_FORCE = 0.015;               // Mouse attraction
const MOUSE_RANGE = 200;                 // Mouse interaction distance

const EDGE_FORCE = 0.02;                    // Edge repulsion

const SCALE_FACTOR = 0.35;               // ↓ Resolution scale for performance

// === CANVAS SETUP === //
let width = window.innerWidth;
let height = window.innerHeight;
let renderWidth = Math.floor(width * SCALE_FACTOR);
let renderHeight = Math.floor(height * SCALE_FACTOR);

canvas.width = renderWidth;
canvas.height = renderHeight;
canvas.style.width = width + "px";
canvas.style.height = height + "px";

const ctxScaled = ctx;
ctxScaled.imageSmoothingEnabled = true;

let floorTop = renderHeight * (window.innerWidth < 600 ? 0.85 : 0.75);
const lightDir = normalize({ x: 1, y: -1 });
let mouse = { x: width / 2, y: height / 2, active: false };

const blobs = [];
const numBlobs = 12;
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
    this.r = random(isMobile ? 25 : 45, isMobile ? 45 : 60) * SCALE_FACTOR;
    this.x = random(this.r, renderWidth - this.r);
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
      const dx = mouse.x * SCALE_FACTOR - this.x;
      const dy = mouse.y * SCALE_FACTOR - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MOUSE_RANGE * SCALE_FACTOR) {
        const force = (MOUSE_RANGE * SCALE_FACTOR - dist) / (MOUSE_RANGE * SCALE_FACTOR);
        this.vx += dx * force * MOUSE_FORCE;
        this.vy += dy * force * MOUSE_FORCE;
      }
    }

    if (this.x < 0) this.vx += -this.x * EDGE_FORCE;
    if (this.x > renderWidth) this.vx -= (this.x - renderWidth) * EDGE_FORCE;
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

  for (let i = 0; i < numBlobs; i++) {
    blobs.push(new Blob());
  }

  const pinCount = Math.floor(renderWidth / 35);
  for (let i = 0; i <= pinCount; i++) {
    const b = new Blob(true);
    b.r = 50 * SCALE_FACTOR;
    b.x = (i / pinCount) * renderWidth;
    b.y = floorTop;
    blobs.push(b);
  }
}

function draw() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, renderWidth, renderHeight);

  const topHeight = Math.ceil(floorTop);
  const image = ctx.createImageData(renderWidth, topHeight);
  const data = image.data;

  for (let y = 1; y < topHeight - 1; y++) {
    for (let x = 1; x < renderWidth - 1; x++) {
      const index = (x + y * renderWidth) * 4;
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
    if (!blob.pinned) {
      blob.vy += amplified * SCROLL_FORCE_MULTIPLIER;
    }
    blob.move();
  }

  requestAnimationFrame(draw);
}

init();
draw();

// === EVENTS === //
window.addEventListener("mousemove", e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  mouse.active = true;
});
window.addEventListener("mouseleave", () => {
  mouse.active = false;
  mouse.x = Infinity;
  mouse.y = Infinity;
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
  mouse.x = Infinity;
  mouse.y = Infinity;
});

// === Resize with delay to reduce canvas resets === //
let resizeTimeout;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    width = window.innerWidth;
    height = window.innerHeight;
    renderWidth = Math.floor(width * SCALE_FACTOR);
    renderHeight = Math.floor(height * SCALE_FACTOR);

    canvas.width = renderWidth;
    canvas.height = renderHeight;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    floorTop = renderHeight * (window.innerWidth < 600 ? 0.85 : 0.75);
    init();
  }, 200); // Debounce
});

window.addEventListener("scroll", () => {
  const currentY = window.scrollY;
  scrollVelocity = currentY - lastScrollY;
  lastScrollY = currentY;
});
