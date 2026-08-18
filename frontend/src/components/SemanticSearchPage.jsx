import React, { useState, useRef, useEffect, useCallback } from 'react'
import { API_BASE_URL } from '../config';
import ConstellationExplorer from "./react-bits/ConstellationExplorer";
import { makeTile } from "./react-bits/constellationTiles";
import SemanticMap from "./react-bits/SemanticMap";

// ═══════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════
const C = {
  green:            '#00ff0f',
  cyan:             '#00ccff',
  crimson:          '#ff2040',
  void:             '#0a0a1e',
  surface:          '#111125',
  surfaceContainer: '#1e1e32',
  onSurface:        '#e2e0fc',
  onSurfaceVariant: '#b9ccb0',
  textSecondary:    '#8899aa',
  white10:          'rgba(255,255,255,0.10)',
  white5:           'rgba(255,255,255,0.05)',
}

// ═══════════════════════════════════════════════════════════════
// ICON (Material Symbols Outlined)
// ═══════════════════════════════════════════════════════════════
function Icon({ name, style }) {
  return (
    <span style={{
      fontFamily: 'Material Symbols Outlined',
      fontVariationSettings: "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
      lineHeight: 1,
      userSelect: 'none',
      ...(style || {}),
    }}>
      {name}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════
// AMBIENT GALAXY - transparent WebGL background
// ═══════════════════════════════════════════════════════════════
const DISC_TILT = 0.21
const FIXED_RX  = 5.5
const ROT_SPEED = 0.000105
const SC        = 1.72
const TILT_Y    = 0.88
const BRANCHES  = 4
const SPIN      = 10.8
const NSTAR     = 95000
const NCLOUD    = 200
const NOUTR     = 120
const NC        = 8000
const NBG       = 3500
const NDUST     = 2000
const NNEB      = 35

const TX = `
  float armAng = atan(aP.y, aP.x) + uRot;
  float R = length(aP);
  float wx = cos(armAng)*R;
  float wy = sin(armAng)*R;
  float wz = aZ;
  float ct = cos(${DISC_TILT.toFixed(5)});
  float st = sin(${DISC_TILT.toFixed(5)});
  float ty = wy*ct - wz*st;
  float tz = wy*st + wz*ct;
  float rx = uRX * 0.10472;
  float py = ty*cos(rx) - tz*sin(rx);
  float pz = ty*sin(rx) + tz*cos(rx);
  float persp = 1.0 / (1.0 + pz*0.085 + 0.46);
  gl_Position = vec4(wx*persp/uAsp*${SC.toFixed(3)}, py*persp*${SC.toFixed(3)}*${TILT_Y.toFixed(3)}, 0.0, 1.0);
`

const SH = {
  vsStar: `
    attribute vec2 aP; attribute float aSz,aBr,aT,aPh,aZ;
    uniform float uRot,uRX,uAsp,uTime,uPulse,uBright;
    varying float vBr,vT,vTw,vAcc,vEdge;
    void main(){
      ${TX}
      float r = length(aP);
      vEdge = smoothstep(0.0, 0.55, r);
      vBr   = aBr*(1.0 + uPulse*(1.0-r)*0.22)*uBright*(1.0-vEdge*0.55);
      vT    = aT;
      vAcc  = aSz>4.2 ? 1.0 : (aSz>2.2 ? 0.5 : 0.0);
      vTw   = sin(uTime*2.5+aPh*6.2832)*0.5+0.5;
      gl_PointSize = max(0.3, aSz*(1.0-vEdge*0.4)/( 1.0+pz*0.085+0.46 ));
    }`,
  fsStar: `
    precision highp float;
    varying float vBr,vT,vTw,vAcc,vEdge;
    void main(){
      vec2 pc = gl_PointCoord-0.5; float d = length(pc)*2.0; if(d>1.0)discard;
      float core  = 1.0-smoothstep(0.0,1.0,pow(d,2.1));
      float spike = 0.0;
      if(vAcc>0.5){
        float sx = max(0.0,1.0-abs(pc.x)*13.0)*max(0.0,1.0-abs(pc.y)*48.0);
        float sy = max(0.0,1.0-abs(pc.y)*13.0)*max(0.0,1.0-abs(pc.x)*48.0);
        spike = (sx+sy)*(vAcc>0.8?0.58:0.32);
      }
      float bloom = vAcc>0.0 ? pow(max(0.0,1.0-d*1.35),3.2)*0.28 : 0.0;
      float f = core + spike + bloom;
      float t = clamp(vT,0.0,1.0);
      vec3 col;
      if     (t<0.07) col=mix(vec3(0.95,0.98,1.00),vec3(0.80,0.94,1.00),t/0.07);
      else if(t<0.22) col=mix(vec3(0.80,0.94,1.00),vec3(0.22,0.70,1.00),(t-0.07)/0.15);
      else if(t<0.52) col=mix(vec3(0.22,0.70,1.00),vec3(0.10,0.48,0.97),(t-0.22)/0.30);
      else            col=mix(vec3(0.10,0.48,0.97),vec3(0.03,0.20,0.76),(t-0.52)/0.48);
      float bright = 1.0-t*0.38;
      float tw     = vAcc>0.0?(0.55+vTw*0.45):1.0;
      float edgeFade = 1.0-smoothstep(0.40,1.0,vEdge);
      float alpha = f*vBr*bright*tw*edgeFade;
      gl_FragColor = vec4(col*alpha, alpha);
    }`,
  vsCloud: `
    attribute vec2 aP; attribute float aSz,aBr,aT,aZ;
    uniform float uRot,uRX,uAsp,uTime,uBright;
    varying float vBr,vT,vEdge;
    void main(){
      ${TX}
      float r=length(aP);
      vEdge=smoothstep(0.0,0.6,r);
      vBr=aBr*uBright*(1.0-vEdge*0.7); vT=aT;
      gl_PointSize=max(14.0,aSz/(1.0+pz*0.085+0.46));
    }`,
  fsCloud: `
    precision mediump float;
    varying float vBr,vT,vEdge;
    void main(){
      vec2 pc=gl_PointCoord-0.5; float r=length(pc)*2.0; if(r>1.0)discard;
      float f=1.0-smoothstep(0.0,1.0,pow(r,0.30));
      float t=clamp(vT,0.0,1.0);
      vec3 c=mix(vec3(0.15,0.58,1.0),vec3(0.04,0.20,0.74),t*0.82);
      float vis=mix(0.075,0.040,smoothstep(0.38,1.0,t));
      float edgeFade=1.0-smoothstep(0.35,1.0,vEdge);
      gl_FragColor=vec4(c*f*vBr,f*vBr*vis*edgeFade);
    }`,
  vsOuter: `
    attribute vec2 aP; attribute float aSz,aBr,aZ;
    uniform float uRot,uRX,uAsp,uBright;
    varying float vBr,vEdge;
    void main(){
      ${TX}
      float r=length(aP);
      vEdge=smoothstep(0.3,1.0,r);
      vBr=aBr*uBright*(1.0-vEdge*0.85);
      gl_PointSize=max(20.0,aSz/(1.0+pz*0.085+0.46));
    }`,
  fsOuter: `
    precision mediump float;
    varying float vBr,vEdge;
    void main(){
      vec2 pc=gl_PointCoord-0.5; float r=length(pc)*2.0; if(r>1.0)discard;
      float f=1.0-smoothstep(0.0,1.0,pow(r,0.30));
      float edgeFade=1.0-smoothstep(0.3,1.0,vEdge);
      gl_FragColor=vec4(0.04,0.17,0.70,f*vBr*0.055*edgeFade);
    }`,
  vsCore: `
    attribute vec2 aP; attribute float aSz,aBr,aPh;
    uniform float uRX,uAsp,uTime,uPulse,uBright;
    varying float vBr,vD;
    void main(){
      float r=length(aP);
      float x=aP.x,y=aP.y,z=0.0;
      float ct=cos(${DISC_TILT.toFixed(5)}),st=sin(${DISC_TILT.toFixed(5)});
      float ty=y*ct-z*st,tz=y*st+z*ct;
      float rx=uRX*0.10472;
      float py=ty*cos(rx)-tz*sin(rx),pz=ty*sin(rx)+tz*cos(rx);
      float persp=1.0/(1.0+pz*0.085+0.46);
      float scl=1.0+sin(uTime*1.25)*0.018;
      vBr=aBr*(0.75+uPulse*(1.0-r/0.09)*0.22)*uBright;
      vD=r/0.09;
      gl_PointSize=max(0.5,aSz*scl*persp);
      gl_Position=vec4(x*persp/uAsp*${SC.toFixed(3)},py*persp*${SC.toFixed(3)}*${TILT_Y.toFixed(3)},0.0,1.0);
    }`,
  fsCore: `
    precision highp float;
    varying float vBr,vD;
    void main(){
      vec2 pc=gl_PointCoord-0.5; float d=length(pc)*2.0; if(d>1.0)discard;
      float f=1.0-smoothstep(0.0,1.0,pow(d,0.16));
      float halo=pow(1.0-d,3.0)*0.14;
      float bloom=pow(max(0.0,1.0-d*1.5),2.4)*0.22;
      float t=clamp(vD,0.0,1.0);
      vec3 col=mix(vec3(0.93,0.97,1.0),vec3(0.70,0.92,1.0),t*0.38);
      col=mix(col,vec3(0.25,0.68,1.0),t*t*0.50);
      gl_FragColor=vec4(col,clamp(f*vBr*0.70+halo+bloom,0.0,1.0));
    }`,
  vsBg: `
    attribute vec2 aP; attribute float aBr,aSz,aPh;
    uniform float uTime,uBright;
    varying float vBr,vTw,vAcc;
    void main(){
      vBr=aBr*uBright; vAcc=aSz>1.8?1.0:0.0;
      vTw=sin(uTime*1.55+aPh*6.2832)*0.5+0.5;
      gl_PointSize=aSz; gl_Position=vec4(aP,0.0,1.0);
    }`,
  fsBg: `
    precision mediump float;
    varying float vBr,vTw,vAcc;
    void main(){
      vec2 pc=gl_PointCoord-0.5; float d=length(pc)*2.0; if(d>1.0)discard;
      float f=1.0-smoothstep(0.0,0.88,d);
      float spike=0.0;
      if(vAcc>0.5){
        spike=(max(0.0,1.0-abs(pc.x)*26.0)*max(0.0,1.0-abs(pc.y)*78.0)
              +max(0.0,1.0-abs(pc.y)*26.0)*max(0.0,1.0-abs(pc.x)*78.0))*0.38;
      }
      float tw=vAcc>0.5?(0.50+vTw*0.50):1.0;
      vec3 col=mix(vec3(0.44,0.66,0.96),vec3(0.93,0.97,1.0),vBr);
      gl_FragColor=vec4(col,(f+spike)*vBr*0.32*tw);
    }`,
  vsDust: `attribute vec2 aP;attribute float aBr,aSz;varying float vBr;void main(){vBr=aBr;gl_PointSize=aSz;gl_Position=vec4(aP,0.0,1.0);}`,
  fsDust: `precision mediump float;varying float vBr;void main(){vec2 pc=gl_PointCoord-0.5;float d=length(pc)*2.0;if(d>1.0)discard;float f=1.0-smoothstep(0.0,1.0,d);gl_FragColor=vec4(0.07,0.23,0.80,f*vBr*0.10);}`,
  vsNeb:  `attribute vec2 aP;attribute float aSz,aBr,aC;varying float vBr,vC;void main(){vBr=aBr;vC=aC;gl_PointSize=aSz;gl_Position=vec4(aP,0.0,1.0);}`,
  fsNeb:  `precision mediump float;varying float vBr,vC;void main(){vec2 pc=gl_PointCoord-0.5;float r=length(pc)*2.0;if(r>1.0)discard;float f=1.0-smoothstep(0.0,1.0,pow(r,0.26));vec3 c=mix(vec3(0.04,0.14,0.65),vec3(0.09,0.33,0.86),vC);gl_FragColor=vec4(c*f*vBr,f*vBr*0.038);}`,
}

function spiralPos(arm, rIn) {
  const bAng = (arm / BRANCHES) * Math.PI * 2
  const sAng = rIn * SPIN * (Math.PI / BRANCHES)
  const ang  = bAng + sAng
  const cl   = Math.sin(rIn * 18 + arm * 2.3) * 0.022 + Math.sin(rIn * 37 + arm) * 0.009
  const sc   = 0.10 + rIn * 0.055
  const rf   = Math.pow(Math.random(), 2.4)
  const ox   = (Math.random() - 0.5) * sc * rf + cl
  const oy   = (Math.random() - 0.5) * sc * rf + cl * 0.7
  const oz   = (Math.random() - 0.5) * (0.030 + rIn * 0.075) * 2
  return [Math.cos(ang) * rIn + ox, Math.sin(ang) * rIn + oy, oz]
}

function buildData() {
  const sP=new Float32Array(NSTAR*2),sSz=new Float32Array(NSTAR)
  const sBr=new Float32Array(NSTAR),sT=new Float32Array(NSTAR)
  const sPh=new Float32Array(NSTAR),sZ=new Float32Array(NSTAR)
  for (let i = 0; i < NSTAR; i++) {
    const u = Math.random(); let px, py, pz = 0, t, br, sz
    if (u < 0.79) {
      const arm = Math.floor(Math.random() * BRANCHES)
      const rIn = Math.pow(Math.random(), 1.28) * 0.97 + 0.02
      ;[px, py, pz] = spiralPos(arm, rIn)
      t = Math.min(Math.sqrt(px*px + py*py), 0.99)
      br = (1.0 - t * 0.36) * (t > 0.68 ? 1.22 : 1.0)
      const q = Math.random()
      if (q > 0.981) sz = 4.6 + Math.random() * 2.4
      else if (q > 0.892) sz = 1.9 + Math.random() * 1.9
      else sz = 0.40 + Math.random() * 0.92
    } else if (u < 0.91) {
      const r = Math.pow(Math.random(), 1.7) * 0.99, a = Math.random() * Math.PI * 2
      px = Math.cos(a) * r; py = Math.sin(a) * r
      pz = (Math.random() - 0.5) * (0.015 + r * 0.035)
      t = r; br = Math.pow(1 - r, 3.0) * 0.26 + 0.04
      sz = Math.random() < 0.06 ? 2.3 + Math.random() * 1.4 : 0.38 + Math.random() * 0.72
    } else {
      const r = Math.pow(Math.random(), 4.8) * 0.08, a = Math.random() * Math.PI * 2
      px = Math.cos(a) * r; py = Math.sin(a) * r; pz = 0
      t = r / 0.08; br = 0.58 + Math.random() * 0.60; sz = 0.85 + Math.random() * 3.6
    }
    sP[i*2]=px; sP[i*2+1]=py; sSz[i]=sz; sBr[i]=br; sT[i]=t; sPh[i]=Math.random()*Math.PI*2; sZ[i]=pz
  }
  const clP=new Float32Array(NCLOUD*2),clSz=new Float32Array(NCLOUD)
  const clBr=new Float32Array(NCLOUD),clT=new Float32Array(NCLOUD),clZ=new Float32Array(NCLOUD)
  for (let i = 0; i < NCLOUD; i++) {
    const arm = Math.floor(Math.random() * BRANCHES)
    const rIn = Math.pow(Math.random(), 1.2) * 0.93 + 0.05
    const [px, py, pz] = spiralPos(arm, rIn)
    clP[i*2]=px; clP[i*2+1]=py
    clSz[i]=(0.26+Math.random()*0.54)*165; clBr[i]=0.24+Math.random()*0.44
    clT[i]=Math.min(Math.sqrt(px*px+py*py),0.99); clZ[i]=pz
  }
  const ouP=new Float32Array(NOUTR*2),ouSz=new Float32Array(NOUTR)
  const ouBr=new Float32Array(NOUTR),ouZ=new Float32Array(NOUTR)
  for (let i = 0; i < NOUTR; i++) {
    const arm = Math.floor(Math.random() * BRANCHES)
    const rIn = 0.55 + Math.pow(Math.random(), 1.05) * 0.45
    const [px, py, pz] = spiralPos(arm, rIn)
    ouP[i*2]=px; ouP[i*2+1]=py
    ouSz[i]=(0.38+Math.random()*0.60)*185; ouBr[i]=0.22+Math.random()*0.38; ouZ[i]=pz
  }
  const cP=new Float32Array(NC*2),cSz=new Float32Array(NC),cBr=new Float32Array(NC),cPh=new Float32Array(NC)
  for (let i = 0; i < NC; i++) {
    const a = Math.random()*Math.PI*2, r = Math.pow(Math.random(), 4.5)*0.09
    cP[i*2]=Math.cos(a)*r; cP[i*2+1]=Math.sin(a)*r
    const n = 1 - r / 0.09
    cSz[i]=0.7+n*n*17+Math.random()*4.2; cBr[i]=n*n*0.88+0.07; cPh[i]=Math.random()*Math.PI*2
  }
  const bP=new Float32Array(NBG*2),bBr=new Float32Array(NBG),bSz=new Float32Array(NBG),bPh=new Float32Array(NBG)
  for (let i = 0; i < NBG; i++) {
    bP[i*2]=(Math.random()-0.5)*2.18; bP[i*2+1]=(Math.random()-0.5)*2.18
    const q = Math.random()
    if (q < 0.006)       { bBr[i]=0.9+Math.random()*0.1; bSz[i]=3.2+Math.random()*2.0 }
    else if (q < 0.052)  { bBr[i]=0.48+Math.random()*0.38; bSz[i]=1.5+Math.random()*1.2 }
    else                 { bBr[i]=Math.pow(Math.random(),4.2)*0.46+0.03; bSz[i]=0.4+Math.random()*0.76 }
    bPh[i]=Math.random()*Math.PI*2
  }
  const dP=new Float32Array(NDUST*2),dBr=new Float32Array(NDUST),dSz=new Float32Array(NDUST)
  for (let i = 0; i < NDUST; i++) {
    const a = Math.random()*Math.PI*2, r = 0.48 + Math.pow(Math.random(), 0.56)*0.58
    dP[i*2]=Math.cos(a)*r; dP[i*2+1]=Math.sin(a)*r
    dBr[i]=Math.pow(Math.random(),3.2)*0.35+0.03; dSz[i]=1.5+Math.random()*3.2
  }
  const nP=new Float32Array(NNEB*2),nSz=new Float32Array(NNEB),nBr=new Float32Array(NNEB),nC=new Float32Array(NNEB)
  for (let i = 0; i < NNEB; i++) {
    const a = Math.random()*Math.PI*2, r = 0.25 + Math.random()*0.80
    nP[i*2]=Math.cos(a)*r*0.86; nP[i*2+1]=Math.sin(a)*r*0.50
    nSz[i]=130+Math.random()*230; nBr[i]=0.18+Math.random()*0.42; nC[i]=Math.random()
  }
  return { sP,sSz,sBr,sT,sPh,sZ,clP,clSz,clBr,clT,clZ,ouP,ouSz,ouBr,ouZ,cP,cSz,cBr,cPh,bP,bBr,bSz,bPh,dP,dBr,dSz,nP,nSz,nBr,nC }
}

function mkProg(gl, vs, fs) {
  const mkS = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s }
  const p = gl.createProgram()
  gl.attachShader(p, mkS(gl.VERTEX_SHADER, vs))
  gl.attachShader(p, mkS(gl.FRAGMENT_SHADER, fs))
  gl.linkProgram(p)
  return p
}
function mkBuf(gl, data) { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); return b }
function bAttr(gl, prog, name, buf, sz) { const l = gl.getAttribLocation(prog, name); if (l < 0) return; gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.vertexAttribPointer(l, sz, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(l) }
function u1f(gl, prog, name, val) { const l = gl.getUniformLocation(prog, name); if (l != null) gl.uniform1f(l, val) }

function AmbientGalaxy({ sidebarWidth = 320 }) {
  const canvasRef  = useRef(null)
  const mouseRef   = useRef({ x: 0.5, y: 0.5 })
  const hoverRef   = useRef(false)
  const brightRef  = useRef(0.62)

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
    const gl = cv.getContext('webgl', { antialias: true, premultipliedAlpha: false, alpha: true })
    if (!gl) { console.warn('WebGL not supported'); return }

    let W, H, T = 0, baseRot = 0, rafId

    function resize() {
      W = cv.width  = window.innerWidth
      H = cv.height = window.innerHeight
      gl.viewport(0, 0, W, H)
    }
    resize()
    window.addEventListener('resize', resize)

    const pStar  = mkProg(gl, SH.vsStar,  SH.fsStar)
    const pCloud = mkProg(gl, SH.vsCloud, SH.fsCloud)
    const pOuter = mkProg(gl, SH.vsOuter, SH.fsOuter)
    const pCore  = mkProg(gl, SH.vsCore,  SH.fsCore)
    const pBg    = mkProg(gl, SH.vsBg,    SH.fsBg)
    const pDust  = mkProg(gl, SH.vsDust,  SH.fsDust)
    const pNeb   = mkProg(gl, SH.vsNeb,   SH.fsNeb)

    const d = buildData()
    const bSP=mkBuf(gl,d.sP),bSSz=mkBuf(gl,d.sSz),bSBr=mkBuf(gl,d.sBr)
    const bST=mkBuf(gl,d.sT),bSPh=mkBuf(gl,d.sPh),bSZ=mkBuf(gl,d.sZ)
    const bCP=mkBuf(gl,d.clP),bCSz=mkBuf(gl,d.clSz),bCBr=mkBuf(gl,d.clBr)
    const bCT=mkBuf(gl,d.clT),bCZ=mkBuf(gl,d.clZ)
    const bOP=mkBuf(gl,d.ouP),bOSz=mkBuf(gl,d.ouSz),bOBr=mkBuf(gl,d.ouBr),bOZ=mkBuf(gl,d.ouZ)
    const bcP=mkBuf(gl,d.cP),bcSz=mkBuf(gl,d.cSz),bcBr=mkBuf(gl,d.cBr),bcPh=mkBuf(gl,d.cPh)
    const bBP=mkBuf(gl,d.bP),bBBr=mkBuf(gl,d.bBr),bBSz=mkBuf(gl,d.bSz),bBPh=mkBuf(gl,d.bPh)
    const bDP=mkBuf(gl,d.dP),bDBr=mkBuf(gl,d.dBr),bDSz=mkBuf(gl,d.dSz)
    const bNP=mkBuf(gl,d.nP),bNSz=mkBuf(gl,d.nSz),bNBr=mkBuf(gl,d.nBr),bNC=mkBuf(gl,d.nC)

    gl.enable(gl.BLEND)

    function draw() {
      T += 0.011
      const targetBright = hoverRef.current ? 0.85 : 0.62
      brightRef.current += (targetBright - brightRef.current) * 0.035
      const mx = mouseRef.current.x
      baseRot += ROT_SPEED + (mx - 0.5) * 0.000018
      const asp   = W / H
      const pulse = Math.sin(T * 1.22) * 0.075
      const bright = brightRef.current
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      const ndcX = 0.36, ndcY = 0.10
      const vpX = Math.round(ndcX * W * 0.5), vpY = Math.round(ndcY * H * 0.5)
      gl.viewport(-vpX, -vpY, W, H)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
      gl.useProgram(pBg)
      bAttr(gl,pBg,'aP',bBP,2);bAttr(gl,pBg,'aBr',bBBr,1);bAttr(gl,pBg,'aSz',bBSz,1);bAttr(gl,pBg,'aPh',bBPh,1)
      u1f(gl,pBg,'uTime',T);u1f(gl,pBg,'uBright',bright*0.55)
      gl.drawArrays(gl.POINTS, 0, NBG)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE)
      gl.useProgram(pNeb)
      bAttr(gl,pNeb,'aP',bNP,2);bAttr(gl,pNeb,'aSz',bNSz,1);bAttr(gl,pNeb,'aBr',bNBr,1);bAttr(gl,pNeb,'aC',bNC,1)
      gl.drawArrays(gl.POINTS, 0, NNEB)
      gl.useProgram(pDust)
      bAttr(gl,pDust,'aP',bDP,2);bAttr(gl,pDust,'aBr',bDBr,1);bAttr(gl,pDust,'aSz',bDSz,1)
      gl.drawArrays(gl.POINTS, 0, NDUST)
      gl.useProgram(pOuter)
      bAttr(gl,pOuter,'aP',bOP,2);bAttr(gl,pOuter,'aSz',bOSz,1);bAttr(gl,pOuter,'aBr',bOBr,1);bAttr(gl,pOuter,'aZ',bOZ,1)
      u1f(gl,pOuter,'uRot',baseRot);u1f(gl,pOuter,'uRX',FIXED_RX);u1f(gl,pOuter,'uAsp',asp);u1f(gl,pOuter,'uBright',bright)
      gl.drawArrays(gl.POINTS, 0, NOUTR)
      gl.useProgram(pCloud)
      bAttr(gl,pCloud,'aP',bCP,2);bAttr(gl,pCloud,'aSz',bCSz,1);bAttr(gl,pCloud,'aBr',bCBr,1);bAttr(gl,pCloud,'aT',bCT,1);bAttr(gl,pCloud,'aZ',bCZ,1)
      u1f(gl,pCloud,'uRot',baseRot);u1f(gl,pCloud,'uRX',FIXED_RX);u1f(gl,pCloud,'uAsp',asp);u1f(gl,pCloud,'uTime',T);u1f(gl,pCloud,'uBright',bright)
      gl.drawArrays(gl.POINTS, 0, NCLOUD)
      gl.useProgram(pStar)
      bAttr(gl,pStar,'aP',bSP,2);bAttr(gl,pStar,'aSz',bSSz,1);bAttr(gl,pStar,'aBr',bSBr,1);bAttr(gl,pStar,'aT',bST,1);bAttr(gl,pStar,'aPh',bSPh,1);bAttr(gl,pStar,'aZ',bSZ,1)
      u1f(gl,pStar,'uRot',baseRot);u1f(gl,pStar,'uRX',FIXED_RX);u1f(gl,pStar,'uAsp',asp);u1f(gl,pStar,'uTime',T);u1f(gl,pStar,'uPulse',pulse);u1f(gl,pStar,'uBright',bright)
      gl.drawArrays(gl.POINTS, 0, NSTAR)
      gl.useProgram(pCore)
      bAttr(gl,pCore,'aP',bcP,2);bAttr(gl,pCore,'aSz',bcSz,1);bAttr(gl,pCore,'aBr',bcBr,1);bAttr(gl,pCore,'aPh',bcPh,1)
      u1f(gl,pCore,'uRX',FIXED_RX);u1f(gl,pCore,'uAsp',asp);u1f(gl,pCore,'uTime',T);u1f(gl,pCore,'uPulse',pulse);u1f(gl,pCore,'uBright',bright)
      gl.drawArrays(gl.POINTS, 0, NC)
      rafId = requestAnimationFrame(draw)
    }
    rafId = requestAnimationFrame(draw)

    const onMM = e => { mouseRef.current = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight } }
    const onME = () => { hoverRef.current = true }
    const onML = () => { hoverRef.current = false }
    window.addEventListener('mousemove', onMM)
    cv.addEventListener('mouseenter', onME)
    cv.addEventListener('mouseleave', onML)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMM)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', top: 0, left: 0,
        width: '100%', height: '100%',
        zIndex: 1, pointerEvents: 'none', background: 'transparent',
      }}
    />
  )
}

