const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

let width = window.innerWidth;
let height = window.innerHeight;
canvas.width = width;
canvas.height = height;

const blobs = [];
const numBlobs = 12;

let floorTop = height * (width < 600 ? 0.85 : 0.75);
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
    const isMobile = width < 600;
    this.r = random(isMobile ? 15 : 20, isMobile ? 35 : 60);
    this.x = random(this.r, width - this.r);
    this.y = random(this.r, floorTop - this.r - 20);
    this.vx = 0;
    this.vy = 0;
    this.pinned = pinned;
    this.mass = this.r * 0.02;
  }

  move() {
    if (this.pinned) return;

    this.vy += 2.5 * this.mass;

    if (mouse.active) {
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const range = 150;
      if (dist < range) {
        const force = (range - dist) / range;
        this.vx += dx * force * 0.005;
        this.vy += dy * force * 0.005;
      }
    }

    const edgeForce = 0.5;
    if (this.x < 0) this.vx += -this.x * edgeForce;
    if (this.x > width) this.vx -= (this.x - width) * edgeForce;
    if (this.y < 0) this.vy += -this.y * edgeForce;

    if (this.y + this.r > floorTop) {
      const overlap = (this.y + this.r) - floorTop;
      this.y -= overlap;
      this.vy *= -0.1;
    }

    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.98;
    this.vy *= 0.98;
  }
}

function init() {
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
        const c = h;

        data[index] = c;
        data[index + 1] = c;
        data[index + 2] = c;
        data[index + 3] = 255;
      }
    }
  }

  ctx.putImageData(image, 0, 0);

  scrollVelocity *= 0.9;
  for (const blob of blobs) {
    if (!blob.pinned) {
      blob.vy -= scrollVelocity * 0.03;
    }
    blob.move();
  }

  requestAnimationFrame(draw);
}

init();
draw();

// Event Listeners
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
window.addEventListener("resize", () => {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  floorTop = height * (window.innerWidth < 600 ? 0.85 : 0.75);
  init();
});
window.addEventListener("scroll", () => {
  const currentY = window.scrollY;
  scrollVelocity = currentY - lastScrollY;
  lastScrollY = currentY;
});
