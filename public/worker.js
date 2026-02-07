class PN{constructor(s){this.p=new Uint8Array(512);const r=this.R(s);const t=new Uint8Array(256);for(let i=0;i<256;i++)t[i]=i;for(let i=255;i>0;i--){const j=(r()*i+.5)|0;const tmp=t[i];t[i]=t[j];t[j]=tmp}for(let i=0;i<256;i++){this.p[i]=t[i];this.p[i+256]=t[i]}}
R(s){return()=>{s=(s*9301+49297)%233280;return s/233280}}
n(x,y){const p=this.p;const xi=(x|0)-(x<0?1:0),yi=(y|0)-(y<0?1:0),X=xi&255,Y=yi&255,xf=x-xi,yf=y-yi,u=xf*xf*xf*(xf*(xf*6-15)+10),v=yf*yf*yf*(yf*(yf*6-15)+10),a=p[p[X]+Y]/255,b=p[p[X+1]+Y]/255,c=p[p[X]+Y+1]/255,d=p[p[X+1]+Y+1]/255;return(a+(b-a)*u+(c-a+(a-b-c+d)*u)*v)*2-1}
fbm(x,y,o){let v=0,a=1,f=1,m=0;for(let i=0;i<o;i++){v+=this.n(x*f,y*f)*a;m+=a;a*=.5;f*=2}return v/m}
ridge(x,y,o){let v=0,a=1,f=1,m=0;for(let i=0;i<o;i++){let n=this.n(x*f,y*f);n=1-(n<0?-n:n);v+=n*n*a;m+=a;a*=.5;f*=2}return v/m}}
function rng(s){return()=>{s=(s*9301+49297)%233280;return s/233280}}

