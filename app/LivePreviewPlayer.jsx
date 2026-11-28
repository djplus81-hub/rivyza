"use client";
import {useEffect,useState,useRef} from 'react';
import {LiveKitRoom,useTracks,VideoTrack,useRoomContext,useParticipants} from '@livekit/components-react';
import useLiveLayout from './useLiveLayout';
import {Track,RoomEvent} from 'livekit-client';
function PreviewGrid({roomId,hostId,hostAvatar,hostName,supabase,feedPreview=false}){
 const room=useRoomContext(), participants=useParticipants(), tracks=useTracks([{source:Track.Source.Camera,withPlaceholder:false}]);
 const [layout,setLayout]=useState(null),[profiles,setProfiles]=useState({});const memory=useRef({});
 useLiveLayout(room,supabase,roomId,next=>setLayout(previous=>JSON.stringify(previous)===JSON.stringify(next)?previous:next));
 const shown=participants.filter(p=>p.identity===hostId||p.permissions?.canPublish).sort((a,b)=>a.identity===hostId?-1:b.identity===hostId?1:a.identity.localeCompare(b.identity));
 const ids=shown.map(p=>p.identity).join(',');
 useEffect(()=>{let active=true;if(ids)supabase.from('profiles').select('id,display_name,username,avatar_url').in('id',ids.split(',')).then(({data})=>{if(active&&data)setProfiles(Object.fromEntries(data.map(p=>[p.id,p])))});return()=>{active=false}},[ids,supabase]);
 const slots=Math.max(1,Math.min(14,Number(layout?.slots)||10)), ordered=Array(slots).fill(null), remembered=layout?{...layout.positions}:memory.current;
 for(const [id,n] of Object.entries(layout?.positions||{})){for(const other of Object.keys(remembered))if(other!==id&&remembered[other]===n)delete remembered[other];remembered[id]=n;}
 if(remembered[hostId]===undefined)remembered[hostId]=0;
 const all=shown.some(p=>p.identity===hostId)?shown:[{identity:hostId,name:hostName},...shown];
 for(const p of all){const n=remembered[p.identity];if(Number.isInteger(n)&&n>=0&&n<slots&&!ordered[n])ordered[n]=p;}
 for(const p of all){if(ordered.includes(p))continue;const n=ordered.findIndex((x,i)=>!x&&!Object.values(remembered).includes(i));if(n>=0){ordered[n]=p;remembered[p.identity]=n;}}
 if(!layout)return <div className="rivyza-live-preview-wait">Conectando vista previa…</div>;
 const cols=slots===1?1:slots===4?2:slots===9?3:4;
 const backgrounds={neon:'url(/rivyza-live-bg.webp) center / cover no-repeat',original:'linear-gradient(145deg,#130c29,#09051a)',hearts:'radial-gradient(ellipse at 25% 30%,#a32663,#17071f 70%)',stars:'radial-gradient(ellipse at 70% 20%,#283e78,#08091e 70%)',butterflies:'linear-gradient(145deg,#12294e,#50205e)',petals:'linear-gradient(145deg,#57233e,#190e30)',black:'linear-gradient(145deg,#020204,#302313,#050406)',blue:'linear-gradient(165deg,#01040e,#124a96,#020615)',purple:'linear-gradient(150deg,#090315,#6a216e,#17051e)'};
 return <div className="rivyza-live-preview-video" style={{display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none',height:'100%',minHeight:0,overflow:'hidden',background:feedPreview?(backgrounds[layout.background]||backgrounds.neon):undefined}}><div style={{display:'grid',width:'100%',padding:slots===13?0:5,boxSizing:'border-box',gap:slots===13?0:3,height:slots===13||(feedPreview&&slots===1)?'100%':undefined,minHeight:0,overflow:'hidden',isolation:'isolate',gridTemplateColumns:slots===13?'19% 62% 19%':slots===9?'minmax(0,2fr) repeat(2,minmax(0,1fr))':`repeat(${cols},minmax(0,1fr))`,gridTemplateRows:slots===13?'repeat(6,minmax(0,1fr))':slots===9?'repeat(4,minmax(0,1fr))':undefined,aspectRatio:slots===9?'1 / 1':undefined,alignContent:'center'}}>{ordered.map((p,i)=>{const span=slots!==1&&slots!==4&&slots!==9&&i<2?2:1;const profile=profiles[p?.identity],name=profile?.display_name||profile?.username||p?.name||'Usuario',avatar=profile?.avatar_url||(p?.identity===hostId?hostAvatar:null),track=tracks.find(t=>t.participant.identity===p?.identity);return <div key={i} style={{gridColumn:slots===13?(i===0?'1 / -1':i<=6?'1':'3'):slots===9?(i===0?'1':String(2+(i-1)%2)):`span ${span}`,gridRow:slots===13?(i===0?'1 / -1':String((i-1)%6+1)):slots===9?(i===0?'1 / 5':String(1+Math.floor((i-1)/2))):undefined,zIndex:slots===13?(i===0?0:2):undefined,width:slots===13?(i===0?'100%':'calc(100% - 6px)'):undefined,height:slots===13?(i===0?'100%':'calc(100% - 10px)'):undefined,alignSelf:slots===13?'center':undefined,justifySelf:slots===13?'center':undefined,minHeight:0,boxSizing:'border-box',aspectRatio:slots===13||slots===9||(feedPreview&&slots===1)?'auto':slots===1?'9/16':'1/1',maxHeight:slots===1&&!feedPreview?'72dvh':undefined,position:'relative',overflow:'hidden',border:'1px solid #604677',borderRadius:7,background:'#21172f',display:'grid',placeItems:'center',minWidth:0}}>{p?(p.isCameraEnabled&&track?<VideoTrack trackRef={track} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}/>:avatar?<img src={avatar} alt="" style={{width:'min(80px,65%)',aspectRatio:'1',objectFit:'cover',borderRadius:'50%'}}/>:<span style={{color:'white',fontSize:24}}>{name[0]}</span>): <span aria-hidden="true" style={{color:'white',fontSize:28}}>+</span>}<span style={{position:'absolute',bottom:3,left:3,color:'white',fontSize:11,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',textShadow:'0 1px 3px black',background:'#0009',borderRadius:4,padding:'2px 4px',right:'auto',maxWidth:'calc(100% - 6px)'}}>{p?`${p.identity===hostId?'👑 ':''}${name}`:`+ ${i+1}`}</span></div>})}</div></div>;
}
export default function LivePreviewPlayer({roomId,supabase,hostId,hostAvatar,hostName,feedPreview=false}){
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
  return <LiveKitRoom key={roomId} token={session.token} serverUrl={session.serverUrl} connect={true} audio={false} video={false} options={{adaptiveStream:true,dynacast:true}}><PreviewGrid roomId={roomId} hostId={hostId} hostAvatar={hostAvatar} hostName={hostName} supabase={supabase} feedPreview={feedPreview}/></LiveKitRoom>;
}
