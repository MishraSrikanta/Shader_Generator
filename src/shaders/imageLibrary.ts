import type { ShaderDef, UniformMap } from '../types'

/**
 * Image / post-processing effects. Each is a FRAGMENT shader that samples a shared
 * procedural test image `srcImage(uv)` and applies one effect "kernel" (`vec4 fx(vec2)`).
 * The kernel returns rgb + alpha; main() composites it over a checker backdrop so
 * dissolve / reveal transparency is visible. Effects share noise/colour helpers and the
 * uMouse / uTime globals; custom uniforms are auto-included based on what the kernel uses.
 */

// Shared helpers + the procedural source image + checker backdrop.
const IMAGE_PRELUDE = /* glsl */ `
#define PI 3.14159265359
mat2 rot2(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float n2(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y);
}
float fbm2(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*n2(p); p*=2.0; a*=0.5; } return v; }
vec3 vor(vec2 p){
  vec2 n=floor(p), f=fract(p); float md=8.0; vec2 mg=vec2(0.0);
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
    vec2 g=vec2(float(i),float(j)); vec2 o=vec2(h21(n+g), h21(n+g+17.0));
    vec2 r=g+o-f; float d=dot(r,r); if(d<md){ md=d; mg=n+g; }
  }
  return vec3(sqrt(md), mg);
}
vec4 hexCoords(vec2 uv){
  vec2 r=vec2(1.0,1.7320508), h=r*0.5;
  vec2 a=mod(uv,r)-h, b=mod(uv-h,r)-h;
  vec2 gv = dot(a,a)<dot(b,b) ? a : b;
  return vec4(gv, uv-gv);
}
vec3 rgb2hsv(vec3 c){
  vec4 K=vec4(0.0,-1.0/3.0,2.0/3.0,-1.0);
  vec4 p=mix(vec4(c.bg,K.wz), vec4(c.gb,K.xy), step(c.b,c.g));
  vec4 q=mix(vec4(p.xyw,c.r), vec4(c.r,p.yzx), step(p.x,c.r));
  float d=q.x-min(q.w,q.y), e=1e-10;
  return vec3(abs(q.z+(q.w-q.y)/(6.0*d+e)), d/(q.x+e), q.x);
}
vec3 hsv2rgb(vec3 c){
  vec3 p=abs(fract(c.xxx+vec3(0.0,2.0/3.0,1.0/3.0))*6.0-3.0);
  return c.z*mix(vec3(1.0), clamp(p-1.0,0.0,1.0), c.y);
}
vec3 srcImage(vec2 uv){
  vec3 col = mix(vec3(0.12,0.22,0.6), vec3(0.95,0.45,0.2), uv.x);
  col = mix(col, vec3(0.2,0.7,0.45), uv.y*0.5);
  vec2 g = abs(fract(uv*8.0)-0.5);
  col = mix(col, vec3(1.0), smoothstep(0.46,0.5,max(g.x,g.y))*0.35);
  float c = length(fract(uv*4.0)-0.5);
  col = mix(col, vec3(1.0,0.9,0.25), smoothstep(0.32,0.3,c)*0.6);
  return col;
}
vec3 checker(vec2 uv){
  float c = mod(floor(uv.x*16.0)+floor(uv.y*16.0), 2.0);
  return mix(vec3(0.05), vec3(0.11), c);
}`

const MAIN = /* glsl */ `
void main(){
  vec4 c = fx(vUv);
  vec3 col = mix(checker(vUv), c.rgb, clamp(c.a, 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
}`

