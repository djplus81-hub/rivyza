"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {RoomEvent} from 'livekit-client';

const TOPIC='rivyza-live-stickers-v1';
const DEFAULT_FILES=['01_bolsas_compras.png','02_gafas_sol.png','03_tenis_azules.png','04_fuegos_artificiales.png','05_good_vibe.png','06_feliz_cumpleanos.png','07_gracias.png','08_feliz_dia.png','09_wow.png','10_ok.png','11_correcto.png','12_incorrecto.png','13_nuevo.png','14_planeta_tierra.png','15_corazon_rosado.png','16_celebracion.png','17_pizza.png','18_baloncesto.png','19_futbol.png','20_control_videojuego.png','21_grabando_rec.png','22_bateria.png','23_cargando.png','24_sigueme.png','25_pulgar_arriba.png','26_me_gusta.png','27_angel.png','29_libreta_corazon.png','30_labial.png','31_campana.png','32_flor_rosa.png','33_girasol.png','34_regalo.png','35_fuego.png','36_copo_nieve.png','37_nube.png','38_sol_gafas.png','39_luna_estrellas.png','40_hamburguesa.png','41_papas_fritas.png','42_audifonos.png','43_notas_musicales.png','44_cine.png','45_avion.png','46_palmera.png','47_camara.png','48_manzana_libro.png','49_ve.png','50_corona.png','51_diamante.png','52_enamorado.png','53_te_amo.png','54_sobre_corazones.png','55_gato_gafas.png','56_arcoiris.png','57_cafe_corazon.png','58_corazon_morado.png','59_corazon_rojo.png','60_love.png','61_rosa_roja.png','62_mariposa_azul.png'];
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const sanitize=items=>Array.isArray(items)?items.slice(0,60).filter(s=>s&&typeof s.id==='string'&&typeof s.file==='string'&&/^\d{2}_[\w-]+\.png$/i.test(s.file)).map(s=>({id:s.id.slice(0,80),file:s.file,x:clamp(Number(s.x)||0,0,100),y:clamp(Number(s.y)||0,0,100),size:clamp(Number(s.size)||16,5,80),rotation:clamp(Number(s.rotation)||0,-360,360)})):[];

