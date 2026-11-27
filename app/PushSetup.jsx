'use client';
import {useEffect,useState} from 'react';
export default function PushSetup({db,userId,lang}){
 const [busy,setBusy]=useState(false),[status,setStatus]=useState(''),[enabled,setEnabled]=useState(null);const en=lang==='en';
 const supported=()=>('serviceWorker' in navigator)&&('PushManager' in window)&&('Notification' in window);
 async function readState(){
  if(!db||!userId)throw Error(en?'Sign in first.':'Inicia sesión.');
  if(!supported())throw Error(en?'On iPhone, add RIVYZA to your Home Screen first.':'En iPhone agrega RIVYZA a la pantalla de inicio y ábrelo desde allí.');
  if(Notification.permission!=='granted')return false;
  const reg=await navigator.serviceWorker.getRegistration('/');
  const sub=await reg?.pushManager.getSubscription();if(!sub)return false;
  const {data,error}=await db.from('rivyza_push_subscriptions').select('endpoint').eq('user_id',userId).eq('endpoint',sub.endpoint).maybeSingle();if(error)throw error;return !!data;
 }
 useEffect(()=>{let active=true;const refresh=async()=>{try{const value=await readState();if(active){setEnabled(value);setStatus('');}}catch(e){if(active){setEnabled(null);setStatus(e.message);}}};refresh();window.addEventListener('focus',refresh);return()=>{active=false;window.removeEventListener('focus',refresh);};},[db,userId,lang]);
 async function action(kind){setBusy(true);setStatus('');try{
 if(!db||!userId)throw Error('Inicia sesión');
 if(!supported())throw Error(en?'On iPhone, add RIVYZA to your Home Screen first.':'En iPhone agrega RIVYZA a la pantalla de inicio y ábrelo desde allí.');
 const key=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
 if(kind==='enable'){if(!key)throw Error('Falta configurar VAPID');if(await Notification.requestPermission()!=='granted')throw Error(en?'Permission not granted.':'Permiso no concedido.');}
 const reg=await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;
 let sub=await reg.pushManager.getSubscription();
 const {data:{session}}=await db.auth.getSession();if(session?.user?.id!==userId)throw Error('La sesión cambió');
 if(kind==='disable'){if(sub){const {error}=await db.from('rivyza_push_subscriptions').delete().eq('user_id',userId).eq('endpoint',sub.endpoint);if(error)throw error;await sub.unsubscribe();}setEnabled(false);setStatus(en?'Disabled':'Desactivadas');return;}
 if(kind==='enable'){const raw=atob(key.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(key.length/4)*4,'='));if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:Uint8Array.from(raw,c=>c.charCodeAt(0))});const {error}=await db.from('rivyza_push_subscriptions').upsert({user_id:userId,endpoint:sub.endpoint,subscription:sub.toJSON()});if(error)throw error;setEnabled(true);setStatus(en?'Enabled':'Activadas');}
 }catch(e){try{setEnabled(await readState());}catch{setEnabled(null);}setStatus(e.message);}finally{setBusy(false);}}
 return <div className="rivyza-feature-settings" style={{display:'grid',gap:12}}>
 <p>{en?'Receive RIVYZA notifications on your phone. Call alerts are not included.':'Recibe notificaciones de RIVYZA en tu teléfono. No incluye avisos de llamadas.'}</p>
 <button type="button" role="switch" aria-checked={enabled===true} disabled={busy||enabled===null} onClick={()=>action(enabled?'disable':'enable')} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,padding:12,borderRadius:12,background:'transparent',color:'inherit',border:'1px solid #7775',textAlign:'start',opacity:busy ? 0.6 : 1}}>
 <span>{en?'Phone notifications':'Notificaciones del teléfono'}<small style={{display:'block',opacity:.7,marginTop:4}}>{busy?(en?'Updating…':'Actualizando…'):enabled===null?(en?'Unavailable':'Sin verificar'):enabled?(en?'Enabled':'Activadas'):(en?'Disabled':'Desactivadas')}</small></span>
 <span aria-hidden="true" style={{width:48,height:28,borderRadius:20,background:enabled?'#30b95c':'#777',position:'relative',flexShrink:0}}><span style={{position:'absolute',top:3,left:enabled?23:3,width:22,height:22,borderRadius:'50%',background:'#fff',transition:'left .2s'}}/></span>
 </button><p role="status">{status}</p></div>
}