// ═══════════════════════════════════════════════════════════════
// PREMIUM RIGHT PANEL - orrery + constellation art
// ═══════════════════════════════════════════════════════════════
function PremiumRightPanel() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf

    function init() {
      const W = canvas.offsetWidth || 520
      const H = canvas.offsetHeight || window.innerHeight
      const dpr = window.devicePixelRatio || 1
      canvas.width  = W * dpr
      canvas.height = H * dpr
      ctx.scale(dpr, dpr)

      const field = Array.from({ length: 300 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        r: 0.3 + Math.random() * 0.9, op: 0.06 + Math.random() * 0.22,
        tw: Math.random() * Math.PI * 2, twS: 0.002 + Math.random() * 0.005,
      }))

      const armStars = []
      for (let i = 0; i < 80; i++) {
        const t = i / 80
        const ang = -Math.PI * 0.12 + t * Math.PI * 0.58
        const rad = W * 0.26 + t * W * 0.30
        armStars.push({
          x: W * 0.72 + Math.cos(ang) * rad * 0.52 + (Math.random() - 0.5) * 26,
          y: H * 0.30 + Math.sin(ang) * rad * 0.40 + (Math.random() - 0.5) * 16,
          r: 0.5 + Math.random() * 1.7, op: 0.18 + t * 0.58,
          tw: Math.random() * Math.PI * 2, twS: 0.001 + Math.random() * 0.004,
        })
      }
      for (let i = 0; i < 50; i++) {
        const t = i / 50
        const ang = Math.PI * 0.28 + t * Math.PI * 0.42
        const rad = W * 0.16 + t * W * 0.26
        armStars.push({
          x: W * 0.66 + Math.cos(ang) * rad * 0.58 + (Math.random() - 0.5) * 18,
          y: H * 0.56 + Math.sin(ang) * rad * 0.42 + (Math.random() - 0.5) * 12,
          r: 0.4 + Math.random() * 1.3, op: 0.14 + t * 0.42,
          tw: Math.random() * Math.PI * 2, twS: 0.001 + Math.random() * 0.004,
        })
      }

      const highlights = [
        { x: W * 0.78, y: H * 0.22, r: 3.2, op: 0.90, tw: 0,   twS: 0.003 },
        { x: W * 0.55, y: H * 0.38, r: 2.6, op: 0.80, tw: 1.0, twS: 0.004 },
        { x: W * 0.88, y: H * 0.48, r: 2.0, op: 0.75, tw: 2.0, twS: 0.005 },
        { x: W * 0.62, y: H * 0.65, r: 2.3, op: 0.70, tw: 0.5, twS: 0.003 },
        { x: W * 0.73, y: H * 0.72, r: 1.7, op: 0.62, tw: 1.5, twS: 0.006 },
        { x: W * 0.44, y: H * 0.55, r: 1.9, op: 0.58, tw: 2.5, twS: 0.004 },
        { x: W * 0.92, y: H * 0.32, r: 1.5, op: 0.68, tw: 0.8, twS: 0.005 },
      ]

      const lineStars = [...armStars, ...highlights]
      const lines = []
      for (let a = 0; a < lineStars.length; a++) {
        const nearest = []
        for (let b = 0; b < lineStars.length; b++) {
          if (a === b) continue
          const dx = lineStars[a].x - lineStars[b].x, dy = lineStars[a].y - lineStars[b].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 85) nearest.push({ b, dist })
        }
        nearest.sort((a, b) => a.dist - b.dist)
        nearest.slice(0, 2).forEach(n => {
          if (!lines.find(l => (l.a === n.b && l.b === a) || (l.a === a && l.b === n.b)))
            lines.push({ a, b: n.b, dist: n.dist })
        })
      }

      let T = 0

      function draw() {
        ctx.clearRect(0, 0, W, H)

        const neb1 = ctx.createRadialGradient(W * 0.75, H * 0.30, 0, W * 0.75, H * 0.30, W * 0.32)
        neb1.addColorStop(0, 'rgba(20,80,200,0.13)')
        neb1.addColorStop(0.5, 'rgba(60,20,160,0.07)')
        neb1.addColorStop(1, 'transparent')
        ctx.fillStyle = neb1; ctx.fillRect(0, 0, W, H)

        const neb2 = ctx.createRadialGradient(W * 0.60, H * 0.60, 0, W * 0.60, H * 0.60, W * 0.22)
        neb2.addColorStop(0, 'rgba(80,30,180,0.09)')
        neb2.addColorStop(1, 'transparent')
        ctx.fillStyle = neb2; ctx.fillRect(0, 0, W, H)

        lines.forEach(l => {
          const pa = lineStars[l.a], pb = lineStars[l.b]
          const op = Math.min(0.16, (1 - l.dist / 85) * 0.20)
          ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y)
          ctx.strokeStyle = `rgba(140,190,255,${op})`; ctx.lineWidth = 0.6; ctx.stroke()
        })

        field.forEach(s => {
          const tw = Math.sin(T * s.twS * 1000 + s.tw) * 0.5 + 0.5
          const alpha = s.op * (0.3 + tw * 0.7)
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(220,235,255,${alpha})`; ctx.fill()
        })

        armStars.forEach(s => {
          const tw = Math.sin(T * s.twS * 1000 + s.tw) * 0.5 + 0.5
          const alpha = s.op * (0.35 + tw * 0.65)
          const gr = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r)
          gr.addColorStop(0, `rgba(220,235,255,${alpha})`)
          gr.addColorStop(1, `rgba(140,180,255,${alpha * 0.25})`)
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
          ctx.fillStyle = gr; ctx.fill()
        })

        highlights.forEach(s => {
          const tw = Math.sin(T * s.twS * 1000 + s.tw) * 0.5 + 0.5
          const alpha = s.op * (0.45 + tw * 0.55)
          const r = s.r * (1 + tw * 0.35)

          ctx.save()
          ctx.strokeStyle = `rgba(210,230,255,${alpha * 0.65})`; ctx.lineWidth = 0.5
          ctx.beginPath(); ctx.moveTo(s.x - r * 3.2, s.y); ctx.lineTo(s.x + r * 3.2, s.y); ctx.stroke()
          ctx.beginPath(); ctx.moveTo(s.x, s.y - r * 3.2); ctx.lineTo(s.x, s.y + r * 3.2); ctx.stroke()
          ctx.strokeStyle = `rgba(210,230,255,${alpha * 0.28})`
          ctx.beginPath(); ctx.moveTo(s.x - r * 2, s.y - r * 2); ctx.lineTo(s.x + r * 2, s.y + r * 2); ctx.stroke()
          ctx.beginPath(); ctx.moveTo(s.x + r * 2, s.y - r * 2); ctx.lineTo(s.x - r * 2, s.y + r * 2); ctx.stroke()
          ctx.restore()

          const gw = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 5)
          gw.addColorStop(0, `rgba(200,225,255,${alpha * 0.45})`)
          gw.addColorStop(0.4, `rgba(160,200,255,${alpha * 0.18})`)
          gw.addColorStop(1, 'transparent')
          ctx.beginPath(); ctx.arc(s.x, s.y, r * 5, 0, Math.PI * 2)
          ctx.fillStyle = gw; ctx.fill()

          const gr = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r)
          gr.addColorStop(0, `rgba(255,255,255,${alpha})`)
          gr.addColorStop(0.5, `rgba(200,228,255,${alpha * 0.75})`)
          gr.addColorStop(1, `rgba(140,190,255,${alpha * 0.2})`)
          ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2)
          ctx.fillStyle = gr; ctx.fill()
        })

        T += 16
        raf = requestAnimationFrame(draw)
      }
      draw()
    }

    init()

    const onResize = () => {
      if (raf) cancelAnimationFrame(raf)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      init()
    }
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
  }, [])

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0,
      width: 520, height: '100vh',
      zIndex: 2, pointerEvents: 'none', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 380px 500px at 78% 42%, rgba(20,60,180,0.16) 0%, rgba(60,20,160,0.08) 40%, transparent 70%)',
        animation: 'nebulaShift 9s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 260px 340px at 85% 27%, rgba(0,180,255,0.10) 0%, transparent 65%)',
        animation: 'nebulaShift 13s ease-in-out infinite reverse',
      }} />

      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

      <div style={{
        position: 'absolute', top: '50%', right: 70,
        transform: 'translateY(-50%)',
        width: 1, height: 1,
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: 16, height: 16,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #fff 0%, #b8dcff 45%, rgba(100,180,255,0.2) 100%)',
          boxShadow: '0 0 14px rgba(160,220,255,0.85), 0 0 36px rgba(80,160,255,0.45), 0 0 70px rgba(40,120,255,0.18)',
          zIndex: 10,
        }} />
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            position: 'absolute', top: 0, left: 0,
            width: 16, height: 16, borderRadius: '50%',
            border: '1px solid rgba(160,220,255,0.5)',
            transform: 'translate(-50%, -50%)',
            animation: `ringPulse 3s ease-out ${i}s infinite`,
          }} />
        ))}

        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: 180, height: 180,
          transform: 'translate(-50%, -50%) rotateX(72deg) rotateZ(-15deg)',
          borderRadius: '50%',
          border: '1px solid rgba(0,180,255,0.16)',
        }}>
          <div style={{
            position: 'absolute', top: -4, left: 'calc(50% - 4px)',
            width: 8, height: 8, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(160,220,255,1), rgba(80,160,255,0.4))',
            boxShadow: '0 0 10px rgba(140,200,255,0.85), 0 0 22px rgba(80,150,255,0.4)',
            transformOrigin: '4px 94px',
            animation: 'orbitSpin 12s linear infinite',
          }} />
        </div>

        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: 280, height: 280,
          transform: 'translate(-50%, -50%) rotateX(68deg) rotateZ(25deg)',
          borderRadius: '50%',
          border: '1px solid rgba(100,100,255,0.12)',
        }}>
          <div style={{
            position: 'absolute', top: -5, left: 'calc(50% - 5px)',
            width: 10, height: 10, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(190,160,255,1), rgba(130,80,230,0.45))',
            boxShadow: '0 0 10px rgba(190,150,255,0.85), 0 0 22px rgba(130,80,220,0.45)',
            transformOrigin: '5px 145px',
            animation: 'orbitSpin 22s linear infinite',
          }} />
        </div>

        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: 400, height: 400,
          transform: 'translate(-50%, -50%) rotateX(66deg) rotateZ(-40deg)',
          borderRadius: '50%',
          border: '1px solid rgba(0,150,220,0.09)',
        }}>
          <div style={{
            position: 'absolute', top: -4, left: 'calc(50% - 4px)',
            width: 8, height: 8, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,190,110,1), rgba(220,130,40,0.45))',
            boxShadow: '0 0 8px rgba(255,185,100,0.85), 0 0 18px rgba(220,130,40,0.45)',
            transformOrigin: '4px 204px',
            animation: 'orbitSpin 34s linear infinite reverse',
          }} />
        </div>
      </div>

      {[
        { label: 'cos sim', value: '0.847', icon: 'data_object', color: '#00ccff', top: '18%', right: '28%', delay: '0s' },
        { label: 'cluster',  value: 'Ψ-4A', icon: 'hub',         color: '#a78bfa', top: '36%', right: '8%',  delay: '0.5s' },
        { label: 'entropy',  value: '1.32', icon: 'compress',    color: '#00ff0f', top: '62%', right: '22%', delay: '1s'   },
        { label: 'rank',     value: '#3',   icon: 'leaderboard', color: '#f59e0b', top: '76%', right: '10%', delay: '1.5s' },
      ].map((item) => (
        <div key={item.label} style={{
          position: 'absolute', top: item.top, right: item.right,
          background: 'rgba(10,10,30,0.72)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10,
          padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8,
          animation: `floatBadge 4s ease-in-out ${item.delay} infinite`,
        }}>
          <Icon name={item.icon} style={{ fontSize: 16, color: item.color }} />
          <div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{item.label}</div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 700, color: item.color }}>{item.value}</div>
          </div>
        </div>
      ))}

      <div style={{ position: 'absolute', top: 0, left: 0, width: 160, height: '100%', background: 'linear-gradient(90deg, #0a0a1e 0%, transparent 100%)', zIndex: 20 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(0deg, #0a0a1e 0%, transparent 100%)', zIndex: 20 }} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// CORNER INFO CARD
// ═══════════════════════════════════════════════════════════════
function CornerInfoCard() {
  const [show, setShow] = useState(false)
  if (!show) {
    return (
      <button onClick={() => setShow(true)} style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 50,
        width: 38, height: 38, borderRadius: '50%',
        background: 'rgba(10,10,30,0.85)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(0,204,255,0.3)', color: C.cyan, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 15px rgba(0,204,255,0.2)',
      }} title="How is this different from Knowledge Graph?">
        <Icon name="info" style={{ fontSize: 18, color: C.cyan }} />
      </button>
    )
  }
  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 50, width: 290,
      background: 'rgba(10,8,22,0.96)', backdropFilter: 'blur(20px)',
      border: '1px solid rgba(0,204,255,0.25)', borderRadius: 14, padding: 16,
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)', animation: 'fadeSlideUp 0.3s ease',
    }}>
      <button onClick={() => setShow(false)} style={{
        position: 'absolute', top: 8, right: 10, background: 'none', border: 'none',
        color: '#666', cursor: 'pointer',
      }}>
        <Icon name="close" style={{ fontSize: 16, color: '#667' }} />
      </button>
      <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon name="compare_arrows" style={{ fontSize: 16, color: C.cyan }} />
        Constellation vs Graph
      </div>
      {[
        ['This page (Constellation)', 'Knowledge Graph'],
        ['Shows search results for a query', 'Shows all your research topics'],
        ['Stars = search matches', 'Nodes = topics/claims/arguments'],
        ['Brighter = better match', 'Bigger = more researched'],
        ['Click → see that research', 'Click → explore connections'],
        ['Data: Pinecone vectors', 'Data: Neo4j relationships'],
      ].map((row, i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
          padding: i === 0 ? '6px 0' : '5px 0',
          borderBottom: i === 0 ? `1px solid ${C.white5}` : 'none',
          marginBottom: i === 0 ? 6 : 0,
        }}>
          <span style={{
            fontFamily: i === 0 ? "'JetBrains Mono',monospace" : "'Hanken Grotesk',sans-serif",
            fontSize: i === 0 ? 10 : 11,
            color: i === 0 ? C.cyan : '#c8d6e5',
            fontWeight: i === 0 ? 700 : 400,
            textTransform: i === 0 ? 'uppercase' : 'none',
            letterSpacing: i === 0 ? '0.05em' : 0,
          }}>{row[0]}</span>
          <span style={{
            fontFamily: i === 0 ? "'JetBrains Mono',monospace" : "'Hanken Grotesk',sans-serif",
            fontSize: i === 0 ? 10 : 11,
            color: i === 0 ? '#a855f7' : '#8899aa',
            fontWeight: i === 0 ? 700 : 400,
            textTransform: i === 0 ? 'uppercase' : 'none',
            letterSpacing: i === 0 ? '0.05em' : 0,
          }}>{row[1]}</span>
        </div>
      ))}
      <div style={{
        marginTop: 10, paddingTop: 8, borderTop: `1px solid ${C.white5}`,
        fontSize: 10, color: '#667788', lineHeight: 1.5,
        display: 'flex', alignItems: 'flex-start', gap: 6,
        fontFamily: "'Hanken Grotesk',sans-serif",
      }}>
        <Icon name="lightbulb" style={{ fontSize: 14, color: C.cyan, flexShrink: 0, marginTop: 1 }} />
        <span>
          <strong style={{ color: C.cyan }}>Search</strong> to find past research.{' '}
          <strong style={{ color: '#a855f7' }}>Graph</strong> to explore connections.
        </span>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// VECTOR NODE COUNT - bottom-left corner badge (live API call)
// ═══════════════════════════════════════════════════════════════
function VectorNodeBadge({ sidebarWidth }) {
  const [count, setCount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let mounted = true
    const fetchCount = async () => {
      setLoading(true); setError(false)
      try {
        const token = window.__POLYNOUS_ACCESS_TOKEN__ || 
              localStorage.getItem('polynous_token') || '';

const res = await fetch(`${API_BASE_URL}/stats/vector-count`, {
    headers: {
        'Authorization': token ? `Bearer ${token}` : ''
    }
})
        if (!mounted) return
        if (res.ok) {
          const data = await res.json()
          setCount(data.count ?? data.total ?? data.vector_count ?? null)
        } else {
          setError(true)
        }
      } catch {
        if (mounted) setError(true)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchCount()
    // Refresh every 60 seconds
    const interval = setInterval(fetchCount, 60000)
    return () => { mounted = false; clearInterval(interval) }
  }, [])

  const formatCount = n => {
    if (n === null) return ' - '
    if (n >= 1000000) return `${(n / 1000000).toFixed(2)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return n.toString()
  }

  return (
    <div
      onClick={() => setExpanded(e => !e)}
      style={{
        position: 'fixed',
        bottom: 20,
        left: sidebarWidth + 16,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: expanded ? 10 : 8,
        background: 'rgba(10,8,22,0.88)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${error ? 'rgba(255,32,64,0.3)' : 'rgba(0,204,255,0.22)'}`,
        borderRadius: expanded ? 14 : 50,
        padding: expanded ? '10px 16px' : '8px 14px',
        cursor: 'pointer',
        boxShadow: error
          ? '0 0 18px rgba(255,32,64,0.12)'
          : '0 0 18px rgba(0,204,255,0.10), 0 2px 12px rgba(0,0,0,0.4)',
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
        userSelect: 'none',
        minWidth: expanded ? 180 : 'unset',
      }}
    >
      {/* Pulse dot */}
      <div style={{
        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
        background: error ? C.crimson : loading ? '#f59e0b' : C.cyan,
        boxShadow: error
          ? `0 0 8px ${C.crimson}`
          : loading
            ? '0 0 8px #f59e0b'
            : `0 0 8px ${C.cyan}`,
        animation: loading ? 'shimmer 1s ease-in-out infinite' : error ? 'none' : 'shimmer 2.5s ease-in-out infinite',
      }} />

      {/* Collapsed view */}
      {!expanded && (
        <>
          <Icon name="scatter_plot" style={{ fontSize: 14, color: error ? C.crimson : C.cyan, flexShrink: 0 }} />
          <span style={{
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: 13, fontWeight: 700,
            color: error ? C.crimson : loading ? '#f59e0b' : C.cyan,
            letterSpacing: '-0.02em',
          }}>
            {loading ? '···' : error ? 'ERR' : formatCount(count)}
          </span>
          <span style={{
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: 9, color: C.textSecondary,
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            nodes
          </span>
        </>
      )}

      {/* Expanded view */}
      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="scatter_plot" style={{ fontSize: 16, color: error ? C.crimson : C.cyan }} />
            <span style={{
              fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 800,
              color: error ? C.crimson : C.cyan, letterSpacing: '-0.03em',
              lineHeight: 1,
            }}>
              {loading ? '···' : error ? 'Offline' : formatCount(count)}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontFamily: "'JetBrains Mono',monospace", fontSize: 9,
              color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '0.12em',
            }}>
              {error ? 'vector index unreachable' : loading ? 'fetching index…' : 'vector nodes indexed'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}
function lerp(a, b, t) { return a + (b - a) * t }
function easeOut(t) { return 1 - Math.pow(1 - t, 3) }

// ═══════════════════════════════════════════════════════════════
// NEURAL CONSTELLATION CANVAS
// ═══════════════════════════════════════════════════════════════
function NeuralConstellation({ results = [], filter = 'all', onStarClick, onFilterChange }) {
  const canvasRef = useRef(null)
  const stateRef  = useRef({
    stars: [], bgStars: [], particles: [],
    hoveredStar: null, selectedStar: null,
    animTime: 0, burstProgress: 1, burstActive: false,
    W: 0, H: 0, cx: 0, cy: 0, mouseX: 0, mouseY: 0, rafId: null,
  })
  const [tooltip, setTooltip]     = useState(null)
  const [detail, setDetail]       = useState(null)
  const [activeFilter, setActiveFilter] = useState(filter)

  const resize = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const s = stateRef.current, rect = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr; canvas.height = rect.height * dpr
    canvas.getContext('2d').scale(dpr, dpr)
    s.W = rect.width; s.H = rect.height; s.cx = rect.width / 2; s.cy = rect.height / 2
    s.bgStars = Array.from({ length: 45 }, () => ({
      x: Math.random() * s.W, y: Math.random() * s.H,
      r: 0.5 + Math.random() * 1.2, op: 0.1 + Math.random() * 0.3,
      twinkle: Math.random() * Math.PI * 2,
    }))
  }, [])

  const makeStars = useCallback((res, fil) => {
    const s = stateRef.current
    const filtered = res.filter(r => fil === 'all' || r.mode === fil)
    s.stars = filtered.map((r, i) => {
      const color      = r.mode === 'research' ? C.green : C.crimson
      const radius     = 8 + (r.confidence / 100) * 20
      const brightness = 0.35 + (r.score / 100) * 0.65
      const angle      = i * 2.39996
      const rad        = 60 + (i / Math.max(filtered.length, 1)) * Math.min(s.cx, s.cy) * 1.5
      return {
        ...r, color, radius, brightness,
        tx: s.cx + Math.cos(angle) * rad, ty: s.cy + Math.sin(angle) * rad * 0.7,
        x: s.cx, y: s.cy,
        phase: Math.random() * Math.PI * 2,
        drift: { x: 0, y: 0, vx: (Math.random() - 0.5) * 0.015, vy: (Math.random() - 0.5) * 0.015 },
        hovered: false, selected: false,
        rings: [{ r: 0, op: 1 }, { r: 0, op: 0.6 }],
      }
    })
    s.particles = []
    for (let a = 0; a < s.stars.length; a++) {
      for (let b = a + 1; b < s.stars.length; b++) {
        const dx = s.stars[a].tx - s.stars[b].tx, dy = s.stars[a].ty - s.stars[b].ty
        if (Math.sqrt(dx * dx + dy * dy) < 180) {
          for (let p = 0; p < 2; p++) s.particles.push({ a, b, t: Math.random(), speed: 0.0003 + Math.random() * 0.0004 })
        }
      }
    }
    s.selectedStar = null; setDetail(null); s.burstProgress = 0; s.burstActive = true
  }, [])

  const startLoop = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'), s = stateRef.current
    function frame() {
      ctx.clearRect(0, 0, s.W, s.H); ctx.fillStyle = C.void; ctx.fillRect(0, 0, s.W, s.H)
      const g = ctx.createRadialGradient(s.cx, s.cy, 0, s.cx, s.cy, 160)
      g.addColorStop(0, 'rgba(0,100,200,0.06)'); g.addColorStop(0.5, 'rgba(100,0,200,0.04)'); g.addColorStop(1, 'transparent')
      ctx.fillStyle = g; ctx.fillRect(0, 0, s.W, s.H)
      ctx.save(); ctx.strokeStyle = 'rgba(0,204,255,0.08)'; ctx.lineWidth = 0.5
      ;[80, 160, 240].forEach(r => { ctx.beginPath(); ctx.arc(s.cx, s.cy, r, 0, Math.PI * 2); ctx.stroke() })
      ctx.beginPath(); ctx.moveTo(0, s.cy); ctx.lineTo(s.W, s.cy); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(s.cx, 0); ctx.lineTo(s.cx, s.H); ctx.stroke()
      ctx.restore()
      s.bgStars.forEach(bs => {
        ctx.beginPath(); ctx.arc(bs.x, bs.y, bs.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${bs.op + Math.sin(s.animTime * 0.001 + bs.twinkle) * 0.05})`; ctx.fill()
      })
      if (s.burstActive && s.burstProgress < 1) {
        s.burstProgress = Math.min(1, s.burstProgress + 0.018)
        if (s.burstProgress >= 1) s.burstActive = false
      }
      const ep = easeOut(s.burstProgress)
      s.stars.forEach(star => {
        star.x = lerp(s.cx, star.tx + star.drift.x, ep)
        star.y = lerp(s.cy, star.ty + star.drift.y, ep)
        if (!s.burstActive) {
          star.drift.x += star.drift.vx; star.drift.y += star.drift.vy
          if (Math.abs(star.drift.x) > 3) star.drift.vx *= -1
          if (Math.abs(star.drift.y) > 3) star.drift.vy *= -1
        }
      })
      for (let a = 0; a < s.stars.length; a++) {
        for (let b = a + 1; b < s.stars.length; b++) {
          const sa = s.stars[a], sb = s.stars[b], dx = sa.x - sb.x, dy = sa.y - sb.y
          if (Math.sqrt(dx * dx + dy * dy) >= 180) continue
          const hov = sa.hovered || sb.hovered || sa === s.selectedStar || sb === s.selectedStar
          ctx.beginPath(); ctx.moveTo(sa.x, sa.y); ctx.lineTo(sb.x, sb.y)
          ctx.strokeStyle = hov ? 'rgba(0,204,255,0.35)' : 'rgba(0,204,255,0.12)'
          ctx.lineWidth = hov ? 1.5 : 0.8; ctx.globalAlpha = ep; ctx.stroke(); ctx.globalAlpha = 1
        }
      }
      s.particles.forEach(p => {
        p.t += p.speed * 16; if (p.t > 1) p.t = 0
        const sa = s.stars[p.a], sb = s.stars[p.b]; if (!sa || !sb) return
        const dx = sa.x - sb.x, dy = sa.y - sb.y; if (Math.sqrt(dx * dx + dy * dy) > 180) return
        ctx.beginPath(); ctx.arc(lerp(sa.x, sb.x, p.t), lerp(sa.y, sb.y, p.t), 1.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(200,240,255,${0.7 * ep})`; ctx.fill()
      })
      s.stars.forEach(star => {
        const pulse  = Math.sin(s.animTime * 0.003 + star.phase) * 2
        const r      = star.radius + (star.hovered ? star.radius * 0.35 : 0) + pulse
        const glowR  = r * (star.hovered ? 3 : 2.5), alpha = star.brightness * ep
        const { r: cr, g: cg, b: cb } = hexToRgb(star.color)
        const gw = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, glowR)
        gw.addColorStop(0, `rgba(${cr},${cg},${cb},${0.4 * alpha})`); gw.addColorStop(1, 'transparent')
        ctx.beginPath(); ctx.arc(star.x, star.y, glowR, 0, Math.PI * 2); ctx.fillStyle = gw; ctx.fill()
        ctx.beginPath(); ctx.arc(star.x, star.y, r + 2, 0, Math.PI * 2); ctx.fillStyle = `rgba(${cr},${cg},${cb},${0.7 * alpha})`; ctx.fill()
        ctx.beginPath(); ctx.arc(star.x, star.y, r, 0, Math.PI * 2); ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`; ctx.fill()
        ctx.beginPath(); ctx.arc(star.x, star.y, star.hovered ? 4 : 2.5, 0, Math.PI * 2); ctx.fillStyle = `rgba(255,255,255,${0.9 * alpha})`; ctx.fill()
        if (star === s.selectedStar) {
          star.rings.forEach(ring => {
            ring.r += 0.4; ring.op -= 0.008; if (ring.op <= 0) { ring.r = 0; ring.op = 0.8 }
            ctx.beginPath(); ctx.arc(star.x, star.y, r + ring.r, 0, Math.PI * 2)
            ctx.strokeStyle = `rgba(${cr},${cg},${cb},${ring.op})`; ctx.lineWidth = 1.5; ctx.stroke()
          })
        }
      })
      s.animTime += 16; s.rafId = requestAnimationFrame(frame)
    }
    if (s.rafId) cancelAnimationFrame(s.rafId); s.rafId = requestAnimationFrame(frame)
  }, [])

  useEffect(() => {
    resize(); startLoop()
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      if (stateRef.current.rafId) cancelAnimationFrame(stateRef.current.rafId)
    }
  }, [resize, startLoop])

  useEffect(() => {
    const s = stateRef.current
    if (s.W > 0) makeStars(results, activeFilter)
  }, [results, activeFilter, makeStars])

  const handleMouseMove = useCallback(e => {
    const canvas = canvasRef.current; if (!canvas) return
    const s = stateRef.current, rect = canvas.getBoundingClientRect()
    s.mouseX = e.clientX - rect.left; s.mouseY = e.clientY - rect.top
    s.hoveredStar = null; s.stars.forEach(st => st.hovered = false)
    for (let i = s.stars.length - 1; i >= 0; i--) {
      const st = s.stars[i], dx = st.x - s.mouseX, dy = st.y - s.mouseY
      if (Math.sqrt(dx * dx + dy * dy) < st.radius + 12) {
        st.hovered = true; s.hoveredStar = st
        setTooltip({ star: st, cx: e.clientX, cy: e.clientY })
        return
      }
    }
    setTooltip(null)
  }, [])

  const handleClick = useCallback(e => {
    const canvas = canvasRef.current; if (!canvas) return
    const s = stateRef.current, rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    let clicked = null
    for (let i = s.stars.length - 1; i >= 0; i--) {
      const st = s.stars[i], dx = st.x - mx, dy = st.y - my
      if (Math.sqrt(dx * dx + dy * dy) < st.radius + 12) { clicked = st; break }
    }
    s.stars.forEach(st => st.selected = false)
    if (clicked && clicked !== s.selectedStar) {
      s.selectedStar = clicked; clicked.selected = true
      clicked.rings = [{ r: 0, op: 1 }, { r: 0, op: 0.6 }]
      setDetail(clicked); onStarClick?.(clicked)
    } else {
      s.selectedStar = null; setDetail(null)
    }
  }, [onStarClick])

  const filterBtnStyle = f => {
    const active = activeFilter === f
    const accent = f === 'all' ? C.cyan : f === 'research' ? C.green : C.crimson
    return {
      padding: '5px 16px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
      fontFamily: 'inherit', transition: 'all 0.2s',
      background: active ? `${accent}22` : 'transparent',
      border: `1px solid ${active ? accent + '80' : accent + '33'}`,
      color: active ? accent : `${accent}66`,
    }
  }

  return (
    <div style={{ background: C.void, borderRadius: 16, overflow: 'hidden', fontFamily: 'system-ui,sans-serif' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: 420, cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onMouseLeave={() => {
          const s = stateRef.current
          s.hoveredStar = null; s.stars.forEach(st => st.hovered = false); setTooltip(null)
        }}
      />
      <div style={{ display: 'flex', gap: 8, padding: '10px 14px', alignItems: 'center' }}>
        {['all', 'research', 'debate'].map(f => (
          <button key={f} style={filterBtnStyle(f)} onClick={() => {
            setActiveFilter(f); onFilterChange?.(f)
          }}>
            {f === 'all' ? 'All' : f === 'research' ? 'Research' : 'Debates'}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', color: '#4a5568', fontSize: 11, fontFamily: 'monospace' }}>
          {stateRef.current.stars.length} results
        </span>
      </div>
      {detail && (
        <div style={{
          margin: '0 14px 14px',
          background: 'rgba(10,8,22,0.95)',
          border: '1px solid rgba(0,204,255,0.25)',
          borderRadius: 10, padding: '12px 16px', color: '#ccd',
          animation: 'fadeIn 0.2s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: detail.color, display: 'inline-block' }} />
            <span style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>{detail.score}% match</span>
            <span style={{
              fontSize: 11, padding: '2px 10px', borderRadius: 10, marginLeft: 'auto',
              background: `${detail.color}22`, color: detail.color,
              border: `1px solid ${detail.color}44`, textTransform: 'capitalize',
            }}>{detail.mode}</span>
          </div>
          <div style={{ fontSize: 13, color: '#aabbcc', marginBottom: 4, lineHeight: 1.4 }}>{detail.query}</div>
          <div style={{ fontSize: 12, color: '#667788', lineHeight: 1.5 }}>{detail.content_preview}</div>
        </div>
      )}
      {tooltip && (
        <div style={{
          position: 'fixed', left: tooltip.cx + 16, top: tooltip.cy - 20,
          pointerEvents: 'none', zIndex: 999,
          background: 'rgba(10,8,22,0.95)', border: '1px solid rgba(0,204,255,0.3)',
          borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#ccd',
          maxWidth: 200, backdropFilter: 'blur(4px)',
        }}>
          <div style={{ color: tooltip.star.color, fontWeight: 600, marginBottom: 4 }}>{tooltip.star.score}% match</div>
          <div style={{ color: '#aabbcc', lineHeight: 1.4 }}>
            {tooltip.star.query.length > 35 ? tooltip.star.query.slice(0, 35) + '…' : tooltip.star.query}
          </div>
          <div style={{ marginTop: 4, fontSize: 10, color: '#556677', textTransform: 'uppercase', letterSpacing: 1 }}>{tooltip.star.mode}</div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════════
const NAV_ITEMS = [
  { icon: 'travel_explore', label: 'Research',       path: '/research' },
  { icon: 'forum',          label: 'Debate Chamber', path: '/debate' },
  { icon: 'account_tree',   label: 'Knowledge Graph',path: '/graph' },
  { icon: 'search',         label: 'Semantic Search', path: '/search', active: true },
  { icon: 'database',       label: 'Memory Bank',    path: '/memory' },
  { icon: 'picture_as_pdf', label: 'PDF Lab',        path: '/pdf-lab' },
  { icon: 'analytics',      label: 'Analytics',      path: '/analytics' },
  { icon: 'settings',       label: 'Settings',       path: '/settings' },
]

function NavItem({ icon, label, path, active, collapsed, onNavigate }) {
  const [hovered, setHovered] = useState(false)
  const handleNav = () => onNavigate ? onNavigate(path) : (window.location.href = path)
  if (collapsed) {
    return (
      <div onClick={handleNav} title={label} style={{
        padding: '12px 0', cursor: 'pointer',
        color: active ? C.cyan : C.onSurfaceVariant,
        width: '100%', display: 'flex', justifyContent: 'center',
      }}>
        <Icon name={icon} style={{ fontSize: 20, color: 'inherit' }} />
      </div>
    )
  }
  return (
    <div
      onClick={handleNav}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
        borderRadius: 9999, cursor: 'pointer',
        color: active || hovered ? C.cyan : C.onSurfaceVariant,
        background: active ? 'rgba(0,204,255,0.08)' : hovered ? C.white5 : 'transparent',
        fontFamily: "'JetBrains Mono',monospace", fontSize: 13,
        fontWeight: active ? 700 : 400, transition: 'all 0.2s',
        whiteSpace: 'nowrap', overflow: 'hidden',
      }}
    >
      <Icon name={icon} style={{ fontSize: 20, color: 'inherit', flexShrink: 0 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
    </div>
  )
}

function Sidebar({ onNavigate, user, onLogout, collapsed, setCollapsed }) {
  const handleNav    = path => onNavigate ? onNavigate(path) : (window.location.href = path)
  const handleLogout = () => onLogout ? onLogout() : (localStorage.clear(), window.location.href = '/')
  return (
    <aside style={{
      position: 'fixed', left: 0, top: 0, height: '100%',
      width: collapsed ? 56 : 320,
      background: 'rgba(10,10,30,0.6)', backdropFilter: 'blur(24px)',
      borderRight: `1px solid ${C.white10}`,
      display: 'flex', flexDirection: 'column',
      padding: collapsed ? '16px 8px' : 24,
      zIndex: 20,
      transition: 'width 0.35s cubic-bezier(0.4,0,0.2,1), padding 0.35s cubic-bezier(0.4,0,0.2,1)',
      overflow: 'hidden',
    }}>
      {collapsed ? (
        <>
          <button onClick={() => setCollapsed(false)} style={{
            background: 'none', border: 'none', color: C.cyan, cursor: 'pointer',
            marginBottom: 32, display: 'flex', justifyContent: 'center',
          }}>
            <Icon name="chevron_right" style={{ fontSize: 22 }} />
          </button>
          {NAV_ITEMS.map(item => <NavItem key={item.label} {...item} collapsed onNavigate={onNavigate} />)}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div onClick={() => handleNav('/research')} style={{
              width: 34, height: 34, borderRadius: '50%', background: C.cyan,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}>
              <Icon name="add" style={{ fontSize: 16, color: C.void }} />
            </div>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: C.surfaceContainer, border: '1px solid rgba(0,204,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="face" style={{ color: C.cyan, fontSize: 14 }} />
            </div>
            <div onClick={handleLogout} style={{ cursor: 'pointer', color: C.crimson }}>
              <Icon name="logout" style={{ fontSize: 14 }} />
            </div>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 40, minWidth: 0 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{
                fontFamily: "'Sora',sans-serif", fontSize: 28, fontWeight: 800,
                color: C.cyan, letterSpacing: '-0.03em', whiteSpace: 'nowrap', margin: 0,
              }}>POLYNOUS</h1>
              <p style={{
                fontFamily: "'JetBrains Mono',monospace", fontSize: 10,
                color: C.onSurfaceVariant, textTransform: 'uppercase',
                letterSpacing: '0.2em', opacity: 0.7, whiteSpace: 'nowrap', margin: '4px 0 0',
              }}>Cerebral Vitality Engine</p>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              style={{ background: 'none', border: 'none', color: C.textSecondary, cursor: 'pointer', padding: 4, flexShrink: 0, marginLeft: 8 }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = C.textSecondary}
            >
              <Icon name="chevron_left" style={{ fontSize: 20 }} />
            </button>
          </div>
          <nav className="pn-stagger" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, overflow: 'hidden' }}>
            {NAV_ITEMS.map(item => <NavItem key={item.label} {...item} collapsed={false} onNavigate={onNavigate} />)}
          </nav>
          <div style={{ borderTop: `1px solid ${C.white5}`, paddingTop: 24, marginTop: 24 }}>
            <button
              onClick={() => handleNav('/research')}
              style={{
                width: '100%', padding: '12px', background: C.cyan, color: C.void,
                fontWeight: 700, borderRadius: 9999, border: 'none', cursor: 'pointer',
                fontFamily: "'Sora',sans-serif", fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'transform 0.2s', whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Icon name="add" style={{ fontSize: 18, color: C.void, flexShrink: 0 }} />
              New Research
            </button>
            <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', background: C.surfaceContainer,
                border: '1px solid rgba(0,204,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon name="face" style={{ color: C.cyan, fontSize: 22 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700,
                  color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0,
                }}>{user?.username || 'Guest'}</p>
                <button onClick={handleLogout} style={{
                  fontSize: 10, color: C.crimson, background: 'none', border: 'none',
                  cursor: 'pointer', fontFamily: "'JetBrains Mono',monospace", padding: 0,
                }}>Disconnect</button>
              </div>
            </div>
          </div>
        </>
      )}
    </aside>
  )
}

// ═══════════════════════════════════════════════════════════════
// CONSTELLATION BACKGROUND - rich star field with constellation lines
// ═══════════════════════════════════════════════════════════════
function ParticleCanvas() {
  const ref   = useRef(null)
  const mouse = useRef({ x: null, y: null })

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    let animId, W, H

    // ── seed constellation anchor points as % of screen ──
    // These are fixed named-shape clusters spread across the full page.
    const CONSTELLATION_SEEDS = [
      // top-left quadrant
      [0.08,0.07],[0.14,0.04],[0.20,0.09],[0.13,0.13],[0.07,0.17],
      // top-center
      [0.35,0.05],[0.41,0.11],[0.38,0.17],[0.45,0.08],
      // top-right (left of right panel)
      [0.60,0.06],[0.66,0.13],[0.62,0.20],[0.70,0.18],
      // left mid
      [0.04,0.34],[0.11,0.29],[0.16,0.38],[0.09,0.43],
      // center-left
      [0.28,0.32],[0.33,0.38],[0.26,0.44],[0.35,0.46],[0.30,0.52],
      // center
      [0.48,0.28],[0.53,0.34],[0.46,0.40],[0.55,0.42],
      // center-right
      [0.63,0.35],[0.68,0.28],[0.72,0.38],[0.65,0.45],
      // bottom-left
      [0.06,0.60],[0.12,0.66],[0.18,0.58],[0.10,0.74],[0.20,0.72],
      // bottom-center-left
      [0.30,0.64],[0.36,0.70],[0.28,0.76],[0.38,0.78],
      // bottom-center
      [0.48,0.60],[0.54,0.68],[0.50,0.76],[0.56,0.82],
      // bottom-right
      [0.62,0.62],[0.68,0.70],[0.64,0.80],[0.72,0.74],
      // far right sparse
      [0.76,0.22],[0.82,0.30],[0.78,0.50],[0.74,0.58],
    ]

    // constellation line pairs by index into CONSTELLATION_SEEDS
    const CONST_LINES = [
      // top-left shape
      [0,1],[1,2],[2,3],[3,4],[4,0],[3,1],
      // top-center shape
      [5,6],[6,7],[7,8],[8,5],
      // top-right shape
      [9,10],[10,11],[11,12],[12,9],[10,12],
      // left mid
      [13,14],[14,15],[15,16],[16,13],
      // center-left shape
      [17,18],[18,19],[19,20],[20,21],[21,17],[18,20],
      // center
      [22,23],[23,24],[24,25],[25,22],
      // center-right
      [26,27],[27,28],[28,29],[29,26],[27,29],
      // bottom-left
      [30,31],[31,32],[32,33],[33,34],[34,30],[31,33],
      // bottom-center-left
      [35,36],[36,37],[37,38],[38,35],
      // bottom-center
      [39,40],[40,41],[41,42],[42,39],
      // bottom-right
      [43,44],[44,45],[45,46],[46,43],[44,46],
      // far-right
      [47,48],[48,49],[49,50],[50,47],
    ]

    function init() {
      W = canvas.width  = window.innerWidth
      H = canvas.height = window.innerHeight

      // Build constellation anchor star objects
      const anchors = CONSTELLATION_SEEDS.map(([px, py], i) => ({
        bx: px, by: py,
        x: px * W + (Math.random() - 0.5) * W * 0.015,
        y: py * H + (Math.random() - 0.5) * H * 0.015,
        r: 1.0 + Math.random() * 1.6,
        op: 0.45 + Math.random() * 0.45,
        twPhase: Math.random() * Math.PI * 2,
        twSpeed: 0.0008 + Math.random() * 0.0012,
        isBright: Math.random() < 0.22,
        // slow drift
        vx: (Math.random() - 0.5) * 0.06,
        vy: (Math.random() - 0.5) * 0.06,
      }))

      // Scattered background micro-stars - many more, spread evenly
      const micro = Array.from({ length: 320 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.3 + Math.random() * 0.9,
        op: 0.05 + Math.random() * 0.18,
                twSpeed: 0.0002 + Math.random() * 0.0003,  // anchors (4x slower)
        twSpeed: 0.0001 + Math.random() * 0.0002,  // micro stars (5x slower)
      }))

      // Drifting particle motes (original feel, preserved)
      const motes = Array.from({ length: 60 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        size: Math.random() * 1.2 + 0.3,
        vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18,
        op: Math.random() * 0.14 + 0.03,
      }))

      let T = 0

      function draw() {
        T++
        ctx.clearRect(0, 0, W, H)

        // ── drift anchors slowly ──
        anchors.forEach(a => {
          a.x += a.vx; a.y += a.vy
          // soft boundary bounce back toward base position
          const bx = a.bx * W, by = a.by * H
          if (Math.abs(a.x - bx) > W * 0.025) a.vx *= -1
          if (Math.abs(a.y - by) > H * 0.025) a.vy *= -1
        })

        // ── constellation lines ──
        CONST_LINES.forEach(([ai, bi]) => {
          const a = anchors[ai], b = anchors[bi]
          if (!a || !b) return
          const twA = Math.sin(T * a.twSpeed * 1000 + a.twPhase) * 0.5 + 0.5
          const twB = Math.sin(T * b.twSpeed * 1000 + b.twPhase) * 0.5 + 0.5
          const lineOp = ((twA + twB) / 2) * 0.10 + 0.04
          const grd = ctx.createLinearGradient(a.x, a.y, b.x, b.y)
          grd.addColorStop(0, `rgba(0,200,255,${lineOp * (0.5 + twA * 0.5)})`)
          grd.addColorStop(0.5, `rgba(160,140,255,${lineOp})`)
          grd.addColorStop(1, `rgba(0,200,255,${lineOp * (0.5 + twB * 0.5)})`)
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.strokeStyle = grd
          ctx.lineWidth = 0.65
          ctx.stroke()
        })

        // ── micro stars ──
        micro.forEach(s => {
          const tw = Math.sin(T * s.twSpeed * 1000 + s.twPhase) * 0.5 + 0.5
          ctx.beginPath()
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(200,220,255,${s.op * (0.4 + tw * 0.6)})`
          ctx.fill()
        })

        // ── anchor constellation stars ──
        anchors.forEach(s => {
          const tw = Math.sin(T * s.twSpeed * 1000 + s.twPhase) * 0.5 + 0.5
          const alpha = s.op * (0.45 + tw * 0.55)
          const r = s.r * (1 + tw * (s.isBright ? 0.4 : 0.15))

          if (s.isBright) {
            // diffraction cross
            ctx.save()
            ctx.strokeStyle = `rgba(200,230,255,${alpha * 0.55})`
            ctx.lineWidth = 0.4
            ctx.beginPath(); ctx.moveTo(s.x - r * 3.5, s.y); ctx.lineTo(s.x + r * 3.5, s.y); ctx.stroke()
            ctx.beginPath(); ctx.moveTo(s.x, s.y - r * 3.5); ctx.lineTo(s.x, s.y + r * 3.5); ctx.stroke()
            ctx.strokeStyle = `rgba(200,230,255,${alpha * 0.22})`
            ctx.beginPath(); ctx.moveTo(s.x - r * 2.2, s.y - r * 2.2); ctx.lineTo(s.x + r * 2.2, s.y + r * 2.2); ctx.stroke()
            ctx.beginPath(); ctx.moveTo(s.x + r * 2.2, s.y - r * 2.2); ctx.lineTo(s.x - r * 2.2, s.y + r * 2.2); ctx.stroke()
            ctx.restore()

            // outer glow
            const gw = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 5.5)
            gw.addColorStop(0, `rgba(180,220,255,${alpha * 0.30})`)
            gw.addColorStop(0.5, `rgba(100,160,255,${alpha * 0.10})`)
            gw.addColorStop(1, 'transparent')
            ctx.beginPath(); ctx.arc(s.x, s.y, r * 5.5, 0, Math.PI * 2)
            ctx.fillStyle = gw; ctx.fill()
          }

          // core glow
          const gr = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 2.2)
          gr.addColorStop(0, `rgba(240,248,255,${alpha})`)
          gr.addColorStop(0.45, `rgba(160,210,255,${alpha * 0.6})`)
          gr.addColorStop(1, 'transparent')
          ctx.beginPath(); ctx.arc(s.x, s.y, r * 2.2, 0, Math.PI * 2)
          ctx.fillStyle = gr; ctx.fill()

          // pinpoint core
          ctx.beginPath(); ctx.arc(s.x, s.y, Math.max(0.6, r * 0.55), 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255,255,255,${alpha * 0.95})`; ctx.fill()
        })

        // ── drifting motes ──
        motes.forEach(p => {
          p.x += p.vx; p.y += p.vy
          if (p.x < 0 || p.x > W) p.vx *= -1
          if (p.y < 0 || p.y > H) p.vy *= -1
          if (mouse.current.x != null) {
            const dx = mouse.current.x - p.x, dy = mouse.current.y - p.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 100) { p.x -= dx / 28; p.y -= dy / 28 }
          }
          ctx.fillStyle = `rgba(0,204,255,${p.op})`
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill()
        })

        animId = requestAnimationFrame(draw)
      }
      if (animId) cancelAnimationFrame(animId)
      draw()
    }

    init()
    const onResize = () => { cancelAnimationFrame(animId); init() }
    window.addEventListener('resize', onResize)
    const mm = e => { mouse.current = { x: e.clientX, y: e.clientY } }
    window.addEventListener('mousemove', mm)
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousemove', mm)
    }
  }, [])

  return <canvas ref={ref} style={{ position: 'fixed', top: 0, left: 0, zIndex: 0, pointerEvents: 'none' }} />
}

// ═══════════════════════════════════════════════════════════════
// ALL 25 SUGGESTION TOPICS - short keyword combos, auto-shuffled
// ═══════════════════════════════════════════════════════════════
const ALL_SUGGESTIONS = [
  'AI alignment',
  'quantum entanglement',
  'cognitive enhancement',
  'deep space habitat',
  'CRISPR off-target',
  'consciousness theory',
  'dark matter detection',
  'synthetic biology',
  'neuroplasticity',
  'Fermi paradox',
  'moral patienthood',
  'longevity escape',
  'autonomous organizations',
  'psychedelic therapy',
  'planetary defense',
  'brain-computer interface',
  'carbon capture',
  'swarm robotics',
  'AGI governance',
  'epigenetic inheritance',
  'topological computing',
  'artificial photosynthesis',
  'embodied cognition',
  'plasma stability',
  'biosignature detection',
]

// Shuffle helper - Fisher-Yates
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ═══════════════════════════════════════════════════════════════
// QUICK CHIP
// ═══════════════════════════════════════════════════════════════
function QuickChip({ label, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '8px 20px', borderRadius: 50,
        background: hovered ? 'rgba(0,204,255,0.08)' : 'rgba(10,10,30,0.6)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${hovered ? 'rgba(0,204,255,0.3)' : C.white10}`,
        color: hovered ? C.cyan : C.textSecondary,
        cursor: 'pointer', fontFamily: "'JetBrains Mono',monospace",
        fontSize: 12, transition: 'all 0.2s',
        animation: 'fadeIn 0.3s ease both',
      }}
    >
      {label}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════
