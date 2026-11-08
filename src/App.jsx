import React, { useEffect, useRef, useState } from 'react'
import {
  Sparkles, Flame, Palette, Gift, Camera, Music2, Volume2, VolumeX,
  Moon, Sun, Menu, X, Download, Share2, Play, Pause, RotateCcw,
  House, Gamepad2, Globe2, Heart, WandSparkles, Stars, PartyPopper,
  Image as ImageIcon, Send, Flower2, Lightbulb, Trophy, ChevronRight, Maximize2, Gift as GiftIcon, MoonStar
} from 'lucide-react'

const sections = [
  ['Home', 'home', Sparkles], ['Fireworks', 'fireworks', PartyPopper], ['Virtual Crackers', 'crackers', Stars], ['Gifts & Cards', 'gifts', Gift], ['Love & Friends Chat', 'chat', Heart], ['Gifts & Cards', 'gifts', Gift], ['Love & Friends Chat', 'chat', Heart],
  ['Diya World', 'diyas', Flame], ['Rangoli Studio', 'rangoli', Palette],
  ['Home Decor', 'decor', House], ['Greeting Maker', 'greetings', Gift],
  ['Photo Booth', 'photo', Camera], ['Games', 'games', Gamepad2],
  ['Music', 'music', Music2], ['Celebration Wall', 'wall', Globe2],
  ['Traditions', 'traditions', Heart], ['Night Sky', 'night', MoonStar], ['Surprise Zone', 'surprise', GiftIcon]
]

function makeAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return null
  return new Ctx()
}

function burstSound(ctx, volume = 0.22) {
  if (!ctx) return
  if (ctx.state === 'suspended') ctx.resume()
  const length = Math.floor(ctx.sampleRate * 0.42)
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5)
  const source = ctx.createBufferSource()
  const filter = ctx.createBiquadFilter()
  const gain = ctx.createGain()
  source.buffer = buffer
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(2200 + Math.random() * 1800, ctx.currentTime)
  filter.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 0.38)
  gain.gain.setValueAtTime(volume, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.42)
  source.connect(filter); filter.connect(gain); gain.connect(ctx.destination)
  source.start()
}

function Fireworks({ soundOn }) {
  const canvasRef = useRef(null)
  const particles = useRef([])
  const rockets = useRef([])
  const audio = useRef(null)
  const [auto, setAuto] = useState(true)
  const [showHint, setShowHint] = useState(true)
  const [burstMode, setBurstMode] = useState('classic')
  const [burstColor, setBurstColor] = useState('rainbow')

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let raf, last = 0, spawn = 0
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)
    const launch = (x = Math.random() * canvas.clientWidth, y = canvas.clientHeight + 8) => {
      rockets.current.push({ x, y, tx: canvas.clientWidth * (0.14 + Math.random() * 0.72), ty: canvas.clientHeight * (0.12 + Math.random() * 0.48), hue: Math.random() * 360, speed: 5 + Math.random() * 2 })
    }
    const explode = (r) => {
      const count = burstMode === 'sparkler' ? 28 : burstMode === 'grand' ? 150 : 75
      for (let i = 0; i < count; i++) {
        const angle = Math.PI * 2 * i / count
        const speed = 1.2 + Math.random() * 4.2
        particles.current.push({ x:r.x, y:r.y, vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed, life:1, decay:0.008+Math.random()*0.012, hue:burstColor==='gold'?42:burstColor==='blue'?205:burstColor==='pink'?325:r.hue, size:1+Math.random()*2.3 })
      }
      if (soundOn) burstSound(audio.current)
    }
    const draw = (time) => {
      const w = canvas.clientWidth, h = canvas.clientHeight
      ctx.fillStyle = 'rgba(5, 7, 22, 0.23)'
      ctx.fillRect(0,0,w,h)
      if (auto && time - spawn > 720) { launch(); spawn = time }
      rockets.current = rockets.current.filter(r => {
        const dx = r.tx-r.x, dy = r.ty-r.y
        const dist = Math.hypot(dx,dy)
        if (dist < r.speed + 3) { explode(r); return false }
        r.x += dx/dist*r.speed; r.y += dy/dist*r.speed
        ctx.beginPath(); ctx.arc(r.x,r.y,2,0,Math.PI*2); ctx.fillStyle = '#fff4c4'; ctx.fill()
        return true
      })
      particles.current = particles.current.filter(p => p.life > 0)
      for (const p of particles.current) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.025; p.vx *= 0.992; p.vy *= 0.992; p.life -= p.decay
        ctx.globalAlpha = Math.max(0,p.life)
        ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2)
        ctx.fillStyle = `hsl(${p.hue} 100% 66%)`; ctx.shadowBlur = 12; ctx.shadowColor = ctx.fillStyle; ctx.fill()
      }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0
      raf = requestAnimationFrame(draw)
    }
    audio.current = makeAudio()
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize',resize); audio.current?.close() }
  }, [auto, soundOn, burstMode, burstColor])

  const fireAt = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left, y = e.clientY - rect.top
    const hue = burstColor === 'gold' ? 42 : burstColor === 'blue' ? 205 : burstColor === 'pink' ? 325 : Math.random()*360
    const count = burstMode === 'sparkler' ? 32 : burstMode === 'grand' ? 170 : 90
    for (let i=0;i<count;i++) {
      const a = Math.PI*2*i/count, speed = 1.2+Math.random()*4.6
      particles.current.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:1,decay:.009+Math.random()*.01,hue,size:1+Math.random()*2.5})
    }
    if (soundOn) burstSound(audio.current)
    setShowHint(false)
  }
  return <div className="fireworks-stage">
    <canvas ref={canvasRef} onPointerDown={fireAt} aria-label="Interactive fireworks canvas" />
    <div className="fireworks-overlay">
      <div className="eyebrow"><span className="live-dot"/> THE SKY IS YOUR CANVAS</div>
      <h2>Paint the night<br/><em>with light.</em></h2>
      <p>Tap anywhere in the sky to create your own colorful burst.</p>
      <div className="firework-options"><label>Style <select value={burstMode} onChange={e=>setBurstMode(e.target.value)}><option value="classic">Classic</option><option value="sparkler">Sparkler</option><option value="grand">Grand finale</option></select></label><label>Color <select value={burstColor} onChange={e=>setBurstColor(e.target.value)}><option value="rainbow">Rainbow</option><option value="gold">Golden</option><option value="blue">Blue</option><option value="pink">Pink</option></select></label></div>
      <div className="button-row">
        <button className="btn btn-gold" onClick={()=>setAuto(v=>!v)}>{auto?<Pause size={16}/>:<Play size={16}/>} {auto?'Pause show':'Start auto show'}</button>
        <button className="btn btn-glass" onClick={()=>{particles.current=[];rockets.current=[]}}><RotateCcw size={16}/> Clear sky</button>
      </div>
      {showHint && <span className="tap-hint">✦ Tap the sky to launch a burst ✦</span>}
    </div>
    <div className="fireworks-badge">✦ LIVE CANVAS · SOUND {soundOn?'ON':'OFF'} ✦</div>
  </div>
}


