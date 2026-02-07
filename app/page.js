'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

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

export default function App(){
  const cv=useRef(null);
  const[seed,setSeed]=useState(42000);
  const pr=useRef({continents:1,landSize:.7,irregularity:.7,seaLevel:.2,elevation:.7,mountainHeight:.7,mountainSpread:.5,temperature:.5,moisture:.5,snowLine:.5,deserts:.5,forests:.5,tundra:.5,grasslands:.5,rivers:.5,fragmentation:.5});
  const[P,sP]=useState(pr.current);const rf=useRef(null);
  const[rendering,setRendering]=useState(false);
  const[apiKey,setApiKey]=useState('');const[showKey,setShowKey]=useState(false);const[gen,setGen]=useState(false);const[err,setErr]=useState(null);
  const[style,setStyle]=useState('fantasy');const[str,setStr]=useState(.75);
  const STY={fantasy:{n:'Fantasy',i:'🏨'},parchment:{n:'Parchment',i:'📜'},satellite:{n:'Satellite',i:'🛰️'},watercolor:{n:'Watercolor',i:'🖌️'},tolkien:{n:'Tolkien',i:'🧙'},scifi:{n:'Sci-Fi',i:'🚀'}};
  const sk=k=>{setApiKey(k);setShowKey(false)};
  const doGen=useCallback(async()=>{
    if(!apiKey){setShowKey(true);setErr('Enter API key first');return}
    if(gen)return;
    const c=cv.current;if(!c)return;
    setErr(null);setGen(true);
    // Downscale to 1024x680 JPEG to stay within API limits
    const tmp=document.createElement('canvas');tmp.width=1024;tmp.height=680;
    const tctx=tmp.getContext('2d');tctx.drawImage(c,0,0,1024,680);
    const dataUrl=tmp.toDataURL('image/jpeg',0.85);
    try{
      const res=await fetch('/api/enhance',{method:'POST',headers:{'Content-Type':'application/json','x-replicate-token':apiKey},body:JSON.stringify({image:dataUrl,style,strength:str})});
      const text=await res.text();
      let data;try{data=JSON.parse(text)}catch(e){setErr(text.slice(0,100));setGen(false);return}
      if(data.error){setErr(data.error);setGen(false);return}
      if(data.status==='succeeded'&&data.output){
        const img=new Image();img.crossOrigin='anonymous';
        img.onload=()=>{const ctx=c.getContext('2d');ctx.drawImage(img,0,0,CW,CH);setGen(false)};
        img.onerror=()=>{setErr('Failed to load enhanced image');setGen(false)};
        img.src=data.output;return;
      }
      if(data.id){
        const poll=async()=>{
          for(let i=0;i<60;i++){
            await new Promise(r=>setTimeout(r,2000));
            const sr=await fetch(`/api/status?id=${data.id}`,{headers:{'x-replicate-token':apiKey}});
            const stxt=await sr.text();let sd;try{sd=JSON.parse(stxt)}catch(e){continue}
            if(sd.status==='succeeded'&&sd.output){
              const img2=new Image();img2.crossOrigin='anonymous';
              img2.onload=()=>{const ctx=c.getContext('2d');ctx.drawImage(img2,0,0,CW,CH);setGen(false)};
              img2.onerror=()=>{setErr('Failed to load enhanced image');setGen(false)};
              img2.src=sd.output;return;
            }
            if(sd.status==='failed'){setErr(sd.error||'Generation failed');setGen(false);return}
          }
          setErr('Timed out waiting for result');setGen(false);
        };
        poll();
      }else{setGen(false)}
    }catch(e){setErr(e.message||'Network error');setGen(false)}
  },[apiKey,style,str]);
  useEffect(()=>{setSeed(Math.floor(Math.random()*100000))},[]);
  const up=useCallback((k,v)=>{pr.current={...pr.current,[k]:v};if(rf.current)cancelAnimationFrame(rf.current);rf.current=requestAnimationFrame(()=>sP({...pr.current}))},[]);

  // Paint system
  const paintType=useRef(null),paintStr=useRef(null),overlayCv=useRef(null);
  const[brush,setBrush]=useState(null),[brushSize,setBrushSize]=useState(25),[brushOpacity,setBrushOpacity]=useState(.7);
  const paintingRef=useRef(false),[undoStack,setUndoStack]=useState([]);
  const lastPt=useRef(null),paintedRivers=useRef([]),currentRiverStroke=useRef(null);
  const initPaint=useCallback(()=>{paintType.current=new Int8Array(CW*CH);paintStr.current=new Float32Array(CW*CH)},[]);
  useEffect(()=>{initPaint()},[initPaint]);

  const toCanvas=useCallback(e=>{const c=cv.current;if(!c)return null;const rect=c.getBoundingClientRect();return{x:Math.round((e.clientX-rect.left)*CW/rect.width),y:Math.round((e.clientY-rect.top)*CH/rect.height)}},[]);

  const drawOverlayCircle=useCallback((cx,cy)=>{
    const oc=overlayCv.current;if(!oc)return;const octx=oc.getContext('2d');
    const bType=BT.find(b2=>b2.id===brush);if(!bType)return;
    if(brush==='water'){const last=currentRiverStroke.current;if(last&&last.length>0){const prev=last[last.length-1];octx.strokeStyle='rgba(40,84,160,.8)';octx.lineWidth=2.5;octx.lineCap='round';octx.beginPath();octx.moveTo(prev.x,prev.y);octx.lineTo(cx,cy);octx.stroke()}else{octx.fillStyle='rgba(40,84,160,.8)';octx.beginPath();octx.arc(cx,cy,2,0,Math.PI*2);octx.fill()}return}
    const r=brushSize;const grad=octx.createRadialGradient(cx,cy,0,cx,cy,r);const co=bType.color;
    grad.addColorStop(0,co+(brush==='erase'?'80':'60'));grad.addColorStop(.7,co+(brush==='erase'?'40':'35'));grad.addColorStop(1,co+'00');
    if(brush==='erase'){octx.globalCompositeOperation='destination-out';octx.beginPath();octx.arc(cx,cy,r,0,Math.PI*2);octx.fillStyle=`rgba(0,0,0,${brushOpacity})`;octx.fill();octx.globalCompositeOperation='source-over'}
    else{octx.fillStyle=grad;octx.beginPath();octx.arc(cx,cy,r,0,Math.PI*2);octx.fill()}
  },[brush,brushSize,brushOpacity]);

  const writePaintData=useCallback((cx,cy)=>{
    if(!paintType.current)return;const W=CW,H=CH;
    const typeIdx=brush==='erase'?0:BT.findIndex(b2=>b2.id===brush)+1;
    const r=brushSize,r2=r*r;const x0=Math.max(0,cx-r),x1=Math.min(W-1,cx+r),y0=Math.max(0,cy-r),y1=Math.min(H-1,cy+r);
    for(let py=y0;py<=y1;py++){const dy=py-cy,dy2=dy*dy;for(let px=x0;px<=x1;px++){const dx=px-cx,d2=dx*dx+dy2;if(d2>r2)continue;const fo=1-Math.sqrt(d2)/r,s=fo*fo*brushOpacity,i=py*W+px;
    if(brush==='erase'){paintStr.current[i]*=(1-s);if(paintStr.current[i]<.01){paintType.current[i]=0;paintStr.current[i]=0}}
    else{if(paintType.current[i]===typeIdx)paintStr.current[i]=Math.min(1,paintStr.current[i]+s*.3);else if(s>paintStr.current[i]*.5){paintType.current[i]=typeIdx;paintStr.current[i]=Math.min(1,s)}}}}
  },[brush,brushSize,brushOpacity]);

  const paintLine=useCallback((x0,y0,x1,y1)=>{const dx=x1-x0,dy=y1-y0,dist=Math.sqrt(dx*dx+dy*dy),steps=Math.max(1,Math.floor(dist/(brushSize*.3)));for(let s=0;s<=steps;s++){const t=s/steps;drawOverlayCircle(Math.round(x0+dx*t),Math.round(y0+dy*t));writePaintData(Math.round(x0+dx*t),Math.round(y0+dy*t))}},[brushSize,drawOverlayCircle,writePaintData]);
  const saveUndo=useCallback(()=>{if(!paintType.current)return;setUndoStack(prev=>[...prev.slice(-15),{type:new Int8Array(paintType.current),str:new Float32Array(paintStr.current),rivers:paintedRivers.current.map(p=>[...p])}])},[]);
  const undo=useCallback(()=>{setUndoStack(prev=>{if(!prev.length)return prev;const last=prev[prev.length-1];paintType.current=new Int8Array(last.type);paintStr.current=new Float32Array(last.str);paintedRivers.current=last.rivers||[];sP(p=>({...p}));return prev.slice(0,-1)})},[]);
  const clearPaint=useCallback(()=>{saveUndo();initPaint();paintedRivers.current=[];const oc=overlayCv.current;if(oc)oc.getContext('2d').clearRect(0,0,CW,CH);sP(p=>({...p}))},[saveUndo,initPaint]);

  const onMouseDown=useCallback(e=>{if(!brush)return;const p=toCanvas(e);if(!p)return;saveUndo();paintingRef.current=true;lastPt.current=p;drawOverlayCircle(p.x,p.y);writePaintData(p.x,p.y);if(brush==='water')currentRiverStroke.current=[{x:p.x,y:p.y}]},[brush,toCanvas,saveUndo,drawOverlayCircle,writePaintData]);
  const onMouseMove=useCallback(e=>{if(!paintingRef.current||!brush)return;const p=toCanvas(e);if(!p)return;const lp=lastPt.current||p;paintLine(lp.x,lp.y,p.x,p.y);lastPt.current=p;if(brush==='water'&&currentRiverStroke.current){const last=currentRiverStroke.current,prev=last[last.length-1],d=Math.sqrt((p.x-prev.x)**2+(p.y-prev.y)**2);if(d>3)last.push({x:p.x,y:p.y})}},[brush,toCanvas,paintLine]);
  const finishPaint=useCallback(()=>{if(paintingRef.current){paintingRef.current=false;lastPt.current=null;if(currentRiverStroke.current&&currentRiverStroke.current.length>2)paintedRivers.current.push(currentRiverStroke.current);currentRiverStroke.current=null;sP(p=>({...p}))}},[]);

  // Web Worker — all heavy computation runs here, UI stays responsive
  const workerRef=useRef(null);
  const pendingRef=useRef(null);
  const renderingRef=useRef(false);

  const dispatchRender=useCallback((s,params)=>{
    if(!workerRef.current)return;
    const ptCopy=paintType.current?new Int8Array(paintType.current):null;
    const psCopy=paintStr.current?new Float32Array(paintStr.current):null;
    const transfers=[ptCopy?.buffer,psCopy?.buffer].filter(Boolean);
    workerRef.current.postMessage({seed:s,P:params,W:CW,H:CH,
      paintTypeArr:ptCopy?.buffer??null,paintStrArr:psCopy?.buffer??null},transfers);
  },[]);

  useEffect(()=>{
    const w=new Worker('/worker.js');
    workerRef.current=w;
    w.onmessage=(ev)=>{
      const{pixels,riverSegs,P_rivers}=ev.data;
      const c=cv.current;if(!c){renderingRef.current=false;setRendering(false);return}
      const ctx=c.getContext('2d'),W=c.width,H=c.height;
      ctx.putImageData(new ImageData(new Uint8ClampedArray(pixels),W,H),0,0);
      // Draw rivers (needs canvas API, fast)
      if(P_rivers>.02&&riverSegs&&riverSegs.length){
        ctx.lineCap='round';ctx.lineJoin='round';
        riverSegs.sort((a,b2)=>{let ma=0,mb=0;for(const p of a)if(p.f>ma)ma=p.f;for(const p of b2)if(p.f>mb)mb=p.f;return ma-mb});
        let gmf=1;for(const seg of riverSegs)for(const p of seg)if(p.f>gmf)gmf=p.f;
        for(const seg of riverSegs){if(seg.length<4)continue;const step=Math.max(1,Math.min(8,(seg.length/30)|0));const pts=[];for(let j=0;j<seg.length;j+=step)pts.push(seg[j]);if(pts[pts.length-1]!==seg[seg.length-1])pts.push(seg[seg.length-1]);if(pts.length<2)continue;
          for(let j=1;j<pts.length;j++){const p0=pts[j-1],p1=pts[j],f=(p0.f+p1.f)*.5,norm=f/gmf,w2=(.3+norm*4)*(.5+P_rivers);ctx.globalAlpha=Math.min(1,.35+norm*.65);ctx.strokeStyle=`rgb(${38-norm*15|0},${65-norm*15|0},${130+norm*40|0})`;ctx.lineWidth=Math.max(.3,w2);ctx.beginPath();ctx.moveTo(p0.x,p0.y);if(j<pts.length-1){const p2=pts[j+1];ctx.quadraticCurveTo(p1.x,p1.y,(p1.x+p2.x)*.5,(p1.y+p2.y)*.5)}else ctx.lineTo(p1.x,p1.y);ctx.stroke()}}ctx.globalAlpha=1}
      // Painted rivers
      const pRv=paintedRivers.current;if(pRv&&pRv.length>0){ctx.lineCap='round';ctx.lineJoin='round';for(const path of pRv){if(path.length<2)continue;ctx.strokeStyle='rgb(28,58,135)';ctx.globalAlpha=.9;ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);for(let j=1;j<path.length;j++){if(j<path.length-1){const p1=path[j],p2=path[j+1];ctx.quadraticCurveTo(p1.x,p1.y,(p1.x+p2.x)*.5,(p1.y+p2.y)*.5)}else ctx.lineTo(path[j].x,path[j].y)}ctx.stroke()}ctx.globalAlpha=1}
      const oc=overlayCv.current;if(oc)oc.getContext('2d').clearRect(0,0,W,H);
      renderingRef.current=false;setRendering(false);
      // Fire pending render if queued
      if(pendingRef.current){const p=pendingRef.current;pendingRef.current=null;renderingRef.current=true;setRendering(true);dispatchRender(p.seed,p.P)}
    };
    return()=>w.terminate();
  },[dispatchRender]);

  // Trigger render when seed/params change
  useEffect(()=>{
    if(renderingRef.current){pendingRef.current={seed,P};return}
    renderingRef.current=true;setRendering(true);
    dispatchRender(seed,P);
  },[seed,P,dispatchRender]);

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
          <Sec title="API / Export" defaultOpen={false}>
            <div style={{marginBottom:10}}>
              <span style={{fontSize:10,letterSpacing:1,color:'#8b7355',textTransform:'uppercase',fontFamily:"'Cinzel',serif"}}>Style</span>
              <div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:6}}>
                {Object.entries(STY).map(([k,v])=>(
                  <button key={k} onClick={()=>setStyle(k)} style={{background:style===k?'#2a2318':'transparent',border:`1px solid ${style===k?'#8b7355':'#2a2620'}`,borderRadius:6,padding:'4px 8px',cursor:'pointer',fontSize:12,color:style===k?'#c9b98a':'#777',display:'flex',alignItems:'center',gap:4}}>
                    <span>{v.i}</span><span style={{fontSize:10}}>{v.n}</span>
                  </button>
                ))}
              </div>
            </div>
            <Sl label="Style Strength" value={str} min={0} max={1} onChange={v=>setStr(v)}/>
            <div style={{marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                <span style={{color:apiKey?'#7a9e6b':'#666',fontSize:11}}>{apiKey?'✦ Key set':'◇ API Key'}</span>
                <button onClick={()=>setShowKey(!showKey)} style={{background:'none',border:'none',color:'#c9b98a',cursor:'pointer',fontSize:10,fontFamily:"'Cinzel',serif"}}>{apiKey?'Edit':'Set'}</button>
              </div>
              {showKey&&<div style={{display:'flex',gap:3}}><input type="password" placeholder="r8_..." id="kI" onKeyDown={e=>e.key==='Enter'&&sk(e.target.value)} style={{flex:1,background:'#1a1b20',border:'1px solid #2a2620',borderRadius:5,padding:'4px 6px',color:'#d4cfc6',fontSize:11,fontFamily:'monospace',outline:'none'}}/><button onClick={()=>{const e=document.getElementById('kI');if(e)sk(e.value)}} style={{background:'#8b7355',border:'none',borderRadius:5,padding:'4px 10px',color:'#0b0c10',fontSize:10,cursor:'pointer'}}>Save</button></div>}
            </div>
            <button onClick={doGen} disabled={gen} style={{width:'100%',padding:8,border:'1px solid #8b7355',background:'linear-gradient(135deg,#2a2318,#1a1510)',borderRadius:8,color:'#c9b98a',fontFamily:"'Cinzel',serif",fontSize:12,fontWeight:600,cursor:gen?'not-allowed':'pointer',letterSpacing:1,opacity:gen?.5:1}}>{gen?'Generating...':'✦ AI Enhance'}</button>
            <button onClick={()=>{const c=cv.current;if(!c)return;const a=document.createElement('a');a.download=`fantasy-map-${seed}.png`;a.href=c.toDataURL('image/png');a.click()}} style={{width:'100%',padding:8,marginTop:6,border:'1px solid #2a2620',background:'transparent',borderRadius:8,color:'#999',fontFamily:"'Cinzel',serif",fontSize:12,fontWeight:600,cursor:'pointer',letterSpacing:1}}>⬇ Download Map</button>
            {err&&<div style={{marginTop:4,background:'rgba(180,60,40,.15)',border:'1px solid #8b3a2a',borderRadius:6,padding:5,color:'#d4836a',fontSize:10}}>{err}</div>}
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
              {rendering&&<div style={{position:'absolute',top:12,right:12,background:'rgba(0,0,0,.6)',borderRadius:6,padding:'4px 10px',fontSize:11,color:'#c9b98a',pointerEvents:'none'}}>Rendering...</div>}
              <canvas ref={overlayCv} width={CW} height={CH} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={finishPaint} onMouseLeave={finishPaint}
                style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',borderRadius:8,cursor:brush?'crosshair':'default',pointerEvents:brush?'auto':'none'}}/>
            </div>
          </div>
        </div>
      </div>
    </div>);
}
