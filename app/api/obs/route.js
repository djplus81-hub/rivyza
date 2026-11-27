import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AccessToken, IngressClient, IngressInput, RoomServiceClient } from 'livekit-server-sdk';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(req){
 try{
  const bearer=req.headers.get('authorization')||'';
  if(!bearer.startsWith('Bearer '))return reply({error:'Inicia sesión'},401);
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const auth=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false}});
  const {data:{user},error:authError}=await auth.auth.getUser(bearer.slice(7));
  if(authError||!user)return reply({error:'Inicia sesión'},401);
  const db=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
  const {data:allowed,error:ae}=await db.from('rivyza_obs_test_access').select('user_id').eq('user_id',user.id).maybeSingle();
  if(ae)throw ae;if(!allowed)return reply({error:'OBS piloto: acceso no autorizado'},403);
  const input=await req.json();
  const serverUrl=process.env.LIVEKIT_URL;
  const endpoint=serverUrl.replace(/^wss:/,'https:').replace(/^ws:/,'http:');
  const key=process.env.LIVEKIT_API_KEY,secret=process.env.LIVEKIT_API_SECRET;
  const ingress=new IngressClient(endpoint,key,secret),rooms=new RoomServiceClient(endpoint,key,secret);
  const {data:existing,error:ee}=await db.from('rivyza_obs_test_sessions').select('*').eq('host_id',user.id).maybeSingle();if(ee)throw ee;
  if(input.action==='stop'){
   if(existing){if(existing.ingress_id)await ingress.deleteIngress(existing.ingress_id);await rooms.deleteRoom(existing.room_name);const {error}=await db.from('rivyza_obs_test_sessions').delete().eq('host_id',user.id);if(error)throw error;}
   return reply({ok:true});
  }
  let session=existing;
  if(input.action==='start'&&!session){
   if(!['vertical','horizontal'].includes(input.orientation))return reply({error:'Formato inválido'},400);
   const {data:normal,error:ne}=await db.from('rivyza_live_rooms').select('id').eq('host_id',user.id).eq('status','live').limit(1);if(ne)throw ne;if(normal?.length)return reply({error:'Termina el LIVE normal primero'},409);
   const roomName=`rivyza-obs-test-${crypto.randomUUID()}`;
   const {data:reserved,error:re}=await db.from('rivyza_obs_test_sessions').insert({host_id:user.id,room_name:roomName,orientation:input.orientation}).select().single();if(re)throw re;
   let created;
   try{
    await rooms.createRoom({name:roomName,emptyTimeout:600});
    created=await ingress.createIngress(IngressInput.RTMP_INPUT,{name:roomName,roomName,participantIdentity:`obs-${user.id}`,participantName:'OBS',enableTranscoding:true});
    const {data:saved,error:se}=await db.from('rivyza_obs_test_sessions').update({ingress_id:created.ingressId,server_url:created.url,stream_key:created.streamKey}).eq('host_id',user.id).select().single();if(se)throw se;session=saved;
   }catch(e){if(created?.ingressId)await ingress.deleteIngress(created.ingressId).catch(()=>{});await rooms.deleteRoom(roomName).catch(()=>{});await db.from('rivyza_obs_test_sessions').delete().eq('host_id',user.id);throw e;}
  }
  if(input.action==='format'){
   if(!session?.ingress_id)return reply({error:'Crea una conexión primero'},409);
   if(!['vertical','horizontal'].includes(input.orientation))return reply({error:'Formato inválido'},400);
   const {data:updated,error:ue}=await db.from('rivyza_obs_test_sessions').update({orientation:input.orientation}).eq('host_id',user.id).select().single();
   if(ue)throw ue;session=updated;
  }
  if(!['start','resume','format'].includes(input.action))return reply({error:'Acción inválida'},400);
  if(!session)return reply({session:null});if(!session.ingress_id)return reply({error:'Conexión en preparación'},409);
  const token=new AccessToken(key,secret,{identity:`control-${user.id}-${crypto.randomUUID()}`,ttl:'15m'});
  token.addGrant({roomJoin:true,room:session.room_name,canPublish:false,canSubscribe:true,canPublishData:false});
  return reply({session:{orientation:session.orientation,url:session.server_url,streamKey:session.stream_key,token:await token.toJwt(),serverUrl}});
 }catch(e){console.error('OBS pilot',e?.name);return reply({error:'No se pudo completar la operación OBS. Revisa la configuración de LiveKit y Supabase.'},500);}
}