const crackerShowcase = [
  {id:'sparkler',name:'Phuljhadi',emoji:'✨',kind:'Sparkler trail',description:'A handheld-style sparkling trail, shown here as a touch animation. The digital effect creates tiny bright points that fade gently.',motion:'sparkler',color:'#ffd978',fact:'Sparkling light close to the starting point.'},
  {id:'fountain',name:'Anar / Fountain',emoji:'🌋',kind:'Upward fountain',description:'A cone-shaped fountain effect that sends a fan of glowing particles upward before they softly fall away.',motion:'fountain',color:'#ffb65c',fact:'A vertical plume with a wide, glittering crown.'},
  {id:'spinner',name:'Chakri',emoji:'🌀',kind:'Spinning pattern',description:'A ground-level circular pattern represented by a rotating ring of light. This is only a screen animation.',motion:'spinner',color:'#8bdcff',fact:'A circular motion that appears to rotate around its centre.'},
  {id:'rocket',name:'Sky Rocket',emoji:'🚀',kind:'Ascending streak',description:'A glowing point rises through the night and becomes a distant starburst in this simplified animation.',motion:'rocket',color:'#ff9bc5',fact:'A rising trail followed by a high sky sparkle.'},
  {id:'flowerpot',name:'Flower Pot',emoji:'🌼',kind:'Compact fountain',description:'A short, dense spray of golden particles blooms outward like a small flower and fades.',motion:'flowerpot',color:'#ffe49a',fact:'A compact burst that opens into a flower-like shape.'},
  {id:'aerial',name:'Aerial Burst',emoji:'🎆',kind:'Sky burst',description:'A distant circular bloom of colored points expands in the sky, then slowly dims.',motion:'aerial',color:'#c4a5ff',fact:'A bright sky bloom with particles moving outward.'},
  {id:'ground',name:'Ground Spinner',emoji:'💫',kind:'Rotating glow',description:'A low, circular halo spins in place with a soft luminous trail. The movement is intentionally abstract.',motion:'ground',color:'#83e4bd',fact:'A low spinning ring with a smooth light trail.'},
  {id:'spark-rain',name:'Spark Rain',emoji:'🌠',kind:'Falling glitter',description:'A gentle shower of tiny lights drifts downward like glittering rain against the night sky.',motion:'rain',color:'#ffad83',fact:'Many small lights drift down and fade out.'}
];
function VirtualCrackers(){
 const canvasRef=useRef(null),[selected,setSelected]=useState('sparkler'),[playing,setPlaying]=useState(true),[color,setColor]=useState('rainbow');
 const item=crackerShowcase.find(x=>x.id===selected)||crackerShowcase[0];
 useEffect(()=>{
  const c=canvasRef.current,ctx=c&&c.getContext('2d');if(!ctx)return;let raf=0,last=0,elapsed=0,parts=[],dpr=1;
  const resize=()=>{dpr=Math.min(devicePixelRatio||1,1.5);c.width=Math.round(c.clientWidth*dpr);c.height=Math.round(c.clientHeight*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)};resize();window.addEventListener('resize',resize);
  const W=()=>c.clientWidth,H=()=>c.clientHeight;
  const hue=()=>color==='gold'?42:color==='blue'?205:color==='pink'?325:color==='green'?150:Math.random()*360;
  const add=(x,y,vx,vy)=>parts.push({x,y,vx,vy,life:1,decay:.008+Math.random()*.008,h:hue(),r:1+Math.random()*2});
  const bloom=(x,y,n,heart=false)=>{for(let i=0;i<n;i++){let t=i/n*Math.PI*2,vx=Math.cos(t),vy=Math.sin(t);if(heart){vx=16*Math.pow(Math.sin(t),3)/16;vy=-(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))/13}add(x,y,vx*(1+Math.random()*3),vy*(1+Math.random()*3))}};
  const draw=t=>{let w=W(),h=H(),cx=w/2,cy=h*.5;ctx.fillStyle='rgba(5,8,24,.22)';ctx.fillRect(0,0,w,h);elapsed+=t-(last||t);last=t;
   if(playing&&elapsed>1500){elapsed=0;parts=[]}
   if(playing&&elapsed<45){
    if(selected==='sparkler'){for(let i=0;i<90;i++)add(cx+(Math.random()-.5)*24,cy+(Math.random()-.5)*24,(Math.random()-.5)*4,(Math.random()-.5)*4)}
    if(selected==='fountain'||selected==='flowerpot'){for(let i=0;i<120;i++){let an=-Math.PI*.9+Math.random()*Math.PI*.8,sp=1+Math.random()*4;add(cx,h*.84,Math.cos(an)*sp,Math.sin(an)*sp)}}
    if(selected==='spinner'||selected==='ground'){for(let i=0;i<110;i++){let an=i/110*Math.PI*2;add(cx+Math.cos(an)*55,cy+Math.sin(an)*20,-Math.sin(an)*2,Math.cos(an)*2)}}
    if(selected==='rocket'){for(let i=0;i<90;i++)add(cx+(Math.random()-.5)*12,h*.8-Math.random()*h*.55,(Math.random()-.5)*.6,-1-Math.random()*2);}
    if(selected==='aerial')bloom(cx,cy,125);
    if(selected==='spark-rain'){for(let i=0;i<120;i++)add(Math.random()*w,Math.random()*h*.65,(Math.random()-.5)*.4,.8+Math.random()*2)}
   }
   if(selected==='fountain'||selected==='flowerpot'){ctx.strokeStyle='rgba(255,210,120,.35)';ctx.beginPath();ctx.moveTo(cx,h*.85);ctx.lineTo(cx-100,h*.28);ctx.moveTo(cx,h*.85);ctx.lineTo(cx+100,h*.28);ctx.stroke()}
   if(selected==='spinner'||selected==='ground'){ctx.save();ctx.translate(cx,cy);ctx.rotate(t*.0018);ctx.strokeStyle='#8deaff';ctx.lineWidth=3;ctx.shadowBlur=16;ctx.shadowColor='#8deaff';ctx.beginPath();ctx.ellipse(0,0,78,26,0,0,Math.PI*2);ctx.stroke();ctx.restore()}
   if(selected==='rocket'){ctx.fillStyle='#fff2c4';ctx.font='26px sans-serif';ctx.fillText('✦',cx-8,h*.17)}
   parts=parts.filter(p=>p.life>0&&p.y<h+20);for(const p of parts){p.x+=p.vx;p.y+=p.vy;p.vy+=selected==='spark-rain'?.01:.02;p.life-=p.decay;ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle='hsl('+p.h+' 100% 68%)';ctx.shadowBlur=10;ctx.shadowColor=ctx.fillStyle;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;ctx.shadowBlur=0;raf=requestAnimationFrame(draw)};
  ctx.fillStyle='#060a20';ctx.fillRect(0,0,W(),H());raf=requestAnimationFrame(draw);return()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',resize)};
 },[selected,playing,color]);
 const choose=id=>{setSelected(id);setPlaying(false);requestAnimationFrame(()=>requestAnimationFrame(()=>setPlaying(true)))};
 const descriptions={sparkler:'A close-up field of fine sparkling points.',fountain:'A wide fan of light moving upward.',spinner:'A rotating elliptical halo.',rocket:'A rising streak with a star-like finish.',flowerpot:'A short, flower-shaped upward spray.',aerial:'A wide radial sky bloom.',ground:'A low circular spinning pattern.','spark-rain':'A field of gently falling points.'};
 return <div className='cracker-lab'><div className='cracker-lab-head'><div><span className='eyebrow'>TOUCH · EXPLORE · LEARN</span><h2>Every sparkle has its <em>own motion.</em></h2><p>Each card uses a different browser-drawn visual simulation.</p></div><div className='safety-chip'>✦ DIGITAL SIMULATION ONLY</div></div>
 <div className='cracker-catalog'>{crackerShowcase.map(c=><button key={c.id} onClick={()=>choose(c.id)} className={selected===c.id?'cracker-tile selected':'cracker-tile'}><span>{c.emoji}</span><b>{c.name}</b><small>{c.kind}</small><i>View animation ↗</i></button>)}</div>
 <div className='cracker-detail'><canvas ref={canvasRef} className='cracker-canvas' aria-label={item.name+' simulation'}/><div className='cracker-info'><div><span className='eyebrow'>NOW PREVIEWING</span><h3>{item.emoji} {item.name}</h3><p>{descriptions[selected]} {item.description}</p></div><div className='cracker-actions'><label>Color <select value={color} onChange={e=>setColor(e.target.value)}><option value='rainbow'>Rainbow</option><option value='gold'>Gold</option><option value='blue'>Blue</option><option value='pink'>Pink</option><option value='green'>Emerald</option></select></label><button className='btn btn-gold' onClick={()=>{setPlaying(false);requestAnimationFrame(()=>requestAnimationFrame(()=>setPlaying(true)))}}><RotateCcw size={16}/> Replay</button></div></div><div className='cracker-fact'><span>✦ VISUAL CHARACTER</span><b>{item.fact}</b></div></div>
 <div className='cracker-footnote'>Digital effects only. Real fireworks should only be handled by trained professionals at approved displays.</div></div>
}
function DiyaCard({ lit, onClick, index }) {
  return <button className={`diya-card ${lit?'is-lit':''}`} onClick={onClick} aria-pressed={lit}>
    <div className="diya-glow"/>
    <div className="flame-wrap">{lit && <><span className="flame-outer"/><span className="flame-inner"/></>}</div>
    <div className="diya-bowl"><span/></div>
    <strong>{lit?'Your light is glowing':'Light this diya'}</strong>
    <small>DIYA {String(index+1).padStart(2,'0')}</small>
  </button>
}

