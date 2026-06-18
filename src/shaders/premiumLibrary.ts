import type { ShaderDef } from '../types'

/**
 * Premium showcase effects — polished, self-contained full-screen fragment shaders
 * (category "Premium"). Each writes gl_FragColor from vUv using uTime / uMouse and
 * two editable colours + speed. Helpers are inlined per shader.
 */

type RGB = [number, number, number]

function pf(
  id: string,
  name: string,
  description: string,
  fragment: string,
  a: RGB,
  b: RGB,
  speed = 1,
): ShaderDef {
  return {
    id: `px-${id}`,
    name,
    category: 'Premium',
    description,
    complexity: 'High',
    performance: 3,
    kind: 'fragment',
    preferredGeometry: 'plane',
    fragment,
    uniforms: {
      uColorA: { type: 'color', label: 'Color A', value: a },
      uColorB: { type: 'color', label: 'Color B', value: b },
      uSpeed: { type: 'float', label: 'Speed', value: speed, min: 0, max: 4, step: 0.01 },
    },
  }
}

// reusable GLSL snippets (string-concatenated into bodies)
const HASH = `float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }`
const NOISE = `${HASH}
float n2(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }`
const FBM = `${NOISE}
float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<6;i++){ v+=a*n2(p); p*=2.0; a*=0.5; } return v; }`
const H2 = `vec2 h22(vec2 p){ p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))); return fract(sin(p)*43758.5453); }`

