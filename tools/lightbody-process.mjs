import {NodeIO} from '@gltf-transform/core';
import {weld, simplify, prune, dedup} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
let necknj=0;
await MeshoptSimplifier.ready;
const io=new NodeIO(); const d=await io.read('../base.glb');
const mesh=d.getRoot().listMeshes()[0], p=mesh.listPrimitives()[0];
p.setAttribute('TEXCOORD_0',null); p.setAttribute('NORMAL',null);
for(const s of Object.keys(p.listSemantics?{}:{})){}
await d.transform(weld({tolerance:1e-5}));
await d.transform(simplify({simplifier:MeshoptSimplifier,ratio:+process.argv[3]||0.3,error:0.0015,lockBorder:false}));
let P=d.getRoot().listMeshes()[0].listPrimitives()[0];
const pos=P.getAttribute('POSITION'); const A=pos.getArray(); const n=A.length/3; const idx=P.getIndices().getArray();
console.log('welded verts',n,'tris',idx.length/3);
// adjacency
const nb=Array.from({length:n},()=>new Set());
for(let t=0;t<idx.length;t+=3){const a=idx[t],b=idx[t+1],c=idx[t+2];nb[a].add(b);nb[a].add(c);nb[b].add(a);nb[b].add(c);nb[c].add(a);nb[c].add(b);}
const ss=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t)};
const W=new Float32Array(n);
for(let i=0;i<n;i++){const x=A[3*i],y=A[3*i+1],z=A[3*i+2];let w=0;
  // pelvis front (genital area): strong
  if(y>0.60&&y<1.00&&Math.abs(x)<0.15&&z>-0.02){w=Math.max(w,ss(0.60,0.74,y)*(1-ss(0.90,1.0,y))*(1-ss(0.10,0.15,Math.abs(x))));}
  // chest
  if(y>1.10&&y<1.42&&Math.abs(x)<0.22&&z>0.0){w=Math.max(w,1.0*ss(1.08,1.14,y)*(1-ss(1.34,1.42,y))*(1-ss(0.16,0.22,Math.abs(x))));}
  // head / face: smooth fully, ears, brow, lips
  if(y>1.40){w=Math.max(w,1.0*ss(1.40,1.44,y));}
  W[i]=Math.max(w,0.22);}
function lap(lam,mask){const out=new Float32Array(A.length);for(let i=0;i<n;i++){const s=nb[i];let cx=0,cy=0,cz=0;for(const j of s){cx+=A[3*j];cy+=A[3*j+1];cz+=A[3*j+2];}const k=s.size||1;const w=W[i]*lam;out[3*i]=A[3*i]+w*(cx/k-A[3*i]);out[3*i+1]=A[3*i+1]+w*(cy/k-A[3*i+1]);out[3*i+2]=A[3*i+2]+w*(cz/k-A[3*i+2]);}A.set(out);}
const IT=+process.argv[2]||60;
for(let it=0;it<IT;it++){lap(0.5);lap(-0.53*0.5);}
// extra: front pelvis flatten pass (no shrink fix needed)
// pass 2: chest/pelvis-only heavy smoothing (removes nipples / any residual detail)
for(let i=0;i<n;i++){const x=A[3*i],y=A[3*i+1],z=A[3*i+2];let w=0;
 if(y>1.12&&y<1.40&&Math.abs(x)<0.2&&z>0.0)w=ss(1.12,1.18,y)*(1-ss(1.34,1.40,y))*(1-ss(0.15,0.2,Math.abs(x)));
 W[i]=w;}
for(let it=0;it<120;it++){lap(0.5);lap(-0.53*0.5);}
// pass 3: neck top (jaw remnants)
for(let i=0;i<n;i++){const y=A[3*i+1];W[i]=ss(1.38,1.42,y)*(1-ss(1.50,1.54,y));}
for(let it=0;it<200;it++){lap(0.5);lap(-0.53*0.5);}
// head -> smooth ellipsoid (no face, no ears, no hair: sexless 'light' head)
{const cx=0,cy=1.555,cz=0.055,rx=0.082,ry=0.125,rz=0.108;
for(let i=0;i<n;i++){const x=A[3*i],y=A[3*i+1],z=A[3*i+2];const w=ss(1.438,1.462,y)*(1-ss(1.70,1.72,y));if(w<=0)continue;
 const dx=(x-cx)/rx,dy=(y-cy)/ry,dz=(z-cz)/rz;const l=Math.hypot(dx,dy,dz)||1;
 // neck below ellipsoid keeps its own shape: only blend vertices outside/inside radially
 const px=cx+dx/l*rx,py=cy+dy/l*ry,pz=cz+dz/l*rz; const ww=w;
 A[3*i]=x+(px-x)*ww;A[3*i+1]=y+(py-y)*ww;A[3*i+2]=z+(pz-z)*ww;}}
