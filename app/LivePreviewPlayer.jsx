"use client";
import {useEffect,useState,useRef} from 'react';
import {LiveKitRoom,useTracks,VideoTrack,useRoomContext,useParticipants} from '@livekit/components-react';
import {Track,RoomEvent} from 'livekit-client';
function PreviewGrid({hostId,hostAvatar,hostName,supabase}){
 const room=useRoomContext(), participants=useParticipants(), tracks=useTracks([{source:Track.Source.Camera,withPlaceholder:false}]);
 const [layout,setLayout]=useState({slots:10,positions:{}}),[profiles,setProfiles]=useState({});const memory=useRef({});
 useEffect(()=>{const sync=()=>{try{setLayout(JSON.parse(room.metadata||'{}').rivyzaLayout||{slots:10,positions:{}})}catch{}};sync();room.on(RoomEvent.RoomMetadataChanged,sync);room.on(RoomEvent.Connected,sync);return()=>{room.off(RoomEvent.RoomMetadataChanged,sync);room.off(RoomEvent.Connected,sync)}},[room]);
 const shown=participants.filter(p=>p.identity===hostId||p.permissions?.canPublish).sort((a,b)=>a.identity===hostId?-1:b.identity===hostId?1:a.identity.localeCompare(b.identity));
 const ids=shown.map(p=>p.identity).join(',');
 useEffect(()=>{let active=true;if(ids)supabase.from('profiles').select('id,display_name,username,avatar_url').in('id',ids.split(',')).then(({data})=>{if(active&&data)setProfiles(Object.fromEntries(data.map(p=>[p.id,p])))});return()=>{active=false}},[ids,supabase]);
 const slots=Math.max(1,Math.min(14,Number(layout.slots)||10)), ordered=Array(slots).fill(null), remembered=memory.current;
 for(const [id,n] of Object.entries(layout.positions||{})){for(const other of Object.keys(remembered))if(other!==id&&remembered[other]===n)delete remembered[other];remembered[id]=n;}
 if(remembered[hostId]===undefined)remembered[hostId]=0;
 const all=shown.some(p=>p.identity===hostId)?shown:[{identity:hostId,name:hostName},...shown];
 for(const p of all){const n=remembered[p.identity];if(Number.isInteger(n)&&n>=0&&n<slots&&!ordered[n])ordered[n]=p;}
 for(const p of all){if(ordered.includes(p))continue;const n=ordered.findIndex((x,i)=>!x&&!Object.values(remembered).includes(i));if(n>=0){ordered[n]=p;remembered[p.identity]=n;}}
 const cols=slots===1?1:slots<=4?2:slots===14?6:4;
 return <div className="rivyza-live-preview-video" style={{display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}><div style={{display:'grid',width:'100%',padding:5,boxSizing:'border-box',gap:3,gridTemplateColumns:`repeat(${cols},minmax(0,1fr))`,alignContent:'center'}}>{ordered.map((p,i)=>{const large=slots>=5&&i<2;const span=large?cols/2:1;const profile=profiles[p?.identity],name=profile?.display_name||profile?.username||p?.name||'Usuario',avatar=profile?.avatar_url||(p?.identity===hostId?hostAvatar:null),track=tracks.find(t=>t.participant.identity===p?.identity);return <div key={i} style={{gridColumn:`span ${span}`,aspectRatio:slots===1?'3/4':'1/1',position:'relative',overflow:'hidden',border:'1px solid #604677',borderRadius:7,background:'#21172f',display:'grid',placeItems:'center',minWidth:0}}>{p?(p.isCameraEnabled&&track?<VideoTrack trackRef={track} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}/>:avatar?<img src={avatar} alt="" style={{width:'min(80px,65%)',aspectRatio:'1',objectFit:'cover',borderRadius:'50%'}}/>:<span style={{color:'white',fontSize:24}}>{name[0]}</span>):null}<span style={{position:'absolute',bottom:3,left:3,right:3,color:'white',fontSize:11,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',textShadow:'0 1px 3px black'}}>{p?`${p.identity===hostId?'👑 ':''}${name}`:`+ ${i+1}`}</span></div>})}</div></div>;
}
export default function LivePreviewPlayer({roomId,supabase,hostId,hostAvatar,hostName}){
  const [session,setSession]=useState(null);
  useEffect(()=>{
    let cancelled=false;setSession(null);
    (async()=>{try{
      const {data}=await supabase.auth.getSession();if(!data.session)return;
      const res=await fetch('/api/live',{method:'POST',headers:{Authorization:`Bearer ${data.session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({action:'token',roomId,preview:true})});
      if(!res.ok)throw new Error('No disponible');
      const value=await res.json();if(!cancelled)setSession(value);
    }catch{if(!cancelled)setSession(null)}})();
    return()=>{cancelled=true};
  },[roomId,supabase]);
  if(!session)return <div className="rivyza-live-preview-wait">Conectando vista previa…</div>;
  return <LiveKitRoom key={roomId} token={session.token} serverUrl={session.serverUrl} connect={true} audio={false} video={false} options={{adaptiveStream:true,dynacast:true}}><PreviewGrid hostId={hostId} hostAvatar={hostAvatar} hostName={hostName} supabase={supabase}/></LiveKitRoom>;
}