// Each kernel defines `vec4 fx(vec2 uv)`. Only ONE kernel is compiled per shader.
const KERNELS: Record<string, string> = {
  // ---------- Distortion ----------
  ripple: `vec4 fx(vec2 uv){ vec2 c=vec2(0.5); float d=distance(uv,c);
    uv += normalize(uv-c+1e-5)*sin(d*40.0-uTime*uSpeed*3.0)*uAmount*exp(-d*3.0);
    return vec4(srcImage(uv),1.0); }`,
  rippleM: `vec4 fx(vec2 uv){ vec2 c=uMouse; float d=distance(uv,c);
    uv += normalize(uv-c+1e-5)*sin(d*40.0-uTime*uSpeed*3.0)*uAmount*exp(-d*3.0);
    return vec4(srcImage(uv),1.0); }`,
  shockwave: `vec4 fx(vec2 uv){ vec2 c=vec2(0.5); float d=distance(uv,c); float f=fract(uTime*uSpeed*0.5);
    float ring=smoothstep(0.06,0.0,abs(d-f)); uv += normalize(uv-c+1e-5)*ring*uAmount;
    return vec4(srcImage(uv)+ring*0.15,1.0); }`,
  wave: `vec4 fx(vec2 uv){ uv.x += sin(uv.y*20.0+uTime*uSpeed)*uAmount;
    uv.y += cos(uv.x*20.0+uTime*uSpeed)*uAmount*0.5; return vec4(srcImage(uv),1.0); }`,
  heat: `vec4 fx(vec2 uv){ uv += (vec2(fbm2(uv*8.0+vec2(0.0,uTime*uSpeed)), fbm2(uv*8.0+vec2(3.0,uTime*uSpeed)))-0.5)*uAmount;
    return vec4(srcImage(uv),1.0); }`,
  glassdist: `vec4 fx(vec2 uv){ uv += (vec2(fbm2(uv*4.0+uTime*0.1), fbm2(uv*4.0+vec2(5.0)+uTime*0.1))-0.5)*uAmount;
    return vec4(srcImage(uv),1.0); }`,
  lens: `vec4 fx(vec2 uv){ vec2 cc=uv-0.5; float r2=dot(cc,cc); uv=0.5+cc*(1.0+uAmount*r2*4.0);
    return vec4(srcImage(uv),1.0); }`,
  fisheye: `vec4 fx(vec2 uv){ vec2 cc=uv-0.5; float r=length(cc);
    uv=0.5+cc*(1.0 - uAmount*(1.0-smoothstep(0.0,0.7,r))); return vec4(srcImage(uv),1.0); }`,
  pinch: `vec4 fx(vec2 uv){ vec2 cc=uv-0.5; float r=length(cc); uv=0.5+cc*mix(1.0, r*2.0, uAmount);
    return vec4(srcImage(uv),1.0); }`,
  bulge: `vec4 fx(vec2 uv){ vec2 cc=uv-0.5; float r=length(cc); uv=0.5+cc*mix(1.0, smoothstep(0.0,0.7,r), uAmount);
    return vec4(srcImage(uv),1.0); }`,
  swirl: `vec4 fx(vec2 uv){ vec2 cc=uv-0.5; float r=length(cc);
    cc = rot2(uAmount*6.0*(0.5-r)+uTime*uSpeed*0.3)*cc; return vec4(srcImage(cc+0.5),1.0); }`,
  turbulence: `vec4 fx(vec2 uv){ uv += (vec2(fbm2(uv*3.0+uTime*0.2), fbm2(uv*3.0+vec2(10.0)))-0.5)*uAmount*2.0;
    uv += (fbm2(uv*6.0)-0.5)*uAmount; return vec4(srcImage(uv),1.0); }`,

  // ---------- Color ----------
  huerot: `vec4 fx(vec2 uv){ vec3 h=rgb2hsv(srcImage(uv)); h.x=fract(h.x+uTime*uSpeed*0.1+uAmount); return vec4(hsv2rgb(h),1.0); }`,
  rainbow: `vec4 fx(vec2 uv){ vec3 c=srcImage(uv); float hue=fract(uv.x+uv.y*0.3+uTime*uSpeed*0.1);
    return vec4(mix(c, hsv2rgb(vec3(hue,0.7,1.0)), uAmount),1.0); }`,
  invert: `vec4 fx(vec2 uv){ vec3 c=srcImage(uv); return vec4(mix(c,1.0-c,uAmount),1.0); }`,
  duotone: `vec4 fx(vec2 uv){ float l=dot(srcImage(uv),vec3(0.299,0.587,0.114)); return vec4(mix(uColorA,uColorB,l),1.0); }`,
  posterize: `vec4 fx(vec2 uv){ float n=max(2.0,floor(uScale)); vec3 c=floor(srcImage(uv)*n)/n; return vec4(c,1.0); }`,
  satpulse: `vec4 fx(vec2 uv){ vec3 h=rgb2hsv(srcImage(uv));
    h.y=clamp(h.y*(0.4+(0.5+0.5*sin(uTime*uSpeed))*2.0*uAmount),0.0,1.0); return vec4(hsv2rgb(h),1.0); }`,
  brightpulse: `vec4 fx(vec2 uv){ return vec4(srcImage(uv)*(0.6+(0.5+0.5*sin(uTime*uSpeed))*uAmount),1.0); }`,
  contrastpulse: `vec4 fx(vec2 uv){ float f=1.0+(0.5+0.5*sin(uTime*uSpeed))*uAmount*2.0;
    return vec4((srcImage(uv)-0.5)*f+0.5,1.0); }`,
  colorreplace: `vec4 fx(vec2 uv){ vec3 c=srcImage(uv); if(distance(c,uColorA)<uAmount) c=uColorB; return vec4(c,1.0); }`,
  prism: `vec4 fx(vec2 uv){ float o=uAmount*0.03; vec3 c;
    c.r=srcImage(uv+vec2(o,0.0)).r; c.g=srcImage(uv).g; c.b=srcImage(uv-vec2(o,0.0)).b; return vec4(c,1.0); }`,

  // ---------- Digital ----------
  pixelate: `vec4 fx(vec2 uv){ return vec4(srcImage(floor(uv*uScale)/uScale),1.0); }`,
  rgbsplit: `vec4 fx(vec2 uv){ float o=uAmount*0.03*(1.0+0.3*sin(uTime*uSpeed*10.0)); vec3 c;
    c.r=srcImage(uv+vec2(o,0.0)).r; c.g=srcImage(uv).g; c.b=srcImage(uv-vec2(o,0.0)).b; return vec4(c,1.0); }`,
  glitch: `vec4 fx(vec2 uv){ float by=floor(uv.y*40.0); float t=floor(uTime*uSpeed*8.0);
    float j=(h21(vec2(by,t))-0.5)*uAmount*step(0.7,h21(vec2(by*1.7,t))); uv.x+=j;
    float o=0.02*uAmount; vec3 c; c.r=srcImage(uv+vec2(o,0.0)).r; c.g=srcImage(uv).g; c.b=srcImage(uv-vec2(o,0.0)).b;
    c += (h21(uv+t)-0.5)*0.1*uAmount; return vec4(c,1.0); }`,
  scanlines: `vec4 fx(vec2 uv){ float line=0.5+0.5*sin(uv.y*uScale*6.2831);
    return vec4(srcImage(uv)*(1.0-uAmount*0.5*line),1.0); }`,
  staticn: `vec4 fx(vec2 uv){ return vec4(srcImage(uv)+(h21(uv+fract(uTime*uSpeed))-0.5)*uAmount,1.0); }`,
  vhs: `vec4 fx(vec2 uv){ float sh=sin(uv.y*8.0+uTime*uSpeed)*uAmount*0.02; uv.x+=sh;
    vec3 c; c.r=srcImage(uv+vec2(0.01*uAmount,0.0)).r; c.g=srcImage(uv).g; c.b=srcImage(uv-vec2(0.01*uAmount,0.0)).b;
    c*=0.8+0.2*sin(uv.y*200.0); c+=(h21(uv+fract(uTime))-0.5)*0.05; return vec4(c,1.0); }`,
  crt: `vec4 fx(vec2 uv){ vec2 cc=uv-0.5; uv=0.5+cc*(1.0+dot(cc,cc)*0.3);
    if(uv.x<0.0||uv.x>1.0||uv.y<0.0||uv.y>1.0) return vec4(0.0,0.0,0.0,1.0);
    vec3 c=srcImage(uv); c*=0.85+0.15*sin(uv.y*300.0); c*=smoothstep(0.75,0.25,length(cc))+0.3; return vec4(c,1.0); }`,
  matrix: `vec4 fx(vec2 uv){ vec3 base=srcImage(uv)*0.25; float col=floor(uv.x*uScale);
    float y=fract(uv.y+uTime*uSpeed*0.2+h21(vec2(col,1.0))); float trail=pow(1.0-y,4.0);
    float glyph=step(0.5,h21(vec2(col,floor(uv.y*30.0)+floor(uTime*8.0))));
    return vec4(base+uColorA*trail*glyph,1.0); }`,
  pixelexplode: `vec4 fx(vec2 uv){ vec2 g=floor(uv*uScale)/uScale; float r=h21(g*13.0);
    vec2 off=(vec2(h21(g),h21(g+7.0))-0.5)*uAmount*(0.5+0.5*sin(uTime*uSpeed+r*6.2831));
    return vec4(srcImage(uv+off),1.0); }`,

  // ---------- Glass & Refraction ----------
  glassrefract: `vec4 fx(vec2 uv){ vec2 d=(vec2(n2(uv*6.0+uTime*0.1), n2(uv*6.0+vec2(5.0)+uTime*0.1))-0.5)*uAmount;
    return vec4(mix(srcImage(uv+d), uColorA, 0.08),1.0); }`,
  crystal: `vec4 fx(vec2 uv){ vec3 v=vor(uv*uScale); vec2 cell=(v.yz+0.5)/uScale; vec2 dir=uv-cell;
    return vec4(srcImage(cell+dir*0.3),1.0); }`,
  bubble: `vec4 fx(vec2 uv){ vec2 cc=uv-uMouse; float r=length(cc); float lens=smoothstep(0.3,0.0,r);
    uv+=cc*lens*uAmount; return vec4(srcImage(uv)+lens*0.1,1.0); }`,
  chromatic: `vec4 fx(vec2 uv){ vec2 cc=uv-0.5; float r2=dot(cc,cc); vec2 u=0.5+cc*(1.0+uAmount*r2*2.0);
    float o=uAmount*0.02; vec3 c; c.r=srcImage(u+cc*o).r; c.g=srcImage(u).g; c.b=srcImage(u-cc*o).b; return vec4(c,1.0); }`,

  // ---------- Glow ----------
  bloom: `vec4 fx(vec2 uv){ vec3 c=srcImage(uv); vec3 b=vec3(0.0);
    for(int x=-2;x<=2;x++) for(int y=-2;y<=2;y++){ vec3 s=srcImage(uv+vec2(float(x),float(y))*0.012); b+=max(s-0.6,0.0); }
    return vec4(c+b/25.0*uAmount*8.0,1.0); }`,
  edgeglow: `vec4 fx(vec2 uv){ float e=0.003;
    vec3 dx=srcImage(uv+vec2(e,0.0))-srcImage(uv-vec2(e,0.0));
    vec3 dy=srcImage(uv+vec2(0.0,e))-srcImage(uv-vec2(0.0,e));
    float edge=length(dx)+length(dy); return vec4(srcImage(uv)+uColorA*edge*4.0*uAmount,1.0); }`,
  pulseglow: `vec4 fx(vec2 uv){ vec3 c=srcImage(uv); float l=dot(c,vec3(0.333));
    return vec4(c+uColorA*pow(l,2.0)*uAmount*(0.6+0.6*sin(uTime*uSpeed)),1.0); }`,

  // ---------- Blur ----------
  gaussian: `vec4 fx(vec2 uv){ float s=uAmount*0.02; vec3 c=vec3(0.0); float w=0.0;
    for(int x=-2;x<=2;x++) for(int y=-2;y<=2;y++){ float k=exp(-float(x*x+y*y)*0.5);
      c+=srcImage(uv+vec2(float(x),float(y))*s)*k; w+=k; } return vec4(c/w,1.0); }`,
  motion: `vec4 fx(vec2 uv){ vec3 c=vec3(0.0); for(int i=-4;i<=4;i++) c+=srcImage(uv+vec2(float(i)*uAmount*0.02,0.0));
    return vec4(c/9.0,1.0); }`,
  zoom: `vec4 fx(vec2 uv){ vec3 c=vec3(0.0); for(int i=0;i<8;i++){ float t=1.0-float(i)*uAmount*0.02;
    c+=srcImage((uv-0.5)*t+0.5); } return vec4(c/8.0,1.0); }`,
  bokeh: `vec4 fx(vec2 uv){ vec3 c=vec3(0.0); float s=uAmount*0.03;
    for(int i=0;i<12;i++){ float a=float(i)*0.5236; c+=srcImage(uv+vec2(cos(a),sin(a))*s); } return vec4(c/12.0,1.0); }`,
  tiltshift: `vec4 fx(vec2 uv){ float s=uAmount*0.03*smoothstep(0.1,0.5,abs(uv.y-0.5)); vec3 c=vec3(0.0);
    for(int i=-3;i<=3;i++) c+=srcImage(uv+vec2(0.0,float(i)*s)); return vec4(c/7.0,1.0); }`,

  // ---------- Dissolve & Burn ----------
  burn: `vec4 fx(vec2 uv){ float prog=0.5+0.5*sin(uTime*uSpeed*0.5); float m=fbm2(uv*6.0); float e=m-prog;
    vec3 col=mix(uColorB, srcImage(uv), smoothstep(0.0,0.06,e));
    col+=uColorA*smoothstep(0.0,0.06,e)*(1.0-smoothstep(0.06,0.14,e))*2.0; return vec4(col, step(0.0,e)); }`,
  burnRadial: `vec4 fx(vec2 uv){ float prog=0.5+0.5*sin(uTime*uSpeed*0.5); float m=distance(uv,vec2(0.5))*1.6; float e=m-prog;
    vec3 col=mix(uColorB, srcImage(uv), smoothstep(0.0,0.06,e));
    col+=uColorA*smoothstep(0.0,0.06,e)*(1.0-smoothstep(0.06,0.14,e))*2.0; return vec4(col, step(0.0,e)); }`,
  burnM: `vec4 fx(vec2 uv){ float prog=0.5+0.5*sin(uTime*uSpeed*0.5); float m=distance(uv,uMouse)*1.6; float e=m-prog;
    vec3 col=mix(uColorB, srcImage(uv), smoothstep(0.0,0.06,e));
    col+=uColorA*smoothstep(0.0,0.06,e)*(1.0-smoothstep(0.06,0.14,e))*2.0; return vec4(col, step(0.0,e)); }`,
  pixeldissolve: `vec4 fx(vec2 uv){ float prog=fract(uTime*uSpeed*0.3); float m=h21(floor(uv*uScale));
    return vec4(srcImage(uv), step(prog,m)); }`,
  voronoidissolve: `vec4 fx(vec2 uv){ float prog=fract(uTime*uSpeed*0.3); vec3 v=vor(uv*uScale);
    return vec4(srcImage(uv), step(prog, h21(v.yz))); }`,
  hexdissolve: `vec4 fx(vec2 uv){ float prog=fract(uTime*uSpeed*0.3); vec4 h=hexCoords(uv*uScale);
    return vec4(srcImage(uv), step(prog, h21(h.zw))); }`,
  melt: `vec4 fx(vec2 uv){ float drip=fbm2(vec2(uv.x*8.0,0.0))*uAmount;
    uv.y += drip*(0.5+0.5*sin(uTime*uSpeed)); return vec4(srcImage(uv),1.0); }`,
  noisedissolve: `vec4 fx(vec2 uv){ float prog=fract(uTime*uSpeed*0.3); return vec4(srcImage(uv), step(prog, fbm2(uv*uScale))); }`,
  fade: `vec4 fx(vec2 uv){ return vec4(srcImage(uv), 1.0-(0.5+0.5*sin(uTime*uSpeed))); }`,

  // ---------- Reveal ----------
  circreveal: `vec4 fx(vec2 uv){ float prog=fract(uTime*uSpeed*0.3)*1.4; float d=distance(uv,vec2(0.5));
    return vec4(srcImage(uv), 1.0-smoothstep(prog-0.05-uAmount*0.1, prog, d)); }`,
  swipereveal: `vec4 fx(vec2 uv){ float prog=fract(uTime*uSpeed*0.3); return vec4(srcImage(uv), 1.0-smoothstep(prog-0.05, prog, uv.x)); }`,
  noisereveal: `vec4 fx(vec2 uv){ float prog=fract(uTime*uSpeed*0.3); return vec4(srcImage(uv), 1.0-smoothstep(prog-0.05, prog, fbm2(uv*uScale))); }`,
  pixelreveal: `vec4 fx(vec2 uv){ float prog=fract(uTime*uSpeed*0.3); return vec4(srcImage(uv), step(h21(floor(uv*uScale)), prog)); }`,
  scanreveal: `vec4 fx(vec2 uv){ float prog=fract(uTime*uSpeed*0.3); float line=smoothstep(0.02,0.0,abs(uv.y-prog));
    return vec4(srcImage(uv)+line*uColorA, clamp(step(uv.y,prog)+line,0.0,1.0)); }`,

  // ---------- Energy ----------
  electric: `vec4 fx(vec2 uv){ float n=fbm2(uv*4.0+uTime*uSpeed); float bolt=smoothstep(0.0,0.06,abs(uv.y-0.5-(n-0.5)*0.6));
    return vec4(srcImage(uv)*0.4+uColorA*(1.0-bolt)*uAmount*2.0,1.0); }`,
  plasma: `vec4 fx(vec2 uv){ vec2 p=uv*8.0; float t=uTime*uSpeed; float v=sin(p.x+t)+sin(p.y*0.8+t)+sin(length(p-4.0)+t);
    vec3 c=0.5+0.5*cos(6.2831*(v*0.16+vec3(0.0,0.33,0.67))); return vec4(mix(srcImage(uv),c,uAmount),1.0); }`,
  forcefield: `vec4 fx(vec2 uv){ vec2 cc=uv-0.5; float r=length(cc); float ring=abs(sin(r*30.0-uTime*uSpeed*3.0));
    return vec4(srcImage(uv)+uColorA*smoothstep(0.5,0.45,r)*ring*0.6*uAmount,1.0); }`,
  portal: `vec4 fx(vec2 uv){ vec2 cc=uv-0.5; float r=length(cc); float a=atan(cc.y,cc.x);
    float sw=sin(a*6.0+r*20.0-uTime*uSpeed*4.0);
    return vec4(mix(srcImage(uv), uColorA, smoothstep(0.0,0.5,sw)*smoothstep(0.5,0.1,r)),1.0); }`,
  pulsering: `vec4 fx(vec2 uv){ vec2 cc=uv-0.5; float r=length(cc); float f=fract(uTime*uSpeed*0.5);
    return vec4(srcImage(uv)+uColorA*smoothstep(0.05,0.0,abs(r-f))*uAmount*1.5,1.0); }`,

  // ---------- Interactive ----------
  mousemagnet: `vec4 fx(vec2 uv){ uv += (uMouse-uv)*uAmount*exp(-distance(uv,uMouse)*4.0); return vec4(srcImage(uv),1.0); }`,
  mouserepulsion: `vec4 fx(vec2 uv){ vec2 d=uv-uMouse; uv += normalize(d+1e-5)*uAmount*exp(-length(d)*4.0); return vec4(srcImage(uv),1.0); }`,
  hoverzoom: `vec4 fx(vec2 uv){ float m=exp(-distance(uv,uMouse)*4.0); uv=mix(uv,(uv-uMouse)*(1.0-uAmount)+uMouse,m); return vec4(srcImage(uv),1.0); }`,
  cursortrail: `vec4 fx(vec2 uv){ return vec4(srcImage(uv)+uColorA*exp(-distance(uv,uMouse)*8.0)*1.5*uAmount,1.0); }`,
  audioreactive: `vec4 fx(vec2 uv){ float amp=0.5+0.5*sin(uTime*uSpeed); uv=(uv-0.5)*(1.0-amp*uAmount*0.3)+0.5;
    return vec4(srcImage(uv)*(0.8+amp*0.5),1.0); }`,
}

