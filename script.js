// WebGL Ferrofluid-style Blobs – High Performance
const canvas = document.getElementById('c');
const gl = canvas.getContext('webgl');

// Resize canvas to full screen
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Vertex shader (simple passthrough)
const vertexShaderSource = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0, 1);
}`;

// Fragment shader (metaball field + threshold + solid colour)
const fragmentShaderSource = `
precision highp float;
uniform vec2 u_resolution;
uniform int u_blobCount;
uniform vec2 u_blobs[100]; // Max 50 blobs (x=px, y=py)
uniform float u_radii[100];

void main() {
  vec2 uv = gl_FragCoord.xy;
  float field = 0.0;

  for (int i = 0; i < 100; i++) {
    if (i >= u_blobCount) break;
    vec2 p = u_blobs[i];
    float r = u_radii[i];
    float dx = uv.x - p.x;
    float dy = uv.y - p.y;
    field += (r * r) / (dx * dx + dy * dy + 1.0);
  }

  if (field > 1.0) {
    gl_FragColor = vec4(0.2, 0.2, 0.2, 1.0); // Dark grey blobs
  } else {
    discard;
  }
}`;

function createShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(vsSource, fsSource) {
  const vertexShader = createShader(gl.VERTEX_SHADER, vsSource);
  const fragmentShader = createShader(gl.FRAGMENT_SHADER, fsSource);
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}

const program = createProgram(vertexShaderSource, fragmentShaderSource);

// Setup full-screen quad
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
const positions = [
  -1, -1,
   1, -1,
  -1,  1,
  -1,  1,
   1, -1,
   1,  1
];
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

const a_position = gl.getAttribLocation(program, 'a_position');
const u_resolution = gl.getUniformLocation(program, 'u_resolution');
const u_blobCount = gl.getUniformLocation(program, 'u_blobCount');
const u_blobs = gl.getUniformLocation(program, 'u_blobs');
const u_radii = gl.getUniformLocation(program, 'u_radii');

// Blob simulation
const blobs = [];
const numBlobs = 16;
const gravity = 0.8;
const damping = 0.95;

for (let i = 0; i < numBlobs; i++) {
  blobs.push({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight * 0.6,
    vx: 0,
    vy: 0,
    r: Math.random() * 20 + 30
  });
}

function updateBlobs() {
  for (const b of blobs) {
    b.vy += gravity;
    b.x += b.vx;
    b.y += b.vy;

    if (b.y + b.r > window.innerHeight * 0.75) {
      b.y = window.innerHeight * 0.75 - b.r;
      b.vy = 0;
    }

    b.vx *= damping;
    b.vy *= damping;
  }
}

function render() {
  updateBlobs();

  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program);

  gl.enableVertexAttribArray(a_position);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

  gl.uniform2f(u_resolution, canvas.width, canvas.height);
  gl.uniform1i(u_blobCount, blobs.length);

  const blobArray = new Float32Array(200);
  const radiusArray = new Float32Array(100);
  for (let i = 0; i < blobs.length; i++) {
    blobArray[i * 2] = blobs[i].x;
    blobArray[i * 2 + 1] = canvas.height - blobs[i].y;
    radiusArray[i] = blobs[i].r;
  }

  gl.uniform2fv(u_blobs, blobArray);
  gl.uniform1fv(u_radii, radiusArray);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
  requestAnimationFrame(render);
}

render();
