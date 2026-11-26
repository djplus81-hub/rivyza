"use client";
import {useEffect,useRef} from 'react';
import {RoomEvent} from 'livekit-client';
export default function useLiveLayout(room,supabase,roomId,apply){
 const callback=useRef(apply);callback.current=apply;
 useEffect(()=>{
  let active=true,busy=false,pending=false;
  const refresh=async()=>{
   if(!active)return;if(busy){pending=true;return;}busy=true;
   try{const {data}=await supabase.auth.getSession();if(!data.session)return;
    const res=await fetch(`/api/live?mode=layout&room=${encodeURIComponent(roomId)}`,{headers:{Authorization:`Bearer ${data.session.access_token}`},cache:'no-store'});
    if(!res.ok)throw new Error(`Layout HTTP ${res.status}`);
    const {layout}=await res.json();if(active&&Number.isInteger(layout?.slots)&&layout.slots>=1&&layout.slots<=14)callback.current(layout);
   }catch(e){console.warn('LIVE layout refresh',e);}finally{busy=false;if(pending&&active){pending=false;void refresh();}}
  };
  const notify=()=>{void refresh();};
  const events=[RoomEvent.RoomMetadataChanged,RoomEvent.Connected,RoomEvent.Reconnected,RoomEvent.ParticipantConnected,RoomEvent.ParticipantDisconnected,RoomEvent.ParticipantPermissionsChanged];
  events.forEach(e=>room.on(e,notify));notify();const timer=setInterval(notify,2500);
  return()=>{active=false;clearInterval(timer);events.forEach(e=>room.off(e,notify));};
 },[room,supabase,roomId]);
}