// hips slightly wider (androgynous), shoulders slightly narrower
for(let i=0;i<n;i++){const x=A[3*i],y=A[3*i+1];const hip=ss(0.62,0.78,y)*(1-ss(0.92,1.06,y));const sh=ss(1.26,1.34,y)*(1-ss(1.40,1.46,y))*(1-ss(0.26,0.40,Math.abs(x)));A[3*i]=x*(1+0.07*hip-0.06*sh);}
pos.setArray(A);
{ // replace the whole head by a clean smooth ellipsoid skinned 100% to the head joint
 const Ix=P.getIndices(); const I0=Ix.getArray(); const keep=[];
 for(let t=0;t<I0.length;t+=3){const a=I0[t],b=I0[t+1],c=I0[t+2]; {const mn=Math.min(A[3*a+1],A[3*b+1],A[3*c+1]),mx=Math.max(Math.abs(A[3*a]),Math.abs(A[3*b]),Math.abs(A[3*c]));if((mn>1.405&&mx<0.062)||(mn>1.45&&mx<0.13))continue;} keep.push(a,b,c);}
 const skin=d.getRoot().listSkins()[0]; const hj=skin.listJoints().findIndex(j=>j.getName()==='head'); console.log('head joint',hj);
 const cx=0,cy=1.56,cz=0.05,rx=0.082,ry=0.125,rz=0.106; const LAT=18,LON=28; const sp=[],si=[];
 for(let i=0;i<=LAT;i++){const th=Math.PI*i/LAT;for(let j=0;j<=LON;j++){const ph=2*Math.PI*j/LON;sp.push(cx+rx*Math.sin(th)*Math.cos(ph),cy+ry*Math.cos(th),cz+rz*Math.sin(th)*Math.sin(ph));}}
 const base=A.length/3; for(let i=0;i<LAT;i++)for(let j=0;j<LON;j++){const a=base+i*(LON+1)+j,b=a+LON+1;si.push(a,b,a+1, a+1,b,b+1);}
 // neck cylinder
 let nxs=[],nzs=[],nxc=0,nzc=0,cnt=0;{for(let i=0;i<n;i++){const y=A[3*i+1];if(y>1.375&&y<1.40&&Math.abs(A[3*i])<0.12){nxc+=A[3*i];nzc+=A[3*i+2];cnt++;}}nxc/=cnt;nzc/=cnt;
  let mrx=0,mrz=0;for(let i=0;i<n;i++){const y=A[3*i+1];if(y>1.375&&y<1.40&&Math.abs(A[3*i])<0.12){mrx=Math.max(mrx,Math.abs(A[3*i]-nxc));mrz=Math.max(mrz,Math.abs(A[3*i+2]-nzc));}} console.log('neck',nxc.toFixed(3),nzc.toFixed(3),mrx.toFixed(3),mrz.toFixed(3));
  const nj=skin.listJoints().findIndex(j=>j.getName()==='neck_01'); const SEG=20, RING=6; const nb=sp.length/3;
  for(let r=0;r<=RING;r++){const k=r/RING;const y=1.395+k*0.075; const czz=0.017+0.03*k, rxx=0.056-0.006*k, rzz=0.066-0.006*k; for(let j=0;j<SEG;j++){const ph=2*Math.PI*j/SEG; sp.push(rxx*Math.cos(ph), y, czz+rzz*Math.sin(ph)); globalThis.necknj=nj;}}
  for(let r=0;r<RING;r++)for(let j=0;j<SEG;j++){const a=A.length/3+nb+r*SEG+j,b=A.length/3+nb+r*SEG+(j+1)%SEG,c=a+SEG,dd=b+SEG; si.push(a,c,b, b,c,dd);}
  globalThis.neckStart=nb;}
 const nsp=sp.length/3; const posA=P.getAttribute('POSITION'), jA=P.getAttribute('JOINTS_0'), wA=P.getAttribute('WEIGHTS_0');
 const cat=(arr,ex)=>{const o=new arr.constructor(arr.length+ex.length);o.set(arr);o.set(ex,arr.length);return o;};
 const ex3=new Float32Array(sp); const jEx=new (jA.getArray().constructor)(nsp*4); const wEx=new (wA.getArray().constructor)(nsp*4);
 const wmax = wA.getArray() instanceof Float32Array?1:(wA.getArray() instanceof Uint8Array?255:65535);
 for(let i=0;i<nsp;i++){jEx[4*i]=(i>=globalThis.neckStart)?globalThis.necknj:hj;wEx[4*i]=wmax;}
 posA.setArray(cat(posA.getArray(),ex3)); jA.setArray(cat(jA.getArray(),jEx)); wA.setArray(cat(wA.getArray(),wEx));
 Ix.setArray(new Uint32Array([...keep,...si]));
 // flip winding if needed is checked visually
 console.log('head tris replaced');}
const A2=P.getAttribute('POSITION').getArray(), I2=P.getIndices().getArray(), m=A2.length/3;
const N=new Float32Array(A2.length);
for(let t=0;t<I2.length;t+=3){const a=I2[t],b=I2[t+1],c=I2[t+2];const ux=A2[3*b]-A2[3*a],uy=A2[3*b+1]-A2[3*a+1],uz=A2[3*b+2]-A2[3*a+2],vx=A2[3*c]-A2[3*a],vy=A2[3*c+1]-A2[3*a+1],vz=A2[3*c+2]-A2[3*a+2];const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;for(const k of [a,b,c]){N[3*k]+=nx;N[3*k+1]+=ny;N[3*k+2]+=nz;}}
for(let i=0;i<m;i++){const l=Math.hypot(N[3*i],N[3*i+1],N[3*i+2])||1;N[3*i]/=l;N[3*i+1]/=l;N[3*i+2]/=l;}
const acc=d.createAccessor().setType('VEC3').setArray(N).setBuffer(d.getRoot().listBuffers()[0]);
P.setAttribute('NORMAL',acc);
console.log('final verts',m,'tris',I2.length/3);
await d.transform(prune(),dedup());
await io.write(process.argv[4]||'../t/neutral.glb',d);
