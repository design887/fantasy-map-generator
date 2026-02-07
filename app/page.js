"use client";
import { useState, useRef, useEffect, useCallback } from 'react';

// ═══ Perlin Noise ═══
class PN {
  constructor(s){this.p=new Uint8Array(512);const r=this.R(s);const t=new Uint8Array(256);for(let i=0;i<256;i++)t[i]=i;for(let i=255;i>0;i--){const j=(r()*i+.5)|0;const tmp=t[i];t[i]=t[j];t[j]=tmp}for(let i=0;i<256;i++){this.p[i]=t[i];this.p[i+256]=t[i]}}
  R(s){return()=>{s=(s*9301+49297)%233280;return s/233280}}
  n(x,y){const p=this.p;const xi=(x|0)-(x<0?1:0),yi=(y|0)-(y<0?1:0),X=xi&255,Y=yi&255,xf=x-xi,yf=y-yi,u=xf*xf*xf*(xf*(xf*6-15)+10),v=yf*yf*yf*(yf*(yf*6-15)+10),a=p[p[X]+Y]/255,b=p[p[X+1]+Y]/255,c=p[p[X]+Y+1]/255,d=p[p[X+1]+Y+1]/255;return(a+(b-a)*u+(c-a+(a-b-c+d)*u)*v)*2-1}
  fbm(x,y,o){let v=0,a=1,f=1,m=0;for(let i=0;i<o;i++){v+=this.n(x*f,y*f)*a;m+=a;a*=.5;f*=2}return v/m}
  ridge(x,y,o){let v=0,a=1,f=1,m=0;for(let i=0;i<o;i++){let n=this.n(x*f,y*f);n=1-(n<0?-n:n);v+=n*n*a;m+=a;a*=.5;f*=2}return v/m}
}
function rng(s){return()=>{s=(s*9301+49297)%233280;return s/233280}}

const CW=2400,CH=1600;

// ═══ Binary Heap for priority queue (fast flood-fill growth) ═══
class MinHeap {
  constructor(){this.data=[]}
  push(item){this.data.push(item);this._up(this.data.length-1)}
  pop(){const top=this.data[0],last=this.data.pop();if(this.data.length>0){this.data[0]=last;this._down(0)}return top}
  get size(){return this.data.length}
  _up(i){const d=this.data;while(i>0){const p=(i-1)>>1;if(d[p].p<=d[i].p)break;[d[p],d[i]]=[d[i],d[p]];i=p}}
  _down(i){const d=this.data,n=d.length;while(true){let s=i;const l=2*i+1,r=2*i+2;if(l<n&&d[l].p<d[s].p)s=l;if(r<n&&d[r].p<d[s].p)s=r;if(s===i)break;[d[s],d[i]]=[d[i],d[s]];i=s}}
}

// ═══ UI Components ═══
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

const BT=[
  {id:'forest',label:'Forest',icon:'🌲',color:'#2d6b2e'},
  {id:'desert',label:'Desert',icon:'🏜️',color:'#c4a44a'},
  {id:'snow',label:'Snow',icon:'❄️',color:'#e0e8f0'},
  {id:'mountain',label:'Mountain',icon:'⛰️',color:'#8a7560'},
  {id:'water',label:'River',icon:'🌊',color:'#2854a0'},
  {id:'grassland',label:'Grass',icon:'🌿',color:'#5a8a3c'},
  {id:'tundra',label:'Tundra',icon:'🧊',color:'#8a9088'},
  {id:'land',label:'Land',icon:'🏝️',color:'#6a8a45'},
  {id:'erode',label:'Erode',icon:'🕳️',color:'#1a2a40'},
  {id:'erase',label:'Erase',icon:'🧹',color:'#555'},
];

