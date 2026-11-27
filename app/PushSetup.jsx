'use client';
import {useState} from 'react';
export default function PushSetup({db,userId,lang}){
 const [busy,setBusy]=useState(false),[status,setStatus]=useState('');const en=lang==='en';
 async function action(kind){setBusy(true);try{
 if(!db||!userId)throw Error('Inicia sesión');
 if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))throw Error(en?'On iPhone, add RIVYZA to your Home Screen first.':'En iPhone agrega RIVYZA a la pantalla de inicio y ábrelo desde allí.');
 const key=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
 if(kind==='enable'){if(!key)throw Error('Falta configurar VAPID');if(await Notification.requestPermission()!=='granted')throw Error('Permiso no concedido');}
 const reg=await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;
 let sub=await reg.pushManager.getSubscription();
 const {data:{session}}=await db.auth.getSession();if(session?.user?.id!==userId)throw Error('La sesión cambió');
 if(kind==='disable'){if(sub){const {error}=await db.from('rivyza_push_subscriptions').delete().eq('user_id',userId).eq('endpoint',sub.endpoint);if(error)throw error;await sub.unsubscribe();}setStatus(en?'Disabled':'Desactivadas');return;}
 if(kind==='enable'){const raw=atob(key.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(key.length/4)*4,'='));if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:Uint8Array.from(raw,c=>c.charCodeAt(0))});const {error}=await db.from('rivyza_push_subscriptions').upsert({user_id:userId,endpoint:sub.endpoint,subscription:sub.toJSON()});if(error)throw error;setStatus(en?'Enabled. Send a test.':'Activadas. Envía una prueba.');return;}
 if(!sub)throw Error('Activa las notificaciones primero');const r=await fetch('/api/push',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({endpoint:sub.endpoint})});const d=await r.json();if(!r.ok)throw Error(d.error);setStatus(en?'Test sent':'Prueba enviada');
 }catch(e){setStatus(e.message)}finally{setBusy(false)}}
 return <div className="rivyza-feature-settings" style={{display:'grid',gap:12}}><p>{en?'Phone notifications · test only. No call alerts.':'Notificaciones del teléfono · fase de prueba. Sin avisos de llamadas.'}</p>{[['enable',en?'Enable':'Activar'],['test',en?'Send test':'Enviar prueba'],['disable',en?'Disable':'Desactivar']].map(([k,t])=><button type="button" key={k} disabled={busy} onClick={()=>action(k)} style={{padding:12,borderRadius:12,background:'#28304a',color:'white',border:0}}>{t}</button>)}<p role="status">{status}</p></div>
}
