"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Trash2} from 'lucide-react';
import {RoomEvent} from 'livekit-client';

const hostStickerMemory=new Map();
const TOPIC='rivyza-live-stickers-v1';
const DEFAULT_FILES=['01_bolsas_compras.png','02_gafas_sol.png','03_tenis_azules.png','04_fuegos_artificiales.png','05_good_vibe.png','06_feliz_cumpleanos.png','07_gracias.png','08_feliz_dia.png','09_wow.png','10_ok.png','11_correcto.png','12_incorrecto.png','13_nuevo.png','14_planeta_tierra.png','15_corazon_rosado.png','16_celebracion.png','17_pizza.png','18_baloncesto.png','19_futbol.png','20_control_videojuego.png','21_grabando_rec.png','22_bateria.png','23_cargando.png','24_sigueme.png','25_pulgar_arriba.png','26_me_gusta.png','27_angel.png','29_libreta_corazon.png','30_labial.png','31_campana.png','32_flor_rosa.png','33_girasol.png','34_regalo.png','35_fuego.png','36_copo_nieve.png','37_nube.png','38_sol_gafas.png','39_luna_estrellas.png','40_hamburguesa.png','41_papas_fritas.png','42_audifonos.png','43_notas_musicales.png','44_cine.png','45_avion.png','46_palmera.png','47_camara.png','48_manzana_libro.png','49_ve.png','50_corona.png','51_diamante.png','52_enamorado.png','53_te_amo.png','54_sobre_corazones.png','55_gato_gafas.png','56_arcoiris.png','57_cafe_corazon.png','58_corazon_morado.png','59_corazon_rojo.png','60_love.png','61_rosa_roja.png','62_mariposa_azul.png'];
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const sanitize=items=>Array.isArray(items)?items.slice(0,60).filter(s=>s&&typeof s.id==='string'&&(s.kind==='text'?typeof s.text==='string':typeof s.file==='string'&&/^[^/\\]+\.(?:png|webp)$/i.test(s.file))).map(s=>({id:s.id.slice(0,80),...(s.kind==='text'?{kind:'text',text:s.text.slice(0,100),color:/^#[0-9a-f]{6}$/i.test(s.color)?s.color:'#ffffff',scale:clamp(Number(s.scale)||1,.25,8)}:{file:s.file,size:clamp(Number(s.size)||24,8,100)}),x:clamp(Number(s.x)||0,-50,150),y:clamp(Number(s.y)||0,-50,150),rotation:clamp(Number(s.rotation)||0,-360,360)})):[];

export default function LiveStickers({room,isHost,hostId,liveRoomId,supabase,lang='es'}){
  const [stage,setStage]=useState(null),[items,setItems]=useState([]),[catalog,setCatalog]=useState([]),[catalogError,setCatalogError]=useState(false),[panel,setPanel]=useState(''),[selected,setSelected]=useState(null),[draft,setDraft]=useState(''),[color,setColor]=useState('#ffffff');
  const itemsRef=useRef([]),gesture=useRef(null),stageRef=useRef(null),version=useRef(0),hostSession=useRef(null),lastSent=useRef(0);
  const labels=lang==='en'?{button:'Stickers',title:'3D stickers',delete:'Release to delete',empty:'Could not load stickers. Check Storage permissions.'}:{button:'Stickers',title:'Stickers 3D',delete:'Suelta para eliminar',empty:'No se pudieron cargar los stickers. Revisa los permisos de Storage.'};
  useEffect(()=>{const node=document.querySelector('.rivyza-live-stage');setStage(node);stageRef.current=node;},[]);
  useEffect(()=>{const saved=isHost?(hostStickerMemory.get(liveRoomId)||[]):[];setItems(saved);itemsRef.current=saved;version.current=0;hostSession.current=null;setPanel('');setSelected(null);},[liveRoomId,isHost]);
  useEffect(()=>{
    let alive=true;
    const load=async()=>{
      setCatalogError(false);
      try{
        const bucket=supabase.storage.from('rivyza-stickers');
        const found=[];
        const pageSize=100;
        for(let offset=0;offset<10000;offset+=pageSize){
          const {data,error}=await bucket.list('',{limit:pageSize,offset,sortBy:{column:'name',order:'asc'}});
          if(error)throw error;
          const page=data||[];
          for(const entry of page){
            if(entry?.name && /^[^/\\]+\.(?:png|webp)$/i.test(entry.name) && (entry.id || entry.metadata))found.push(entry.name);
          }
          if(page.length<pageSize)break;
        }
        if(alive){setCatalog([...new Set(found)].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})));setCatalogError(false);}
      }catch(error){
        console.warn('RIVYZA sticker catalog:',error);
        if(alive){setCatalog([]);setCatalogError(true);}
      }
    };
    load();
    return()=>{alive=false;};
  },[supabase]);
  const send=useCallback((next,receiver)=>{
    if(!isHost)return;
    hostStickerMemory.set(liveRoomId,sanitize(next));
    if(hostStickerMemory.size>30)hostStickerMemory.delete(hostStickerMemory.keys().next().value);
    if(room.state!=='connected')return;
    const packet={type:'state',roomId:liveRoomId,version:(version.current=Math.max(version.current+1,Date.now())),session:room.localParticipant.sid,items:sanitize(next)};
    room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(packet)),{reliable:true,topic:TOPIC,...(receiver?{destinationIdentities:[receiver]}:{})}).catch(e=>console.warn('LIVE stickers sync:',e));
  },[isHost,room,liveRoomId]);
  const commit=useCallback(next=>{const clean=sanitize(next);itemsRef.current=clean;setItems(clean);send(clean);},[send]);
  useEffect(()=>{
    const receive=(bytes,sender,_kind,topic)=>{
      if(topic!==TOPIC||!sender?.identity)return;
      try{
        const packet=JSON.parse(new TextDecoder().decode(bytes));
        if(packet.roomId!==liveRoomId)return;
        if(packet.type==='request'){
          if(isHost)send(itemsRef.current,sender.identity);
          return;
        }
        if(packet.type!=='state'||sender.identity!==hostId||isHost)return;
        const currentHost=room.remoteParticipants.get(hostId);
        if(!currentHost || sender.sid!==currentHost.sid) return;
        if(packet.session && packet.session!==sender.sid) return;
        if(hostSession.current!==sender.sid){hostSession.current=sender.sid;version.current=0;}
        if(Number(packet.version)<version.current)return;
        version.current=Number(packet.version)||0;
        const clean=sanitize(packet.items);itemsRef.current=clean;setItems(clean);
      }catch(e){console.warn('Invalid sticker packet:',e);}
    };
    const request=()=>{if(isHost||room.state!=='connected')return;room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify({type:'request',roomId:liveRoomId})),{reliable:true,topic:TOPIC,destinationIdentities:[hostId]}).catch(()=>{});};
    const joined=p=>{if(isHost&&p?.identity)send(itemsRef.current,p.identity);else if(p?.identity===hostId){hostSession.current=null;version.current=0;request();}};
    const reconnect=()=>{if(isHost)send(itemsRef.current);else {hostSession.current=null;version.current=0;request();}};
    room.on(RoomEvent.DataReceived,receive);room.on(RoomEvent.Reconnected,reconnect);room.on(RoomEvent.ParticipantConnected,joined);
    request();const timer=setInterval(()=>{if(isHost){send(itemsRef.current);}else request();},4500);
    return()=>{clearInterval(timer);room.off(RoomEvent.DataReceived,receive);room.off(RoomEvent.Reconnected,reconnect);room.off(RoomEvent.ParticipantConnected,joined);};
  },[room,liveRoomId,hostId,isHost,send]);
  const tx=(es,en)=>lang==='en'?en:es;
  const select=s=>{setSelected(s.id);setPanel('edit');};
  const toggle=which=>{setSelected(null);setPanel(p=>p===which?'':which);};
  const patch=(id,values)=>commit(itemsRef.current.map(s=>s.id===id?{...s,...values}:s));
  const point=e=>({x:e.clientX,y:e.clientY});
  const resetGesture=g=>{g.base={...itemsRef.current.find(s=>s.id===g.id)};g.start=[...g.pointers.values()];};
  const startDrag=(e,s)=>{if(!isHost)return;e.preventDefault();e.stopPropagation();try{e.currentTarget.setPointerCapture(e.pointerId)}catch{};select(s);let g=gesture.current;if(!g||g.id!==s.id)g=gesture.current={id:s.id,pointers:new Map()};g.pointers.set(e.pointerId,point(e));resetGesture(g);};
  const moveDrag=e=>{const g=gesture.current,r=stageRef.current?.getBoundingClientRect();if(!g||!g.pointers.has(e.pointerId)||!r?.width||!r.height)return;e.preventDefault();e.stopPropagation();g.pointers.set(e.pointerId,point(e));const pts=[...g.pointers.values()],start=g.start,base=g.base;let next={};if(pts.length===2&&start.length===2){const [a,b]=pts,[c,d]=start;const ratio=Math.hypot(b.x-a.x,b.y-a.y)/Math.max(1,Math.hypot(d.x-c.x,d.y-c.y));next={...(base.kind==='text'?{scale:base.scale*ratio}:{size:base.size*ratio}),rotation:base.rotation+(Math.atan2(b.y-a.y,b.x-a.x)-Math.atan2(d.y-c.y,d.x-c.x))*180/Math.PI,x:base.x+(a.x+b.x-c.x-d.x)/2/r.width*100,y:base.y+(a.y+b.y-c.y-d.y)/2/r.height*100};}else if(pts.length===1&&start.length===1){next={x:base.x+(pts[0].x-start[0].x)/r.width*100,y:base.y+(pts[0].y-start[0].y)/r.height*100};}const updated=sanitize(itemsRef.current.map(s=>s.id===g.id?{...s,...next}:s));itemsRef.current=updated;setItems(updated);if(Date.now()-lastSent.current>110){lastSent.current=Date.now();send(updated);}};
  const endDrag=e=>{const g=gesture.current;if(!g||!g.pointers.has(e.pointerId))return;e.stopPropagation();g.pointers.delete(e.pointerId);if(g.pointers.size)resetGesture(g);else{gesture.current=null;commit(itemsRef.current);}};
  const add=file=>{if(!isHost||itemsRef.current.length>=60)return;const s={id:crypto.randomUUID(),file,x:50,y:48,size:24,rotation:0};commit([...itemsRef.current,s]);select(s);};
  const addText=()=>{if(!isHost||!draft.trim()||itemsRef.current.length>=60)return;const s={id:crypto.randomUUID(),kind:'text',text:draft.trim(),color,x:50,y:50,scale:1,rotation:0};commit([...itemsRef.current,s]);setDraft('');setPanel('');setSelected(null);};
  const active=items.find(s=>s.id===selected);
  const close=()=>{setPanel('');setSelected(null);};
  const buttonStyle={background:'#0009',border:'1px solid #ffffff50',color:'white',borderRadius:12,padding:'8px 10px',fontSize:12};
  const rowStyle={display:'flex',alignItems:'center',gap:5,flexWrap:'nowrap',width:'100%',boxSizing:'border-box',background:'#16131eea',border:'1px solid #ffffff30',borderRadius:12,padding:5,color:'white'};
  const rangeStyle={flex:'1 1 0',minWidth:0,width:0,touchAction:'pan-x'};
  const url=file=>supabase.storage.from('rivyza-stickers').getPublicUrl(file).data.publicUrl;
  if(!stage)return null;
  return createPortal(<>
    <div className="rivyza-sticker-layer" style={{position:'absolute',inset:0,zIndex:55,pointerEvents:'none',overflow:'hidden'}}>
      {items.map(s=><div key={s.id} onPointerDown={e=>startDrag(e,s)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag} style={{position:'absolute',left:`${s.x}%`,top:`${s.y}%`,...(s.kind==='text'?{color:s.color,fontSize:23,fontWeight:800,textShadow:'0 2px 4px #000,0 0 8px #000',whiteSpace:'pre-wrap',maxWidth:'90%',textAlign:'center',transform:`translate(-50%,-50%) rotate(${s.rotation}deg) scale(${s.scale})`}:{width:`${s.size}%`,transform:`translate(-50%,-50%) rotate(${s.rotation}deg)`}),touchAction:'none',pointerEvents:isHost?'auto':'none',cursor:isHost?'grab':'default',userSelect:'none',outline:isHost&&selected===s.id?'1px dashed #ffffff99':'none'}}>{s.kind==='text'?s.text:<img src={url(s.file)} draggable={false} alt="Sticker" style={{display:'block',width:'100%',height:'auto',pointerEvents:'none'}}/>}</div>)}
    </div>
    {isHost&&<button type="button" onClick={()=>toggle('stickers')} aria-label={labels.button} style={{position:'fixed',right:19,bottom:"calc(96px + env(safe-area-inset-bottom))",zIndex:90,background:'#251b36e8',border:'1px solid #ffffff66',borderRadius:14,color:'white',padding:'5px 6px',fontSize:10,fontWeight:700,width:58,height:65,boxSizing:'border-box',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:1,pointerEvents:'auto'}}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{display:'block'}}><path d="M20 13V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7"/><path d="M20 13h-5a2 2 0 0 0-2 2v5z"/><path d="M8 9h8"/><path d="M8 13h3"/></svg><span>{labels.button}</span></button>}
    {isHost&&<button type="button" onClick={()=>toggle('text')} style={{...buttonStyle,position:'fixed',right:19,bottom:'calc(166px + env(safe-area-inset-bottom))',zIndex:90,width:58,height:44,padding:3}}>Aa {tx('Texto','Text')}</button>}
    {isHost&&(panel==='text'||(panel==='edit'&&active))&&<div style={{position:'absolute',top:'calc(70px + env(safe-area-inset-top,0px))',left:8,right:8,zIndex:96,pointerEvents:'auto'}}>
      {panel==='text'?<div style={rowStyle}><input value={draft} maxLength={100} onChange={e=>setDraft(e.target.value)} placeholder={tx('Escribe en tu LIVE','Write on your LIVE')} style={{flex:1,width:0,minWidth:0,fontSize:16,background:'#111827',color:'white',border:'1px solid #64748b',borderRadius:9,padding:9}}/><input type="color" value={color} onChange={e=>setColor(e.target.value)} aria-label={tx('Color del texto','Text color')} style={{flex:'0 0 36px',width:36,height:36}}/><button type="button" style={buttonStyle} disabled={!draft.trim()} onClick={addText}>{tx('Añadir','Add')}</button><button type="button" style={buttonStyle} onClick={close}>✓</button></div>:<div style={rowStyle}><label style={{fontSize:11,whiteSpace:'nowrap'}}>{active.kind==='text'?'Aa':'↔'} {tx('Tamaño','Size')}</label><input aria-label={tx('Tamaño','Size')} type="range" min={active.kind==='text'?.25:8} max={active.kind==='text'?8:100} step={active.kind==='text'?.05:1} value={active.kind==='text'?active.scale:active.size} onChange={e=>patch(active.id,{[active.kind==='text'?'scale':'size']:Number(e.target.value)})} style={rangeStyle}/><label style={{fontSize:11,whiteSpace:'nowrap'}}>↻ {tx('Girar','Rotate')}</label><input aria-label={tx('Girar','Rotate')} type="range" min={-180} max={180} step={1} value={((active.rotation+180)%360+360)%360-180} onChange={e=>patch(active.id,{rotation:Number(e.target.value)})} style={rangeStyle}/><button type="button" aria-label={tx('Eliminar','Delete')} onClick={()=>{commit(itemsRef.current.filter(s=>s.id!==active.id));close();}} style={{...buttonStyle,background:'#b91c43',padding:'8px 9px',flexShrink:0}}><Trash2 size={18}/></button><button type="button" onClick={close} style={{...buttonStyle,padding:'4px 6px'}}>✓</button></div>}
    </div>}
    {isHost&&panel==='stickers'&&<div role="dialog" aria-label={labels.title} style={{position:'absolute',bottom:90,left:10,right:10,maxHeight:'42%',zIndex:95,overflow:'hidden',display:'flex',flexDirection:'column',background:'#17121ef5',border:'1px solid #ffffff44',borderRadius:16,color:'white',padding:12,pointerEvents:'auto'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><strong>{labels.title}</strong><button type="button" onClick={()=>setOpen(false)} style={{color:'white',background:'transparent',border:0,fontSize:23}}>✕</button></div><div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:9,gridAutoRows:'104px',overflowY:'auto',minHeight:0,alignContent:'start',touchAction:'pan-y'}}>{catalog.length?catalog.map(file=><button key={file} type="button" onClick={()=>add(file)} title={file.replace(/^\d+_/,'').replace('.png','').replaceAll('_',' ')} style={{background:'#ffffff16',border:'1px solid #ffffff20',borderRadius:10,padding:0,width:'100%',height:104,minWidth:0,minHeight:0,overflow:'hidden',position:'relative',display:'block',boxSizing:'border-box',cursor:'pointer'}}><img src={url(file)} alt={file.replace(/^\d+_/,'').replace('.png','').replaceAll('_',' ')} loading="lazy" style={{display:'block',position:'absolute',inset:7,width:'calc(100% - 14px)',height:'calc(100% - 14px)',maxWidth:'calc(100% - 14px)',maxHeight:'calc(100% - 14px)',objectFit:'contain',pointerEvents:'none'}}/></button>):<p style={{gridColumn:'1 / -1',fontSize:13}}>{catalogError?labels.empty:(lang==='en'?'No images in the bucket.':'No hay imágenes en el bucket.')}</p>}</div></div>}
  </>,stage);
}