export default function App(){
  const cv=useRef(null);
  const[seed,setSeed]=useState(42000);
  const[apiKey,setApiKey]=useState('');const[showKey,setShowKey]=useState(false);
  const[gen,setGen]=useState(false);const[err,setErr]=useState(null);
  const[genProgress,setGenProgress]=useState('');
  const[aiResult,setAiResult]=useState(null); // URL of generated image
  const[style,setStyle]=useState('fantasy');
  const[aiStrength,setAiStrength]=useState(.65);
  const STY={fantasy:{n:'Fantasy',i:'🏰'},parchment:{n:'Parchment',i:'📜'},satellite:{n:'Relief Map',i:'🗻'},watercolor:{n:'Watercolor',i:'🖌️'},tolkien:{n:'Tolkien',i:'🧙'},scifi:{n:'Sci-Fi',i:'🚀'}};
  const pr=useRef({
    continents:1,landSize:.7,irregularity:.7,seaLevel:.2,
    elevation:.7,mountainHeight:.7,mountainSpread:.5,
    temperature:.5,moisture:.5,
    snowLine:.5,deserts:.5,forests:.5,tundra:.5,grasslands:.5,
    rivers:.5,fragmentation:.5,
  });
  const[P,sP]=useState(pr.current);const rf=useRef(null);
  useEffect(()=>{setSeed(Math.floor(Math.random()*100000))},[]);
  const sk=k=>{setApiKey(k);setShowKey(false)};
  const doGen=async()=>{
    if(!apiKey){setShowKey(true);setErr('Enter your Replicate API key first');return}
    if(!cv.current){setErr('No map to enhance');return}
    setErr(null);setGen(true);setGenProgress('Preparing image...');setAiResult(null);
    try{
      const dataUrl=cv.current.toDataURL('image/png');
      setGenProgress('Sending to AI... (this takes ~30s)');
      const res=await fetch('/api/enhance',{
        method:'POST',
        headers:{'Content-Type':'application/json','x-replicate-token':apiKey},
        body:JSON.stringify({image:dataUrl,style,strength:aiStrength}),
      });
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||'API request failed');

      if(data.status==='succeeded'&&data.output){
        // Got result immediately (blocking mode worked)
        const url=Array.isArray(data.output)?data.output[data.output.length-1]:data.output;
        setAiResult(url);setGenProgress('');
      }else if(data.id){
        // Need to poll for result
        setGenProgress('Generating enhanced map...');
        let attempts=0;
        while(attempts<60){
          await new Promise(r=>setTimeout(r,2000));
          const statusRes=await fetch(`/api/status?id=${data.id}`,{
            headers:{'x-replicate-token':apiKey},
          });
          const sd=await statusRes.json();
          if(sd.status==='succeeded'){
            const url=Array.isArray(sd.output)?sd.output[sd.output.length-1]:sd.output;
            setAiResult(url);setGenProgress('');break;
          }else if(sd.status==='failed'){
            throw new Error(sd.error||'Generation failed');
          }
          setGenProgress(`Generating... (${sd.status})`);
          attempts++;
        }
        if(attempts>=60)throw new Error('Generation timed out');
      }else{
        throw new Error('Unexpected API response');
      }
    }catch(e){
      setErr(e.message);setGenProgress('');
    }finally{setGen(false)}
  };
  const up=useCallback((k,v)=>{pr.current={...pr.current,[k]:v};if(rf.current)cancelAnimationFrame(rf.current);rf.current=requestAnimationFrame(()=>sP({...pr.current}))},[]);

  // Paint system
  const paintType=useRef(null),paintStr=useRef(null),overlayCv=useRef(null);
  const[brush,setBrush]=useState(null),[brushSize,setBrushSize]=useState(25),[brushOpacity,setBrushOpacity]=useState(.7);
  const paintingRef=useRef(false),[undoStack,setUndoStack]=useState([]);
  const lastPt=useRef(null),paintedRivers=useRef([]),currentRiverStroke=useRef(null);
  const initPaint=useCallback(()=>{paintType.current=new Int8Array(CW*CH);paintStr.current=new Float32Array(CW*CH)},[]);
  useEffect(()=>{initPaint()},[initPaint]);
  // Clear paint when seed changes
  const prevSeed=useRef(seed);
  useEffect(()=>{if(seed!==prevSeed.current){prevSeed.current=seed;initPaint();paintedRivers.current=[];setUndoStack([]);const oc=overlayCv.current;if(oc)oc.getContext('2d').clearRect(0,0,CW,CH)}},[seed,initPaint]);
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

  // ═══════════════════════════════════════════════════════════════
  // ═══ MAIN RENDER — NEW FLOOD-FILL CONTINENT GROWTH ALGORITHM ═══
  // ═══════════════════════════════════════════════════════════════
  const render=useCallback(()=>{
    const c=cv.current;if(!c)return;
    const ctx=c.getContext('2d'),W=c.width,H=c.height,im=ctx.createImageData(W,H),R=rng(seed);
    const ns=[];for(let i=0;i<12;i++)ns.push(new PN(seed+i*377));
    const windAng=R()*Math.PI*2,wdx=Math.cos(windAng),wdy=Math.sin(windAng);
    const tAng=R()*Math.PI*2,tdx=Math.cos(tAng),tdy=Math.sin(tAng);
    const nc=P.continents;
    const irr=P.irregularity;
    const frag=P.fragmentation;

    // ═══ STEP 1: Generate noise cost field ═══
    // Each pixel gets a "growth cost" — how hard it is for land to expand here.
    // Low cost = land grows here easily. High cost = land avoids this area.
    // This is the ONLY thing that shapes continents — no radial attractors!
    const cost=new Float32Array(W*H);

    // We work at 1/4 resolution for the flood fill, then upscale
    const QW=W>>2, QH=H>>2;  // 450x300
    const qCost=new Float32Array(QW*QH);

    for(let qy=0;qy<QH;qy++){
      for(let qx=0;qx<QW;qx++){
        const qi=qy*QW+qx;
        const nx=qx/QW, ny=qy/QH;

        // Multi-scale domain warp for organic shapes
        const w1x=ns[1].fbm(nx*2.5,ny*2.5,4)*.07*irr;
        const w1y=ns[1].fbm(nx*2.5+50,ny*2.5,4)*.07*irr;
        const w2x=ns[3].fbm((nx+w1x)*6,ny*6,3)*.025*irr;
        const w2y=ns[3].fbm(nx*6,(ny+w1y)*6+30,3)*.025*irr;
        const wnx=nx+w1x+w2x, wny=ny+w1y+w2y;

        // Base cost: multi-octave noise
        // This creates the organic shape — valleys in noise become land
        let c0=0;
        c0+=ns[0].fbm(wnx*2,wny*2,5)*.45;        // large-scale shape
        c0+=ns[2].fbm(wnx*4,wny*4,4)*.2;          // medium detail
        c0+=ns[3].fbm(wnx*8,wny*8,3)*.1*irr;      // fine detail (coast irregularity)
        c0+=ns[4].fbm(wnx*16,wny*16,2)*.05*irr;   // micro detail

        // Fragmentation: adds high-frequency noise that creates channels/gaps
        // At frag=0: smooth cost field → solid landmass
        // At frag=1: rough cost field → land grows around noise peaks → archipelago
        const fragNoise=ns[5].fbm(wnx*6,wny*6,4)*.3+ns[6].fbm(wnx*12,wny*12,3)*.15;
        c0+=fragNoise*frag*.7;

        // Edge penalty: exponentially increasing cost near canvas borders
        // This naturally prevents land from reaching edges — no hard cutoff!
        const edgeMargin=.06; // ~6% of canvas
        const dL=nx,dR=1-nx,dT=ny,dB=1-ny;
        const dEdge=Math.min(dL,dR,dT,dB);
        // Noise-distorted edge so it's not perfectly rectangular
        const edgeNoise=ns[9].fbm(nx*4+ny*3,ny*4+nx*3,3)*.02;
        const dEdgeN=Math.max(0,dEdge+edgeNoise);
        let edgePenalty=0;
        if(dEdgeN<edgeMargin){
          const t=1-dEdgeN/edgeMargin;
          edgePenalty=t*t*t*2; // cubic — very steep near edges
        }

        // Final cost: invert noise (low noise = low cost = land grows here)
        // and add edge penalty
        qCost[qi]=(.5-c0)+edgePenalty;
      }
    }

    // ═══ STEP 2: Place continent seeds ═══
    const cRng=rng(seed+999);
    const seeds=[];  // {qx, qy, targetPixels}

    // Total land target
    const totalLandFrac=P.landSize*.45+.1; // 10% to 55% of canvas
    const totalLandPixels=Math.round(QW*QH*totalLandFrac);

    if(nc===1){
      // Single continent: seed near center with slight offset
      const sx=Math.round(QW*(.5+(cRng()-.5)*.15));
      const sy=Math.round(QH*(.5+(cRng()-.5)*.15));
      seeds.push({qx:sx,qy:sy,target:totalLandPixels});
    }else{
      // Multiple: spread seeds with separation, divide land between them
      const pts=[];
      for(let ci=0;ci<nc;ci++){
        let best=null,bestScore=-99;
        for(let attempt=0;attempt<50;attempt++){
          const px=.12+cRng()*.76, py=.12+cRng()*.76;
          let minD=99;
          for(const p of pts){
            const dd=Math.sqrt((px-p.x)**2+(py-p.y)**2);
            if(dd<minD)minD=dd;
          }
          const score=pts.length===0?1:minD;
          if(score>bestScore){bestScore=score;best={x:px,y:py}}
        }
        if(best)pts.push(best);
      }
      // Assign land proportionally (slight random variation)
      const shares=pts.map(()=>.7+cRng()*.6);
      const shareSum=shares.reduce((a,b)=>a+b,0);
      for(let ci=0;ci<pts.length;ci++){
        seeds.push({
          qx:Math.round(pts[ci].x*QW),
          qy:Math.round(pts[ci].y*QH),
          target:Math.round(totalLandPixels*shares[ci]/shareSum)
        });
      }
    }

    // ═══ STEP 3: Flood-fill growth ═══
    // Each continent grows from its seed using a priority queue.
    // Lower cost pixels are claimed first → noise shapes the coastline.
    // Each continent has its OWN queue → they grow independently and never merge.
    const qLand=new Int8Array(QW*QH); // 0=ocean, 1..nc=continent id
    const qElev=new Float32Array(QW*QH); // distance from seed (for elevation)

    for(let ci=0;ci<seeds.length;ci++){
      const s=seeds[ci];
      const heap=new MinHeap();
      const visited=new Uint8Array(QW*QH);
      const contId=ci+1;
      let claimed=0;

      // Seed pixel
      const si=s.qy*QW+s.qx;
      if(si>=0&&si<QW*QH){
        heap.push({p:qCost[si],i:si,d:0});
        visited[si]=1;
      }

      // 8-connected neighbors
      const dirs=[-1,1,-QW,QW,-QW-1,-QW+1,QW-1,QW+1];

      while(heap.size>0&&claimed<s.target){
        const {p:priority,i:idx,d:dist}=heap.pop();

        // Skip if already claimed by another continent
        if(qLand[idx]!==0)continue;

        // Claim this pixel
        qLand[idx]=contId;
        qElev[idx]=dist;
        claimed++;

        // Expand to neighbors
        const qx=idx%QW, qy=(idx/QW)|0;
        for(const di of dirs){
          const ni=idx+di;
          const nx2=ni%QW, ny2=(ni/QW)|0;
          // Bounds check (prevent wrapping)
          if(nx2<0||nx2>=QW||ny2<0||ny2>=QH)continue;
          if(Math.abs(nx2-qx)>1||Math.abs(ny2-qy)>1)continue;
          if(visited[ni])continue;
          visited[ni]=1;
          // Priority = cost at that pixel + small distance bias
          // Distance bias keeps growth roughly radial (prevents thin tendrils)
          const distBias=.0003; // very small — noise dominates shape
          const newDist=dist+1;
          const p2=qCost[ni]+newDist*distBias;
          heap.push({p:p2,i:ni,d:newDist});
        }
      }
    }

    // ═══ STEP 4: Upscale land mask to full resolution ═══
    // Use the quarter-res land map + noise to create organic full-res coastline
    const isLand=new Uint8Array(W*H);
    const landDist=new Float32Array(W*H); // normalized distance from seed

    // First: find max distance per continent for normalization
    const maxDists=new Float32Array(nc+1);
    for(let qi=0;qi<QW*QH;qi++){
      const cid=qLand[qi];
      if(cid>0&&qElev[qi]>maxDists[cid])maxDists[cid]=qElev[qi];
    }

    for(let py=0;py<H;py++){
      for(let px=0;px<W;px++){
        const i=py*W+px;
        // Sample quarter-res with bilinear interpolation
        const qxf=px*QW/W-.5, qyf=py*QH/H-.5;
        const qx0=Math.max(0,Math.min(QW-2,qxf|0));
        const qy0=Math.max(0,Math.min(QH-2,qyf|0));
        const fx=qxf-qx0, fy=qyf-qy0;
        const qi00=qy0*QW+qx0, qi10=qi00+1, qi01=qi00+QW, qi11=qi00+QW+1;

        // Check if any of the 4 corners are land
        const l00=qLand[qi00]>0?1:0;
        const l10=qLand[qi10]>0?1:0;
        const l01=qLand[qi01]>0?1:0;
        const l11=qLand[qi11]>0?1:0;
        const landFrac=l00*(1-fx)*(1-fy)+l10*fx*(1-fy)+l01*(1-fx)*fy+l11*fx*fy;

        // Add micro-noise at coastline for organic full-res edge
        const nx=px/W, ny=py/H;
        const coastNoise=ns[7].fbm(nx*20,ny*20,3)*.12*irr
                        +ns[8].fbm(nx*40,ny*40,2)*.05*irr
                        +ns[9].n(nx*80,ny*80)*.025*irr;

        // Smooth coastline: use continuous value, not hard threshold
        const landVal=landFrac+coastNoise;
        isLand[i]=landVal>.48?1:0;

        // Interpolate distance for elevation
        if(isLand[i]){
          const d00=qLand[qi00]>0?qElev[qi00]/Math.max(1,maxDists[qLand[qi00]]):1;
          const d10=qLand[qi10]>0?qElev[qi10]/Math.max(1,maxDists[qLand[qi10]]):1;
          const d01=qLand[qi01]>0?qElev[qi01]/Math.max(1,maxDists[qLand[qi01]]):1;
          const d11=qLand[qi11]>0?qElev[qi11]/Math.max(1,maxDists[qLand[qi11]]):1;
          landDist[i]=d00*(1-fx)*(1-fy)+d10*fx*(1-fy)+d01*(1-fx)*fy+d11*fx*fy;
        }
      }
    }

    // ═══ STEP 5: Generate elevation from land mask ═══
    const el=new Float32Array(W*H);
    const mt=new Float32Array(W*H);
    const sea=.11; // fixed sea level threshold for internal use

    for(let py=0;py<H;py++){
      for(let px=0;px<W;px++){
        const i=py*W+px;
        const nx=px/W, ny=py/H;

        if(isLand[i]){
          // Domain warp for terrain detail
          const w1x=ns[1].fbm(nx*2.5,ny*2.5,4)*.07*irr;
          const w1y=ns[1].fbm(nx*2.5+50,ny*2.5,4)*.07*irr;
          const wnx=nx+w1x, wny=ny+w1y;

          // Elevation: base from distance + noise detail
          const distFromCoast=1-landDist[i]; // 1 at seed, 0 at edge
          const coastRamp=Math.min(1,distFromCoast*6)*.06; // wider, taller ramp near coast
          // Interior elevation dome — gradual rise toward center
          const interiorRise=distFromCoast*distFromCoast*.08;

          // Terrain detail noise — boosted amplitudes
          const d1=ns[5].fbm(wnx*5,wny*5,4)*.22;
          const d2=ns[6].fbm(wnx*12,wny*12,3)*.12;
          const d3=ns[2].fbm(wnx*25,wny*25,2)*.06;
          const d4=ns[3].fbm(wnx*50,wny*50,2)*.03;
          const d5=ns[4].n(wnx*100,wny*100)*.015;
          const detail=d1+d2+d3+d4+d5;

          // Valley carving
          const vwx=ns[1].fbm(wnx*2.5+10,wny*2.5+10,2)*.1;
          const vwy=ns[0].fbm(wnx*2.5+40,wny*2.5+40,2)*.1;
          const valley=ns[7].ridge(wnx*4+vwx,wny*4+vwy,3);
          const valleyCut=Math.max(0,valley-.3)*.4;

          const elev=P.elevation*P.elevation*3;
          el[i]=sea+(coastRamp+interiorRise+(detail-.15*valleyCut))*elev;

          // Mountains
          const bm=ns[6].fbm(nx*2.5,ny*2.5,3);
          const msO=P.mountainSpread*15;
          const sn2=ns[8].fbm(nx*3.2+10+msO,ny*3.2+10,3)*P.mountainSpread*.4;
          const mask=bm+sn2, mTh=.35-P.mountainSpread*.35;
          if(mask>mTh){
            const ms=Math.min(1,(mask-mTh)*2.5);
            const mwx=ns[0].fbm(nx*3,ny*3,2)*.15, mwy=ns[1].fbm(nx*3+20,ny*3+20,2)*.15;
            const mnx=nx+mwx, mny=ny+mwy;
            const r1=ns[7].ridge(mnx*6,mny*6,4);
            const r2=ns[7].ridge(mnx*14+50,mny*14+50,3)*.35;
            const r3=ns[7].ridge(mnx*30+80,mny*30+80,2)*.15;
            const r4=ns[7].n(mnx*60,mny*60)*.06;
            const f1=ns[8].fbm(mnx*8,mny*8,3)*.25;
            const f2=ns[8].n(mnx*18,mny*18)*.08;
            const rv=Math.max(0,r1*.5+r2+r3+r4+f1+f2)*.8;
            const mh=rv*ms*P.mountainHeight*P.mountainHeight*1.2;
            mt[i]=mh; el[i]+=mh;
          }
        }else{
          // Ocean: below sea level — vary depth
          const nx=px/W,ny=py/H;
          el[i]=sea*(.5+ns[0].fbm(nx*3,ny*3,2)*.15);
        }
        el[i]=Math.max(0,el[i]);
      }
    }

    // ═══ Terrain paint (Land/Erode) — BEFORE coast distance so new land integrates fully ═══
    const pt=paintType.current,ps=paintStr.current;
    if(pt&&ps)for(let i=0;i<W*H;i++){
      if(ps[i]<.01)continue;const s=ps[i],nx=i%W/W,ny=((i/W)|0)/H;
      if(pt[i]===8){// Land
        const tn=ns[5].fbm(nx*5,ny*5,4)*.16+ns[6].fbm(nx*12,ny*12,3)*.09+ns[2].fbm(nx*25,ny*25,2)*.05+ns[3].fbm(nx*50,ny*50,2)*.025;
        const landEl=sea+.02+Math.abs(tn)*.4*P.elevation*P.elevation*3;
        el[i]=el[i]*(1-s)+landEl*s;
        if(el[i]<sea+.005)el[i]=sea+.005;
      }else if(pt[i]===9){// Erode
        el[i]=el[i]*(1-s)+(sea*.3)*s;mt[i]*=(1-s);
      }
    }

    // ═══ BFS coast distance ═══
    const cD=new Int16Array(W*H),oD=new Int16Array(W*H);cD.fill(-1);oD.fill(-1);
    const queue=[],oQueue=[];let qi2=0,oqi=0;const maxDist2=80;
    for(let py=1;py<H-1;py++)for(let px=1;px<W-1;px++){
      const i=py*W+px;
      if(el[i]>=sea&&(el[i-1]<sea||el[i+1]<sea||el[i-W]<sea||el[i+W]<sea)){cD[i]=0;queue.push(i)}
      if(el[i]<sea&&(el[i-1]>=sea||el[i+1]>=sea||el[i-W]>=sea||el[i+W]>=sea)){oD[i]=0;oQueue.push(i)}
    }
    while(qi2<queue.length){const ci=queue[qi2++],cd=cD[ci];if(cd>=maxDist2)continue;for(const ni of[ci-1,ci+1,ci-W,ci+W])if(ni>=0&&ni<W*H&&cD[ni]===-1&&el[ni]>=sea){cD[ni]=cd+1;queue.push(ni)}}
    while(oqi<oQueue.length){const ci=oQueue[oqi++],cd=oD[ci];if(cd>=maxDist2)continue;for(const ni of[ci-1,ci+1,ci-W,ci+W])if(ni>=0&&ni<W*H&&oD[ni]===-1&&el[ni]<sea){oD[ni]=cd+1;oQueue.push(ni)}}
    for(let i=0;i<W*H;i++){if(el[i]>=sea&&cD[i]===-1)cD[i]=maxDist2;if(el[i]<sea&&oD[i]===-1)oD[i]=maxDist2}

    // ═══ Temperature & Moisture ═══
    const temp=new Float32Array(W*H),moist=new Float32Array(W*H);
    const tShift=(P.temperature-.5)*.7,mShift=(P.moisture-.5)*.5;
    const desS=(P.deserts-.5),forS=(P.forests-.5),tunS=(P.tundra-.5),graS=(P.grasslands-.5);
    for(let py=0;py<H;py++)for(let px=0;px<W;px++){
      const i=py*W+px,nx=px/W,ny=py/H;
      let t=1-Math.abs((nx-.5)*tdx+(ny-.5)*tdy)*1.6+tShift;
      t-=mt[i]*1.8;
      if(el[i]>sea)t-=((el[i]-sea)/(1-sea))*.2*P.elevation;
      t+=ns[2].fbm(nx*1.8,ny*1.8,2)*.1;
      const tO=tunS*20,tn2=ns[9].fbm(nx*2.8+tO,ny*2.8,2);
      t-=tunS*.3;t-=Math.max(0,tn2+.3)*tunS*.5;
      temp[i]=Math.max(0,Math.min(1,t));
      let m=.2+mShift;
      if(el[i]<sea){m=.9}else{
        const cd=cD[i];m+=Math.max(0,1-cd/maxDist2)*.5;m-=Math.max(0,(cd-20)/maxDist2)*.1;
        let shadow=0;for(let s=3;s<=15;s+=3){const si=((py-wdy*s*3+.5)|0)*W+((px-wdx*s*3+.5)|0);if(si>=0&&si<W*H&&mt[si]>.06)shadow=Math.max(shadow,mt[si]*(1-s/18))}m-=shadow*2.2;
        let ww=0;for(let s=3;s<=9;s+=3){const si2=((py+wdy*s*3+.5)|0)*W+((px+wdx*s*3+.5)|0);if(si2>=0&&si2<W*H&&mt[si2]>.06)ww=Math.max(ww,mt[si2]*(1-s/10))}m+=ww*.5;
        m+=ns[5].fbm(nx*2,ny*2,2)*.15;
        const dO=desS*20,dn=ns[10].fbm(nx*2.2+dO,ny*2.2,2);m-=desS*.25;m-=Math.max(0,dn+.3)*desS*.6;
        const fO=forS*20,fn=ns[11].fbm(nx*2.5,ny*2.5+fO,2);m+=forS*.25;m+=Math.max(0,fn+.3)*forS*.6;
        const gO=graS*20,gn=ns[9].fbm(nx*3+50+gO,ny*3+50,2);m+=(.35-m)*Math.max(0,gn+.3)*graS*.7;m+=(.35-m)*graS*.2;
      }
      moist[i]=Math.max(0,Math.min(1,m));
    }

    // ═══ Paint overlay — biome brushes (after temp/moisture) ═══
    if(pt&&ps)for(let i=0;i<W*H;i++){if(pt[i]===0||pt[i]>=8||ps[i]<.01)continue;const s=ps[i];
      switch(pt[i]){case 1:moist[i]=moist[i]*(1-s)+.75*s;temp[i]=temp[i]*(1-s*.3)+.45*s*.3;break;case 2:moist[i]=moist[i]*(1-s)+.08*s;temp[i]=temp[i]*(1-s*.5)+.8*s*.5;break;case 3:temp[i]=temp[i]*(1-s)+.05*s;if(el[i]>=sea)el[i]+=s*.15;break;case 4:if(el[i]>=sea){el[i]+=s*.5;mt[i]+=s*.3}break;case 5:moist[i]=Math.min(1,moist[i]+s*.3);break;case 6:moist[i]=moist[i]*(1-s)+.4*s;temp[i]=temp[i]*(1-s*.3)+.5*s*.3;break;case 7:temp[i]=temp[i]*(1-s)+.12*s;moist[i]=moist[i]*(1-s*.4)+.25*s*.4;break}}

    // ═══ Rivers ═══
    const fEl=new Float32Array(el);
    for(let iter=0;iter<5;iter++){let changed=false;for(let py=1;py<H-1;py++)for(let px=1;px<W-1;px++){const i=py*W+px;if(fEl[i]<sea)continue;let hasLower=false,minN=Infinity;for(const di of[-1,1,-W,W,-W-1,-W+1,W-1,W+1]){if(fEl[i+di]<fEl[i]){hasLower=true;break}if(fEl[i+di]<minN)minN=fEl[i+di]}if(!hasLower&&minN<Infinity){fEl[i]=minN+.0002;changed=true}}if(!changed)break}
    const flow=new Int32Array(W*H).fill(-1);
    for(let py=1;py<H-1;py++)for(let px=1;px<W-1;px++){const i=py*W+px;if(fEl[i]<sea)continue;let minE=fEl[i],minI=-1;for(const di of[-1,1,-W,W,-W-1,-W+1,W-1,W+1])if(fEl[i+di]<minE){minE=fEl[i+di];minI=i+di}flow[i]=minI}
    const landPx=[];for(let i=0;i<W*H;i++)if(fEl[i]>=sea)landPx.push(i);landPx.sort((a,b)=>fEl[b]-fEl[a]);
    const flux=new Float32Array(W*H);
    for(const i2 of landPx){flux[i2]=1+moist[i2]*1.5;if(pt&&pt[i2]===5&&ps&&ps[i2]>.01)flux[i2]+=500*ps[i2]}
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

    // ═══ Rendering ═══
    const snowThr=.15+(1-P.snowLine)*.3,rockThr=snowThr*.5;
    let maxEl=sea+.001;for(let i=0;i<W*H;i++)if(el[i]>maxEl)maxEl=el[i];
    // Richer, more saturated color ramps
    const hR=[[22,58,18],[32,75,25],[42,92,32],[58,112,42],[78,132,55],[105,148,72],[135,160,95],[162,172,118],[188,185,148],[212,208,185],[235,232,222]];
    const aR2=[[142,88,42],[158,105,55],[172,122,68],[185,140,85],[196,158,102],[208,172,118],[218,185,138],[228,200,162],[236,215,185],[242,228,208],[248,240,228]];
    const coldR=[[108,118,115],[122,132,125],[138,148,138],[152,158,150],[168,172,162],[182,185,178],[195,198,192],[210,212,208],[225,228,224],[236,238,236],[244,246,244]];
    const smpR=(ramp,lo,f)=>[ramp[lo][0]+(ramp[lo+1][0]-ramp[lo][0])*f,ramp[lo][1]+(ramp[lo+1][1]-ramp[lo][1])*f,ramp[lo][2]+(ramp[lo+1][2]-ramp[lo][2])*f];
    const RL=hR.length-1;
    // Light from NW, steeper angle for more dramatic shadows
    const lAz=315*Math.PI/180,lAlt=40*Math.PI/180,lx=Math.cos(lAlt)*Math.sin(lAz),ly=-Math.cos(lAlt)*Math.cos(lAz),lz=Math.sin(lAlt);

    for(let py=0;py<H;py++)for(let px=0;px<W;px++){
      const i=py*W+px,e=el[i],t=temp[i],m=moist[i],mh=mt[i],nx=px/W,ny=py/H;
      let r,g,b;
      if(e<sea){
        // Deeper, richer ocean
        const od=oD[i];
        const depth=Math.min(1,od/40);
        r=18-depth*6; g=26-depth*4; b=52+depth*8;
        // Coastal shelf — warm turquoise shallows
        if(od<6){const cw=(1-od/6);r+=cw*28;g+=cw*38;b+=cw*22}
      }else{
        const landE=Math.max(0,(e-sea)/(maxEl-sea)),eN=Math.min(1,Math.pow(landE,.45));
        const hW=Math.max(0,Math.min(1,(m-.12)/.35)),aW=1-hW;
        const coW=Math.max(0,Math.min(1,(.3-t)/.25)),hoW=Math.max(0,Math.min(1,(t-.65)/.2));
        const ti=eN*RL,lo=Math.min((ti|0),RL-1),f=ti-lo;
        const hc=smpR(hR,lo,f),ac=smpR(aR2,lo,f),cc=smpR(coldR,lo,f);
        let cr=hc[0]*hW+ac[0]*aW,cg=hc[1]*hW+ac[1]*aW,cb=hc[2]*hW+ac[2]*aW;
        if(coW>0){cr=cr*(1-coW)+cc[0]*coW;cg=cg*(1-coW)+cc[1]*coW;cb=cb*(1-coW)+cc[2]*coW}
        if(hoW>0&&aW>.3){const hw=hoW*aW*.7;cr=cr*(1-hw)+(cr*1.15)*hw;cg=cg*(1-hw)+(cg*.85)*hw;cb=cb*(1-hw)+(cb*.65)*hw}
        // Lowland color variation — richer
        if(eN<.35){const lv=ns[5].fbm(nx*10,ny*10,2)*.15,lw=(1-eN/.35)*.7;cr+=lv*40*lw;cg+=lv*30*lw;cb+=lv*12*lw;
          const dp=ns[10].n(nx*6,ny*6);if(dp>.1){const dpw=Math.min(1,(dp-.1)*2)*lw*.35;cr+=dpw*30;cg+=dpw*15;cb-=dpw*8}}
        // Beach
        const cd=cD[i];if(cd<5){const bw=(1-cd/5)*.45;const bc=t>.55?[210,195,145]:t<.25?[170,168,158]:[195,185,148];cr=cr*(1-bw)+bc[0]*bw;cg=cg*(1-bw)+bc[1]*bw;cb=cb*(1-bw)+bc[2]*bw}
        const sm2=(v,lo2,hi)=>Math.max(0,Math.min(1,(v-lo2)/(hi-lo2)));
        const sEl=1.0-P.snowLine*.55,elSn=sm2(eN,sEl,sEl+.15),mtSn=mh>snowThr*.5?sm2(mh,snowThr*.7,snowThr*1.2):0,coSn=sm2(.2-t,0,.15)*sm2(eN,.5,.7)*P.snowLine;
        const snW=Math.min(1,Math.max(elSn,mtSn)+coSn),roW=sm2(mh,rockThr*.3,rockThr)*(1-snW*.7);
        if(roW>0){const rn=ns[4].n(nx*50,ny*50)*.07+ns[2].n(nx*120,ny*120)*.035;const rk=[145+rn*55,122+rn*48,95+rn*32];const rw=roW*(1-snW);cr=cr*(1-rw)+rk[0]*rw;cg=cg*(1-rw)+rk[1]*rw;cb=cb*(1-rw)+rk[2]*rw}
        if(snW>0){const sn=ns[3].n(nx*35,ny*35)*.04+ns[5].n(nx*90,ny*90)*.02;cr=cr*(1-snW)+(240+sn*18)*snW;cg=cg*(1-snW)+(242+sn*14)*snW;cb=cb*(1-snW)+(248+sn*8)*snW}

        // ═══ Multi-scale hillshade — dramatic 3D relief ═══
        // 1px neighbors (fine detail)
        const eL2=px>0?el[i-1]:e,eR3=px<W-1?el[i+1]:e,eU=py>0?el[i-W]:e,eD=py<H-1?el[i+W]:e;
        let dzdx1=(eR3-eL2),dzdy1=(eD-eU);
        // 3px neighbors (medium terrain)
        let dzdx3=dzdx1,dzdy3=dzdy1;
        if(px>2&&px<W-3&&py>2&&py<H-3){dzdx3=(el[i+3]-el[i-3])/3;dzdy3=(el[i+W*3]-el[i-W*3])/3}
        // 6px neighbors (broad shape)
        let dzdx6=dzdx1,dzdy6=dzdy1;
        if(px>5&&px<W-6&&py>5&&py<H-6){dzdx6=(el[i+6]-el[i-6])/6;dzdy6=(el[i+W*6]-el[i-W*6])/6}
        // Blend scales
        const dzdx=dzdx1*.4+dzdx3*.35+dzdx6*.25;
        const dzdy=dzdy1*.4+dzdy3*.35+dzdy6*.25;
        const zS=8+P.elevation*35+P.mountainHeight*28;
        const sx=dzdx*zS,sy=dzdy*zS;
        const len=Math.sqrt(sx*sx+sy*sy+1);
        const nDotL=(-sx*lx-sy*ly+lz)/len;
        // Wider shade range: deeper shadows, brighter highlights
        let shade=nDotL;
        shade=shade*.55+.45; // remap: shade range ~[-.1,1] → ~[.4, 1.0]
        // Boost contrast
        shade=Math.pow(Math.max(.01,shade),0.85);
        // Micro texture noise
        shade+=ns[3].n(nx*150,ny*150)*.018+ns[4].n(nx*250,ny*250)*.01+ns[5].n(nx*400,ny*400)*.005;
        shade=Math.max(.04,Math.min(1.25,shade));

        // Apply shading with slight warm/cool tint for light/shadow
        if(shade>1){
          // Highlight — slight warm boost
          const hi=shade-1;
          r=cr+hi*40;g=cg+hi*35;b=cb+hi*25;
        }else{
          // Shadow — cool-tinted darken
          const sh=shade;
          r=cr*sh;g=cg*sh;b=cb*(sh*.95+.05);
        }
        // Color noise to break uniformity
        const cn=ns[0].n(nx*100,ny*100)*.015+ns[2].n(nx*180,ny*180)*.008;r+=cn*16;g+=cn*12;b+=cn*8;
      }
      const q=i*4;im.data[q]=r<0?0:r>255?255:(r+.5)|0;im.data[q+1]=g<0?0:g>255?255:(g+.5)|0;im.data[q+2]=b<0?0:b>255?255:(b+.5)|0;im.data[q+3]=255;
    }
    ctx.putImageData(im,0,0);

    // River rendering
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
            <button onClick={()=>{
              if(!cv.current)return;
              const a=document.createElement('a');
              a.href=cv.current.toDataURL('image/png');
              a.download=`fantasy-map-${seed}.png`;
              document.body.appendChild(a);a.click();document.body.removeChild(a);
            }} style={{width:'100%',padding:8,border:'1px solid #2a2620',background:'#1a1b20',borderRadius:8,color:'#c9b98a',fontFamily:"'Cinzel',serif",fontSize:12,fontWeight:600,cursor:'pointer',letterSpacing:1,marginBottom:6}}>
              ⬇ Save Map as PNG
            </button>
          </Sec>

          <Sec title="AI Enhance" defaultOpen={false}>
            <div style={{marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                <span style={{color:apiKey?'#7a9e6b':'#666',fontSize:11}}>{apiKey?'✦ Key set':'◇ Replicate API Key'}</span>
                <button onClick={()=>setShowKey(!showKey)} style={{background:'none',border:'none',color:'#c9b98a',cursor:'pointer',fontSize:10,fontFamily:"'Cinzel',serif"}}>{apiKey?'Edit':'Set'}</button>
              </div>
              {showKey&&<div style={{display:'flex',gap:3}}><input type="password" placeholder="r8_..." id="kI" onKeyDown={e=>e.key==='Enter'&&sk(e.target.value)} style={{flex:1,background:'#1a1b20',border:'1px solid #2a2620',borderRadius:5,padding:'4px 6px',color:'#d4cfc6',fontSize:11,fontFamily:'monospace',outline:'none'}}/><button onClick={()=>{const e=document.getElementById('kI');if(e)sk(e.value)}} style={{background:'#8b7355',border:'none',borderRadius:5,padding:'4px 10px',color:'#0b0c10',fontSize:10,cursor:'pointer'}}>Save</button></div>}
            </div>

            {/* Style selector */}
            <div style={{marginBottom:10}}>
              <div style={{fontSize:10,color:'#666',marginBottom:5,letterSpacing:1,textTransform:'uppercase'}}>Style</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:4}}>
                {Object.entries(STY).map(([k,v])=>(
                  <button key={k} onClick={()=>setStyle(k)}
                    style={{background:style===k?'#2a2318':'#1a1b20',border:`1px solid ${style===k?'#8b7355':'#2a2620'}`,
                      borderRadius:6,padding:'5px 4px',cursor:'pointer',fontSize:10,color:style===k?'#c9b98a':'#777',
                      display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                    <span style={{fontSize:14}}>{v.i}</span><span>{v.n}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Strength */}
            <Sl label="AI Strength" value={aiStrength} min={.3} max={.9} step={.05} onChange={v=>setAiStrength(v)}/>
            <div style={{fontSize:9,color:'#555',marginTop:-8,marginBottom:10}}>Lower = keep more original detail. Higher = more AI creativity.</div>

            <button onClick={doGen} disabled={gen} style={{width:'100%',padding:8,border:'1px solid #8b7355',background:'linear-gradient(135deg,#2a2318,#1a1510)',borderRadius:8,color:'#c9b98a',fontFamily:"'Cinzel',serif",fontSize:12,fontWeight:600,cursor:gen?'not-allowed':'pointer',letterSpacing:1,opacity:gen?.5:1}}>{gen?'Generating...':'✦ AI Enhance'}</button>
            {genProgress&&<div style={{marginTop:4,fontSize:10,color:'#8b7355',textAlign:'center'}}>{genProgress}</div>}
            {err&&<div style={{marginTop:4,background:'rgba(180,60,40,.15)',border:'1px solid #8b3a2a',borderRadius:6,padding:5,color:'#d4836a',fontSize:10}}>{err}</div>}

            {/* AI Result */}
            {aiResult&&<div style={{marginTop:8}}>
              <div style={{fontSize:10,color:'#7a9e6b',marginBottom:4}}>✦ AI Enhanced Result:</div>
              <img src={aiResult} alt="AI Enhanced Map" style={{width:'100%',borderRadius:6,border:'1px solid #2a2620'}}/>
              <div style={{display:'flex',gap:4,marginTop:4}}>
                <a href={aiResult} target="_blank" rel="noopener noreferrer"
                  style={{flex:1,textAlign:'center',padding:5,background:'#1a1b20',border:'1px solid #2a2620',borderRadius:5,color:'#c9b98a',fontSize:10,textDecoration:'none',cursor:'pointer'}}>
                  Open Full Size ↗
                </a>
                <button onClick={async()=>{
                  try{
                    const r=await fetch(aiResult);const blob=await r.blob();
                    const url=URL.createObjectURL(blob);
                    const a=document.createElement('a');a.href=url;a.download=`fantasy-map-${style}-${seed}.png`;
                    document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
                  }catch(e){window.open(aiResult,'_blank')}
                }}
                  style={{flex:1,textAlign:'center',padding:5,background:'#2a2318',border:'1px solid #8b7355',borderRadius:5,color:'#c9b98a',fontSize:10,cursor:'pointer'}}>
                  ⬇ Download
                </button>
                <button onClick={()=>setAiResult(null)}
                  style={{padding:'5px 10px',background:'#1a1b20',border:'1px solid #2a2620',borderRadius:5,color:'#777',fontSize:10,cursor:'pointer'}}>
                  ✕
                </button>
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