export default function LiveStickers({room,isHost,hostId,liveRoomId,supabase,lang='es'}){
  const [stage,setStage]=useState(null),[items,setItems]=useState([]),[catalog,setCatalog]=useState(DEFAULT_FILES),[open,setOpen]=useState(false),[dragging,setDragging]=useState(null),[overTrash,setOverTrash]=useState(false);
  const itemsRef=useRef([]),gesture=useRef(null),stageRef=useRef(null),version=useRef(0),lastSent=useRef(0);
  const labels=lang==='en'?{button:'Stickers',title:'3D stickers',delete:'Release to delete',empty:'No stickers found'}:{button:'Stickers',title:'Stickers 3D',delete:'Suelta para eliminar',empty:'No se encontraron stickers'};
  useEffect(()=>{const node=document.querySelector('.rivyza-live-stage');setStage(node);stageRef.current=node;},[]);
  useEffect(()=>{itemsRef.current=items;},[items]);
  useEffect(()=>{setItems([]);itemsRef.current=[];version.current=0;setOpen(false);},[liveRoomId]);
  useEffect(()=>{let alive=true;supabase.storage.from('rivyza-stickers').list('',{limit:100,sortBy:{column:'name',order:'asc'}}).then(({data,error})=>{if(!alive||error)return;const names=(data||[]).map(x=>x.name).filter(x=>/^\d{2}_[\w-]+\.png$/i.test(x));if(names.length)setCatalog(names);}).catch(()=>{});return()=>{alive=false;};},[supabase]);
  const send=useCallback((next,receiver)=>{
    if(!isHost||room.state!=='connected')return;
    const packet={type:'state',roomId:liveRoomId,version:++version.current,items:sanitize(next)};
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
        if(Number(packet.version)<version.current)return;
        version.current=Number(packet.version)||0;
        const clean=sanitize(packet.items);itemsRef.current=clean;setItems(clean);
      }catch(e){console.warn('Invalid sticker packet:',e);}
    };
    const request=()=>{if(isHost||room.state!=='connected')return;room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify({type:'request',roomId:liveRoomId})),{reliable:true,topic:TOPIC,destinationIdentities:[hostId]}).catch(()=>{});};
    const joined=p=>{if(isHost&&p?.identity)send(itemsRef.current,p.identity);};
    room.on(RoomEvent.DataReceived,receive);room.on(RoomEvent.Reconnected,request);room.on(RoomEvent.ParticipantConnected,joined);
    request();const timer=setInterval(()=>{if(isHost){send(itemsRef.current);}else request();},4500);
    return()=>{clearInterval(timer);room.off(RoomEvent.DataReceived,receive);room.off(RoomEvent.Reconnected,request);room.off(RoomEvent.ParticipantConnected,joined);};
  },[room,liveRoomId,hostId,isHost,send]);
  const point=e=>{const r=stageRef.current?.getBoundingClientRect();return r?{x:clamp((e.clientX-r.left)/r.width*100,0,100),y:clamp((e.clientY-r.top)/r.height*100,0,100)}:{x:50,y:50};};
  const startDrag=(e,s)=>{if(!isHost)return;e.preventDefault();e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);const p=point(e);const current=itemsRef.current.find(x=>x.id===s.id);if(!current)return;const g=gesture.current;if(g?.id===s.id){g.pointers.set(e.pointerId,p);if(g.pointers.size===2){const [a,b]=[...g.pointers.values()];g.baseDistance=Math.hypot(b.x-a.x,b.y-a.y)||1;g.baseAngle=Math.atan2(b.y-a.y,b.x-a.x);g.baseSize=current.size;g.baseRotation=current.rotation;}return;}gesture.current={id:s.id,pointers:new Map([[e.pointerId,p]]),baseX:current.x,baseY:current.y,startX:p.x,startY:p.y,baseSize:current.size,baseRotation:current.rotation};setDragging(s.id);};
  const moveDrag=e=>{const g=gesture.current;if(!g||!g.pointers.has(e.pointerId))return;e.preventDefault();e.stopPropagation();const p=point(e);g.pointers.set(e.pointerId,p);const current=itemsRef.current.find(x=>x.id===g.id);if(!current)return;let next={...current};if(g.pointers.size>=2){const [a,b]=[...g.pointers.values()];next.size=clamp(g.baseSize*Math.hypot(b.x-a.x,b.y-a.y)/g.baseDistance,5,80);next.rotation=clamp(g.baseRotation+(Math.atan2(b.y-a.y,b.x-a.x)-g.baseAngle)*180/Math.PI,-360,360);}else{next.x=clamp(g.baseX+p.x-g.startX,0,100);next.y=clamp(g.baseY+p.y-g.startY,0,100);}const updated=itemsRef.current.map(s=>s.id===g.id?next:s);itemsRef.current=updated;setItems(updated);const trash=p.y>82&&p.x>30&&p.x<70;setOverTrash(trash);if(Date.now()-lastSent.current>110){lastSent.current=Date.now();send(updated);}};
  const endDrag=e=>{const g=gesture.current;if(!g||!g.pointers.has(e.pointerId))return;e.preventDefault();e.stopPropagation();const p=point(e);g.pointers.delete(e.pointerId);if(g.pointers.size){const [remaining]=g.pointers.values();const current=itemsRef.current.find(s=>s.id===g.id);if(current){g.baseX=current.x;g.baseY=current.y;g.startX=remaining.x;g.startY=remaining.y;}return;}const trash=p.y>82&&p.x>30&&p.x<70;const next=trash?itemsRef.current.filter(s=>s.id!==g.id):itemsRef.current;gesture.current=null;setDragging(null);setOverTrash(false);commit(next);};
  const add=file=>{if(!isHost)return;commit([...itemsRef.current,{id:crypto.randomUUID(),file,x:50,y:43,size:36,rotation:0}]);setOpen(false);};
  const url=file=>supabase.storage.from('rivyza-stickers').getPublicUrl(file).data.publicUrl;
  if(!stage)return null;
  return createPortal(<>
    <div className="rivyza-sticker-layer" style={{position:'absolute',inset:0,zIndex:55,pointerEvents:'none',overflow:'hidden'}}>
      {items.map(s=><div key={s.id} onPointerDown={e=>startDrag(e,s)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} style={{position:'absolute',left:`${s.x}%`,top:`${s.y}%`,width:`${s.size}%`,aspectRatio:'1',transform:`translate(-50%,-50%) rotate(${s.rotation}deg)`,touchAction:'none',pointerEvents:isHost?'auto':'none',cursor:isHost?'grab':'default',userSelect:'none',zIndex:2}}><img src={url(s.file)} draggable={false} alt="Sticker" style={{width:'100%',height:'100%',objectFit:'contain',pointerEvents:'none'}}/></div>)}
      {isHost&&dragging&&<div style={{position:'absolute',bottom:'6%',left:'50%',transform:'translateX(-50%)',borderRadius:50,background:overTrash?'#ef174b':'#25202c',border:'2px solid #fff',color:'#fff',padding:'14px 20px',textAlign:'center',fontSize:12,fontWeight:700,boxShadow:'0 4px 20px #0009',pointerEvents:'none',zIndex:5}}>🗑️ {labels.delete}</div>}
    </div>
    {isHost&&<button type="button" onClick={()=>setOpen(x=>!x)} aria-label={labels.button} style={{position:'absolute',right:12,bottom:"calc(90px + env(safe-area-inset-bottom))",zIndex:90,background:'#251b36e8',border:'1px solid #ffffff66',borderRadius:14,color:'white',padding:'5px 6px',fontSize:10,fontWeight:700,minWidth:51,minHeight:49,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:1,pointerEvents:'auto'}}><span style={{fontSize:21,lineHeight:1}}>💟</span><span>{labels.button}</span></button>}
    {isHost&&open&&<div role="dialog" aria-label={labels.title} style={{position:'absolute',bottom:90,left:10,right:10,maxHeight:'42%',zIndex:95,overflow:'hidden',display:'flex',flexDirection:'column',background:'#17121ef5',border:'1px solid #ffffff44',borderRadius:16,color:'white',padding:12,pointerEvents:'auto'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><strong>{labels.title}</strong><button type="button" onClick={()=>setOpen(false)} style={{color:'white',background:'transparent',border:0,fontSize:23}}>✕</button></div><div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:7,overflowY:'auto',touchAction:'pan-y',paddingBottom:4}}>{catalog.length?catalog.map(file=><button key={file} type="button" onClick={()=>add(file)} title={file.replace(/^\d+_/,'').replace('.png','').replaceAll('_',' ')} style={{background:'#ffffff16',border:'1px solid #ffffff20',borderRadius:10,padding:0,aspectRatio:'1',minWidth:0,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}><img src={url(file)} alt={file.replace(/^\d+_/,'').replace('.png','').replaceAll('_',' ')} loading="lazy" style={{width:'100%',height:'100%',objectFit:'contain',transform:'scale(1.2)',pointerEvents:'none'}}/></button>):<p>{labels.empty}</p>}</div></div>}
  </>,stage);
}
