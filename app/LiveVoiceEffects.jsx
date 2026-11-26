'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Track} from 'livekit-client';

// LiveKit owns the original microphone and its mute state. No second capture.
function makeProcessor(context,mode){
  return {name:'rivyza-voice-fx',processedTrack:undefined,mode,context,node:null,source:null,destination:null,
    async init({track}){await this.build(track);},
    async restart({track}){this.release();await this.build(track);},
    async build(track){
      await context.audioWorklet.addModule('/rivyza-voice-worklet.js?v=4');
      this.source=context.createMediaStreamSource(new MediaStream([track]));
      const channels=track.getSettings?.().channelCount===1?1:2;
      this.node=new AudioWorkletNode(context,'rivyza-voice',{outputChannelCount:[channels],channelCount:channels,channelCountMode:'explicit'});
      this.node.port.postMessage(this.mode);
      this.destination=context.createMediaStreamDestination();this.destination.channelCount=channels;
      this.source.connect(this.node);this.node.connect(this.destination);
      this.processedTrack=this.destination.stream.getAudioTracks()[0];
    },
    change(mode){this.mode=mode;this.node?.port.postMessage(mode);},
    release(){this.source?.disconnect();this.node?.disconnect();this.destination?.stream.getTracks().forEach(t=>t.stop());this.source=null;this.node=null;this.destination=null;},
    async destroy(){this.release();}
  };
}
export default function LiveVoiceEffects({room,enabled,open,onClose,lang}){
  const [mode,setMode]=useState('none'),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const current=useRef(null),lock=useRef(false),alive=useRef(true),allowed=useRef(enabled);allowed.current=enabled;
  const en=lang==='en';
  async function clear(){const entry=current.current;if(!entry)return;await entry.track.stopProcessor();current.current=null;await entry.context.close().catch(()=>{});}
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;void clear().catch(console.warn);};},[room]);
  useEffect(()=>{if(!enabled&&!lock.current){void clear().then(()=>{if(alive.current)setMode('none');}).catch(console.warn);}},[enabled]);
  async function choose(next){if(lock.current||!enabled)return;lock.current=true;setBusy(true);setError('');let context=null,processor=null,track=null;
    try{
      if(next==='none'){await clear();setMode('none');return;}
      track=room.localParticipant.getTrackPublication(Track.Source.Microphone)?.track;
      if(!track||typeof track.setProcessor!=='function'||typeof track.stopProcessor!=='function')throw Error(en?'Enable your microphone first or use a supported browser.':'Activa tu micrófono primero o utiliza un navegador compatible.');
      if(current.current?.track===track){await current.current.context.resume();current.current.processor.change(next);setMode(next);return;}
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw Error(en?'Audio effects are not supported.':'Este navegador no admite efectos de audio.');
      context=new AC({sampleRate:48000});await context.resume();if(!context.audioWorklet||context.state!=='running')throw Error(en?'Audio processor unavailable.':'Procesador de audio no disponible.');
      await clear();processor=makeProcessor(context,next);await track.setProcessor(processor);current.current={track,context,processor};context=null;
      if(!alive.current||!allowed.current){await clear();return;}setMode(next);
    }catch(e){if(processor&&context){try{await track.stopProcessor();}catch{}await processor.destroy().catch(()=>{});}if(context)await context.close().catch(()=>{});if(alive.current){setError(e.message||String(e));if(!current.current)setMode('none');}}
    finally{lock.current=false;if(alive.current)setBusy(false);if(!allowed.current||!alive.current)void clear().catch(console.warn);}
  }
  if(!open||!enabled||typeof document==='undefined')return null;
  const options=[['none','🎙️','Sin efectos','No effects'],['chip','🐿️','Ardilla','Chipmunk'],['deep','🦍','Voz gruesa','Deep voice'],['female','👩','Voz de mujer','Female voice'],['baby','👶','Voz de bebé','Baby voice']];
  return createPortal(<div onClick={onClose} style={{position:'fixed',inset:0,zIndex:2147483001,background:'#0009',display:'flex',alignItems:'flex-end',justifyContent:'center'}}><section role="dialog" aria-modal="true" aria-label={en?'Audio effects':'Efectos de audio'} onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:520,background:'#181323',color:'#fff',borderRadius:'20px 20px 0 0',padding:'18px 16px calc(18px + env(safe-area-inset-bottom, 0px))',boxSizing:'border-box',maxHeight:'80dvh',overflowY:'auto'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}><strong>🎙️ {en?'Audio effects':'Efectos de audio'}</strong><button type="button" onClick={onClose} style={{background:'transparent',color:'#fff',border:0,fontSize:22}} aria-label={en?'Close':'Cerrar'}>✕</button></div><div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10}}>{options.map(([id,emoji,es,label])=><button key={id} type="button" disabled={busy} aria-pressed={mode===id} onClick={()=>choose(id)} style={{gridColumn:id==='none'?'1 / -1':undefined,border:mode===id?'2px solid #e85acb':'2px solid #ffffff25',background:mode===id?'#39264f':'#242033',color:'#fff',borderRadius:14,padding:12,minHeight:72,display:'grid',gap:5,justifyItems:'center'}}><span style={{fontSize:27}}>{emoji}</span><span>{en?label:es}{mode===id?' ✓':''}</span></button>)}</div>{busy&&<p>{en?'Applying…':'Aplicando…'}</p>}{error&&<p role="alert" style={{color:'#ffabb9'}}>{error}</p>}<p style={{fontSize:12,color:'#cfc5dc'}}>{en?'Effects change your entire microphone input, including mixed music.':'Los efectos modifican toda tu entrada de audio, incluida la música mezclada.'}</p></section></div>,document.body);
}
