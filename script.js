<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta http-equiv="Content-Style-Type" content="text/css">
  <title></title>
  <meta name="Generator" content="Cocoa HTML Writer">
  <meta name="CocoaVersion" content="2575.4">
  <style type="text/css">
    p.p1 {margin: 0.0px 0.0px 0.0px 0.0px; font: 12.0px Helvetica; -webkit-text-stroke: #000000}
    p.p2 {margin: 0.0px 0.0px 0.0px 0.0px; font: 12.0px Helvetica; -webkit-text-stroke: #000000; min-height: 14.0px}
    span.s1 {font-kerning: none}
  </style>
</head>
<body>
<p class="p1"><span class="s1">const canvas = document.getElementById("c");</span></p>
<p class="p1"><span class="s1">const ctx = canvas.getContext("2d");</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">let width = canvas.width = window.innerWidth;</span></p>
<p class="p1"><span class="s1">let height = canvas.height = window.innerHeight;</span></p>
<p class="p1"><span class="s1">const blobs = [];</span></p>
<p class="p1"><span class="s1">const numBlobs = 12;</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">let floorTop = height * (window.innerWidth &lt; 600 ? 0.85 : 0.75);</span></p>
<p class="p1"><span class="s1">const lightDir = normalize({ x: 1, y: -1 });</span></p>
<p class="p1"><span class="s1">let mouse = { x: width / 2, y: height / 2, active: false };</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">let lastScrollY = window.scrollY;</span></p>
<p class="p1"><span class="s1">let scrollVelocity = 0;</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">function normalize(v) {</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>const len = Math.sqrt(v.x * v.x + v.y * v.y) || 1;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>return { x: v.x / len, y: v.y / len };</span></p>
<p class="p1"><span class="s1">}</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">function random(min, max) {</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>return Math.random() * (max - min) + min;</span></p>
<p class="p1"><span class="s1">}</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">class Blob {</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>constructor(pinned = false) {</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>const isMobile = window.innerWidth &lt; 600;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>this.r = random(isMobile ? 15 : 20, isMobile ? 35 : 60);</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>this.x = random(this.r, width - this.r);</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>this.y = random(this.r, floorTop - this.r - 20);</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>this.vx = 0;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>this.vy = 0;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>this.pinned = pinned;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>this.mass = this.r * 0.02; // More radius = heavier</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>}</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>move() {</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>if (this.pinned) return;</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>this.vy += 2.5 * this.mass; // gravity based on mass</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>if (mouse.active) {</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">      </span>const dx = mouse.x - this.x;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">      </span>const dy = mouse.y - this.y;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">      </span>const dist = Math.sqrt(dx * dx + dy * dy);</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">      </span>const range = 150;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">      </span>if (dist &lt; range) {</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">        </span>const force = (range - dist) / range;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">        </span>this.vx += dx * force * 0.005;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">        </span>this.vy += dy * force * 0.005;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">      </span>}</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>}</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>const edgeForce = 0.5;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>if (this.x &lt; 0) this.vx += -this.x * edgeForce;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>if (this.x &gt; width) this.vx -= (this.x - width) * edgeForce;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>if (this.y &lt; 0) this.vy += -this.y * edgeForce;</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>if (this.y + this.r &gt; floorTop) {</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">      </span>const overlap = (this.y + this.r) - floorTop;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">      </span>this.y -= overlap;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">      </span>this.vy *= -0.3;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>}</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>this.x += this.vx;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>this.y += this.vy;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>this.vx *= 0.98;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>this.vy *= 0.98;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>}</span></p>
<p class="p1"><span class="s1">}</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">function init() {</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>blobs.length = 0;</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>for (let i = 0; i &lt; numBlobs; i++) {</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>blobs.push(new Blob());</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>}</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>const pinCount = Math.floor(width / 35);</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>for (let i = 0; i &lt;= pinCount; i++) {</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>const b = new Blob(true);</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>b.r = 50;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>b.x = (i / pinCount) * width;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>b.y = floorTop;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>blobs.push(b);</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>}</span></p>
<p class="p1"><span class="s1">}</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">function draw() {</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>ctx.fillStyle = "#000";</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>ctx.fillRect(0, 0, width, height);</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>const topHeight = Math.ceil(floorTop);</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>const image = ctx.createImageData(width, topHeight);</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>const data = image.data;</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>for (let y = 1; y &lt; topHeight - 1; y++) {</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>for (let x = 1; x &lt; width - 1; x++) {</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">      </span>const index = (x + y * width) * 4;</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">      </span>let field = 0;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">      </span>for (const blob of blobs) {</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">        </span>const dx = x - blob.x;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">        </span>const dy = y - blob.y;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">        </span>field += (blob.r * blob.r) / (dx * dx + dy * dy + 0.0001);</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">      </span>}</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">      </span>if (field &gt; 1) {</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">        </span>let gradX = 0, gradY = 0;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">        </span>for (const blob of blobs) {</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">          </span>const dx = x - blob.x;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">          </span>const dy = y - blob.y;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">          </span>const d2 = dx * dx + dy * dy + 0.001;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">          </span>const r2 = blob.r * blob.r;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">          </span>const base = -2 * r2 / (d2 * d2);</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">          </span>gradY += base * dx;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">          </span>gradX += base * dy;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">        </span>}</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">        </span>const gradMag = Math.sqrt(gradX * gradX + gradY * gradY) || 1;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">        </span>const nx = gradX / gradMag;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">        </span>const ny = gradY / gradMag;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">        </span>const dot = Math.max(0, nx * lightDir.x + ny * lightDir.y);</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">        </span>const feather = Math.min(1.0, (field - 1) * 8);</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">        </span>const h = Math.min(255, dot ** 1.5 * 80 * (1 - feather));</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">        </span>const c = h;</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">        </span>data[index] = c;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">        </span>data[index + 1] = c;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">        </span>data[index + 2] = c;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">        </span>data[index + 3] = 255;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">      </span>}</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>}</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>}</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>ctx.putImageData(image, 0, 0);</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>// Amplify small scrolls, dampen big ones</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>scrollVelocity *= 0.9;</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>// Apply a softened but boosted scroll force</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>const amplified = -Math.sign(scrollVelocity) * Math.min(6, Math.sqrt(Math.abs(scrollVelocity)) * 1);</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>for (const blob of blobs) {</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>if (!blob.pinned) {</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">      </span>blob.vy += amplified * 0.5; // More responsive to scroll</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>}</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>blob.move();</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>}</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>requestAnimationFrame(draw);</span></p>
<p class="p1"><span class="s1">}</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">init();</span></p>
<p class="p1"><span class="s1">draw();</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">// Events</span></p>
<p class="p1"><span class="s1">window.addEventListener("mousemove", e =&gt; {</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>mouse.x = e.clientX;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>mouse.y = e.clientY;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>mouse.active = true;</span></p>
<p class="p1"><span class="s1">});</span></p>
<p class="p1"><span class="s1">window.addEventListener("mouseleave", () =&gt; {</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>mouse.active = false;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>mouse.x = Infinity;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>mouse.y = Infinity;</span></p>
<p class="p1"><span class="s1">});</span></p>
<p class="p1"><span class="s1">window.addEventListener("touchmove", e =&gt; {</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>if (e.touches.length &gt; 0) {</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>mouse.x = e.touches[0].clientX;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>mouse.y = e.touches[0].clientY;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>mouse.active = true;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>}</span></p>
<p class="p1"><span class="s1">}, { passive: true });</span></p>
<p class="p1"><span class="s1">window.addEventListener("touchend", () =&gt; {</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>mouse.active = false;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>mouse.x = Infinity;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>mouse.y = Infinity;</span></p>
<p class="p1"><span class="s1">});</span></p>
<p class="p1"><span class="s1">window.addEventListener("resize", () =&gt; {</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>width = canvas.width = window.innerWidth;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>height = canvas.height = window.innerHeight;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>floorTop = height * (window.innerWidth &lt; 600 ? 0.85 : 0.75);</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>init();</span></p>
<p class="p1"><span class="s1">});</span></p>
<p class="p1"><span class="s1">window.addEventListener("scroll", () =&gt; {</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>const currentY = window.scrollY;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>scrollVelocity = currentY - lastScrollY;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>lastScrollY = currentY;</span></p>
<p class="p1"><span class="s1">});</span></p>
</body>
</html>