function RangoliStudio(){
 const canvasRef=useRef(null),[color,setColor]=useState('#ffbd45'),[size,setSize]=useState(7),[drawing,setDrawing]=useState(false);
 const [saved,setSaved]=useState(()=>{try{return JSON.parse(localStorage.getItem('dv-rangoli')||'[]')}catch{return []}});
 const colors=['#ffbd45','#ff5e73','#8e7dff','#50d9c1','#fff1c6','#ff8b3d','#e65acb','#75b9ff'];
 const drawPreset=type=>{const c=canvasRef.current,ctx=c.getContext('2d'),cx=c.width/2,cy=c.height/2,p=['#ffbd45','#ff5e73','#8e7dff','#50d9c1','#fff1c6','#ff8b3d'];ctx.fillStyle='#11142d';ctx.fillRect(0,0,c.width,c.height);const n=type==='lotus'?8:type==='mandala'?16:12;for(let ring=0;ring<4;ring++){let radius=35+ring*43;for(let i=0;i<n;i++){let a=i*Math.PI*2/n+(ring%2)*.12,x=cx+Math.cos(a)*radius,y=cy+Math.sin(a)*radius;ctx.beginPath();ctx.ellipse(x,y,type==='lotus'?16:11,type==='lotus'?34:20,a,0,Math.PI*2);ctx.fillStyle=p[(i+ring)%p.length];ctx.globalAlpha=.85;ctx.fill();ctx.globalAlpha=1;ctx.strokeStyle='#fff0bd';ctx.lineWidth=1.5;ctx.stroke()}}ctx.beginPath();ctx.arc(cx,cy,30,0,Math.PI*2);ctx.fillStyle='#f7c85f';ctx.fill()};
 useEffect(()=>drawPreset('mandala'),[]);
 const point=e=>{const c=canvasRef.current,r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*c.width/r.width,y:(e.clientY-r.top)*c.height/r.height}};
 const start=e=>{e.currentTarget.setPointerCapture(e.pointerId);setDrawing(true);let p=point(e),ctx=canvasRef.current.getContext('2d');ctx.beginPath();ctx.moveTo(p.x,p.y)};
 const move=e=>{if(!drawing)return;let p=point(e),ctx=canvasRef.current.getContext('2d');ctx.lineWidth=size;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=color;ctx.shadowColor=color;ctx.shadowBlur=10;ctx.lineTo(p.x,p.y);ctx.stroke()};
 const clear=()=>{let c=canvasRef.current,ctx=c.getContext('2d');ctx.fillStyle='#11142d';ctx.fillRect(0,0,c.width,c.height)};
 const download=()=>{let a=document.createElement('a');a.download='my-diwali-rangoli.png';a.href=canvasRef.current.toDataURL('image/png');a.click()};
 const save=()=>{let next=[{id:Date.now(),image:canvasRef.current.toDataURL('image/png')} ,...saved].slice(0,6);setSaved(next);try{localStorage.setItem('dv-rangoli',JSON.stringify(next))}catch{alert('Device storage is full.')}};
 return <div className='studio-grid'><div className='canvas-card'><div className='canvas-heading'><div><span className='eyebrow'>CREATIVE CORNER</span><h3>Rangoli canvas</h3></div><span className='live-pill'>● READY TO CREATE</span></div>
 <div className='preset-row'><span>Ready-made designs</span><button onClick={()=>drawPreset('mandala')}>🌸 Mandala</button><button onClick={()=>drawPreset('lotus')}>🪷 Lotus</button><button onClick={()=>drawPreset('flower')}>🌼 Floral</button><button onClick={clear}>Blank canvas</button></div>
 <canvas ref={canvasRef} width='760' height='480' className='rangoli-canvas' onPointerDown={start} onPointerMove={move} onPointerUp={()=>setDrawing(false)} onPointerCancel={()=>setDrawing(false)}/>
 <div className='canvas-actions'><div className='color-list'>{colors.map(c=><button key={c} style={{background:c}} className={color===c?'selected':''} onClick={()=>setColor(c)} aria-label={c}/>)}</div><label className='size-control'>Brush <input type='range' min='2' max='22' value={size} onChange={e=>setSize(+e.target.value)}/></label></div>
 <div className='button-row'><button className='btn btn-glass' onClick={clear}><RotateCcw size={15}/> Clear</button><button className='btn btn-glass' onClick={save}><Heart size={15}/> Save locally</button><button className='btn btn-gold' onClick={download}><Download size={15}/> Download PNG</button></div></div>
 <div className='side-note'><div className='note-icon'><Flower2/></div><h3>Made by you.</h3><p>Start with a ready-made design, then customize its colors and draw your own details.</p><div className='mini-stat'><span>✦</span><div><b>Saved designs</b><small>{saved.length} stored on this device.</small></div></div>{saved.length>0&&<div className='saved-rangolis'>{saved.map((x,i)=><button key={x.id} onClick={()=>{let im=new Image();im.onload=()=>{let c=canvasRef.current;c.getContext('2d').drawImage(im,0,0,c.width,c.height)};im.src=x.image}}><img src={x.image} alt={'Saved rangoli '+(i+1)}/><small>Load design</small></button>)}</div>}</div></div>
}
function GreetingMaker() {
  const [from,setFrom]=useState('Your Name')
  const [to,setTo]=useState('Someone Special')
  const [message,setMessage]=useState('May your home shine with happiness, peace and prosperity.')
  const [style,setStyle]=useState('royal')
  const cardRef=useRef(null)
  const download=()=>{
    const c=document.createElement('canvas');c.width=1000;c.height=620;const x=c.getContext('2d')
    const g=x.createLinearGradient(0,0,1000,620);g.addColorStop(0,'#11152f');g.addColorStop(1,'#4b1e31');x.fillStyle=g;x.fillRect(0,0,1000,620)
    x.strokeStyle='#e8b95c';x.lineWidth=4;x.strokeRect(28,28,944,564)
    x.textAlign='center';x.fillStyle='#e8b95c';x.font='30px Georgia';x.fillText('✦  THE FESTIVAL OF LIGHTS  ✦',500,115)
    x.fillStyle='#fff0c7';x.font='bold 76px Georgia';x.fillText('Happy Diwali',500,245)
    x.fillStyle='#ffc86b';x.font='34px Georgia';x.fillText('Dear '+to,500,320)
    x.fillStyle='#fff4df';x.font='27px Arial';wrapText(x,message,500,390,760,42)
    x.fillStyle='#e8b95c';x.font='italic 28px Georgia';x.fillText('With love, '+from,500,520)
    const a=document.createElement('a');a.download='diwaliverse-greeting.png';a.href=c.toDataURL('image/png');a.click()
  }
  const share=()=>{const text=`Happy Diwali, ${to}! 🪔 ${message} — ${from}`;if(navigator.share)navigator.share({title:'Happy Diwali',text}).catch(()=>{});else window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank')}
  return <div className="greeting-layout">
    <div className={`greeting-preview ${style}`} ref={cardRef}><div className="card-mandala">✺</div><span className="eyebrow">THE FESTIVAL OF LIGHTS</span><h3>Happy<br/><em>Diwali</em></h3><div className="greeting-divider">✦ ✦ ✦</div><b>Dear {to||'Someone Special'}</b><p>{message}</p><small>With love, {from||'Your Name'}</small><div className="card-diya">🪔</div></div>
    <div className="form-card"><span className="eyebrow">MAKE IT PERSONAL</span><h3>A little light, a lot of love.</h3>
      <label>Your name<input value={from} onChange={e=>setFrom(e.target.value)} maxLength="35"/></label>
      <label>Send to<input value={to} onChange={e=>setTo(e.target.value)} maxLength="35"/></label>
      <label>Your message<textarea value={message} onChange={e=>setMessage(e.target.value)} maxLength="150"/></label>
      <div className="theme-picker"><span>Card style</span>{['royal','sunrise','midnight'].map(s=><button key={s} className={style===s?'active':''} onClick={()=>setStyle(s)}>{s}</button>)}</div>
      <button className="btn btn-gold full" onClick={download}><Download size={16}/> Download greeting</button><button className="btn btn-glass full" onClick={share}><Share2 size={16}/> Share greeting</button>
    </div>
  </div>
}
function PhotoBooth() {
  const [src,setSrc]=useState('')
  const [frame,setFrame]=useState('gold')
  const [photoFilter,setPhotoFilter]=useState('none')
  const filters={none:'none',warm:'sepia(.28) saturate(1.25)',festive:'saturate(1.45) contrast(1.08)',mono:'grayscale(1)',glow:'brightness(1.12) saturate(1.3)'}
  const imgRef=useRef(null)
  const download=()=>{
    if(!src)return
    const c=document.createElement('canvas');c.width=900;c.height=900;const x=c.getContext('2d'),img=imgRef.current
    x.fillStyle='#10142d';x.fillRect(0,0,900,900)
    const scale=Math.max(820/img.width,700/img.height),w=img.width*scale,h=img.height*scale
    x.save();x.beginPath();x.rect(40,40,820,700);x.clip();x.filter=filters[photoFilter]||'none';x.drawImage(img,(900-w)/2,(740-h)/2,w,h);x.filter='none';x.restore()
    x.strokeStyle=frame==='gold'?'#e8b95c':frame==='rainbow'?'#e65acb':'#f6f0df';x.lineWidth=18;x.strokeRect(28,28,844,724)
    x.fillStyle='#fff0c7';x.textAlign='center';x.font='bold 44px Georgia';x.fillText('Happy Diwali ✨',450,830)
    const a=document.createElement('a');a.download='diwaliverse-photo.png';a.href=c.toDataURL('image/png');a.click()
  }
  return <div className="photo-layout"><div className="photo-preview">
    {src?<><img ref={imgRef} src={src} alt="Your festive photo" style={{filter:filters[photoFilter]}}/><div className={'photo-frame '+frame}/><span className="photo-caption">HAPPY DIWALI ✨</span></>:<div className="upload-placeholder"><Camera size={42}/><b>Your festive photo goes here</b><span>Upload a picture to preview your frame</span></div>}
  </div><div className="form-card"><span className="eyebrow">FESTIVE PHOTO BOOTH</span><h3>Frame your memories.</h3><label className="upload-button"><ImageIcon size={18}/> Choose a photo<input type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f){const u=URL.createObjectURL(f);setSrc(u)}}}/></label><div className="theme-picker vertical"><span>Photo effect</span>{Object.keys(filters).map(k=><button key={k} className={photoFilter===k?'active':''} onClick={()=>setPhotoFilter(k)}>{k}</button>)}</div><div className="theme-picker vertical"><span>Choose a frame</span>{['gold','rainbow','pearl'].map(s=><button key={s} className={frame===s?'active':''} onClick={()=>setFrame(s)}>{s}</button>)}</div><button className="btn btn-gold full" disabled={!src} onClick={download}><Download size={16}/> Download photo frame</button><p className="tiny-muted">Your photo is processed in your browser and is not uploaded to a server.</p></div></div>
}