// SUGGESTION ROW (dropdown)
// ═══════════════════════════════════════════════════════════════
function SuggestionRow({ text, isLast, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '14px 20px', cursor: 'pointer',
        color: hovered ? '#fff' : '#ccc',
        background: hovered ? 'rgba(0,204,255,0.08)' : 'transparent',
        fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13,
        borderBottom: isLast ? 'none' : `1px solid ${C.white5}`,
        transition: 'all 0.15s',
      }}
    >
      {text}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// RESULT PANEL
// ═══════════════════════════════════════════════════════════════
function ResultPanel({ result, onClose, onStartResearch }) {
  if (!result) return null
  const isResearch = result.mode !== 'debate'
  return (
    <div style={{
      background: 'rgba(10,10,30,0.8)', backdropFilter: 'blur(20px)',
      border: `1px solid ${isResearch ? 'rgba(0,255,15,0.3)' : 'rgba(255,32,64,0.3)'}`,
      borderRadius: 20, padding: 28, position: 'relative',
      boxShadow: `0 0 30px ${isResearch ? 'rgba(0,255,15,0.15)' : 'rgba(255,32,64,0.15)'}`,
      animation: 'fadeSlideUp 0.4s ease', marginTop: 20,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <span style={{
            fontFamily: "'JetBrains Mono',monospace",
            background: isResearch ? 'rgba(0,255,15,0.1)' : 'rgba(255,32,64,0.1)',
            color: isResearch ? C.green : C.crimson,
            border: `1px solid ${isResearch ? 'rgba(0,255,15,0.3)' : 'rgba(255,32,64,0.3)'}`,
            padding: '4px 12px', borderRadius: 20, fontSize: 11, textTransform: 'uppercase',
            display: 'inline-block', marginBottom: 12,
          }}>
            {isResearch ? 'Research Node' : 'Debate Node'}
          </span>
          <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: '1.3em', color: '#fff', margin: 0 }}>
            {result.query}
          </h3>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: C.textSecondary, cursor: 'pointer', padding: 4, lineHeight: 1 }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = C.textSecondary}
        >
          <Icon name="close" style={{ fontSize: 20, color: 'inherit' }} />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 20 }}>
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", color: '#c8d6e5', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
          {result.answer || 'No additional details available.'}
        </p>
        <div style={{ background: C.white5, borderRadius: 12, padding: 16, border: `1px solid ${C.white10}` }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 4 }}>Similarity</div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: '1.4em', fontWeight: 800, color: C.green }}>{result.score}%</div>
          </div>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 4 }}>Confidence</div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: '1.2em', fontWeight: 700, color: C.cyan }}>{result.confidence ?? 'N/A'}%</div>
          </div>
        </div>
      </div>
      <button
        onClick={() => result && onStartResearch?.(result.query)}
        style={{
          fontFamily: "'Sora',sans-serif", background: C.green, color: C.void,
          padding: '14px 32px', borderRadius: 50, border: 'none',
          fontWeight: 700, fontSize: 15, cursor: 'pointer', transition: 'transform 0.2s',
          display: 'flex', alignItems: 'center', gap: 8,
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <Icon name="play_arrow" style={{ fontSize: 18, color: C.void }} />
        Initiate Stream
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// PREMIUM IDLE STATE - reworked, no removed elements
// ═══════════════════════════════════════════════════════════════
function IdleState({ noResults = false }) {
  return (
    <div style={{
      borderRadius: 24,
      background: 'rgba(10,10,30,0.55)',
      backdropFilter: 'blur(24px)',
      border: '1px solid rgba(0,204,255,0.12)',
      overflow: 'hidden',
    }}>
      {/* CTA - "Query the neural void" with stellar aesthetic */}
      <div style={{ padding: '72px 40px 52px', textAlign: 'center', position: 'relative' }}>

        {/* Ambient glow behind icon */}
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -62%)',
          width: 320, height: 200,
          background: 'radial-gradient(ellipse, rgba(0,204,255,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Icon with animated rings */}
        <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto 36px' }}>
          {[0, 0.8, 1.6].map(d => (
            <div key={d} style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: '1px solid rgba(0,204,255,0.18)',
              animation: `ringPulse 3s ease-out ${d}s infinite`,
            }} />
          ))}
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,204,255,0.04)', borderRadius: '50%',
            border: '1px solid rgba(0,204,255,0.16)',
          }}>
            <Icon name="scatter_plot" style={{ fontSize: 40, color: C.cyan, opacity: 0.75 }} />
          </div>
        </div>

        {/* Main heading - "Query the neural void" */}
        {noResults ? (
          <>
            <h3 style={{
              fontFamily: "'Inter','Sora',sans-serif",
              fontSize: 28, fontWeight: 900, fontStyle: 'italic',
              letterSpacing: '-1.5px', lineHeight: 1.1,
              color: 'rgba(0,204,255,0.7)',
              marginBottom: 14, marginTop: 0,
            }}>
              No neural matches found
            </h3>
            <p style={{
              fontFamily: "'Hanken Grotesk',sans-serif", color: C.textSecondary,
              fontSize: 14, maxWidth: 360, margin: '0 auto', lineHeight: 1.7,
            }}>
              Try broader keywords - the constellation forms when embeddings find their alignment.
            </p>
          </>
        ) : (
          <>
            {/* The headline */}
            <h3 style={{
              fontFamily: "'Inter','Sora',sans-serif",
              fontSize: 'clamp(28px, 4vw, 42px)',
              fontWeight: 900,
              fontStyle: 'italic',
              letterSpacing: '-2px',
              lineHeight: 1.05,
              margin: '0 0 18px',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(0,204,255,0.8) 45%, rgba(100,80,220,0.75) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Query the neural void
            </h3>

            <p style={{
              fontFamily: "'Hanken Grotesk',sans-serif",
              color: C.textSecondary,
              fontSize: 14, maxWidth: 400,
              margin: '0 auto',
              lineHeight: 1.75,
            }}>
              Semantic embeddings turn your research into living constellations - each star a conceptual match, each edge a hidden connection.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function SemanticSearchPage({ user, onStartResearch, onNavigate, onLogout }) {
  const [query,            setQuery]            = useState('')
  const [results,          setResults]          = useState([])
  const [loading,          setLoading]          = useState(false)
  const [searched,         setSearched]         = useState(false)
  const [selectedResult,   setSelectedResult]   = useState(null)
  const [globeOpen,        setGlobeOpen]        = useState(false)   // results globe (idea #4)
  const [mapOpen,          setMapOpen]          = useState(false)   // Phase E cluster map
  const [filter,           setFilter]           = useState('all')
  const [showSuggestions,  setShowSuggestions]  = useState(false)
  const [suggestions,      setSuggestions]      = useState([])
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // ── 25 quick chips that auto-shuffle every 5 seconds ──
  const [visibleChips, setVisibleChips] = useState(() => shuffle(ALL_SUGGESTIONS).slice(0, 5))
  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleChips(prev => {
        const pool = shuffle(ALL_SUGGESTIONS)
        const next = pool.filter(s => !prev.includes(s)).slice(0, 5)
        return next.length === 5 ? next : pool.slice(0, 5)
      })
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const suggestionsRef = useRef(null)
  useEffect(() => {
    const handler = e => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target))
        setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Search ──
  const handleSearch = async (searchQuery) => {
    const q = (searchQuery || query).trim();
    if (!q) return;
    
    setLoading(true);
    setSearched(true);
    setSelectedResult(null);
    setShowSuggestions(false);
    
    try {
        const token = localStorage.getItem('polynous_token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        
        // Trailing slash matters: the backend route is `/search/`. Hitting
        // `/search` triggers a 307 redirect that can drop the Authorization
        // header cross-origin — which is why search returned nothing.
        const res = await fetch(`${API_BASE_URL}/search/?query=${encodeURIComponent(q)}&top_k=12`, { headers });
        if (res.ok) {
            const data = await res.json();
            setResults(data.results || []);
        } else {
            setResults([]);
        }
    } catch (err) {
        console.error('Search error:', err);
        setResults([]);
    } finally {
        setLoading(false);
    }
  };

  const handleInputChange = async (value) => {
    setQuery(value);
    if (value.length > 2) {
        setShowSuggestions(true);
        try {
            const token = localStorage.getItem('polynous_token');
            const headers = {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };
            
            const res = await fetch(`${API_BASE_URL}/search/suggestions?query=${encodeURIComponent(value)}&limit=5`, { headers });
            if (res.ok) {
                const d = await res.json();
                setSuggestions(d.suggestions || []);
            }
        } catch { /* ignore */ }
    } else {
        setShowSuggestions(false);
        setSuggestions([]);
    }
  };

  const sidebarW = sidebarCollapsed ? 56 : 320

  return (
    <div style={{
      minHeight: '100vh', background: C.void,
      fontFamily: "'Hanken Grotesk',sans-serif",
      position: 'relative', overflow: 'auto', color: C.onSurface,
    }}>
      {/* ── Layer 0: subtle floating dust ── */}
      <ParticleCanvas />

      {/* ── Layer 1: ambient WebGL galaxy ── */}
      <AmbientGalaxy sidebarWidth={sidebarW} />

      {/* ── Layer 1b: premium right panel visual ── */}
      <PremiumRightPanel />

      {/* ── Layer 2: sidebar ── */}
      <Sidebar
        onNavigate={onNavigate} user={user} onLogout={onLogout}
        collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed}
      />

      {/* Results globe (idea #4): top matches as an InfiniteMenu sphere. */}
      {results.length > 1 && (
        <button onClick={() => setGlobeOpen(true)}
          style={{ position:'fixed', right:24, bottom:88, zIndex:60, display:'flex', alignItems:'center', gap:9, padding:'10px 16px', borderRadius:9999, cursor:'pointer',
            background:'rgba(10,10,26,0.75)', border:'1px solid rgba(0,204,255,0.32)', color:'#dcf3ff', backdropFilter:'blur(18px)',
            fontFamily:"'JetBrains Mono',monospace", fontSize:11.5, fontWeight:700, letterSpacing:'0.04em', boxShadow:'0 0 20px -6px rgba(0,204,255,0.4)' }}>
          <span className="material-symbols-outlined" style={{ fontSize:17, color:'#00ccff' }}>hub</span>
          View as globe
        </button>
      )}
      <ConstellationExplorer
        open={globeOpen}
        onClose={() => setGlobeOpen(false)}
        accent="#00ccff"
        heading="Search constellation"
        subheading="Spin your top matches. Tap the arrow to open one."
        items={results.slice(0, 42).map((r) => {
          const q = r.query || 'Untitled'
          const score = Math.round(r.score || 0)
          return {
            image: makeTile({ title: q, tag: `${score}% match`, accent: '#00ccff' }),
            title: q.length > 60 ? q.slice(0, 60) + '…' : q,
            description: (r.answer || '').slice(0, 90) || `${score}% similarity`,
            query: q,
          }
        })}
        onSelect={(it) => { setGlobeOpen(false); onStartResearch?.(it.query); }}
      />

      {/* Phase E cluster map: always available (maps your whole corpus). */}
      <button onClick={() => setMapOpen(true)}
        style={{ position: 'fixed', right: 24, bottom: 148, zIndex: 60, display: 'flex', alignItems: 'center', gap: 9, padding: '10px 16px', borderRadius: 9999, cursor: 'pointer',
          background: 'rgba(10,10,26,0.75)', border: '1px solid rgba(168,85,247,0.32)', color: '#ecdcff', backdropFilter: 'blur(18px)',
          fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', boxShadow: '0 0 20px -6px rgba(168,85,247,0.4)' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 17, color: '#a855f7' }}>bubble_chart</span>
        Cluster map
      </button>
      <SemanticMap open={mapOpen} onClose={() => setMapOpen(false)} onSelect={(p) => { setMapOpen(false); onStartResearch?.(p.query); }} />

      {/* ── Layer 3: main content ── */}
      <main style={{
        marginLeft: sidebarW, padding: '30px 20px 60px',
        position: 'relative', zIndex: 10,
        transition: 'margin-left 0.35s cubic-bezier(0.4,0,0.2,1)',
        width: `calc(100% - ${sidebarW}px)`, boxSizing: 'border-box',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>

          {/* ── HEADER ── */}
          <div style={{ marginBottom: 40, paddingTop: 10, animation: 'fadeSlideUp 0.6s ease both' }}>
            <h2 style={{
              fontFamily: "'Inter','Sora',sans-serif",
              fontWeight: 900, fontStyle: 'italic',
              letterSpacing: '-4px', lineHeight: 0.92,
              fontSize: 'clamp(52px,9vw,88px)',
              marginBottom: 18, marginTop: 0,
            }}>
              <span style={{ display: 'block', color: '#ffffff', textShadow: '0 2px 40px rgba(255,255,255,0.06)' }}>
                NEURAL
              </span>
              <span style={{
                display: 'block',
                background: 'linear-gradient(90deg, #1565c0, #1e88e5, #64b5f6, #90caf9)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textShadow: '0 0 60px rgba(30,136,229,0.35)',
              }}>
                SEMANTIC
              </span>
              <span style={{ display: 'block', color: '#ffffff', textShadow: '0 2px 40px rgba(255,255,255,0.06)' }}>
                SEARCH
              </span>
            </h2>
            <p style={{
              fontFamily: "'JetBrains Mono',monospace", fontSize: 13,
              color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '3px', margin: 0,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Icon name="hub" style={{ fontSize: 16, color: C.cyan, opacity: 0.65 }} />
              Mapping the conceptual geometry of your research space.
            </p>
          </div>

          {/* ── SEARCH BAR ── */}
          <div style={{ position: 'relative', marginBottom: 20 }} ref={suggestionsRef}>
            <div style={{
              display: 'flex', alignItems: 'center',
              background: 'rgba(25,25,46,0.82)', backdropFilter: 'blur(16px)',
              border: '1px solid rgba(0,204,255,0.3)', borderRadius: 50,
              padding: '16px 24px',
              boxShadow: '0 0 24px rgba(0,204,255,0.08), 0 0 80px rgba(0,204,255,0.03)',
            }}>
              <Icon name="travel_explore" style={{ color: C.cyan, marginRight: 16, fontSize: 22, opacity: 0.8 }} />
              <input
                type="text" value={query}
                onChange={e => handleInputChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Enter a research hypothesis or query…"
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: '#fff', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 16,
                }}
              />
              <button
                onClick={() => handleSearch()}
                disabled={loading}
                style={{
                  background: loading ? 'rgba(0,204,255,0.5)' : C.cyan,
                  color: C.void, padding: '12px 28px', borderRadius: 50, border: 'none',
                  fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 14,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s, transform 0.15s',
                  whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6,
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'scale(1.04)' }}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <Icon name={loading ? 'hourglass_top' : 'radar'} style={{ fontSize: 16, color: C.void }} />
                {loading ? 'Scanning…' : 'Scan'}
              </button>
            </div>

            {/* Dropdown suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
                background: 'rgba(10,10,30,0.96)', backdropFilter: 'blur(20px)',
                border: `1px solid ${C.white10}`, borderRadius: 16, overflow: 'hidden', zIndex: 30,
              }}>
                {suggestions.map((s, i) => (
                  <SuggestionRow
                    key={i} text={s}
                    isLast={i === suggestions.length - 1}
                    onClick={() => { setQuery(s); handleSearch(s) }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── QUICK CHIPS ── */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 32 }}>
            {visibleChips.map(t => (
              <QuickChip key={t} label={t} onClick={() => { setQuery(t); handleSearch(t) }} />
            ))}
          </div>

          {/* ── CONSTELLATION ── */}
          {searched && results.length > 0 && !loading && (
            <div style={{ marginBottom: 24 }}>
              <NeuralConstellation
                results={results} filter={filter}
                onStarClick={setSelectedResult} onFilterChange={setFilter}
              />
            </div>
          )}

          {/* ── LOADING ── */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%', background: C.cyan, opacity: 0.5,
                animation: 'pulse 2s infinite', boxShadow: '0 0 40px rgba(0,204,255,0.6)',
                margin: '0 auto 20px',
              }} />
              <p style={{ fontFamily: "'Sora',sans-serif", color: C.cyan, fontWeight: 600, margin: 0 }}>
                Analyzing conceptual overlaps…
              </p>
            </div>
          )}

          {/* ── IDLE / EMPTY STATE ── */}
          {!loading && (!searched || (searched && results.length === 0)) && (
            <IdleState noResults={searched && results.length === 0} />
          )}

          {/* ── RESULT PANEL ── */}
          <ResultPanel
            result={selectedResult}
            onClose={() => setSelectedResult(null)}
            onStartResearch={onStartResearch}
          />

        </div>
      </main>

      {/* ── VECTOR NODE BADGE - bottom-left, adjusts with sidebar ── */}
      <VectorNodeBadge sidebarWidth={sidebarW} />

      <CornerInfoCard />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@1,900&family=Sora:wght@400;700;800;900&family=JetBrains+Mono:wght@400;700&family=Hanken+Grotesk:wght@400;500;600&display=swap');
        @import url('https://fonts.googleapis.com/icon?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0');

        @keyframes pulse {
          0%,100% { opacity:.5; transform:scale(1) }
          50%      { opacity:1;  transform:scale(1.1) }
        }
        @keyframes fadeSlideUp {
          from { opacity:0; transform:translateY(20px) }
          to   { opacity:1; transform:translateY(0) }
        }
        @keyframes fadeIn {
          from { opacity:0 }
          to   { opacity:1 }
        }
        @keyframes ringPulse {
          0%   { transform:scale(1);   opacity:.6 }
          100% { transform:scale(2.2); opacity:0  }
        }
        @keyframes nebulaShift {
          0%,100% { opacity:.18 }
          50%     { opacity:.30 }
        }
        @keyframes orbitSpin {
          from { transform:rotate(0deg) }
          to   { transform:rotate(360deg) }
        }
        @keyframes floatBadge {
          0%,100% { transform:translateY(0) }
          50%     { transform:translateY(-8px) }
        }
        @keyframes shimmer {
          0%,100% { opacity:.3 }
          50%     { opacity:.9 }
        }

        * { box-sizing: border-box }
        input::placeholder { color: rgba(136,153,170,0.5) }
      `}</style>
    </div>
  )
}