"use client";
import {useEffect,useRef,useState} from "react";

// The VIDEO is the playback clock. Music never starts independently.
let activeStop=null;
export default function PostMusicMedia({post,detail=false,videoRef=null}){
  const root=useRef(null),video=useRef(null),music=useRef(null),audioMix=useRef(null);
  const [visible,setVisible]=useState(false);
  const hasMusic=Boolean(post.music_path);
  const start=Math.max(0,Number(post.music_start_seconds)||0);
  const originalVolume=Math.max(0,Math.min(1,Number(post.original_volume??50)/100));
  const musicVolume=Math.max(0,Math.min(1,Number(post.music_volume??50)/100));
  useEffect(()=>{
    const node=root.current;if(!node)return;
    const observer=new IntersectionObserver(entries=>setVisible((entries[0]?.intersectionRatio||0)>=0.65),{threshold:[0,.65,1]});
    observer.observe(node);return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    const v=video.current,a=music.current;
    if(!v)return;
    let disposed=false;
    const stop=()=>{v.pause();a?.pause();};
    if(!visible){stop();return;}
    if(activeStop)activeStop();activeStop=stop;
    // iOS Safari ignores HTMLMediaElement.volume. Use independent WebAudio gains.
    if(hasMusic&&a){
      try{
        const Ctx=window.AudioContext||window.webkitAudioContext;
        if(Ctx&&!audioMix.current){
          const ctx=new Ctx(),vg=ctx.createGain(),ag=ctx.createGain();
          ctx.createMediaElementSource(v).connect(vg).connect(ctx.destination);
          ctx.createMediaElementSource(a).connect(ag).connect(ctx.destination);
          audioMix.current={ctx,vg,ag};
        }
      }catch(e){console.warn('RIVYZA audio mixer:',e);}
    }
    const mix=audioMix.current;
    if(mix){mix.vg.gain.value=originalVolume;mix.ag.gain.value=musicVolume;v.volume=1;if(a)a.volume=1;}
    else {v.volume=hasMusic?originalVolume:1;if(a)a.volume=musicVolume;}
    const align=(force=false)=>{
      if(!a||!hasMusic)return;
      const target=start+(Number.isFinite(v.currentTime)?v.currentTime:0);
      if(!Number.isFinite(target))return;
      // Never wrap the song independently: the video controls each loop.
      if(force||Math.abs(a.currentTime-target)>0.22){
        try{a.currentTime=target;}catch(_){}
      }
    };
    const startMusic=()=>{
      if(disposed||!visible||!a||v.paused||v.readyState<2)return;
      align(true);
      if(mix?.ctx?.state==='suspended')mix.ctx.resume().catch(()=>{});
      a.play().catch(()=>{});
    };
    const onPlay=()=>startMusic();
    const onPause=()=>a?.pause();
    const onSeek=()=>{align(true);if(!v.paused)startMusic();};
    const onTime=()=>{if(!v.paused)align(false);};
    const onLoop=()=>{a?.pause();align(true);startMusic();};
    v.addEventListener('playing',onPlay);
    v.addEventListener('pause',onPause);
    v.addEventListener('seeking',onSeek);
    v.addEventListener('seeked',onSeek);
    v.addEventListener('timeupdate',onTime);
    v.addEventListener('ended',onPause);
    // loop fires a seeking event in most browsers; timeupdate also catches resets.
    let lastTime=0;
    const detectLoop=()=>{if(v.currentTime+0.3<lastTime)onLoop();lastTime=v.currentTime;};
    v.addEventListener('timeupdate',detectLoop);
    const onMusicEnded=()=>{if(!v.paused)startMusic();};
    a?.addEventListener('ended',onMusicEnded);
    v.currentTime=0;
    if(a){a.pause();align(true);}
    v.play().then(()=>{if(!disposed)startMusic();}).catch(()=>{});
    return()=>{
      disposed=true;
      v.removeEventListener('playing',onPlay);v.removeEventListener('pause',onPause);
      v.removeEventListener('seeking',onSeek);v.removeEventListener('seeked',onSeek);
      v.removeEventListener('timeupdate',onTime);v.removeEventListener('timeupdate',detectLoop);
      v.removeEventListener('ended',onPause);a?.removeEventListener('ended',onMusicEnded);
      stop();if(activeStop===stop)activeStop=null;
    };
  },[visible,post.id,hasMusic,start,originalVolume,musicVolume]);
  useEffect(()=>()=>{const mix=audioMix.current;if(mix){mix.ctx.close().catch(()=>{});audioMix.current=null;}},[]);
  return <div ref={root} className={detail?'rivyza-music-detail':'rivyza-music-feed'}>
    {post.media_type==='video'?<video ref={node=>{video.current=node;if(videoRef)videoRef.current=node;}} className={detail?'':'feed-media'} src={post.media_path} playsInline loop preload="metadata" controls={detail}/>:<img className={detail?'':'feed-media'} src={post.media_path} alt={post.caption||'Publicación en RIVYZA'}/>}
    {hasMusic&&<><audio ref={music} src={post.music_path} preload="auto"/><span className="rivyza-music-credit">♫ {post.music_title||'Muévelo Sin Pensar'} · DJ Plus</span></>}
  </div>;
}