function NightSky() {
  const [wish,setWish]=useState('');
  const [sent,setSent]=useState(false);
  return <div className="night-sky-card"><div className="night-sky-stars">{Array.from({length:70},(_,i)=><i key={i} style={{left:((i*37)%97)+'%',top:((i*61)%91)+'%',animationDelay:(i%7)+'s'}}/>)}</div><div className="night-moon">☾</div><div className="night-sky-content"><span className="eyebrow">MAKE A LITTLE WISH</span><h2>A sky full of<br/><em>possibilities.</em></h2><p>Write a wish and send it into this little digital night sky.</p><form onSubmit={e=>{e.preventDefault();if(wish.trim()){setSent(true);setWish('')}}}><input value={wish} onChange={e=>{setWish(e.target.value);setSent(false)}} maxLength="100" placeholder="My Diwali wish is..."/><button className="btn btn-gold" type="submit">Release wish ✦</button></form>{sent&&<div className="wish-sent">✦ Your wish is floating among the stars.</div>}</div></div>
}
function SurpriseZone() {
  const messages=['You bring your own kind of light. Keep shining. ✨','May your home be filled with laughter, warmth and mithai. 🪔','A new beginning is waiting just around the corner. 🌸','Your kindness is someone else’s festival light. 💛','Wishing you a year full of bright ideas and beautiful moments. 🎆'];
  const [message,setMessage]=useState('');
  return <div className="surprise-wrap"><div className="surprise-box"><div className="surprise-gift">🎁</div><span className="eyebrow">A LITTLE FESTIVE SURPRISE</span><h2>{message?'A message just for you':'Something special is waiting.'}</h2><p>{message||'Tap the gift to unwrap a little Diwali happiness.'}</p><button className="btn btn-gold" onClick={()=>setMessage(messages[Math.floor(Math.random()*messages.length)])}>{message?'Open another surprise':'Unwrap your surprise'} <GiftIcon size={16}/></button></div></div>
}

