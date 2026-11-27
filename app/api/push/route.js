import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import webpush from 'web-push';
export const runtime='nodejs';
export async function POST(req){
 try{
 const auth=req.headers.get('authorization')||'';
 if(!auth.startsWith('Bearer '))return NextResponse.json({error:'Inicia sesión'},{status:401});
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user}}=await db.auth.getUser(auth.slice(7));if(!user)return NextResponse.json({error:'Inicia sesión'},{status:401});
 const {endpoint}=await req.json();
 const {data,error}=await db.from('rivyza_push_subscriptions').select('subscription').eq('user_id',user.id).eq('endpoint',endpoint).single();if(error||!data)throw Error('Suscripción no encontrada');
 const url=new URL(data.subscription.endpoint);
 if(url.protocol!=='https:'||url.port||url.username||url.password||!(url.hostname==='fcm.googleapis.com'||url.hostname==='web.push.apple.com'||url.hostname.endsWith('.push.apple.com')||url.hostname==='updates.push.services.mozilla.com'))throw Error('Proveedor no admitido');
 webpush.setVapidDetails(process.env.VAPID_SUBJECT,process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);
 await webpush.sendNotification(data.subscription,JSON.stringify({title:'RIVYZA',body:'¡Tus notificaciones push funcionan!'}),{TTL:60,timeout:10000});
 return NextResponse.json({ok:true});
 }catch(e){return NextResponse.json({error:'No se pudo enviar la prueba. Revisa la configuración y los permisos.'},{status:400});}
}