interface Preset {
  name: string
  cat: string
  k: keyof typeof KERNELS
  amount?: number
  speed?: number
  scale?: number
  a?: [number, number, number]
  b?: [number, number, number]
}

const FIRE_A: [number, number, number] = [1.0, 0.55, 0.12]
const CHAR_B: [number, number, number] = [0.06, 0.04, 0.05]
const CYAN: [number, number, number] = [0.13, 0.83, 0.93]
const VIOLET: [number, number, number] = [0.49, 0.36, 1.0]
const GREEN: [number, number, number] = [0.2, 1.0, 0.4]

const PRESETS: Preset[] = [
  // 🌊 Distortion
  { name: 'Ripple', cat: 'Distortion', k: 'ripple', amount: 0.08, speed: 1 },
  { name: 'Clickable Ripple', cat: 'Distortion', k: 'rippleM', amount: 0.1, speed: 1.5 },
  { name: 'Radial Ripple', cat: 'Distortion', k: 'ripple', amount: 0.12, speed: 2 },
  { name: 'Water Ripple', cat: 'Distortion', k: 'ripple', amount: 0.06, speed: 0.8 },
  { name: 'Shockwave', cat: 'Distortion', k: 'shockwave', amount: 0.15, speed: 1 },
  { name: 'Wave Distortion', cat: 'Distortion', k: 'wave', amount: 0.04, speed: 1.5 },
  { name: 'Heat Distortion', cat: 'Distortion', k: 'heat', amount: 0.04, speed: 1 },
  { name: 'Glass Distortion', cat: 'Distortion', k: 'glassdist', amount: 0.08 },
  { name: 'Lens Distortion', cat: 'Distortion', k: 'lens', amount: 0.4 },
  { name: 'Barrel Distortion', cat: 'Distortion', k: 'lens', amount: 0.8 },
  { name: 'Fisheye', cat: 'Distortion', k: 'fisheye', amount: 0.6 },
  { name: 'Pinch', cat: 'Distortion', k: 'pinch', amount: 0.6 },
  { name: 'Bulge', cat: 'Distortion', k: 'bulge', amount: 0.8 },
  { name: 'Swirl', cat: 'Distortion', k: 'swirl', amount: 1.0, speed: 0.5 },
  { name: 'Twirl', cat: 'Distortion', k: 'swirl', amount: 1.5, speed: 1 },
  { name: 'Warp', cat: 'Distortion', k: 'turbulence', amount: 0.1 },
  { name: 'Liquid Distortion', cat: 'Distortion', k: 'glassdist', amount: 0.12 },
  { name: 'Turbulence', cat: 'Distortion', k: 'turbulence', amount: 0.15 },

  // 🔥 Dissolve & Burn
  { name: 'Burn', cat: 'Dissolve & Burn', k: 'burn', speed: 1, a: FIRE_A, b: CHAR_B },
  { name: 'Radial Burn', cat: 'Dissolve & Burn', k: 'burnRadial', speed: 1, a: FIRE_A, b: CHAR_B },
  { name: 'Clickable Burn', cat: 'Dissolve & Burn', k: 'burnM', speed: 1, a: FIRE_A, b: CHAR_B },
  { name: 'Tappable Burn', cat: 'Dissolve & Burn', k: 'burnM', speed: 1.2, a: FIRE_A, b: CHAR_B },
  { name: 'Edge Burn', cat: 'Dissolve & Burn', k: 'burn', speed: 0.8, a: FIRE_A, b: CHAR_B },
  { name: 'Fire Burn', cat: 'Dissolve & Burn', k: 'burn', speed: 1.4, a: [1, 0.4, 0.05], b: CHAR_B },
  { name: 'Ash Dissolve', cat: 'Dissolve & Burn', k: 'noisedissolve', speed: 1, scale: 8 },
  { name: 'Smoke Dissolve', cat: 'Dissolve & Burn', k: 'noisedissolve', speed: 0.8, scale: 4 },
  { name: 'Pixel Dissolve', cat: 'Dissolve & Burn', k: 'pixeldissolve', speed: 1, scale: 40 },
  { name: 'Radial Pixel Dissolve', cat: 'Dissolve & Burn', k: 'pixeldissolve', speed: 1.2, scale: 30 },
  { name: 'Clickable Pixel Dissolve', cat: 'Dissolve & Burn', k: 'pixeldissolve', speed: 1, scale: 50 },
  { name: 'Tappable Pixel Dissolve', cat: 'Dissolve & Burn', k: 'pixeldissolve', speed: 1, scale: 60 },
  { name: 'Noise Dissolve', cat: 'Dissolve & Burn', k: 'noisedissolve', speed: 1, scale: 6 },
  { name: 'Voronoi Dissolve', cat: 'Dissolve & Burn', k: 'voronoidissolve', speed: 1, scale: 12 },
  { name: 'Hex Dissolve', cat: 'Dissolve & Burn', k: 'hexdissolve', speed: 1, scale: 14 },
  { name: 'Particle Dissolve', cat: 'Dissolve & Burn', k: 'voronoidissolve', speed: 1.3, scale: 24 },
  { name: 'Melt', cat: 'Dissolve & Burn', k: 'melt', amount: 0.3, speed: 1 },
  { name: 'Fade Dissolve', cat: 'Dissolve & Burn', k: 'fade', speed: 1 },

  // ✨ Reveal
  { name: 'Circular Reveal', cat: 'Reveal', k: 'circreveal', speed: 1 },
  { name: 'Radial Reveal', cat: 'Reveal', k: 'circreveal', speed: 1.2 },
  { name: 'Swipe Reveal', cat: 'Reveal', k: 'swipereveal', speed: 1 },
  { name: 'Curtain Reveal', cat: 'Reveal', k: 'swipereveal', speed: 0.8 },
  { name: 'Wipe Reveal', cat: 'Reveal', k: 'swipereveal', speed: 1.2 },
  { name: 'Noise Reveal', cat: 'Reveal', k: 'noisereveal', speed: 1, scale: 6 },
  { name: 'Pixel Reveal', cat: 'Reveal', k: 'pixelreveal', speed: 1, scale: 40 },
  { name: 'Brush Reveal', cat: 'Reveal', k: 'noisereveal', speed: 1, scale: 3 },
  { name: 'Ink Reveal', cat: 'Reveal', k: 'noisereveal', speed: 0.8, scale: 4 },
  { name: 'Smoke Reveal', cat: 'Reveal', k: 'noisereveal', speed: 0.6, scale: 5 },
  { name: 'Water Reveal', cat: 'Reveal', k: 'circreveal', speed: 0.8, amount: 0.5 },
  { name: 'Spotlight Reveal', cat: 'Reveal', k: 'circreveal', speed: 1, amount: 1 },
  { name: 'Growing Reveal', cat: 'Reveal', k: 'circreveal', speed: 1.4 },
  { name: 'Scan Reveal', cat: 'Reveal', k: 'scanreveal', speed: 1, a: CYAN },
  { name: 'Shape Reveal', cat: 'Reveal', k: 'circreveal', speed: 1, amount: 0.3 },

  // 🌈 Color
  { name: 'Gradient Shift', cat: 'Color FX', k: 'rainbow', amount: 0.6, speed: 1 },
  { name: 'Rainbow Shift', cat: 'Color FX', k: 'rainbow', amount: 1, speed: 1.5 },
  { name: 'Hue Rotation', cat: 'Color FX', k: 'huerot', speed: 1 },
  { name: 'Saturation Pulse', cat: 'Color FX', k: 'satpulse', amount: 0.5, speed: 2 },
  { name: 'Contrast Pulse', cat: 'Color FX', k: 'contrastpulse', amount: 0.4, speed: 2 },
  { name: 'Brightness Pulse', cat: 'Color FX', k: 'brightpulse', amount: 0.5, speed: 2 },
  { name: 'Color Inversion', cat: 'Color FX', k: 'invert', amount: 1 },
  { name: 'Duotone', cat: 'Color FX', k: 'duotone', a: VIOLET, b: CYAN },
  { name: 'Posterize', cat: 'Color FX', k: 'posterize', scale: 4 },
  { name: 'Color Replace', cat: 'Color FX', k: 'colorreplace', amount: 0.3, a: [0.95, 0.45, 0.2], b: GREEN },
  { name: 'Color Bleed', cat: 'Color FX', k: 'rgbsplit', amount: 0.4, speed: 0.5 },
  { name: 'Animated Gradient', cat: 'Color FX', k: 'rainbow', amount: 0.8, speed: 0.6 },
  { name: 'Neon Glow', cat: 'Color FX', k: 'edgeglow', amount: 1, a: CYAN },
  { name: 'Holographic Shift', cat: 'Color FX', k: 'huerot', speed: 3 },
  { name: 'Prism Effect', cat: 'Color FX', k: 'prism', amount: 0.6 },

  // 📺 Digital
  { name: 'Pixelate', cat: 'Digital', k: 'pixelate', scale: 40 },
  { name: 'Pixel Explosion', cat: 'Digital', k: 'pixelexplode', amount: 0.3, speed: 1, scale: 30 },
  { name: 'Pixel Stretch', cat: 'Digital', k: 'pixelexplode', amount: 0.5, speed: 0.5, scale: 20 },
  { name: 'RGB Split', cat: 'Digital', k: 'rgbsplit', amount: 0.5, speed: 1 },
  { name: 'Glitch', cat: 'Digital', k: 'glitch', amount: 0.6, speed: 1 },
  { name: 'Digital Noise', cat: 'Digital', k: 'staticn', amount: 0.3, speed: 4 },
  { name: 'VHS', cat: 'Digital', k: 'vhs', amount: 0.5, speed: 2 },
  { name: 'CRT', cat: 'Digital', k: 'crt' },
  { name: 'Scanlines', cat: 'Digital', k: 'scanlines', amount: 0.6, scale: 200 },
  { name: 'Static', cat: 'Digital', k: 'staticn', amount: 0.5, speed: 8 },
  { name: 'Datamosh', cat: 'Digital', k: 'glitch', amount: 0.9, speed: 0.5 },
  { name: 'Compression Artifact', cat: 'Digital', k: 'pixelate', scale: 24 },
  { name: 'Block Glitch', cat: 'Digital', k: 'glitch', amount: 0.8, speed: 0.8 },
  { name: 'Digital Corruption', cat: 'Digital', k: 'glitch', amount: 1, speed: 1.5 },
  { name: 'Matrix Rain', cat: 'Digital', k: 'matrix', speed: 1.5, scale: 40, a: GREEN },

  // 💎 Glass & Refraction
  { name: 'Glass Refraction', cat: 'Glass FX', k: 'glassrefract', amount: 0.08, a: CYAN },
  { name: 'Frosted Glass', cat: 'Glass FX', k: 'gaussian', amount: 0.4 },
  { name: 'Crystal', cat: 'Glass FX', k: 'crystal', scale: 10 },
  { name: 'Bubble Glass', cat: 'Glass FX', k: 'bubble', amount: 0.4 },
  { name: 'Water Refraction', cat: 'Glass FX', k: 'glassrefract', amount: 0.1, a: [0.2, 0.5, 0.7] },
  { name: 'Ice Refraction', cat: 'Glass FX', k: 'crystal', scale: 6 },
  { name: 'Prism', cat: 'Glass FX', k: 'prism', amount: 0.5 },
  { name: 'Lens Refraction', cat: 'Glass FX', k: 'lens', amount: 0.5 },
  { name: 'Chromatic Refraction', cat: 'Glass FX', k: 'chromatic', amount: 0.5 },
  { name: 'Liquid Glass', cat: 'Glass FX', k: 'glassrefract', amount: 0.06, a: CYAN },

  // 💡 Glow
  { name: 'Soft Glow', cat: 'Glow', k: 'bloom', amount: 0.5 },
  { name: 'Bloom', cat: 'Glow', k: 'bloom', amount: 0.8 },
  { name: 'Outline Glow', cat: 'Glow', k: 'edgeglow', amount: 1, a: VIOLET },
  { name: 'Edge Glow', cat: 'Glow', k: 'edgeglow', amount: 0.8, a: CYAN },
  { name: 'Rim Glow', cat: 'Glow', k: 'edgeglow', amount: 1.2, a: [1, 0.6, 0.2] },
  { name: 'Hover Glow', cat: 'Glow', k: 'pulseglow', amount: 0.8, speed: 2, a: CYAN },
  { name: 'Pulse Glow', cat: 'Glow', k: 'pulseglow', amount: 1, speed: 3, a: VIOLET },
  { name: 'Energy Glow', cat: 'Glow', k: 'pulseglow', amount: 1, speed: 4, a: GREEN },
  { name: 'Aura Glow', cat: 'Glow', k: 'pulseglow', amount: 0.7, speed: 1.5, a: [1, 0.4, 0.8] },
  { name: 'Hologram Glow', cat: 'Glow', k: 'pulseglow', amount: 0.9, speed: 6, a: CYAN },

  // 🌫 Blur
  { name: 'Gaussian Blur', cat: 'Blur', k: 'gaussian', amount: 0.5 },
  { name: 'Motion Blur', cat: 'Blur', k: 'motion', amount: 0.5 },
  { name: 'Zoom Blur', cat: 'Blur', k: 'zoom', amount: 0.6 },
  { name: 'Radial Blur', cat: 'Blur', k: 'zoom', amount: 0.8 },
  { name: 'Directional Blur', cat: 'Blur', k: 'motion', amount: 0.8 },
  { name: 'Bokeh Blur', cat: 'Blur', k: 'bokeh', amount: 0.6 },
  { name: 'Tilt Shift', cat: 'Blur', k: 'tiltshift', amount: 0.8 },
  { name: 'Focus Blur', cat: 'Blur', k: 'gaussian', amount: 0.3 },
  { name: 'Interactive Blur', cat: 'Blur', k: 'gaussian', amount: 0.6 },

  // 🧊 Morph
  { name: 'Wobble', cat: 'Morph', k: 'wave', amount: 0.03, speed: 2 },
  { name: 'Jelly', cat: 'Morph', k: 'wave', amount: 0.05, speed: 4 },
  { name: 'Inflate', cat: 'Morph', k: 'bulge', amount: 0.6 },
  { name: 'Deflate', cat: 'Morph', k: 'pinch', amount: 0.5 },
  { name: 'Elastic', cat: 'Morph', k: 'wave', amount: 0.06, speed: 5 },
  { name: 'Stretch', cat: 'Morph', k: 'bulge', amount: 0.9 },
  { name: 'Squash', cat: 'Morph', k: 'pinch', amount: 0.8 },
  { name: 'Bounce', cat: 'Morph', k: 'wave', amount: 0.04, speed: 3 },
  { name: 'Blob', cat: 'Morph', k: 'bubble', amount: 0.5 },
  { name: 'Liquid', cat: 'Morph', k: 'glassdist', amount: 0.1 },

  // ⚡ Energy
  { name: 'Electric', cat: 'Energy', k: 'electric', amount: 0.6, speed: 2, a: CYAN },
  { name: 'Plasma', cat: 'Energy', k: 'plasma', amount: 0.8, speed: 1 },
  { name: 'Lightning', cat: 'Energy', k: 'electric', amount: 1, speed: 4, a: [0.8, 0.9, 1] },
  { name: 'Force Field', cat: 'Energy', k: 'forcefield', amount: 1, speed: 1, a: CYAN },
  { name: 'Energy Shield', cat: 'Energy', k: 'forcefield', amount: 1.2, speed: 1.5, a: VIOLET },
  { name: 'Portal', cat: 'Energy', k: 'portal', speed: 1, a: VIOLET },
  { name: 'Pulse Ring', cat: 'Energy', k: 'pulsering', amount: 1, speed: 1, a: CYAN },
  { name: 'Aura', cat: 'Energy', k: 'pulseglow', amount: 0.8, speed: 1.5, a: [1, 0.5, 0.9] },
  { name: 'Magic Circle', cat: 'Energy', k: 'portal', speed: 0.6, a: [1, 0.8, 0.3] },

  // 🖱 Interactive
  { name: 'Mouse Ripple', cat: 'Interactive', k: 'rippleM', amount: 0.1, speed: 1.5 },
  { name: 'Mouse Magnet', cat: 'Interactive', k: 'mousemagnet', amount: 0.5 },
  { name: 'Mouse Repulsion', cat: 'Interactive', k: 'mouserepulsion', amount: 0.3 },
  { name: 'Hover Distortion', cat: 'Interactive', k: 'glassdist', amount: 0.08 },
  { name: 'Hover Zoom', cat: 'Interactive', k: 'hoverzoom', amount: 0.4 },
  { name: 'Click Explosion', cat: 'Interactive', k: 'shockwave', amount: 0.2, speed: 1 },
  { name: 'Click Ripple', cat: 'Interactive', k: 'rippleM', amount: 0.12, speed: 2 },
  { name: 'Click Burn', cat: 'Interactive', k: 'burnM', speed: 1, a: FIRE_A, b: CHAR_B },
  { name: 'Click Melt', cat: 'Interactive', k: 'melt', amount: 0.3, speed: 1 },
  { name: 'Cursor Trail', cat: 'Interactive', k: 'cursortrail', amount: 1, a: CYAN },
  { name: 'Cursor Warp', cat: 'Interactive', k: 'swirl', amount: 1.2, speed: 0.5 },
  { name: 'Touch Distortion', cat: 'Interactive', k: 'glassdist', amount: 0.1 },
  { name: 'Scroll Wave', cat: 'Interactive', k: 'wave', amount: 0.04, speed: 1 },
  { name: 'Audio Reactive', cat: 'Interactive', k: 'audioreactive', amount: 0.6, speed: 3 },
]

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function buildEffect(p: Preset): ShaderDef {
  const kernel = KERNELS[p.k]
  const uses = (t: string) => kernel.includes(t)
  const uniforms: UniformMap = {}
  if (uses('uAmount'))
    uniforms.uAmount = { type: 'float', label: 'Amount', value: p.amount ?? 0.5, min: 0, max: 1.5, step: 0.01 }
  if (uses('uSpeed'))
    uniforms.uSpeed = { type: 'float', label: 'Speed', value: p.speed ?? 1, min: 0, max: 6, step: 0.01 }
  if (uses('uScale'))
    uniforms.uScale = { type: 'float', label: 'Scale', value: p.scale ?? 20, min: 2, max: 200, step: 1 }
  if (uses('uColorA'))
    uniforms.uColorA = { type: 'color', label: 'Color A', value: p.a ?? CYAN }
  if (uses('uColorB'))
    uniforms.uColorB = { type: 'color', label: 'Color B', value: p.b ?? VIOLET }

  return {
    id: `fx-${slug(p.name)}`,
    name: p.name,
    category: p.cat,
    description: `${p.name} — ${p.cat.toLowerCase()} image effect applied to a procedural test image. Editable parameters; move the mouse for interactive effects.`,
    complexity: 'Medium',
    performance: 4,
    kind: 'fragment',
    preferredGeometry: 'plane',
    fragment: `${IMAGE_PRELUDE}\n${kernel}\n${MAIN}`,
    uniforms,
  }
}

// dedupe by id (a few names appear under more than one category in the spec)
const seen = new Set<string>()
export const IMAGE_SHADERS: ShaderDef[] = PRESETS.map(buildEffect).filter((s) => {
  if (seen.has(s.id)) return false
  seen.add(s.id)
  return true
})