const giftIdeas=[{id:'love',name:'For someone special',emoji:'💖',tag:'LOVE',text:'You make ordinary days feel like celebrations. Sending you light, laughter and lots of love.'},{id:'friends',name:'For my best friends',emoji:'🫶',tag:'FRIENDSHIP',text:'Life shines brighter with friends like you. Happy Diwali to my favourite people!'},{id:'family',name:'For family',emoji:'🏡',tag:'FAMILY',text:'May our home always be filled with warmth, togetherness and beautiful memories.'},{id:'thanks',name:'A little thank you',emoji:'🎁',tag:'GRATITUDE',text:'Thank you for being a bright part of my life. Wishing you joy and peace.'}];
function GiftStudio(){
 const [kind,setKind]=useState('love'),[from,setFrom]=useState('Your name'),[to,setTo]=useState('Someone special'),[note,setNote]=useState(giftIdeas[0].text);const chosen=giftIdeas.find(x=>x.id===kind)||giftIdeas[0];
 const select=id=>{setKind(id);setNote(giftIdeas.find(x=>x.id===id).text)};
 const download=()=>{const c=document.createElement('canvas');c.width=1100;c.height=700;const x=c.getContext('2d'),g=x.createLinearGradient(0,0,1100,700);g.addColorStop(0,'#191332');g.addColorStop(.5,'#53264f');g.addColorStop(1,'#123e4a');x.fillStyle=g;x.fillRect(0,0,1100,700);x.strokeStyle='#f7cf79';x.lineWidth=5;x.strokeRect(28,28,1044,644);x.textAlign='center';x.fillStyle='#ffd98c';x.font='30px Georgia';x.fillText(chosen.tag+' · DIWALI EDITION',550,105);x.font='82px Georgia';x.fillText(chosen.emoji,550,220);x.fillStyle='#fff2d5';x.font='bold 68px Georgia';x.fillText('Happy Diwali',550,330);x.font='30px Georgia';x.fillText('Dear '+to.slice(0,35),550,400);x.font='24px Arial';let words=note.split(' '),line='',y=470;for(const word of words){let test=line+word+' ';if(x.measureText(test).width>850){x.fillText(line,550,y);line=word+' ';y+=38}else line=test}x.fillText(line,550,y);x.fillStyle='#ffd98c';x.font='italic 25px Georgia';x.fillText('With love, '+from,550,620);let a=document.createElement('a');a.download='diwaliverse-gift-card.png';a.href=c.toDataURL('image/png');a.click()};
 const save=()=>{try{let all=JSON.parse(localStorage.getItem('dv-gifts')||'[]');all.unshift({kind,from,to,note,date:new Date().toLocaleDateString('en-IN')});localStorage.setItem('dv-gifts',JSON.stringify(all.slice(0,20)));alert('Gift card saved on this device.')}catch{alert('Local storage is full.')}};
 return <div className='gift-studio'><div className='gift-choice-grid'>{giftIdeas.map(x=><button className={kind===x.id?'gift-choice active':'gift-choice'} key={x.id} onClick={()=>select(x.id)}><span>{x.emoji}</span><b>{x.name}</b><small>{x.tag}</small></button>)}</div><div className='gift-editor'><div className={'gift-live-card gift-'+kind}><span>✦ {chosen.tag} · FESTIVE EDITION ✦</span><div>{chosen.emoji}</div><h2>Happy Diwali</h2><b>Dear {to||'Someone special'}</b><p>{note}</p><small>With love, {from||'Your name'}</small></div><div className='gift-fields'><span className='eyebrow'>PERSONALIZE YOUR GIFT</span><label>From<input value={from} maxLength='35' onChange={e=>setFrom(e.target.value)}/></label><label>To<input value={to} maxLength='35' onChange={e=>setTo(e.target.value)}/></label><label>Your message<textarea value={note} maxLength='220' onChange={e=>setNote(e.target.value)}/></label><div className='button-row'><button className='btn btn-glass' onClick={save}><Heart size={16}/> Save locally</button><button className='btn btn-gold' onClick={download}><Download size={16}/> Download card</button></div></div></div><p className='local-note'>Saved card details stay in this browser. Download the card to share it.</p></div>
}
function LocalChat(){
 const [room,setRoom]=useState(()=>localStorage.getItem('dv-chat-room')||'LIGHTS-2026'),[name,setName]=useState(()=>localStorage.getItem('dv-chat-name')||'Friend'),[draft,setDraft]=useState('');
 const [messages,setMessages]=useState(()=>{try{return JSON.parse(localStorage.getItem('dv-chat-'+(localStorage.getItem('dv-chat-room')||'LIGHTS-2026'))||'[]')}catch{return []}});const channel=useRef(null);
 useEffect(()=>{const key='dv-chat-'+room;localStorage.setItem('dv-chat-room',room);setMessages(()=>{try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return []}});if(channel.current)channel.current.close();if('BroadcastChannel'in window){channel.current=new BroadcastChannel('diwaliverse-'+room);channel.current.onmessage=e=>setMessages(m=>[...m,e.data].slice(-100))}return()=>channel.current?.close()},[room]);
 useEffect(()=>{localStorage.setItem('dv-chat-'+room,JSON.stringify(messages.slice(-100)))},[messages,room]);
 const send=e=>{e.preventDefault();if(!draft.trim())return;const msg={id:Date.now()+Math.random(),name:name.trim().slice(0,24)||'Friend',text:draft.trim().slice(0,400),time:new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})};setMessages(m=>[...m,msg].slice(-100));channel.current?.postMessage(msg);setDraft('')};
 return <div className='chat-shell'><div className='chat-intro'><div className='chat-heart'>💌</div><div><span className='eyebrow'>NO ACCOUNT · NO PASSWORD</span><h2>A little place to <em>say hello.</em></h2><p>Choose a nickname and room code. This demo stores messages in this browser and syncs tabs on the same device.</p></div></div><div className='chat-settings'><label>Your nickname<input value={name} maxLength='24' onChange={e=>{setName(e.target.value);localStorage.setItem('dv-chat-name',e.target.value)}}/></label><label>Room code<input value={room} maxLength='24' onChange={e=>setRoom(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g,'').slice(0,24))}/></label><button className='btn btn-glass' onClick={()=>navigator.clipboard?.writeText(room).catch(()=>{})}>Copy room code</button></div><div className='chat-notice'>🔒 LOCAL DEMO CHAT — it does not connect different phones or people over the internet. Remote chat requires a shared realtime backend.</div><div className='chat-messages' aria-live='polite'>{messages.length===0?<div className='chat-empty'>💬<b>Your conversation starts here.</b><small>Open this same site in another tab on this device to test.</small></div>:messages.map(m=><div className='chat-message' key={m.id}><div><b>{m.name}</b><time>{m.time}</time></div><p>{m.text}</p></div>)}</div><form className='chat-compose' onSubmit={send}><input value={draft} maxLength='400' onChange={e=>setDraft(e.target.value)} placeholder='Write a kind message…' aria-label='Message'/><button className='btn btn-gold' type='submit' disabled={!draft.trim()}><Send size={16}/> Send</button></form><div className='chat-actions'><button onClick={()=>{if(confirm('Clear this room on this device?'))setMessages([])}}>Clear this device chat</button></div></div>
}
function App() {
  const [active,setActive]=useState('home')
  const [soundOn,setSoundOn]=useState(false)
  const [mobileMenu,setMobileMenu]=useState(false)
  const [lit,setLit]=useState([true,false,false,false,false,false])
  const [decor,setDecor]=useState(['lights','flowers'])
  const [wish,setWish]=useState('')
  const [wall,setWall]=useState(()=>{try{return JSON.parse(localStorage.getItem('dv-wall')||'[]')}catch{return []}})
  const [score,setScore]=useState(0)
  const [quiz,setQuiz]=useState(0)
  const [musicOn,setMusicOn]=useState(false)
  const audioRef=useRef(null)
  const musicOsc=useRef(null)
  const [dark,setDark]=useState(true)
  const [theme,setTheme]=useState('rainbow')
  const [count,setCount]=useState({days:0,hours:0,minutes:0,seconds:0})

  useEffect(()=>{
    const tick=()=>{const target=new Date('2027-10-29T00:00:00+05:30').getTime();let diff=Math.max(0,target-Date.now());setCount({days:Math.floor(diff/86400000),hours:Math.floor(diff/3600000)%24,minutes:Math.floor(diff/60000)%60,seconds:Math.floor(diff/1000)%60})}
    tick();const id=setInterval(tick,1000);return()=>clearInterval(id)
  },[])
  useEffect(()=>{localStorage.setItem('dv-wall',JSON.stringify(wall))},[wall])
  useEffect(()=>{
    if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
    const sparkle=(e)=>{
      const el=document.createElement('span');
      el.className='magic-cursor-spark';
      el.textContent=['✦','✧','·','✺'][Math.floor(Math.random()*4)];
      el.style.left=e.clientX+'px';el.style.top=e.clientY+'px';
      document.body.appendChild(el);
      window.setTimeout(()=>el.remove(),750);
    };
    let last=0;
    const move=e=>{const now=Date.now();if(now-last>55){sparkle(e);last=now}};
    window.addEventListener('pointermove',move,{passive:true});
    return()=>window.removeEventListener('pointermove',move);
  },[])
  useEffect(()=>{if(soundOn&&!audioRef.current)audioRef.current=makeAudio();if(!soundOn&&audioRef.current){audioRef.current.close();audioRef.current=null}},[soundOn])
  useEffect(()=>()=>{if(musicOsc.current)musicOsc.current.close();if(audioRef.current)audioRef.current.close()},[])
  const toggleMusic=()=>{
    if(musicOn){musicOsc.current?.close();musicOsc.current=null;setMusicOn(false);return}
    const ctx=makeAudio();if(!ctx)return
    const master=ctx.createGain();master.gain.value=.035;master.connect(ctx.destination)
    ;[220,277.18,329.63].forEach((hz,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=hz;g.gain.value = i === 0 ? 0.6 : 0.22;o.connect(g);g.connect(master);o.start()})
    musicOsc.current=ctx;setMusicOn(true)
  }
  const toggleFullscreen=()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.().catch(()=>{});else document.exitFullscreen?.()}
  const cycleTheme=()=>setTheme(t=>t==='rainbow'?'rose':t==='rose'?'emerald':'rainbow')
  const go=(id)=>{setActive(id);setMobileMenu(false);window.scrollTo({top:0,behavior:'smooth'})}
  const addWish=(e)=>{e.preventDefault();if(!wish.trim())return;setWall([{id:Date.now(),text:wish.trim(),date:new Date().toLocaleDateString('en-IN')} ,...wall].slice(0,30));setWish('')}
  const nav=sections.map(([label,id,Icon])=><button key={id} className={active===id?'nav-link active':'nav-link'} onClick={()=>go(id)}><Icon size={16}/><span>{label}</span></button>)
  const quizQuestions=[{q:'Which festival is widely known as the Festival of Lights?',a:['Holi','Diwali','Pongal'],correct:1},{q:'What is traditionally lit during Diwali?',a:['Diyas','Snow lanterns','Paper fans'],correct:0},{q:'Which colorful art is often made at the entrance?',a:['Origami','Rangoli','Calligraphy'],correct:1},{q:'Which goddess is commonly worshipped by many families during Diwali?',a:['Saraswati','Lakshmi','Parvati'],correct:1},{q:'What is commonly exchanged with family and friends?',a:['Sweets','Winter coats','Seashells'],correct:0},{q:'What do people often decorate their doorways with?',a:['Rangoli','Snow','Shellfish'],correct:0},{q:'Which is a common Diwali greeting?',a:['Happy Onam','Happy Diwali','Merry Holi'],correct:1},{q:'What do rows of diyas symbolize?',a:['Light and hope','Monsoon rain','Harvest tools'],correct:0}]
  const decorItems=[['lights','✨','Fairy lights'],['flowers','🌼','Flowers'],['diyas','🪔','Diyas'],['toran','🏵️','Door toran'],['lanterns','🏮','Lanterns'],['stars','⭐','Stars']]
  return <div className={(dark?'app-shell':'app-shell light-theme')+' theme-'+theme}>
    <header className="topbar"><button className="brand" onClick={()=>go('home')}><span className="brand-mark">🪔</span><span>Diwali<span className="brand-gold">Verse</span><small>THE FESTIVAL OF LIGHTS</small></span></button>
      <nav className="desktop-nav">{nav}</nav>
      <div className="top-actions"><button className="icon-btn" title="Toggle theme" onClick={()=>setDark(v=>!v)}>{dark?<Sun size={18}/>:<Moon size={18}/>}</button><button className="icon-btn" title="Toggle sound" onClick={()=>setSoundOn(v=>!v)}>{soundOn?<Volume2 size={18}/>:<VolumeX size={18}/>}</button><button className="icon-btn" title="Change festive theme" onClick={cycleTheme}><Palette size={18}/></button><button className="icon-btn" title="Fullscreen" onClick={toggleFullscreen}><Maximize2 size={17}/></button><button className="mobile-menu-btn" onClick={()=>setMobileMenu(v=>!v)}>{mobileMenu?<X/>:<Menu/>}</button></div>
    </header>
    {mobileMenu&&<div className="mobile-nav">{nav}</div>}
    <main>
      {active==='home'&&<><section className="hero">
        <div className="hero-stars">✦　　　·　　 ✧　　　 ·　　　✦</div><div className="hero-content"><div className="eyebrow"><span className="live-dot"/> A LITTLE MAGIC. A LOT OF LIGHT.</div><h1>Let there be<br/><em>light.</em></h1><p>Step into a world of glowing diyas, sparkling skies and beautiful moments. Your celebration starts here.</p><div className="button-row"><button className="btn btn-gold" onClick={()=>go('fireworks')}><Sparkles size={17}/> Enter celebration <ChevronRight size={17}/></button><button className="btn btn-glass" onClick={()=>go('diyas')}><Flame size={17}/> Light a diya</button></div><div className="hero-footnote"><span>✦</span> MADE FOR MOMENTS THAT SHINE <span>✦</span></div></div>
        <div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-moon"/><div className="hero-lamp">🪔</div><div className="hero-spark s1">✦</div><div className="hero-spark s2">✧</div><div className="hero-spark s3">✦</div><div className="hero-spark s4">·</div><div className="hero-bottom-glow"/></div>
      </section>
      <section className="countdown-strip"><div><span className="eyebrow">NEXT DIWALI COUNTDOWN</span><b>The celebration returns in</b></div><div className="countdown">{Object.entries(count).map(([k,v])=><div key={k}><strong>{String(v).padStart(2,'0')}</strong><small>{k}</small></div>)}</div></section>
      <section className="section-block"><div className="section-heading"><div><span className="eyebrow">EXPLORE THE MAGIC</span><h2>Your festival, <em>your universe.</em></h2></div><button className="text-link" onClick={()=>go('fireworks')}>Explore all <ChevronRight size={16}/></button></div><div className="feature-grid">{sections.slice(1).map(([label,id,Icon],i)=><button key={id} className="feature-card" onClick={()=>go(id)}><span className="feature-icon"><Icon size={22}/></span><span className="feature-number">0{i+1}</span><h3>{label}</h3><p>{['Create a sky full of color.','Bring a little flame to life.','Draw patterns with light.','Dress up your virtual home.','Send a wish from the heart.','Give your memories a festive frame.','Play a little festival challenge.','Set the mood with gentle sounds.','Share a little happiness.','Discover the meaning behind the light.'][i]}</p><span className="feature-arrow"><ChevronRight size={17}/></span></button>)}</div></section>
      <section className="quote-band"><span>“</span><p>May the light within you shine brighter than the lights around you.</p><small>— A DIWALI WISH</small></section></>}
      {active==='fireworks'&&<section className="page-section"><PageTitle eyebrow="THE NIGHT SKY" title="Fireworks" accent="World" desc="A little sparkle goes a long way. Tap anywhere on the canvas and make the night yours."/><Fireworks soundOn={soundOn}/><p className="tiny-muted centered">Sound effects are synthesized in your browser. Turn sound on using the speaker button above.</p></section>}
      {active==='crackers'&&<section className="page-section"><PageTitle eyebrow="THE VIRTUAL FIREWORK GALLERY" title="Cracker" accent="Explorer" desc="Tap a firework to preview its motion, colors and visual pattern — all safely simulated on your screen."/><VirtualCrackers/></section>}
      {active==='gifts'&&<section className="page-section"><PageTitle eyebrow="LITTLE SURPRISES, BIG FEELINGS" title="Gifts &" accent="Cards" desc="Create a thoughtful Diwali card for your partner, friends or family."/><GiftStudio/></section>}
      {active==='chat'&&<section className="page-section"><PageTitle eyebrow="A LITTLE PLACE TO SAY HELLO" title="Love & Friends" accent="Chat" desc="A no-login local chat demo with a room code."/><LocalChat/></section>}
      {active==='diyas'&&<section className="page-section"><PageTitle eyebrow="LIGHT UP THE MOMENT" title="Diya" accent="World" desc="Every little flame makes the world a little brighter. Tap a diya to light it."/><div className="diya-grid">{lit.map((v,i)=><DiyaCard key={i} index={i} lit={v} onClick={()=>setLit(a=>a.map((x,j)=>j===i?!x:x))}/>)}</div><div className="center-actions"><button className="btn btn-gold" onClick={()=>setLit(lit.map(()=>true))}><Flame size={16}/> Light all diyas</button><button className="btn btn-glass" onClick={()=>setLit(lit.map(()=>false))}>Blow out all</button></div></section>}
      {active==='rangoli'&&<section className="page-section"><PageTitle eyebrow="MAKE SOMETHING BEAUTIFUL" title="Rangoli" accent="Studio" desc="Pick a color, draw a pattern and make your own little piece of festive art."/><RangoliStudio/></section>}
      {active==='decor'&&<section className="page-section"><PageTitle eyebrow="MAKE YOURSELF AT HOME" title="Virtual Home" accent="Decor" desc="Choose your favorite festive touches and decorate this little digital home."/><div className="decor-scene"><div className="decor-stars">✦　 ·　 ✧　　 ✦</div><div className="decor-house"><div className="roof">⌂</div><div className="house-body"><div className="house-window">✧</div><div className="house-door">🪔</div><div className="house-window">✧</div></div><div className="house-floor"> {decor.includes('diyas')?'🪔　🪔　🪔':''} {decor.includes('flowers')?'🌼　🌸　🌼':''} </div></div><div className="decor-effects">{decor.includes('lights')&&<div className="fairy-lights">✦　·　✦　·　✦　·　✦　·　✦</div>}{decor.includes('lanterns')&&<div className="floating-lanterns">🏮　　 🏮　　 🏮</div>}{decor.includes('stars')&&<div className="star-layer">✧　　 ✦　　 ✧　　 ✦</div>}{decor.includes('toran')&&<div className="toran">🌼🌿🌼🌿🌼🌿🌼</div>}</div></div><div className="decor-controls"><h3>Choose your decorations</h3>{decorItems.map(([id,emoji,label])=><button key={id} className={decor.includes(id)?'decor-chip selected':'decor-chip'} onClick={()=>setDecor(a=>a.includes(id)?a.filter(x=>x!==id):[...a,id])}><span>{emoji}</span>{label}{decor.includes(id)&&' ✓'}</button>)}</div></section>}
      {active==='greetings'&&<section className="page-section"><PageTitle eyebrow="SEND A LITTLE HAPPINESS" title="Greeting" accent="Maker" desc="Create a personal Diwali wish, download it as a card or share it with someone special."/><GreetingMaker/></section>}
      {active==='photo'&&<section className="page-section"><PageTitle eyebrow="KEEP THE GLOW" title="Festive Photo" accent="Booth" desc="Add a photo, choose a frame and create a festive keepsake. Your photo stays on your device."/><PhotoBooth/></section>}
      {active==='games'&&<section className="page-section"><PageTitle eyebrow="A LITTLE FESTIVE FUN" title="Diwali" accent="Games" desc="A quick festival quiz. See how many you can get right!"/><div className="game-card"><div className="game-icon">🎮</div><span className="eyebrow">FESTIVAL QUIZ · {quiz+1} / {quizQuestions.length}</span><h3>{quizQuestions[quiz%quizQuestions.length].q}</h3><div className="answer-list">{quizQuestions[quiz%quizQuestions.length].a.map((a,i)=><button key={a} onClick={()=>{if(i===quizQuestions[quiz%quizQuestions.length].correct)setScore(s=>s+1);setQuiz(q=>q+1)}}>{a}<ChevronRight size={16}/></button>)}</div><div className="score-line"><span>✦ Your score</span><b>{score} points</b><button onClick={()=>{setQuiz(0);setScore(0)}}>Restart</button></div></div></section>}
      {active==='music'&&<section className="page-section"><PageTitle eyebrow="SET THE MOOD" title="Music &" accent="Sounds" desc="A gentle ambient tone made right here in your browser. No audio files or external music services needed."/><div className="music-card"><div className="music-art"><div className="music-orbit"/>🪔</div><div className="music-info"><span className="eyebrow">DIWALI AMBIENCE · SYNTH</span><h3>Golden Hour</h3><p>A soft, layered ambient chord to accompany your celebration.</p><button className="btn btn-gold" onClick={toggleMusic}>{musicOn?<Pause size={17}/>:<Play size={17}/>} {musicOn?'Pause ambience':'Play ambience'}</button><small>Use the top speaker control for fireworks sound effects.</small></div></div></section>}
      {active==='wall'&&<section className="page-section"><PageTitle eyebrow="A WORLD FULL OF WISHES" title="Celebration" accent="Wall" desc="Leave a little light for the next visitor. Wishes are saved only in this browser."/><div className="wall-layout"><form className="wall-form" onSubmit={addWish}><span className="eyebrow">ADD YOUR WISH</span><h3>Share a little joy.</h3><textarea placeholder="Wishing everyone a bright and beautiful Diwali..." value={wish} onChange={e=>setWish(e.target.value)} maxLength="180"/><div className="wall-form-bottom"><small>{wish.length}/180 characters</small><button className="btn btn-gold" type="submit"><Send size={15}/> Post wish</button></div></form><div className="wish-list">{wall.length?wall.map(w=><article className="wish-card" key={w.id}><span>✦</span><p>{w.text}</p><small>{w.date} · A visitor's wish</small></article>):<div className="empty-wall"><Stars size={34}/><b>Your wall is waiting for its first wish.</b><span>Be the first to add a little sparkle.</span></div>}</div></div></section>}
      {active==='traditions'&&<section className="page-section"><PageTitle eyebrow="THE MEANING BEHIND THE LIGHT" title="Stories &" accent="Traditions" desc="Discover some of the beautiful customs and stories celebrated during Diwali across India."/><div className="tradition-grid">{[['🪔','The Festival of Lights','Homes and public spaces glow with rows of lamps, symbolizing hope, warmth and the triumph of light.'],['🌸','Lakshmi Puja','Many families offer prayers for well-being and prosperity, decorating their homes with flowers and lamps.'],['🎨','Rangoli','Colorful patterns at entrances welcome guests and bring creativity into the celebration.'],['🍬','Sharing Sweets','Families and friends exchange sweets and greetings as a gesture of affection and togetherness.'],['🏡','New Beginnings','For many, Diwali is a time to refresh homes, reconnect with loved ones and begin anew.'],['🌍','Many Traditions','Diwali is celebrated in different ways across regions and communities, each with its own stories and customs.']].map(([emoji,title,desc])=><article className="tradition-card" key={title}><span>{emoji}</span><h3>{title}</h3><p>{desc}</p></article>)}</div></section>}
      {active==='night'&&<section className="page-section"><PageTitle eyebrow="A QUIET MOMENT OF MAGIC" title="Interactive" accent="Night Sky" desc="Add a wish to your own little universe of stars."/><NightSky/></section>}
      {active==='surprise'&&<section className="page-section"><PageTitle eyebrow="A GIFT OF GOOD VIBES" title="Surprise" accent="Zone" desc="A small surprise, wrapped with festive wishes."/><SurpriseZone/></section>}
    </main>
    <footer className="footer"><div className="footer-brand">🪔 Diwali<span>Verse</span></div><p>A little magic. A lot of light. Made to celebrate together.</p><div className="footer-links">{sections.slice(1,6).map(([l,id])=><button key={id} onClick={()=>go(id)}>{l}</button>)}</div><small>© {new Date().getFullYear()} DiwaliVerse · A digital celebration of light</small></footer>
  </div>
}

function PageTitle({eyebrow,title,accent,desc}){return <div className="page-title"><span className="eyebrow">{eyebrow}</span><h1>{title} <em>{accent}</em></h1><p>{desc}</p></div>}
function wrapText(ctx,text,x,y,maxWidth,lineHeight){const words=text.split(' ');let line='';for(let n=0;n<words.length;n++){const test=line+words[n]+' ';if(ctx.measureText(test).width>maxWidth&&n>0){ctx.fillText(line,x,y);line=words[n]+' ';y+=lineHeight}else line=test}ctx.fillText(line,x,y)}

export default App
