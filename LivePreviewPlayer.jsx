"use client";
import {useEffect,useState} from 'react';
import {LiveKitRoom,useTracks,VideoTrack} from '@livekit/components-react';
import {Track} from 'livekit-client';
function PreviewVideo(){
  const tracks=useTracks([{source:Track.Source.Camera,withPlaceholder:false}]);
  const visible=tracks.find(t=>t.participant?.isCameraEnabled)||tracks[0];
  return <div className="rivyza-live-preview-video">{visible?<VideoTrack trackRef={visible}/>:<div className="rivyza-live-preview-wait">Esperando video del anfitrión…</div>}</div>;
}
export default function LivePreviewPlayer({roomId,supabase}){
  const [session,setSession]=useState(null);
  useEffect(()=>{
    let cancelled=false;
    (async()=>{try{
      const {data}=await supabase.auth.getSession();if(!data.session)return;
      const res=await fetch('/api/live',{method:'POST',headers:{Authorization:`Bearer ${data.session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({action:'token',roomId})});
      if(!res.ok)throw new Error('No disponible');
      const value=await res.json();if(!cancelled)setSession(value);
    }catch{if(!cancelled)setSession(null)}})();
    return()=>{cancelled=true};
  },[roomId,supabase]);
  if(!session)return <div className="rivyza-live-preview-wait">Conectando vista previa…</div>;
  return <LiveKitRoom key={roomId} token={session.token} serverUrl={session.serverUrl} connect={true} audio={false} video={false} options={{adaptiveStream:true,dynacast:true}}><PreviewVideo/></LiveKitRoom>;
}
