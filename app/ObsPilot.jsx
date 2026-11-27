'use client';
import {useState,useRef,useEffect} from 'react';
import {LiveKitRoom,RoomAudioRenderer,VideoTrack,useTracks,StartAudio} from '@livekit/components-react';
import {Track} from 'livekit-client';
function Monitor({orientation}){
 const tracks=useTracks([Track.Source.Camera,Track.Source.ScreenShare],{onlySubscribed:true});
 const video=tracks.find(t=>t.participant.identity.startsWith('obs-'));
 const ref=useRef(null);const [expanded,setExpanded]=useState(false);
 return <><div ref={ref} style={{position:expanded?'fixed':'relative',inset:expanded?0:undefined,zIndex:expanded?999999:undefined,background:'#000',display:'grid',placeItems:'center',width:'100%',aspectRatio:expanded?undefined:orientation==='vertical'?'9/16':'16/9'}}>{video?<VideoTrack trackRef={video} style={{width:'100%',height:'100%',objectFit:'contain'}}/>:<p>Esperando señal de OBS…</p>}<button style={{position:'absolute',right:8,bottom:8}} onClick={()=>setExpanded(v=>!v)}>{expanded?'Salir de pantalla completa':'Pantalla completa'}</button></div><RoomAudioRenderer/><StartAudio label="Activar sonido"/></>;
}
export default function ObsPilot({supabase,onExit}){
 const [orientation,setOrientation]=useState('vertical'),[session,setSession]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[show,setShow]=useState(false);
 async function call(action){setBusy(true);setError('');try{const {data}=await supabase.auth.getSession();const response=await fetch('/api/obs',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session?.access_token}`},body:JSON.stringify({action,orientation})});const result=await response.json();if(!response.ok)throw Error(result.error);setSession(result.session||null);}catch(e){setError(e.message);}finally{setBusy(false);}}
 useEffect(()=>{call('resume');},[]);
 return <main style={{minHeight:'100dvh',background:'#101019',color:'white',padding:16,display:'flex',flexDirection:'column',gap:12}}><button onClick={onExit}>Volver</button><h2>RIVYZA OBS · Prueba privada</h2>{error&&<p role="alert">{error}</p>}{!session?<><label>Formato <select value={orientation} onChange={e=>setOrientation(e.target.value)}><option value="vertical">Vertical 9:16</option><option value="horizontal">Horizontal 16:9</option></select></label><button disabled={busy} onClick={()=>call('start')}>Crear conexión OBS</button></>:<><label>Servidor RTMP<input readOnly value={session.url}/></label><label>Clave privada<input readOnly type={show?'text':'password'} value={session.streamKey}/></label><button onClick={()=>setShow(v=>!v)}>{show?'Ocultar clave':'Mostrar clave'}</button><button onClick={()=>navigator.clipboard.writeText(session.streamKey).catch(()=>setError('Copia la clave manualmente'))}>Copiar clave</button><LiveKitRoom token={session.token} serverUrl={session.serverUrl} connect audio={false} video={false}><Monitor orientation={session.orientation}/></LiveKitRoom><button disabled={busy} onClick={()=>{if(confirm('Detener conexión OBS?'))call('stop');}}>Terminar OBS</button></>}</main>;
}
