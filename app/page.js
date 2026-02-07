'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

class PN {
  constructor(s){this.p=new Uint8Array(512);const r=this.R(s);const t=new Uint8Array(256);for(let i=0;i<256;i++)t[i]=i;for(let i=255;i>0;i--){const j=(r()*i+.5)|0;const tmp=t[i];t[i]=t[j];t[j]=tmp}for(let i=0;i<256;i++){this.p[i]=t[i];this.p[i+256]=t[i]}}
  R(s){return()=>{s=(s*9301+49297)%233280;return s/233280}}
  n(x,y){const p=this.p;const xi=(x|0)-(x<0?1:0),yi=(y|0)-(y<0?1:0),X=xi&255,Y=yi&255,xf=x-xi,yf=y-yi,u=xf*xf*xf*(xf*(xf*6-15)+10),v=yf*yf*yf*(yf*(yf*6-15)+10),a=p[p[X]+Y]/255,b=p[p[X+1]+Y]/255,c=p[p[X]+Y+1]/255,d=p[p[X+1]+Y+1]/255;return(a+(b-a)*u+(c-a+(a-b-c+d)*u)*v)*2-1}
  fbm(x,y,o){let v=0,a=1,f=1,m=0;for(let i=0;i<o;i++){v+=this.n(x*f,y*f)*a;m+=a;a*=.5;f*=2}return v/m}
  ridge(x,y,o){let v=0,a=1,f=1,m=0;for(let i=0;i<o;i++){let n=this.n(x*f,y*f);n=1-(n<0?-n:n);v+=n*n*a;m+=a;a*=.5;f*=2}return v/m}
}
function rng(s){return()=>{s=(s*9301+49297)%233280;return s/233280}}
const CW=1800,CH=1200;

function Sl({label,value,onChange,min,max,step=.01,isInt=false}){
  const r=useRef(null);const[d,sD]=useState(isInt?value:`${Math.round(value*100)}%`);
  useEffect(()=>{if(r.current&&document.activeElement!==r.current)r.current.value=value;sD(isInt?value:`${Math.round(value*100)}%`)},[value,isInt]);
  const h=useCallback(e=>{const v=isInt?parseInt(e.target.value):parseFloat(e.target.value);sD(isInt?v:`${Math.round(v*100)}%`);onChange(v)},[onChange,isInt]);
  return(<div style={{marginBottom:12}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{fontSize:13,color:'#999'}}>{label}</span><span style={{fontSize:12,fontFamily:'monospace',color:'#c9b98a'}}>{d}</span></div><input ref={r} type="range" min={min} max={max} step={step} defaultValue={value} onInput={h} style={{width:'100%'}}/></div>);
}
function Sec({title,children,defaultOpen=true}){
  const[open,setOpen]=useState(defaultOpen);
  return(<div style={{background:'#14151a',border:'1px solid #2a2620',borderRadius:10,marginBottom:10,overflow:'hidden'}}>
    <button onClick={()=>setOpen(!open)} style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',background:'none',border:'none',cursor:'pointer'}}>
      <span style={{fontFamily:"'Cinzel',serif",fontSize:10,letterSpacing:2,color:'#8b7355',textTransform:'uppercase'}}>{title}</span>
      <span style={{color:'#555',fontSize:10,transform:open?'rotate(180deg)':'',transition:'.2s'}}>▼</span>
    </button>{open&&<div style={{padding:'0 14px 14px'}}>{children}</div>}
  </div>);
}
const BT=[{id:'forest',label:'Forest',icon:'🌲',color:'#2d6b2e'},{id:'desert',label:'Desert',icon:'🏜️',color:'#c4a44a'},{id:'snow',label:'Snow',icon:'❄️',color:'#e0e8f0'},{id:'mountain',label:'Mountain',icon:'⛰️',color:'#8a7560'},{id:'water',label:'River',icon:'🌊',color:'#2854a0'},{id:'grassland',label:'Grass',icon:'🌿',color:'#5a8a3c'},{id:'tundra',label:'Tundra',icon:'🧊',color:'#8a9088'},{id:'erase',label:'Erase',icon:'🧹',color:'#555'}];
const STY={fantasy:{n:'Fantasy',i:'🏰'},parchment:{n:'Parchment',i:'📜'},satellite:{n:'Relief Map',i:'🌐'},watercolor:{n:'Watercolor',i:'🖌️'},tolkien:{n:'Tolkien',i:'🧙'},scifi:{n:'Sci-Fi',i:'🚀'}};

