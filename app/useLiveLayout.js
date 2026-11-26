"use client";
import {useEffect,useRef} from 'react';
import {RoomEvent} from 'livekit-client';
export default function useLiveLayout(room,supabase,roomId,apply){
  const callback=useRef(apply); callback.current=apply;
  useEffect(()=>{
    let active=true,busy=false,revision=0;
    const accept=layout=>{if(active && Number.isInteger(layout?.slots) && layout.slots>=1 && layout.slots<=14) callback.current(layout);};
    const refresh=async()=>{
      if(busy)return; busy=true; const started=revision;
      try{
        const {data}=await supabase.auth.getSession(); if(!data.session)return;
        const res=await fetch(`/api/live?mode=layout&room=${encodeURIComponent(roomId)}`,{headers:{Authorization:`Bearer ${data.session.access_token}`},cache:'no-store'});
        if(res.ok){const result=await res.json();if(started===revision)accept(result.layout);}
      }catch(e){console.warn('LIVE layout refresh',e);}finally{busy=false;}
    };
    const receive=metadata=>{revision++;try{accept(JSON.parse(typeof metadata==='string'?metadata:room.metadata||'{}').rivyzaLayout);}catch{};void refresh();};
    const reconnect=()=>{void refresh();};
    room.on(RoomEvent.RoomMetadataChanged,receive);room.on(RoomEvent.Connected,reconnect);room.on(RoomEvent.Reconnected,reconnect);
    receive();const timer=setInterval(refresh,2500);
    return()=>{active=false;clearInterval(timer);room.off(RoomEvent.RoomMetadataChanged,receive);room.off(RoomEvent.Connected,reconnect);room.off(RoomEvent.Reconnected,reconnect);};
  },[room,supabase,roomId]);
}
