import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
export const runtime='nodejs';
export async function POST(req){
 try{
 const bearer=req.headers.get('authorization')||'';
 if(!bearer.startsWith('Bearer '))return NextResponse.json({error:'Inicia sesión'},{status:401});
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{global:{headers:{Authorization:bearer}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user}}=await db.auth.getUser(bearer.slice(7));if(!user)return NextResponse.json({error:'Inicia sesión'},{status:401});
 const {action,callId}=await req.json();if(!['token','end'].includes(action))return NextResponse.json({error:'Acción inválida'},{status:400});
 const {data:c,error}=await db.rpc('rivyza_call_action',{action,call_id:callId});if(error)throw error;
 const url=process.env.LIVEKIT_URL,key=process.env.LIVEKIT_API_KEY,secret=process.env.LIVEKIT_API_SECRET;
 const room='rivyza-private-'+c.id;
 if(action==='end'){try{await new RoomServiceClient(url.replace(/^wss:/,'https:').replace(/^ws:/,'http:'),key,secret).deleteRoom(room);}catch{}return NextResponse.json({ok:true});}
 const token=new AccessToken(key,secret,{identity:user.id,ttl:'2m'});token.addGrant({roomJoin:true,room,canPublish:true,canSubscribe:true,canPublishData:false});
 return NextResponse.json({token:await token.toJwt(),serverUrl:url},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return NextResponse.json({error:e.message||'Error de llamada'},{status:400});}
}