export default function App(){
  const cv=useRef(null);
  const[seed,setSeed]=useState(42000);
  const pr=useRef({continents:1,landSize:.7,irregularity:.7,seaLevel:.2,elevation:.7,mountainHeight:.7,mountainSpread:.5,temperature:.5,moisture:.5,snowLine:.5,deserts:.5,forests:.5,tundra:.5,grasslands:.5,rivers:.5,fragmentation:.5});
  const[P,sP]=useState(pr.current);const rf=useRef(null);
  useEffect(()=>{setSeed(Math.floor(Math.random()*100000))},[]);
  const up=useCallback((k,v)=>{pr.current={...pr.current,[k]:v};if(rf.current)cancelAnimationFrame(rf.current);rf.current=requestAnimationFrame(()=>sP({...pr.current}))},[]);

  // Paint system
  const paintType=useRef(null),paintStr=useRef(null),overlayCv=useRef(null);
  const[brush,setBrush]=useState(null),[brushSize,setBrushSize]=useState(25),[brushOpacity,setBrushOpacity]=useState(.7);
  const paintingRef=useRef(false),[undoStack,setUndoStack]=useState([]);
  const lastPt=useRef(null),paintedRivers=useRef([]),currentRiverStroke=useRef(null);
  const initPaint=useCallback(()=>{paintType.current=new Int8Array(CW*CH);paintStr.current=new Float32Array(CW*CH)},[]);
  useEffect(()=>{initPaint()},[initPaint]);

  // AI Enhance state
  const[apiKey,setApiKey]=useState('');const[showKey,setShowKey]=useState(false);
  const[aiStyle,setAiStyle]=useState('fantasy');const[aiStr,setAiStr]=useState(.65);
  const[gen,setGen]=useState(false);const[err,setErr]=useState(null);
  const[aiResult,setAiResult]=useState(null);

  const doEnhance=useCallback(async()=>{
    if(!apiKey){setShowKey(true);setErr('Enter your Replicate API key first');return}
    const c=cv.current;if(!c)return;
    setGen(true);setErr(null);setAiResult(null);
    try{
      // Downscale canvas to 1024x682 to avoid GPU OOM on Replicate
      const sc=document.createElement('canvas');sc.width=1024;sc.height=682;
      const sctx=sc.getContext('2d');sctx.drawImage(c,0,0,1024,682);
      const dataUrl=sc.toDataURL('image/png');
      const res=await fetch('/api/enhance',{method:'POST',
        headers:{'Content-Type':'application/json','x-replicate-token':apiKey},
        body:JSON.stringify({image:dataUrl,style:aiStyle,strength:aiStr})});
      const data=await res.json();
      if(data.error)throw new Error(data.error);
      if(data.status==='succeeded'){setAiResult(data.output);setGen(false);return}
      // Poll for result
      const predId=data.id;
      for(let i=0;i<60;i++){
        await new Promise(r=>setTimeout(r,2000));
        const pr2=await fetch(`/api/status?id=${predId}`,{headers:{'x-replicate-token':apiKey}});
        const pd=await pr2.json();
        if(pd.error)throw new Error(pd.error);
        if(pd.status==='succeeded'){setAiResult(pd.output);setGen(false);return}
        if(pd.status==='failed')throw new Error(pd.error||'Generation failed');
      }
      throw new Error('Timed out waiting for result');
    }catch(e){setErr(e.message);setGen(false)}
  },[apiKey,aiStyle,aiStr]);

  const downloadMap=useCallback(()=>{
    const c=cv.current;if(!c)return;
    const link=document.createElement('a');link.download=`fantasy-map-${seed}.png`;
    link.href=c.toDataURL('image/png');link.click();
  },[seed]);

  // Paint helpers
  const toCanvas=useCallback(e=>{const c=cv.current;if(!c)return null;const rect=c.getBoundingClientRect();return{x:Math.round((e.clientX-rect.left)*CW/rect.width),y:Math.round((e.clientY-rect.top)*CH/rect.height)}},[]);
  const drawOverlayCircle=useCallback((cx,cy)=>{const oc=overlayCv.current;if(!oc)return;const octx=oc.getContext('2d');const bType=BT.find(b2=>b2.id===brush);if(!bType)return;if(brush==='water'){const last=currentRiverStroke.current;if(last&&last.length>0){const prev=last[last.length-1];octx.strokeStyle='rgba(40,84,160,.8)';octx.lineWidth=2.5;octx.lineCap='round';octx.beginPath();octx.moveTo(prev.x,prev.y);octx.lineTo(cx,cy);octx.stroke()}else{octx.fillStyle='rgba(40,84,160,.8)';octx.beginPath();octx.arc(cx,cy,2,0,Math.PI*2);octx.fill()}return}const r=brushSize;const grad=octx.createRadialGradient(cx,cy,0,cx,cy,r);const co=bType.color;grad.addColorStop(0,co+(brush==='erase'?'80':'60'));grad.addColorStop(.7,co+(brush==='erase'?'40':'35'));grad.addColorStop(1,co+'00');if(brush==='erase'){octx.globalCompositeOperation='destination-out';octx.beginPath();octx.arc(cx,cy,r,0,Math.PI*2);octx.fillStyle=`rgba(0,0,0,${brushOpacity})`;octx.fill();octx.globalCompositeOperation='source-over'}else{octx.fillStyle=grad;octx.beginPath();octx.arc(cx,cy,r,0,Math.PI*2);octx.fill()}},[brush,brushSize,brushOpacity]);
  const writePaintData=useCallback((cx,cy)=>{if(!paintType.current)return;const W=CW,H=CH;const typeIdx=brush==='erase'?0:BT.findIndex(b2=>b2.id===brush)+1;const r=brushSize,r2=r*r;const x0=Math.max(0,cx-r),x1=Math.min(W-1,cx+r),y0=Math.max(0,cy-r),y1=Math.min(H-1,cy+r);for(let py=y0;py<=y1;py++){const dy=py-cy,dy2=dy*dy;for(let px=x0;px<=x1;px++){const dx=px-cx,d2=dx*dx+dy2;if(d2>r2)continue;const fo=1-Math.sqrt(d2)/r,s=fo*fo*brushOpacity,i=py*W+px;if(brush==='erase'){paintStr.current[i]*=(1-s);if(paintStr.current[i]<.01){paintType.current[i]=0;paintStr.current[i]=0}}else{if(paintType.current[i]===typeIdx)paintStr.current[i]=Math.min(1,paintStr.current[i]+s*.3);else if(s>paintStr.current[i]*.5){paintType.current[i]=typeIdx;paintStr.current[i]=Math.min(1,s)}}}}},[brush,brushSize,brushOpacity]);
  const paintLine=useCallback((x0,y0,x1,y1)=>{const dx=x1-x0,dy=y1-y0,dist=Math.sqrt(dx*dx+dy*dy),steps=Math.max(1,Math.floor(dist/(brushSize*.3)));for(let s=0;s<=steps;s++){const t=s/steps;drawOverlayCircle(Math.round(x0+dx*t),Math.round(y0+dy*t));writePaintData(Math.round(x0+dx*t),Math.round(y0+dy*t))}},[brushSize,drawOverlayCircle,writePaintData]);
  const saveUndo=useCallback(()=>{if(!paintType.current)return;setUndoStack(prev=>[...prev.slice(-15),{type:new Int8Array(paintType.current),str:new Float32Array(paintStr.current),rivers:paintedRivers.current.map(p=>[...p])}])},[]);
  const undo=useCallback(()=>{setUndoStack(prev=>{if(!prev.length)return prev;const last=prev[prev.length-1];paintType.current=new Int8Array(last.type);paintStr.current=new Float32Array(last.str);paintedRivers.current=last.rivers||[];sP(p=>({...p}));return prev.slice(0,-1)})},[]);
  const clearPaint=useCallback(()=>{saveUndo();initPaint();paintedRivers.current=[];const oc=overlayCv.current;if(oc)oc.getContext('2d').clearRect(0,0,CW,CH);sP(p=>({...p}))},[saveUndo,initPaint]);
  const onMouseDown=useCallback(e=>{if(!brush)return;const p=toCanvas(e);if(!p)return;saveUndo();paintingRef.current=true;lastPt.current=p;drawOverlayCircle(p.x,p.y);writePaintData(p.x,p.y);if(brush==='water')currentRiverStroke.current=[{x:p.x,y:p.y}]},[brush,toCanvas,saveUndo,drawOverlayCircle,writePaintData]);
  const onMouseMove=useCallback(e=>{if(!paintingRef.current||!brush)return;const p=toCanvas(e);if(!p)return;const lp=lastPt.current||p;paintLine(lp.x,lp.y,p.x,p.y);lastPt.current=p;if(brush==='water'&&currentRiverStroke.current){const last=currentRiverStroke.current,prev=last[last.length-1],d=Math.sqrt((p.x-prev.x)**2+(p.y-prev.y)**2);if(d>3)last.push({x:p.x,y:p.y})}},[brush,toCanvas,paintLine]);
  const finishPaint=useCallback(()=>{if(paintingRef.current){paintingRef.current=false;lastPt.current=null;if(currentRiverStroke.current&&currentRiverStroke.current.length>2)paintedRivers.current.push(currentRiverStroke.current);currentRiverStroke.current=null;sP(p=>({...p}))}},[]);

  // ——— RENDER ———
  const render=useCallback(()=>{
    const c=cv.current;if(!c)return;
    const ctx=c.getContext('2d'),W=c.width,H=c.height,im=ctx.createImageData(W,H),R=rng(seed);
    const ns=[];for(let i=0;i<12;i++)ns.push(new PN(seed+i*377));
    const windAng=R()*Math.PI*2,wdx=Math.cos(windAng),wdy=Math.sin(windAng);
    const tAng=R()*Math.PI*2,tdx=Math.cos(tAng),tdy=Math.sin(tAng);
    const warpAng=R()*Math.PI*2;
    const nc=P.continents,seaThresh=.01+P.seaLevel*.5;
    const el=new Float32Array(W*H),mt=new Float32Array(W*H);
    const irr=P.irregularity, frag=P.fragmentation;

    const cRng=rng(seed+999);const cpts=[];
    if(nc===1){
      const rs=cRng();
      cpts.push({x:.5+(cRng()-.5)*.12,y:.5+(cRng()-.5)*.12,ang:cRng()*Math.PI,stretch:.3+rs*.35,nOfs:cRng()*100});
    }else{
      for(let ci=0;ci<nc;ci++){let best=null,bestS=0;
        for(let a=0;a<40;a++){const px=.12+cRng()*.76,py=.12+cRng()*.76;let minD=99;
          for(const cp of cpts){const dd=Math.sqrt((px-cp.x)**2+(py-cp.y)**2);if(dd<minD)minD=dd}
          const score=minD-.15*Math.sqrt((px-.5)**2+(py-.5)**2);
          if(!cpts.length||score>bestS){bestS=score;best={x:px,y:py}}}
        if(best){best.ang=cRng()*Math.PI;best.stretch=.45+cRng()*.7;best.nOfs=cRng()*100;cpts.push(best)}}
    }

    for(let py=0;py<H;py++){for(let px=0;px<W;px++){
      const i=py*W+px,nx=px/W,ny=py/H;
      const w1x=ns[1].fbm(nx*2.5+warpAng,ny*2.5,4)*.07*irr;
      const w1y=ns[1].fbm(nx*2.5+50,ny*2.5+warpAng,4)*.07*irr;
      const w2x=ns[3].fbm((nx+w1x)*6,ny*6,3)*.025*irr;
      const w2y=ns[3].fbm(nx*6,(ny+w1y)*6+30,3)*.025*irr;
      const w3x=ns[4].fbm((nx+w2x)*15,ny*15,2)*.008*irr;
      const w3y=ns[4].fbm(nx*15,(ny+w2y)*15+60,2)*.008*irr;
      const wnx=nx+w1x+w2x+w3x,wny=ny+w1y+w2y+w3y;

      let terrainNoise=0;
      terrainNoise+=ns[0].fbm(wnx*1.8,wny*1.8,4)*.36;
      terrainNoise+=ns[2].fbm(wnx*3.5,wny*3.5,4)*.17;
      terrainNoise+=ns[3].fbm(wnx*7,wny*7,3)*.08*(.5+irr*.5);
      terrainNoise+=ns[4].fbm(wnx*14,wny*14,3)*.04*irr;
      terrainNoise+=ns[5].fbm(wnx*28,wny*28,2)*.02*irr;
      terrainNoise+=ns[1].fbm(wnx*56,wny*56,2)*.009*irr;

      let contPull=0;
      if(nc===1){
        const cp=cpts[0],dx=nx-cp.x,dy=ny-cp.y;
        const ca=Math.cos(cp.ang),sa=Math.sin(cp.ang);
        const lx=dx*ca+dy*sa,ly=(-dx*sa+dy*ca)*cp.stretch;
        let dd=Math.sqrt(lx*lx+ly*ly);
        const ang=Math.atan2(dy,dx);
        // Boundary noise for organic coastlines — NOT amplified by frag
        dd+=ns[6].fbm(ang*1.2+cp.nOfs,dd*6,3)*.06*(.3+irr*.7);
        dd+=ns[8].fbm(ang*2.5+cp.nOfs+20,dd*12,2)*.025*irr;
        dd+=ns[0].n(ang*5+cp.nOfs+50,dd*20)*.01*irr;
        // Clamp radius so continent fits within canvas (account for center offset + stretch)
        const maxRadius=Math.min(.42, .5-Math.abs(cp.x-.5)-.06, (.5-Math.abs(cp.y-.5)-.06)/Math.max(.3,cp.stretch));
        const radius=Math.min(.15+P.landSize*.35, maxRadius);
        // Smooth falloff from 1 at center to 0 at radius
        contPull=dd<radius?Math.pow(1-dd/radius,.3):0; // .3 exponent = very flat interior, sharp edge
      }else{
        const sz=Math.max(.14,(.55-nc*.03)*P.landSize);
        let bestDist=99,secondDist=99;
        for(const cp of cpts){
          const dx=nx-cp.x,dy=ny-cp.y;
          const ca=Math.cos(cp.ang),sa=Math.sin(cp.ang);
          const lx=dx*ca+dy*sa,ly=(-dx*sa+dy*ca)*cp.stretch;
          let dd=Math.sqrt(lx*lx+ly*ly);
          const ang=Math.atan2(dy,dx);
          dd+=ns[6].fbm(ang*1.5+cp.nOfs,dd*8,2)*.04*(.3+irr*.7);
          if(dd<bestDist){secondDist=bestDist;bestDist=dd}
          else if(dd<secondDist)secondDist=dd;
        }
        contPull=bestDist<sz?Math.pow(1-bestDist/sz,.3):0;
        const ratio=bestDist/(secondDist+.001);
        if(ratio>.5)contPull*=Math.max(0,1-((ratio-.5)/.5)*.6);
      }

      // Combine: noise amplitude scales with (1-contPull) so interior is solid
      // frag controls how much noise affects the transition zone
      // Interior (contPull≈1): noise is suppressed → guaranteed land
      // Edge (contPull≈0): full noise → ocean
      // Transition: frag controls noise strength → coastline complexity
      const noiseScale=1-contPull*(1-frag*.7); // interior: noise*frag*.7, edge: noise*1
      let ln=contPull*.9+terrainNoise*noiseScale*.5+.05;

      const enL=ns[9].fbm(ny*3.5+1,nx*5,3)*.12;
      const enR=ns[9].fbm(ny*3.5+11,nx*5+10,3)*.12;
      const enT=ns[10].fbm(nx*3.5+2,ny*5,3)*.12;
      const enB=ns[10].fbm(nx*3.5+12,ny*5+10,3)*.12;
      const eL=nx+enL,eR2=1-nx+enR,eT=ny+enT,eB=1-ny+enB;
      const edgeDist=Math.min(Math.min(eL,eR2),Math.min(eT,eB));
      const ef=edgeDist<.02?0:edgeDist>.14?1:((edgeDist-.02)/(.12));
      const efS=ef*ef*(3-2*ef);
      ln=ln*efS-.2*(1-efS);

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
    const pt=paintType.current,ps=paintStr.current;
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
    const coldR=[[118,128,125],[132,142,135],[148,155,148],[162,168,160],[175,178,170],[188,192,185],[200,204,198],[215,218,212],[228,230,226],[238,240,238],[244,246,244]];
    const smpR=(ramp,lo,f)=>[ramp[lo][0]+(ramp[lo+1][0]-ramp[lo][0])*f,ramp[lo][1]+(ramp[lo+1][1]-ramp[lo][1])*f,ramp[lo][2]+(ramp[lo+1][2]-ramp[lo][2])*f];
    const RL=hR.length-1;
    const lAz=315*Math.PI/180,lAlt=45*Math.PI/180,lx=Math.cos(lAlt)*Math.sin(lAz),ly=-Math.cos(lAlt)*Math.cos(lAz),lz=Math.sin(lAlt);

    for(let py=0;py<H;py++)for(let px=0;px<W;px++){const i=py*W+px,e=el[i],t=temp[i],m=moist[i],mh=mt[i],nx=px/W,ny=py/H;
      let r,g,b;
      if(e<sea){r=20;g=28;b=56;const od=oD[i];if(od<3){const cw=(1-od/3)*.12;r+=cw*18;g+=cw*22;b+=cw*15}}
      else{const landE=Math.max(0,(e-sea)/(maxEl-sea)),eN=Math.min(1,Math.pow(landE,.5));
        const hW=Math.max(0,Math.min(1,(m-.15)/.4)),aW=1-hW,coW=Math.max(0,Math.min(1,(.3-t)/.25)),hoW=Math.max(0,Math.min(1,(t-.65)/.2));
        const ti=eN*RL,lo=Math.min((ti|0),RL-1),f=ti-lo;const hc=smpR(hR,lo,f),ac=smpR(aR2,lo,f),cc=smpR(coldR,lo,f);
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
      const q=i*4;im.data[q]=r<0?0:r>255?255:(r+.5)|0;im.data[q+1]=g<0?0:g>255?255:(g+.5)|0;im.data[q+2]=b<0?0:b>255?255:(b+.5)|0;im.data[q+3]=255}
    ctx.putImageData(im,0,0);

    // Rivers
    if(P.rivers>.02){ctx.lineCap='round';ctx.lineJoin='round';
      riverSegs.sort((a,b2)=>{let ma=0,mb=0;for(const p of a)if(p.f>ma)ma=p.f;for(const p of b2)if(p.f>mb)mb=p.f;return ma-mb});
      let gmf=1;for(const seg of riverSegs)for(const p of seg)if(p.f>gmf)gmf=p.f;
      for(const seg of riverSegs){if(seg.length<4)continue;const step=Math.max(1,Math.min(8,(seg.length/30)|0));const pts=[];for(let j=0;j<seg.length;j+=step)pts.push(seg[j]);if(pts[pts.length-1]!==seg[seg.length-1])pts.push(seg[seg.length-1]);if(pts.length<2)continue;
        for(let j=1;j<pts.length;j++){const p0=pts[j-1],p1=pts[j],f=(p0.f+p1.f)*.5,norm=f/gmf,w=(.3+norm*4)*(.5+P.rivers);ctx.globalAlpha=Math.min(1,.35+norm*.65);ctx.strokeStyle=`rgb(${38-norm*15|0},${65-norm*15|0},${130+norm*40|0})`;ctx.lineWidth=Math.max(.3,w);ctx.beginPath();ctx.moveTo(p0.x,p0.y);if(j<pts.length-1){const p2=pts[j+1];ctx.quadraticCurveTo(p1.x,p1.y,(p1.x+p2.x)*.5,(p1.y+p2.y)*.5)}else ctx.lineTo(p1.x,p1.y);ctx.stroke()}}ctx.globalAlpha=1}
    const pRv=paintedRivers.current;if(pRv&&pRv.length>0){ctx.lineCap='round';ctx.lineJoin='round';for(const path of pRv){if(path.length<2)continue;ctx.strokeStyle='rgb(28,58,135)';ctx.globalAlpha=.9;ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);for(let j=1;j<path.length;j++){if(j<path.length-1){const p1=path[j],p2=path[j+1];ctx.quadraticCurveTo(p1.x,p1.y,(p1.x+p2.x)*.5,(p1.y+p2.y)*.5)}else ctx.lineTo(path[j].x,path[j].y)}ctx.stroke()}ctx.globalAlpha=1}
    const oc=overlayCv.current;if(oc)oc.getContext('2d').clearRect(0,0,W,H);
  },[seed,P]);

  useEffect(()=>{render()},[render]);
  useEffect(()=>{const h=e=>{if((e.metaKey||e.ctrlKey)&&e.key==='z'){e.preventDefault();undo()}};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)},[undo]);

  return(
    <div style={{background:'#0b0c10',color:'#d4cfc6',fontFamily:"'Nunito Sans',sans-serif",height:'100vh',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Nunito+Sans:ital,opsz,wght@0,6..12,300;0,6..12,400;0,6..12,600&display=swap" rel="stylesheet"/>
      <style>{`input[type=range]{-webkit-appearance:none;appearance:none;height:4px;background:#2a2620;border-radius:2px;outline:none;cursor:pointer}input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;background:#c9b98a;border-radius:50%;cursor:grab;border:2px solid #0b0c10;box-shadow:0 1px 3px rgba(0,0,0,.4)}input[type=range]::-webkit-slider-thumb:active{cursor:grabbing;background:#e8d9a8}input[type=range]::-moz-range-thumb{width:14px;height:14px;background:#c9b98a;border-radius:50%;cursor:grab;border:2px solid #0b0c10}input[type=range]::-moz-range-track{height:4px;background:#2a2620;border-radius:2px;border:none}*::-webkit-scrollbar{width:6px}*::-webkit-scrollbar-track{background:transparent}*::-webkit-scrollbar-thumb{background:#2a2620;border-radius:3px}*::-webkit-scrollbar-thumb:hover{background:#3a3630}`}</style>
      <div style={{textAlign:'center',padding:'10px 0 8px',flexShrink:0,borderBottom:'1px solid #1a1b20'}}>
        <h1 style={{fontFamily:"'Cinzel',serif",fontSize:'1.4rem',fontWeight:600,color:'#c9b98a',letterSpacing:3,margin:0}}>⚔ Fantasy Map Generator</h1>
      </div>
      <div style={{display:'flex',flex:1,minHeight:0}}>
        <div style={{width:260,flexShrink:0,overflowY:'auto',padding:'10px 10px 10px 12px',borderRight:'1px solid #1a1b20'}}>
          <div style={{display:'flex',gap:5,marginBottom:8}}>
            <input type="number" value={seed} onChange={e=>setSeed(parseInt(e.target.value)||0)} style={{flex:1,background:'#14151a',border:'1px solid #2a2620',borderRadius:6,padding:'5px 7px',color:'#d4cfc6',fontFamily:'monospace',fontSize:12,outline:'none'}}/>
            <button onClick={()=>setSeed(Math.floor(Math.random()*100000))} style={{background:'#14151a',border:'1px solid #2a2620',borderRadius:6,padding:'5px 10px',color:'#d4cfc6',cursor:'pointer',fontSize:14}}>🎲</button>
          </div>
          <Sec title="Terrain">
            <Sl label="Continents" value={P.continents} min={1} max={10} step={1} isInt onChange={v=>up('continents',v)}/>
            <Sl label="Land Size" value={P.landSize} min={.2} max={1} onChange={v=>up('landSize',v)}/>
            <Sl label="Sea Level" value={P.seaLevel} min={.05} max={.7} onChange={v=>up('seaLevel',v)}/>
            <Sl label="Coast Detail" value={P.irregularity} min={0} max={1} onChange={v=>up('irregularity',v)}/>
            <Sl label="Fragmentation" value={P.fragmentation} min={0} max={1} onChange={v=>up('fragmentation',v)}/>
          </Sec>
          <Sec title="Height">
            <Sl label="Elevation" value={P.elevation} min={.1} max={1} onChange={v=>up('elevation',v)}/>
            <Sl label="Peak Height" value={P.mountainHeight} min={0} max={1} onChange={v=>up('mountainHeight',v)}/>
            <Sl label="Peak Spread" value={P.mountainSpread} min={0} max={1} onChange={v=>up('mountainSpread',v)}/>
          </Sec>
          <Sec title="Climate">
            <Sl label="Temperature" value={P.temperature} min={0} max={1} onChange={v=>up('temperature',v)}/>
            <Sl label="Moisture" value={P.moisture} min={0} max={1} onChange={v=>up('moisture',v)}/>
          </Sec>
          <Sec title="Water"><Sl label="Rivers" value={P.rivers} min={0} max={1} onChange={v=>up('rivers',v)}/></Sec>
          <Sec title="Biomes">
            <Sl label="Snow / Ice" value={P.snowLine} min={0} max={1} onChange={v=>up('snowLine',v)}/>
            <Sl label="Tundra" value={P.tundra} min={0} max={1} onChange={v=>up('tundra',v)}/>
            <Sl label="Forests" value={P.forests} min={0} max={1} onChange={v=>up('forests',v)}/>
            <Sl label="Grasslands" value={P.grasslands} min={0} max={1} onChange={v=>up('grasslands',v)}/>
            <Sl label="Deserts" value={P.deserts} min={0} max={1} onChange={v=>up('deserts',v)}/>
          </Sec>

          <Sec title="Export" defaultOpen={false}>
            <button onClick={downloadMap} style={{width:'100%',padding:7,border:'1px solid #2a2620',background:'#14151a',borderRadius:6,color:'#c9b98a',cursor:'pointer',fontSize:11,fontFamily:"'Cinzel',serif"}}>⬇ Save Map as PNG</button>
          </Sec>

          <Sec title="AI Enhance" defaultOpen={false}>
            <div style={{marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                <span style={{color:apiKey?'#7a9e6b':'#666',fontSize:11}}>{apiKey?'✦ Key set':'◇ Replicate API Key'}</span>
                <button onClick={()=>setShowKey(!showKey)} style={{background:'none',border:'none',color:'#c9b98a',cursor:'pointer',fontSize:10,fontFamily:"'Cinzel',serif"}}>{apiKey?'Edit':'Set'}</button>
              </div>
              {showKey&&<div style={{display:'flex',gap:3,marginBottom:6}}><input type="password" placeholder="r8_..." id="kI" onKeyDown={e=>{if(e.key==='Enter'){setApiKey(e.target.value);setShowKey(false)}}} style={{flex:1,background:'#1a1b20',border:'1px solid #2a2620',borderRadius:5,padding:'4px 6px',color:'#d4cfc6',fontSize:11,fontFamily:'monospace',outline:'none'}}/><button onClick={()=>{const e=document.getElementById('kI');if(e){setApiKey(e.value);setShowKey(false)}}} style={{background:'#8b7355',border:'none',borderRadius:5,padding:'4px 10px',color:'#0b0c10',fontSize:10,cursor:'pointer'}}>Save</button></div>}
            </div>
            <div style={{marginBottom:8}}>
              <span style={{fontSize:10,color:'#666',display:'block',marginBottom:4}}>Style</span>
              <div style={{display:'flex',flexWrap:'wrap',gap:3}}>
                {Object.entries(STY).map(([k,v])=>(
                  <button key={k} onClick={()=>setAiStyle(k)} style={{background:aiStyle===k?'#2a2318':'#1a1b20',border:`1px solid ${aiStyle===k?'#8b7355':'#2a2620'}`,borderRadius:5,padding:'3px 7px',color:aiStyle===k?'#c9b98a':'#777',cursor:'pointer',fontSize:10}}>{v.i} {v.n}</button>
                ))}
              </div>
            </div>
            <div style={{marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                <span style={{fontSize:10,color:'#666'}}>Transform Strength</span>
                <span style={{fontSize:10,color:'#8b7355',fontFamily:'monospace'}}>{Math.round(aiStr*100)}%</span>
              </div>
              <input type="range" min={.3} max={.9} step={.05} value={aiStr} onChange={e=>setAiStr(parseFloat(e.target.value))} style={{width:'100%'}}/>
            </div>
            <button onClick={doEnhance} disabled={gen} style={{width:'100%',padding:8,border:'1px solid #8b7355',background:'linear-gradient(135deg,#2a2318,#1a1510)',borderRadius:8,color:'#c9b98a',fontFamily:"'Cinzel',serif",fontSize:12,fontWeight:600,cursor:gen?'not-allowed':'pointer',letterSpacing:1,opacity:gen?.5:1}}>{gen?'Generating...':'✦ AI Enhance'}</button>
            {err&&<div style={{marginTop:4,background:'rgba(180,60,40,.15)',border:'1px solid #8b3a2a',borderRadius:6,padding:5,color:'#d4836a',fontSize:10,wordBreak:'break-word'}}>{err}</div>}
            {aiResult&&<div style={{marginTop:6}}>
              <img src={aiResult} alt="AI Enhanced" style={{width:'100%',borderRadius:6,border:'1px solid #2a2620'}}/>
              <div style={{display:'flex',gap:4,marginTop:4}}>
                <a href={aiResult} download={`fantasy-map-ai-${seed}.png`} style={{flex:1,textAlign:'center',padding:4,background:'#14151a',border:'1px solid #2a2620',borderRadius:5,color:'#c9b98a',fontSize:10,textDecoration:'none',cursor:'pointer'}}>⬇ Download</a>
                <a href={aiResult} target="_blank" rel="noreferrer" style={{flex:1,textAlign:'center',padding:4,background:'#14151a',border:'1px solid #2a2620',borderRadius:5,color:'#c9b98a',fontSize:10,textDecoration:'none'}}>Open Full ↗</a>
                <button onClick={()=>setAiResult(null)} style={{padding:'4px 8px',background:'#14151a',border:'1px solid #2a2620',borderRadius:5,color:'#777',fontSize:10,cursor:'pointer'}}>✕</button>
              </div>
            </div>}
          </Sec>
        </div>
        <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',minHeight:0}}>
          <div style={{flexShrink:0,background:'#111218',borderBottom:'1px solid #1a1b20',padding:'6px 12px',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
            <div style={{display:'flex',gap:3}}>{BT.map(b=>(
              <button key={b.id} onClick={()=>setBrush(brush===b.id?null:b.id)} title={b.label}
                style={{background:brush===b.id?'#2a2318':'transparent',border:`1px solid ${brush===b.id?'#8b7355':'#2a2620'}`,borderRadius:6,padding:'4px 8px',cursor:'pointer',fontSize:15,lineHeight:1,color:brush===b.id?'#c9b98a':'#777',display:'flex',alignItems:'center',gap:4}}>
                <span>{b.icon}</span>{brush===b.id&&<span style={{fontSize:10}}>{b.label}</span>}
              </button>))}</div>
            <div style={{width:1,height:24,background:'#2a2620',flexShrink:0}}/>
            <div style={{display:'flex',alignItems:'center',gap:5}}><span style={{fontSize:10,color:'#666'}}>Size</span><input type="range" min={5} max={80} step={1} value={brushSize} onChange={e=>setBrushSize(parseInt(e.target.value))} style={{width:70}}/><span style={{fontSize:10,color:'#8b7355',fontFamily:'monospace'}}>{brushSize}</span></div>
            <div style={{display:'flex',alignItems:'center',gap:5}}><span style={{fontSize:10,color:'#666'}}>Opacity</span><input type="range" min={.1} max={1} step={.05} value={brushOpacity} onChange={e=>setBrushOpacity(parseFloat(e.target.value))} style={{width:60}}/></div>
            <div style={{width:1,height:24,background:'#2a2620',flexShrink:0}}/>
            <button onClick={undo} title="Undo (Ctrl+Z)" style={{background:'transparent',border:'1px solid #2a2620',borderRadius:5,padding:'3px 8px',color:'#777',cursor:'pointer',fontSize:12}}>↩</button>
            <button onClick={clearPaint} title="Clear all paint" style={{background:'transparent',border:'1px solid #2a2620',borderRadius:5,padding:'3px 8px',color:'#777',cursor:'pointer',fontSize:12}}>✕</button>
            {brush&&<span style={{fontSize:10,color:'#8b7355',marginLeft:'auto'}}>🖌 {BT.find(b2=>b2.id===brush)?.label}</span>}
          </div>
          <div style={{flex:1,minHeight:0,padding:8,display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
            <div style={{position:'relative',maxWidth:'100%',maxHeight:'100%',aspectRatio:'3/2'}}>
              <canvas ref={cv} width={CW} height={CH} style={{width:'100%',height:'100%',borderRadius:8,display:'block',boxShadow:'0 2px 20px rgba(0,0,0,.4)'}}/>
              <canvas ref={overlayCv} width={CW} height={CH} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={finishPaint} onMouseLeave={finishPaint}
                style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',borderRadius:8,cursor:brush?'crosshair':'default',pointerEvents:brush?'auto':'none'}}/>
            </div>
          </div>
        </div>
      </div>
    </div>);
}