self.onmessage=function(ev){
const{seed,P,W,H,paintTypeArr,paintStrArr}=ev.data;
const R=rng(seed);
const ns=[];for(let i=0;i<12;i++)ns.push(new PN(seed+i*377));
const windAng=R()*Math.PI*2,wdx=Math.cos(windAng),wdy=Math.sin(windAng);
const tAng=R()*Math.PI*2,tdx=Math.cos(tAng),tdy=Math.sin(tAng);
const warpAng=R()*Math.PI*2;
const nc=P.continents,seaThresh=.01+P.seaLevel*.5;
const el=new Float32Array(W*H),mt=new Float32Array(W*H);
const irr=P.irregularity,frag=P.fragmentation;

// Continent centers
const cRng=rng(seed+999);const cpts=[];
if(nc===1){cpts.push({x:.5+(cRng()-.5)*.15,y:.5+(cRng()-.5)*.15})}
else{for(let ci=0;ci<nc;ci++){let best=null,bestS=0;
for(let a=0;a<40;a++){const px=.15+cRng()*.7,py=.15+cRng()*.7;let minD=99;
for(const cp of cpts){const dd=Math.sqrt((px-cp.x)**2+(py-cp.y)**2);if(dd<minD)minD=dd}
const score=minD-.15*Math.sqrt((px-.5)**2+(py-.5)**2);
if(!cpts.length||score>bestS){bestS=score;best={x:px,y:py}}}
if(best)cpts.push(best)}}

// Noise-primary terrain
for(let py=0;py<H;py++){for(let px=0;px<W;px++){
const i=py*W+px,nx=px/W,ny=py/H;
const w1x=ns[1].fbm(nx*2.5+warpAng,ny*2.5,4)*.07*irr,w1y=ns[1].fbm(nx*2.5+50,ny*2.5+warpAng,4)*.07*irr;
const w2x=ns[3].fbm((nx+w1x)*6,ny*6,3)*.025*irr,w2y=ns[3].fbm(nx*6,(ny+w1y)*6+30,3)*.025*irr;
const w3x=ns[4].fbm((nx+w2x)*15,ny*15,2)*.008*irr,w3y=ns[4].fbm(nx*15,(ny+w2y)*15+60,2)*.008*irr;
const wnx=nx+w1x+w2x+w3x,wny=ny+w1y+w2y+w3y;
let e=0;
e+=ns[0].fbm(wnx*1.5,wny*1.5,5)*1.0;
e+=ns[2].fbm(wnx*3,wny*3,4)*0.55;
e+=ns[3].fbm(wnx*6,wny*6,3)*0.3*(.5+irr*.5);
e+=ns[4].fbm(wnx*12,wny*12,3)*0.15*irr;
e+=ns[5].fbm(wnx*24,wny*24,2)*0.07*irr;
e+=ns[1].fbm(wnx*48,wny*48,2)*0.03*irr;
e=e/2.1;e=(e+1)/2;
e=Math.pow(e,1.0+frag*0.5);
let minDist=99;
for(const cp of cpts){const ddx=nx-cp.x,ddy=ny-cp.y;
const ang=Math.atan2(ddy,ddx),r=Math.sqrt(ddx*ddx+ddy*ddy);
const wD1=ns[6].fbm(ang*2+cp.x*10,r*4+cp.y*10,3)*.18*(.3+irr*.7);
const wD2=ns[8].fbm(ang*4+cp.x*20+10,r*8+cp.y*20+10,2)*.09*irr;
const wD3=ns[0].n(ang*7+cp.x*30,r*12)*.04*irr;
let d=r+wD1+wD2+wD3;if(d<minDist)minDist=d}
const reach=nc===1?.2+P.landSize*.35:Math.max(.08,(.2-nc*.01)+P.landSize*.2);
const beyond=Math.max(0,minDist-reach*.25)/(reach*.75);
const penalty=beyond*beyond*(1.1+frag*.8);
let ln=e-penalty*.55;
const enL=ns[9].fbm(ny*3.5+1,nx*5,3)*.04,enR=ns[9].fbm(ny*3.5+11,nx*5+10,3)*.04;
const enT=ns[10].fbm(nx*3.5+2,ny*5,3)*.04,enB=ns[10].fbm(nx*3.5+12,ny*5+10,3)*.04;
const eL=nx+enL,eR2=1-nx+enR,eT=ny+enT,eB=1-ny+enB;
const edgeDist=Math.min(Math.min(eL,eR2),Math.min(eT,eB));
const ef=edgeDist<.01?0:edgeDist>.06?1:(edgeDist-.01)/.05;
const efS=ef*ef*(3-2*ef);
ln=ln*efS-.3*(1-efS);
if(ln>seaThresh){
const above=(ln-seaThresh)/(1-seaThresh);
const ewx=ns[2].fbm(wnx*3,wny*3,2)*.06,ewy=ns[3].fbm(wnx*3+30,wny*3+30,2)*.06;
const d1=ns[5].fbm(wnx*5+ewx,wny*5+ewy,4)*.16,d2=ns[6].fbm(wnx*12+ewx,wny*12+ewy,3)*.09;
const d3=ns[2].fbm(wnx*25,wny*25,2)*.05,d4=ns[3].fbm(wnx*50,wny*50,2)*.025;
const d5=ns[4].n(wnx*100,wny*100)*.012,d6=ns[5].n(wnx*200,wny*200)*.005;
const detail=d1+d2+d3+d4+d5+d6;
const vwx=ns[1].fbm(wnx*2.5+10,wny*2.5+10,2)*.1,vwy=ns[0].fbm(wnx*2.5+40,wny*2.5+40,2)*.1;
const valley=ns[7].ridge(wnx*4+vwx,wny*4+vwy,3),valleyCut=Math.max(0,valley-.3)*.4;
const elv=P.elevation*P.elevation*3,coastRamp=Math.min(1,above*20)*.02;
el[i]=seaThresh+(coastRamp+(detail-.15*valleyCut)*.9)*elv;
}else{const below=(seaThresh-ln)/seaThresh;el[i]=seaThresh*(1-below*1.2)}
if(el[i]>seaThresh){
const bm=ns[6].fbm(nx*2.5,ny*2.5,3),msO=P.mountainSpread*15;
const sn2=ns[8].fbm(nx*3.2+10+msO,ny*3.2+10,3)*P.mountainSpread*.4;
const mask=bm+sn2,mTh=.35-P.mountainSpread*.35;
if(mask>mTh){const ms=Math.min(1,(mask-mTh)*2.5),mwx=ns[0].fbm(nx*3,ny*3,2)*.15,mwy=ns[1].fbm(nx*3+20,ny*3+20,2)*.15,mnx=nx+mwx,mny=ny+mwy;
const r1=ns[7].ridge(mnx*6,mny*6,4),r2=ns[7].ridge(mnx*14+50,mny*14+50,3)*.35,r3=ns[7].ridge(mnx*30+80,mny*30+80,2)*.15,r4=ns[7].n(mnx*60,mny*60)*.06,f1=ns[8].fbm(mnx*8,mny*8,3)*.25,f2=ns[8].n(mnx*18,mny*18)*.08;
const rv=Math.max(0,r1*.5+r2+r3+r4+f1+f2)*.8,mh=rv*ms*P.mountainHeight*P.mountainHeight*1.2;mt[i]=mh;el[i]+=mh}}
el[i]=Math.max(0,el[i]);
}}

// BFS coast distance
const sea=seaThresh,cD=new Int16Array(W*H),oD=new Int16Array(W*H);cD.fill(-1);oD.fill(-1);
const queue=[],oQueue=[];let qi=0,oqi=0;const maxDist=80;
for(let py=1;py<H-1;py++)for(let px=1;px<W-1;px++){const i=py*W+px;
if(el[i]>=sea&&(el[i-1]<sea||el[i+1]<sea||el[i-W]<sea||el[i+W]<sea)){cD[i]=0;queue.push(i)}
if(el[i]<sea&&(el[i-1]>=sea||el[i+1]>=sea||el[i-W]>=sea||el[i+W]>=sea)){oD[i]=0;oQueue.push(i)}}
while(qi<queue.length){const ci=queue[qi++],cd=cD[ci];if(cd>=maxDist)continue;for(const ni of[ci-1,ci+1,ci-W,ci+W])if(ni>=0&&ni<W*H&&cD[ni]===-1&&el[ni]>=sea){cD[ni]=cd+1;queue.push(ni)}}
while(oqi<oQueue.length){const ci=oQueue[oqi++],cd=oD[ci];if(cd>=maxDist)continue;for(const ni of[ci-1,ci+1,ci-W,ci+W])if(ni>=0&&ni<W*H&&oD[ni]===-1&&el[ni]<sea){oD[ni]=cd+1;oQueue.push(ni)}}
for(let i=0;i<W*H;i++){if(el[i]>=sea&&cD[i]===-1)cD[i]=maxDist;if(el[i]<sea&&oD[i]===-1)oD[i]=maxDist}

// Temp & Moisture
const temp=new Float32Array(W*H),moist=new Float32Array(W*H);
const tShift=(P.temperature-.5)*.7,mShift=(P.moisture-.5)*.5;
const desS=(P.deserts-.5),forS=(P.forests-.5),tunS=(P.tundra-.5),graS=(P.grasslands-.5);
for(let py=0;py<H;py++)for(let px=0;px<W;px++){const i=py*W+px,nx=px/W,ny=py/H;
let t=1-Math.abs((nx-.5)*tdx+(ny-.5)*tdy)*1.6+tShift;t-=mt[i]*1.8;if(el[i]>sea)t-=((el[i]-sea)/(1-sea))*.2*P.elevation;t+=ns[2].fbm(nx*1.8,ny*1.8,2)*.1;
const tO=tunS*20,tn2=ns[9].fbm(nx*2.8+tO,ny*2.8,2);t-=tunS*.3;t-=Math.max(0,tn2+.3)*tunS*.5;temp[i]=Math.max(0,Math.min(1,t));
let m=.2+mShift;if(el[i]<sea){m=.9}else{const cd=cD[i];m+=Math.max(0,1-cd/maxDist)*.5;m-=Math.max(0,(cd-20)/maxDist)*.1;
let shadow=0;for(let s=3;s<=15;s+=3){const si=((py-wdy*s*3+.5)|0)*W+((px-wdx*s*3+.5)|0);if(si>=0&&si<W*H&&mt[si]>.06)shadow=Math.max(shadow,mt[si]*(1-s/18))}m-=shadow*2.2;
let ww=0;for(let s=3;s<=9;s+=3){const si=((py+wdy*s*3+.5)|0)*W+((px+wdx*s*3+.5)|0);if(si>=0&&si<W*H&&mt[si]>.06)ww=Math.max(ww,mt[si]*(1-s/10))}m+=ww*.5;m+=ns[5].fbm(nx*2,ny*2,2)*.15;
const dO=desS*20,dn=ns[10].fbm(nx*2.2+dO,ny*2.2,2);m-=desS*.25;m-=Math.max(0,dn+.3)*desS*.6;
const fO=forS*20,fn=ns[11].fbm(nx*2.5,ny*2.5+fO,2);m+=forS*.25;m+=Math.max(0,fn+.3)*forS*.6;
const gO=graS*20,gn=ns[9].fbm(nx*3+50+gO,ny*3+50,2);m+=(.35-m)*Math.max(0,gn+.3)*graS*.7;m+=(.35-m)*graS*.2}
moist[i]=Math.max(0,Math.min(1,m))}

// Paint overlay
const pt=paintTypeArr?new Int8Array(paintTypeArr):null,ps=paintStrArr?new Float32Array(paintStrArr):null;
if(pt&&ps)for(let i=0;i<W*H;i++){if(pt[i]===0||ps[i]<.01)continue;const s=ps[i];
switch(pt[i]){case 1:moist[i]=moist[i]*(1-s)+.75*s;temp[i]=temp[i]*(1-s*.3)+.45*s*.3;break;case 2:moist[i]=moist[i]*(1-s)+.08*s;temp[i]=temp[i]*(1-s*.5)+.8*s*.5;break;case 3:temp[i]=temp[i]*(1-s)+.05*s;if(el[i]>=sea)el[i]+=s*.15;break;case 4:if(el[i]>=sea){el[i]+=s*.5;mt[i]+=s*.3}break;case 5:moist[i]=Math.min(1,moist[i]+s*.3);break;case 6:moist[i]=moist[i]*(1-s)+.4*s;temp[i]=temp[i]*(1-s*.3)+.5*s*.3;break;case 7:temp[i]=temp[i]*(1-s)+.12*s;moist[i]=moist[i]*(1-s*.4)+.25*s*.4;break}}

// Rivers
const fEl=new Float32Array(el);
for(let iter=0;iter<5;iter++){let changed=false;for(let py=1;py<H-1;py++)for(let px=1;px<W-1;px++){const i=py*W+px;if(fEl[i]<sea)continue;let hasLower=false,minN=Infinity;for(const di of[-1,1,-W,W,-W-1,-W+1,W-1,W+1]){if(fEl[i+di]<fEl[i]){hasLower=true;break}if(fEl[i+di]<minN)minN=fEl[i+di]}if(!hasLower&&minN<Infinity){fEl[i]=minN+.0002;changed=true}}if(!changed)break}
const flow=new Int32Array(W*H).fill(-1);
for(let py=1;py<H-1;py++)for(let px=1;px<W-1;px++){const i=py*W+px;if(fEl[i]<sea)continue;let minE=fEl[i],minI=-1;for(const di of[-1,1,-W,W,-W-1,-W+1,W-1,W+1])if(fEl[i+di]<minE){minE=fEl[i+di];minI=i+di}flow[i]=minI}
const landPx=[];for(let i=0;i<W*H;i++)if(fEl[i]>=sea)landPx.push(i);landPx.sort((a,b)=>fEl[b]-fEl[a]);
const flux=new Float32Array(W*H);for(const i2 of landPx){flux[i2]=1+moist[i2]*1.5;if(pt&&pt[i2]===5&&ps&&ps[i2]>.01)flux[i2]+=500*ps[i2]}
for(const i2 of landPx){const fi=flow[i2];if(fi>=0&&fi<W*H)flux[fi]+=flux[i2]}
const mouths=[];const mfm=Math.max(40,800*(1-P.rivers)*(1-P.rivers));
for(let py=2;py<H-2;py++)for(let px=2;px<W-2;px++){const i=py*W+px;if(fEl[i]<sea||flux[i]<mfm)continue;const fi=flow[i];if(fi>=0&&fi<W*H&&fEl[fi]<sea)mouths.push({i,f:flux[i]})}
mouths.sort((a,b)=>b.f-a.f);
const inflow=new Array(W*H);for(const i2 of landPx){const fi=flow[i2];if(fi>=0&&fi<W*H){if(!inflow[fi])inflow[fi]=[];inflow[fi].push(i2)}}
const riverSegs=[],onRiver=new Uint8Array(W*H),maxRv=Math.min(mouths.length,Math.round(10+P.rivers*90)),minFl=Math.max(15,300*(1-P.rivers)*(1-P.rivers)),minSL=Math.max(3,20-P.rivers*18|0);
for(let ri=0;ri<maxRv;ri++){const mouth=mouths[ri];if(!mouth||onRiver[mouth.i])continue;const stack=[mouth.i],path=[];
while(stack.length){const ci=stack.pop();if(onRiver[ci]||flux[ci]<minFl)continue;onRiver[ci]=1;path.push({x:ci%W,y:(ci/W)|0,f:flux[ci]});const ups=inflow[ci];if(ups){ups.sort((a,b)=>flux[a]-flux[b]);for(const ui of ups)if(!onRiver[ui]&&flux[ui]>=minFl)stack.push(ui)}}
const sources=[];for(const p of path){const si=p.y*W+p.x,ups=inflow[si];let hasUp=false;if(ups)for(const ui of ups)if(onRiver[ui]&&flux[ui]>=minFl){hasUp=true;break}if(!hasUp)sources.push(si)}
for(const src of sources){const seg=[];let ci=src;for(let step=0;step<4000;step++){seg.push({x:ci%W,y:(ci/W)|0,f:flux[ci]});if(ci===mouth.i)break;const ni=flow[ci];if(ni<0||ni>=W*H||fEl[ni]<sea)break;ci=ni}if(seg.length>minSL)riverSegs.push(seg)}}

// Coloring
const snowThr=.15+(1-P.snowLine)*.3,rockThr=snowThr*.5;
let maxEl=sea+.001;for(let i=0;i<W*H;i++)if(el[i]>maxEl)maxEl=el[i];
const hR=[[32,62,28],[42,78,35],[55,95,42],[72,115,55],[95,135,68],[125,152,88],[152,165,112],[175,178,138],[198,195,168],[222,218,202],[240,238,232]];
const aR2=[[138,98,55],[152,112,68],[168,130,82],[182,148,98],[195,165,115],[205,178,132],[212,190,152],[222,205,172],[232,218,195],[240,232,215],[245,242,235]];
const cR2=[[118,128,125],[132,142,135],[148,155,148],[162,168,160],[175,178,170],[188,192,185],[200,204,198],[215,218,212],[228,230,226],[238,240,238],[244,246,244]];
const smpR=(ramp,lo,f)=>[ramp[lo][0]+(ramp[lo+1][0]-ramp[lo][0])*f,ramp[lo][1]+(ramp[lo+1][1]-ramp[lo][1])*f,ramp[lo][2]+(ramp[lo+1][2]-ramp[lo][2])*f];
const RL=hR.length-1;
const lAz=315*Math.PI/180,lAlt=45*Math.PI/180,lx=Math.cos(lAlt)*Math.sin(lAz),ly=-Math.cos(lAlt)*Math.cos(lAz),lz=Math.sin(lAlt);
const pixels=new Uint8ClampedArray(W*H*4);
for(let py=0;py<H;py++)for(let px=0;px<W;px++){const i=py*W+px,e=el[i],t=temp[i],m=moist[i],mh=mt[i],nx=px/W,ny=py/H;
let r,g,b;
if(e<sea){r=20;g=28;b=56;const od=oD[i];if(od<3){const cw=(1-od/3)*.12;r+=cw*18;g+=cw*22;b+=cw*15}}
else{const landE=Math.max(0,(e-sea)/(maxEl-sea)),eN=Math.min(1,Math.pow(landE,.5));
const hW=Math.max(0,Math.min(1,(m-.15)/.4)),aW=1-hW,coW=Math.max(0,Math.min(1,(.3-t)/.25)),hoW=Math.max(0,Math.min(1,(t-.65)/.2));
const ti=eN*RL,lo=Math.min((ti|0),RL-1),f=ti-lo;const hc=smpR(hR,lo,f),ac=smpR(aR2,lo,f),cc=smpR(cR2,lo,f);
let cr=hc[0]*hW+ac[0]*aW,cg=hc[1]*hW+ac[1]*aW,cb=hc[2]*hW+ac[2]*aW;
if(coW>0){cr=cr*(1-coW)+cc[0]*coW;cg=cg*(1-coW)+cc[1]*coW;cb=cb*(1-coW)+cc[2]*coW}
if(hoW>0&&aW>.3){const hw=hoW*aW*.6;cr=cr*(1-hw)+cr*1.1*hw;cg=cg*(1-hw)+cg*.88*hw;cb=cb*(1-hw)+cb*.72*hw}
if(eN<.35){const lv=ns[5].fbm(nx*10,ny*10,2)*.12,lw=(1-eN/.35)*.6;cr+=lv*35*lw;cg+=lv*25*lw;cb+=lv*15*lw;const dp=ns[10].n(nx*6,ny*6);if(dp>.1){const dpw=Math.min(1,(dp-.1)*2)*lw*.3;cr+=dpw*25;cg+=dpw*12;cb-=dpw*5}}
const cd=cD[i];if(cd<5){const bw=(1-cd/5)*.4;const bc=t>.55?[205,192,148]:t<.25?[168,165,158]:[192,182,148];cr=cr*(1-bw)+bc[0]*bw;cg=cg*(1-bw)+bc[1]*bw;cb=cb*(1-bw)+bc[2]*bw}
const sm2=(v,lo2,hi)=>Math.max(0,Math.min(1,(v-lo2)/(hi-lo2)));
const sEl=1.0-P.snowLine*.55,elSn=sm2(eN,sEl,sEl+.15),mtSn=mh>snowThr*.5?sm2(mh,snowThr*.7,snowThr*1.2):0,coSn=sm2(.2-t,0,.15)*sm2(eN,.5,.7)*P.snowLine;
const snW=Math.min(1,Math.max(elSn,mtSn)+coSn),roW=sm2(mh,rockThr*.3,rockThr)*(1-snW*.7);
if(roW>0){const rn=ns[4].n(nx*50,ny*50)*.06+ns[2].n(nx*120,ny*120)*.03,rk=[138+rn*60,118+rn*50,94+rn*35],rw=roW*(1-snW);cr=cr*(1-rw)+rk[0]*rw;cg=cg*(1-rw)+rk[1]*rw;cb=cb*(1-rw)+rk[2]*rw}
if(snW>0){const sn=ns[3].n(nx*35,ny*35)*.04+ns[5].n(nx*90,ny*90)*.02;cr=cr*(1-snW)+(238+sn*20)*snW;cg=cg*(1-snW)+(240+sn*15)*snW;cb=cb*(1-snW)+(245+sn*10)*snW}
const eL2=px>0?el[i-1]:e,eR3=px<W-1?el[i+1]:e,eU=py>0?el[i-W]:e,eD=py<H-1?el[i+W]:e;
let dzdx=(eR3-eL2),dzdy=(eD-eU);if(px>2&&px<W-3&&py>2&&py<H-3){dzdx=dzdx*.5+(el[i+3]-el[i-3])/6;dzdy=dzdy*.5+(el[i+W*3]-el[i-W*3])/6}
const zS=6+P.elevation*25+P.mountainHeight*20;dzdx*=zS;dzdy*=zS;const len=Math.sqrt(dzdx*dzdx+dzdy*dzdy+1);
let shade=Math.max(0,(-dzdx*lx-dzdy*ly+lz/len)/len);shade=.12+shade*.88;
shade+=ns[3].n(nx*120,ny*120)*.015+ns[4].n(nx*200,ny*200)*.008+ns[5].n(nx*350,ny*350)*.004;
shade=Math.max(.06,Math.min(1.18,shade));
r=cr*shade;g=cg*shade;b=cb*shade;
const cn=ns[0].n(nx*100,ny*100)*.012+ns[2].n(nx*180,ny*180)*.006;r+=cn*14;g+=cn*11;b+=cn*7}
const q=i*4;pixels[q]=r<0?0:r>255?255:(r+.5)|0;pixels[q+1]=g<0?0:g>255?255:(g+.5)|0;pixels[q+2]=b<0?0:b>255?255:(b+.5)|0;pixels[q+3]=255}
self.postMessage({pixels:pixels.buffer,riverSegs,P_rivers:P.rivers},[pixels.buffer]);
};