export const PREMIUM_SHADERS: ShaderDef[] = [
  pf('liquid-metal', 'Liquid Metal', 'Flowing chrome with domain-warped highlights.',
    `${FBM}
void main(){
  vec2 uv = vUv*3.0; float t = uTime*uSpeed*0.3;
  float f = fbm(uv + fbm(uv + t));
  float bands = sin(f*10.0)*0.5+0.5;
  vec3 col = mix(uColorA, uColorB, bands);
  col += pow(bands, 8.0);
  gl_FragColor = vec4(col, 1.0);
}`, [0.2, 0.22, 0.28], [0.9, 0.95, 1.0], 1),

  pf('mercury-flow', 'Mercury Flow', 'Heavy metallic blobs drifting upward.',
    `${FBM}
void main(){
  vec2 uv = vUv*2.5; float t = uTime*uSpeed*0.4;
  float m = fbm(uv - vec2(0.0, t*2.0));
  float blob = smoothstep(0.4, 0.62, m);
  vec3 col = mix(uColorA*0.3, uColorB, blob);
  col += pow(blob, 6.0)*0.8;
  gl_FragColor = vec4(col, 1.0);
}`, [0.3, 0.32, 0.38], [0.85, 0.9, 0.98], 1),

  pf('hologram', 'Hologram', 'Scanlines, grid and fresnel edge glow with flicker.',
    `void main(){
  vec2 uv = vUv;
  float scan = 0.5+0.5*sin(uv.y*120.0 - uTime*uSpeed*4.0);
  float grid = step(0.98, fract(uv.x*40.0)) + step(0.98, fract(uv.y*40.0));
  float edge = smoothstep(0.0,0.1,uv.x)*smoothstep(1.0,0.9,uv.x)*smoothstep(0.0,0.1,uv.y)*smoothstep(1.0,0.9,uv.y);
  vec3 col = uColorA*(0.3+0.7*scan) + uColorB*grid*0.5;
  col += uColorB*(1.0-edge)*0.6;
  col *= 0.9+0.1*sin(uTime*40.0);
  gl_FragColor = vec4(col, 1.0);
}`, [0.2, 0.9, 1.0], [0.6, 1.0, 1.0], 1),

  pf('digital-rain', 'Digital Rain', 'Falling matrix glyph columns.',
    `${HASH}
void main(){
  vec2 uv = vUv; float cols = 40.0; float c = floor(uv.x*cols);
  float sp = 0.5 + h21(vec2(c,0.0));
  float y = fract(uv.y + uTime*uSpeed*0.3*sp + h21(vec2(c,1.0)));
  float trail = pow(1.0-y, 4.0);
  float glyph = step(0.5, h21(vec2(c, floor(uv.y*30.0)+floor(uTime*10.0))));
  vec3 col = uColorA*trail*glyph + uColorB*step(0.97, trail);
  gl_FragColor = vec4(col, 1.0);
}`, [0.2, 1.0, 0.4], [0.8, 1.0, 0.9], 1),

  pf('cyber-grid', 'Cyber Grid', 'Neon synthwave grid scrolling toward the horizon.',
    `void main(){
  vec2 uv = vUv; uv.y += uTime*uSpeed*0.1;
  vec2 g = abs(fract(uv*20.0)-0.5);
  float line = smoothstep(0.06, 0.0, min(g.x,g.y));
  float pulse = 0.6+0.4*sin(uTime*2.0 - uv.y*10.0);
  vec3 col = uColorA*line*pulse + uColorB*0.03;
  gl_FragColor = vec4(col, 1.0);
}`, [0.13, 0.95, 0.95], [0.5, 0.2, 0.9], 0.8),

  pf('quantum-warp', 'Quantum Warp', 'Layered sine interference rippling in phase.',
    `void main(){
  vec2 p = vUv*2.0-1.0; float t = uTime*uSpeed;
  float v = 0.0;
  for(int i=0;i<5;i++){ float fi = float(i)+1.0; v += sin(p.x*fi*3.0+t) + cos(p.y*fi*3.0 - t*1.1); }
  v /= 5.0;
  vec3 col = mix(uColorA, uColorB, 0.5+0.5*sin(v*3.1415+t));
  col *= 0.8+0.2*v;
  gl_FragColor = vec4(col, 1.0);
}`, [0.3, 0.2, 0.9], [0.1, 0.85, 0.9], 1),

  pf('aurora', 'Aurora', 'Layered northern-lights curtains.',
    `${NOISE}
void main(){
  vec2 uv = vUv; float t = uTime*uSpeed*0.5; vec3 col = vec3(0.01,0.02,0.06);
  for(int i=0;i<3;i++){ float fi = float(i);
    float wave = n2(vec2(uv.x*3.0 + t + fi*5.0, fi))*0.25;
    float band = 0.5 + 0.13*fi + wave;
    float glow = exp(-pow(uv.y-band,2.0)*60.0);
    col += mix(uColorA, uColorB, fract(fi*0.5 + uv.x*0.5))*glow;
  }
  gl_FragColor = vec4(col, 1.0);
}`, [0.1, 1.0, 0.5], [0.5, 0.2, 1.0], 1),

  pf('galaxy', 'Galaxy', 'Rotating spiral arms with a bright core and stars.',
    `${HASH}
void main(){
  vec2 uv = vUv-0.5; float r = length(uv), a = atan(uv.y, uv.x);
  float spiral = sin(a*5.0 + r*18.0 - uTime*uSpeed*2.0);
  float arm = smoothstep(0.0, 0.6, spiral)*exp(-r*3.0);
  vec3 col = mix(uColorB, uColorA, exp(-r*5.0))*arm*2.0;
  col += uColorA*exp(-r*r*40.0);
  vec2 g = floor((uv+0.5)*200.0);
  col += step(0.995, h21(g))*0.8;
  gl_FragColor = vec4(col, 1.0);
}`, [1.0, 0.85, 0.6], [0.4, 0.3, 1.0], 1),

  pf('black-hole', 'Black Hole', 'Swirling accretion disk around a dark core.',
    `void main(){
  vec2 p = vUv-0.5; float r = length(p), a = atan(p.y, p.x);
  float disk = smoothstep(0.45, 0.2, r)*smoothstep(0.12, 0.2, r);
  float swirl = 0.5+0.5*sin(a*2.0 + 1.0/(r+0.05) + uTime*uSpeed*2.0);
  vec3 col = mix(uColorA, uColorB, swirl)*disk*2.0;
  col *= smoothstep(0.12, 0.16, r);
  gl_FragColor = vec4(col, 1.0);
}`, [1.0, 0.6, 0.2], [0.5, 0.2, 0.9], 1),

  pf('energy-crystal', 'Energy Crystal', 'Pulsing voronoi facets with glowing seams.',
    `${H2}
void main(){
  vec2 uv = vUv*5.0; vec2 i = floor(uv), f = fract(uv); float md = 1.0;
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){
    vec2 g = vec2(float(x),float(y)); vec2 o = h22(i+g);
    o = 0.5+0.5*sin(uTime*uSpeed + 6.2831*o);
    md = min(md, length(g+o-f));
  }
  float edge = smoothstep(0.0, 0.1, md);
  vec3 col = mix(uColorB, uColorA, edge) + (1.0-edge)*uColorB*2.0;
  gl_FragColor = vec4(col, 1.0);
}`, [0.1, 0.06, 0.16], [0.5, 0.9, 1.0], 1),

  pf('infinity-mirror', 'Infinity Mirror', 'Endless tunnel of receding rings.',
    `void main(){
  vec2 p = vUv*2.0-1.0; float r = length(p);
  float z = fract(log(r+0.001)*3.0 - uTime*uSpeed);
  float ring = smoothstep(0.0, 0.1, z)*smoothstep(1.0, 0.85, z);
  vec3 col = mix(uColorA, uColorB, z)*ring;
  col += uColorB*smoothstep(0.5, 0.0, r)*0.3;
  gl_FragColor = vec4(col, 1.0);
}`, [0.49, 0.36, 1.0], [0.13, 0.83, 0.93], 1),

  pf('portal-opening', 'Portal Opening', 'A swirling vortex that breathes open and shut.',
    `void main(){
  vec2 p = vUv-0.5; float r = length(p), a = atan(p.y, p.x);
  float open = 0.5+0.5*sin(uTime*uSpeed*0.5);
  float sw = sin(a*8.0 + r*30.0 - uTime*uSpeed*4.0);
  float ring = smoothstep(open*0.4+0.05, open*0.4, r);
  vec3 col = mix(uColorA, uColorB, 0.5+0.5*sw)*ring;
  col += uColorB*exp(-r*8.0)*open;
  gl_FragColor = vec4(col, 1.0);
}`, [0.6, 0.2, 1.0], [0.2, 0.9, 1.0], 1),

  pf('glass-shatter', 'Glass Shatter', 'Fractured voronoi shards catching the light.',
    `${H2}
void main(){
  vec2 uv = vUv*4.0; vec2 i = floor(uv), f = fract(uv); float md = 1.0; vec2 cell = i;
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){
    vec2 g = vec2(float(x),float(y)); vec2 o = h22(i+g);
    float d = length(g+o-f); if(d<md){ md=d; cell=i+g; }
  }
  float b = fract(h22(cell).x*7.0 + 0.2*sin(uTime*uSpeed));
  vec3 col = mix(uColorA, uColorB, b);
  float edge = smoothstep(0.0, 0.03, md);
  col = col*(0.4+0.6*edge) + (1.0-edge)*0.6;
  gl_FragColor = vec4(col, 1.0);
}`, [0.4, 0.6, 0.8], [0.9, 0.95, 1.0], 0.6),

  pf('ice-crack', 'Ice Crack', 'Frozen surface with spreading luminous cracks.',
    `${H2}
void main(){
  vec2 uv = vUv*5.0; vec2 i = floor(uv), f = fract(uv);
  float d1 = 1.0, d2 = 1.0;
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){
    vec2 g = vec2(float(x),float(y)); vec2 o = h22(i+g);
    float d = length(g+o-f);
    if(d<d1){ d2=d1; d1=d; } else if(d<d2){ d2=d; }
  }
  float crack = smoothstep(0.04, 0.0, d2-d1);
  float grow = 0.5+0.5*sin(uTime*uSpeed*0.5);
  vec3 col = mix(uColorA*0.6, uColorA, 0.5);
  col += uColorB*crack*2.0*grow;
  gl_FragColor = vec4(col, 1.0);
}`, [0.6, 0.8, 0.95], [0.9, 0.98, 1.0], 1),

  pf('electric-surge', 'Electric Surge', 'Crackling lightning arcs across the frame.',
    `${NOISE}
void main(){
  vec2 uv = vUv; vec3 col = vec3(0.0);
  for(int i=0;i<3;i++){ float fi = float(i);
    float y = 0.5 + (n2(vec2(uv.x*6.0 + uTime*uSpeed*2.0, fi*10.0))-0.5)*0.6;
    float bolt = smoothstep(0.025, 0.0, abs(uv.y - y));
    col += uColorA*bolt;
  }
  col += uColorB*0.04;
  gl_FragColor = vec4(col, 1.0);
}`, [0.6, 0.85, 1.0], [0.2, 0.3, 0.8], 1),

  pf('magic-rune', 'Magic Rune', 'Rotating arcane circle with ticks and runes.',
    `void main(){
  vec2 p = vUv-0.5; float r = length(p), a = atan(p.y, p.x) + uTime*uSpeed*0.3;
  float ring1 = smoothstep(0.006, 0.0, abs(r-0.35));
  float ring2 = smoothstep(0.006, 0.0, abs(r-0.30));
  float ticks = step(0.8, sin(a*24.0))*smoothstep(0.02, 0.0, abs(r-0.325));
  float runes = step(0.6, sin(a*8.0 - uTime*uSpeed))*smoothstep(0.04, 0.0, abs(r-0.25));
  float glow = exp(-abs(r-0.3)*6.0)*0.3;
  vec3 col = uColorA*(ring1+ring2+ticks+runes) + uColorB*glow;
  gl_FragColor = vec4(col, 1.0);
}`, [1.0, 0.8, 0.3], [1.0, 0.4, 0.1], 1),

  pf('time-warp', 'Time Warp', 'Concentric rings bent by an angular ripple.',
    `void main(){
  vec2 p = vUv-0.5; float r = length(p), a = atan(p.y, p.x);
  float warp = r + 0.05*sin(a*6.0 + uTime*uSpeed);
  float rings = sin(warp*40.0 - uTime*uSpeed*3.0)*0.5+0.5;
  vec3 col = mix(uColorA, uColorB, rings);
  col *= smoothstep(0.5, 0.1, r)+0.2;
  gl_FragColor = vec4(col, 1.0);
}`, [0.49, 0.36, 1.0], [0.13, 0.83, 0.93], 1),

  pf('dimensional-tear', 'Dimensional Tear', 'A jagged rift glowing with chromatic edges.',
    `${FBM}
void main(){
  vec2 uv = vUv;
  float rift = abs(uv.x - 0.5 - (fbm(vec2(uv.y*3.0, uTime*uSpeed*0.5))-0.5)*0.15);
  float core = smoothstep(0.05, 0.0, rift);
  float glow = exp(-rift*16.0);
  vec3 col = mix(uColorA, uColorB, uv.y)*glow + vec3(core);
  col.r += smoothstep(0.08, 0.0, abs(rift-0.05));
  col.b += smoothstep(0.08, 0.0, abs(rift-0.07));
  gl_FragColor = vec4(col, 1.0);
}`, [0.7, 0.2, 1.0], [0.2, 0.7, 1.0], 1),

  pf('fractal-bloom', 'Fractal Bloom', 'Animated folding fractal kaleidoscope.',
    `void main(){
  vec2 p = (vUv-0.5)*3.0; float t = uTime*uSpeed*0.2; float a = 0.0;
  mat2 R = mat2(cos(t), -sin(t), sin(t), cos(t));
  for(int i=0;i<6;i++){
    p = abs(p)/dot(p,p) - 0.8;
    p = R*p;
    a += length(p);
  }
  vec3 col = mix(uColorA, uColorB, 0.5+0.5*sin(a + t));
  gl_FragColor = vec4(col, 1.0);
}`, [0.9, 0.3, 0.6], [0.2, 0.5, 1.0], 1),

  pf('particle-explosion', 'Particle Explosion', 'A radial burst of glowing particles, looping.',
    `${H2}
void main(){
  vec2 p = vUv-0.5; float t = fract(uTime*uSpeed*0.4); vec3 col = vec3(0.0);
  for(int i=0;i<40;i++){ float fi = float(i);
    vec2 dir = normalize(h22(vec2(fi,1.0))-0.5);
    float speed = 0.3 + 0.7*h22(vec2(fi,2.0)).x;
    vec2 pos = dir*t*speed;
    float life = 1.0 - t;
    col += mix(uColorA, uColorB, h22(vec2(fi,3.0)).x)*exp(-length(p-pos)*60.0)*life;
  }
  gl_FragColor = vec4(col, 1.0);
}`, [1.0, 0.6, 0.1], [1.0, 0.9, 0.3], 1),
]
