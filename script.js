const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

// === CONFIGURABLE CONSTANTS === //
const BASE_GRAVITY = 1;              // Gravity strength (multiplied by blob mass)
const SCROLL_FORCE_MULTIPLIER = 0.9; // How much scroll movement affects blobs
const SCROLL_DAMPING = 0.9;          // 0 = no scroll retained, 1 = forever retained
const SCROLL_MAX_FORCE = 1.3;        // Caps how intense the scroll jostle can be

const BLOB_DAMPING = 0.96;           // Velocity retention per frame (0–1)
const MOUSE_FORCE = 0.015;           // Attraction strength toward mouse
const MOUSE_RANGE = 200;             // Max range at which blobs are attracted

const EDGE_FORCE = 0;                // How strongly blobs are repelled from edges

const COLOUR = { r: 70, g: 130, b: 180 }; // Fixed RGB colour

// === CANVAS AND BLOBS SETUP === //
let width, height, floorTop;
const blobs = [];
const numBlobs = 12;

let mouse = { x: 0, y: 0, active: false };
let lastScrollY = window.scrollY;
let scrollVelocity = 0;

function random(min, max) {
  return Math.random() * (max - min) + min;
}

class Blob {
  constructor(pinned = false) {
    const isMobile = window.innerWidth < 600;
    this.r = random(isMobile ? 25 : 45, isMobile ? 45 : 60);
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
      if (dist < MOUSE_RANGE) {
        const force = (MOUSE_RANGE - dist) / MOUSE_RANGE;
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

function setCanvasSize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  width = window.innerWidth;
  height = window.innerHeight;
  floorTop = height * (width < 600 ? 0.85 : 0.75);
}

function init() {
  setCanvasSize();
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

function draw() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);

  const dpr = window.devicePixelRatio || 1;
  const pixelWidth = canvas.width;
  const pixelHeight = Math.ceil(floorTop * dpr);

  const image = ctx.createImageData(pixelWidth, pixelHeight);
  const data = image.data;

  for (let y = 1; y < image.height - 1; y++) {
    for (let x = 1; x < image.width - 1; x++) {
      const index = (x + y * image.width) * 4;
      const cx = x / dpr;
      const cy = y / dpr;

      let field = 0;
      for (const blob of blobs) {
        const dx = cx - blob.x;
        const dy = cy - blob.y;
        field += (blob.r * blob.r) / (dx * dx + dy * dy + 0.0001);
      }

      if (field > 1) {
        data[index]     = COLOUR.r;
        data[index + 1] = COLOUR.g;
        data[index + 2] = COLOUR.b;
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

// === EVENT LISTENERS === //
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
window.addEventListener("resize", init);
window.addEventListener("scroll", () => {
  const currentY = window.scrollY;
  scrollVelocity = currentY - lastScrollY;
  lastScrollY = currentY;
});
