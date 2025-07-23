const canvas = document.getElementById("c");
const gl = canvas.getContext("webgl");

if (!gl) {
	alert("WebGL not supported");
}

// === SCREEN BREAKPOINTS (editable) === //
const SCREEN_SIZES = {
  mobileMax: 767,
  tabletMax: 1024
};

// === DEFAULT CONFIGS (editable) === //
const CONFIG = {
  mobile: {
    NUM_BLOBS: 120,
    BASE_GRAVITY: 0.8,
    SCROLL_FORCE: 1,
    MAX_RADIUS: 40
  },
  tablet: {
    NUM_BLOBS: 180,
    BASE_GRAVITY: 0.06,
    SCROLL_FORCE: 0.8,
    MAX_RADIUS: 35
  },
  desktop: {
    NUM_BLOBS: 300,
    BASE_GRAVITY: 0.05,
    SCROLL_FORCE: 0.5,
    MAX_RADIUS: 30
  }
};

// === FIXED CONFIGS === //
const BLOB_DAMPING = 0.9;
const MOUSE_FORCE = 10;
const MOUSE_RANGE = 250;
const BLOB_COLOR = [0.0, 0.0, 0.0]; // RGB Black

// === INITIAL STATE === //
let width = canvas.width = window.innerWidth;
let height = canvas.height = window.innerHeight;
let mouse = { x: width / 2, y: height / 2, active: false };
let scrollVelocity = 0;
let lastScrollY = window.scrollY;

// === RESPONSIVE VARIABLES (dynamic) === //
let NUM_BLOBS, BASE_GRAVITY, SCROLL_FORCE, MAX_RADIUS;

// === BLOBS ARRAY === //
let blobs = [];

// === UTILS === //
function rand(min, max) {
	return Math.random() * (max - min) + min;
}

// === RESPONSIVE CONFIGURATION HANDLER === //
function applyResponsiveSettings() {
	const w = window.innerWidth;

	if (w <= SCREEN_SIZES.mobileMax) {
		({ NUM_BLOBS, BASE_GRAVITY, SCROLL_FORCE, MAX_RADIUS } = CONFIG.mobile);
	} else if (w <= SCREEN_SIZES.tabletMax) {
		({ NUM_BLOBS, BASE_GRAVITY, SCROLL_FORCE, MAX_RADIUS } = CONFIG.tablet);
	} else {
		({ NUM_BLOBS, BASE_GRAVITY, SCROLL_FORCE, MAX_RADIUS } = CONFIG.desktop);
	}
}
applyResponsiveSettings();

// === BLOB CLASS === //
class Blob {
	constructor() {
		this.x = rand(100, width - 100);
		this.y = rand(100, height - 100);
		this.vx = rand(-1, 1);
		this.vy = rand(-1, 1);
		this.r = rand(0.5, MAX_RADIUS);
	}

	update() {
		const gravity = BASE_GRAVITY * (this.r / 10);
		this.vy += gravity;

		// Scroll jostle
		const angle = Math.random() * Math.PI * 2;
		this.vx += Math.cos(angle) * scrollVelocity * SCROLL_FORCE;
		this.vy += Math.sin(angle) * scrollVelocity * SCROLL_FORCE;

		// Mouse attraction
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
      sum += (b.z * b.z) / d2;
    }

    if (sum > 1.0) {
      gl_FragColor = vec4(blobColor, 1.0);
    } else {
      discard;
    }
  }
`;

// === SHADER COMPILE === //
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
initBlobs();

// === RENDER LOOP === //
function render() {
	gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
	gl.clearColor(0.22, 0.2, 0.2, 1);
	gl.clear(gl.COLOR_BUFFER_BIT);

	for (const blob of blobs) blob.update();

	const blobData = [];
	for (const b of blobs) blobData.push(b.x, height - b.y, b.r);

	gl.uniform2f(resolutionLoc, width, height);
	gl.uniform3fv(blobsLoc, new Float32Array(blobData));
	gl.drawArrays(gl.TRIANGLES, 0, 6);

	scrollVelocity *= 0.9;
	requestAnimationFrame(render);
}
requestAnimationFrame(render);

// === EVENTS === //
window.addEventListener("mousemove", (e) => {
	mouse.x = e.clientX;
	mouse.y = e.clientY;
	mouse.active = true;
});
window.addEventListener("mouseleave", () => {
	mouse.active = false;
});
window.addEventListener("touchmove", (e) => {
	if (e.touches.length > 0) {
		mouse.x = e.touches[0].clientX;
		mouse.y = e.touches[0].clientY;
		mouse.active = true;
	}
}, { passive: true });
window.addEventListener("touchend", () => {
	mouse.active = false;
});
window.addEventListener("resize", () => {
	width = canvas.width = window.innerWidth;
	height = canvas.height = window.innerHeight;

	applyResponsiveSettings(); // ← update dynamic settings
	initBlobs();               // ← reinit blobs
});
window.addEventListener("scroll", () => {
	const currentY = window.scrollY;
	scrollVelocity = currentY - lastScrollY;
	lastScrollY = currentY;
});
