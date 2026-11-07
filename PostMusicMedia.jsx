"use client";
import {useEffect,useRef,useState} from "react";

// v8.6: keep original video audio audible on iOS before AudioContext is unlocked.
let activeStop=null;
export default function PostMusicMedia({post,detail=false,videoRef=null}){
  const root=useRef(null),video=useRef(null),music=useRef(null),audioMix=useRef(null);
  const [visible,setVisible]=useState(false);
  const [videoReady,setVideoReady]=useState(false);
  const hasMusic=Boolean(post.music_path);
  const start=Math.max(0,Number(post.music_start_seconds)||0);
  const originalVolume=Math.max(0,Math.min(1,Number(post.original_volume??50)/100));
  const musicVolume=Math.max(0,Math.min(1,Number(post.music_volume??50)/100));

  useEffect(()=>{
    const node=root.current;if(!node)return;
    const observer=new IntersectionObserver(entries=>setVisible((entries[0]?.intersectionRatio||0)>=0.65),{threshold:[0,.65,1]});
    observer.observe(node);return()=>observer.disconnect();
  },[]);

  // Photos have no video element: play their selected music segment independently.
  useEffect(()=>{
    if(post.media_type==="video"||!hasMusic)return;
    const a=music.current,node=root.current;
    if(!a||!node)return;
    let disposed=false;
    const clip=Math.max(1,Number(post.music_clip_seconds)||10);
    const stop=()=>a.pause();
    if(!visible){stop();return;}
    if(activeStop)activeStop();
    activeStop=stop;
    a.muted=false;
    a.volume=musicVolume;
    const begin=()=>{
      if(disposed||!visible)return;
      if(a.currentTime<start||a.currentTime>=start+clip){
        try{a.currentTime=start;}catch(_){}
      }
      a.play().catch(()=>{}); // Mobile browsers may require a user gesture.
    };
    const onTick=()=>{
      if(a.currentTime>=start+clip){
        try{a.currentTime=start;}catch(_){}
        if(visible)a.play().catch(()=>{});
      }
    };
    const onEnded=()=>{
      try{a.currentTime=start;}catch(_){}
      if(visible)a.play().catch(()=>{});
    };
    const onTap=()=>begin();
    a.addEventListener("timeupdate",onTick);
    a.addEventListener("ended",onEnded);
    node.addEventListener("pointerdown",onTap,{passive:true});
    node.addEventListener("touchstart",onTap,{passive:true});
    try{a.currentTime=start;}catch(_){}
    begin();
    return()=>{
      disposed=true;
      a.removeEventListener("timeupdate",onTick);
      a.removeEventListener("ended",onEnded);
      node.removeEventListener("pointerdown",onTap);
      node.removeEventListener("touchstart",onTap);
      stop();
      if(activeStop===stop)activeStop=null;
    };
  },[visible,post.id,post.media_type,post.music_clip_seconds,hasMusic,start,musicVolume]);

  useEffect(()=>{
    const v=video.current,a=music.current;
    if(!v)return;
    let disposed=false;
    const stop=()=>{v.pause();a?.pause();};
    if(!visible){stop();return;}
    if(activeStop)activeStop();activeStop=stop;

    // IMPORTANT: creating MediaElementSource during autoplay on iOS can silence
    // the original audio if the AudioContext is suspended. Start with native audio.
    v.muted=false;
    v.volume=hasMusic?originalVolume:1;
    if(a){a.muted=false;a.volume=musicVolume;}
    const applyMix=()=>{
      const mix=audioMix.current;
      if(mix){mix.vg.gain.value=originalVolume;mix.ag.gain.value=musicVolume;}
    };
    applyMix();
    const unlockAudio=async()=>{
      if(disposed||!hasMusic||!a)return;
      try{
        const Ctx=window.AudioContext||window.webkitAudioContext;
        if(!Ctx)return;
        if(!audioMix.current){
          const ctx=new Ctx();
          // Resume in a user-initiated event, BEFORE routing media through WebAudio.
          await ctx.resume();
          if(disposed||ctx.state!=="running"){await ctx.close();return;}
          const vg=ctx.createGain(),ag=ctx.createGain();
          vg.gain.value=originalVolume;ag.gain.value=musicVolume;
          ctx.createMediaElementSource(v).connect(vg).connect(ctx.destination);
          ctx.createMediaElementSource(a).connect(ag).connect(ctx.destination);
          audioMix.current={ctx,vg,ag};
          v.volume=1;a.volume=1;
        }else{
          await audioMix.current.ctx.resume();applyMix();
        }
      }catch(e){console.warn("RIVYZA audio unlock:",e);}
    };
    const onUserGesture=()=>{unlockAudio();};
    root.current?.addEventListener("pointerdown",onUserGesture,{passive:true});
    root.current?.addEventListener("touchstart",onUserGesture,{passive:true});
    const align=(force=false)=>{
      if(!a||!hasMusic)return;
      const target=start+(Number.isFinite(v.currentTime)?v.currentTime:0);
      if(!Number.isFinite(target))return;
      if(force||Math.abs(a.currentTime-target)>0.22){try{a.currentTime=target;}catch(_){}}
    };
    const startMusic=()=>{
      if(disposed||!visible||!a||v.paused||v.readyState<2)return;
      align(true);
      a.play().catch(()=>{});
    };
    const onPlay=()=>startMusic();
    const onPause=()=>a?.pause();
    const onSeek=()=>{align(true);if(!v.paused)startMusic();};
    const onTime=()=>{if(!v.paused)align(false);};
    const onLoop=()=>{a?.pause();align(true);startMusic();};
    v.addEventListener("playing",onPlay);
    v.addEventListener("pause",onPause);
    v.addEventListener("seeking",onSeek);
    v.addEventListener("seeked",onSeek);
    v.addEventListener("timeupdate",onTime);
    v.addEventListener("ended",onPause);
    let lastTime=0;
    const detectLoop=()=>{if(v.currentTime+0.3<lastTime)onLoop();lastTime=v.currentTime;};
    v.addEventListener("timeupdate",detectLoop);
    const onMusicEnded=()=>{if(!v.paused)startMusic();};
    a?.addEventListener("ended",onMusicEnded);
    // Do not start playback before a decoded frame is available.
    // This avoids a black flash while moving between feed posts.
    let startCancelled=false;
    const beginVideo=()=>{
      if(disposed||startCancelled||!visible)return;
      if(v.seeking){v.addEventListener("seeked",beginVideo,{once:true});return;}
      setVideoReady(true);
      if(a){a.pause();align(true);}
      v.play().then(()=>{if(!disposed)startMusic();}).catch(()=>{});
    };
    setVideoReady(v.readyState>=2 && !v.seeking);
    // No forzar un seek al montar: en Safari puede provocar un segundo negro.
    if(v.readyState>=2 && v.currentTime>0.15){try{v.currentTime=0;}catch(_){}}
    if(v.readyState>=2)beginVideo();
    else v.addEventListener("loadeddata",beginVideo,{once:true});
    return()=>{
      disposed=true;startCancelled=true;
      v.removeEventListener("loadeddata",beginVideo);
      v.removeEventListener("seeked",beginVideo);
      root.current?.removeEventListener("pointerdown",onUserGesture);
      root.current?.removeEventListener("touchstart",onUserGesture);
      v.removeEventListener("playing",onPlay);v.removeEventListener("pause",onPause);
      v.removeEventListener("seeking",onSeek);v.removeEventListener("seeked",onSeek);
      v.removeEventListener("timeupdate",onTime);v.removeEventListener("timeupdate",detectLoop);
      v.removeEventListener("ended",onPause);a?.removeEventListener("ended",onMusicEnded);
      stop();if(activeStop===stop)activeStop=null;
    };
  },[visible,post.id,hasMusic,start,originalVolume,musicVolume]);
  useEffect(()=>()=>{const mix=audioMix.current;if(mix){mix.ctx.close().catch(()=>{});audioMix.current=null;}},[]);
  return <div ref={root} className={detail?"rivyza-music-detail":"rivyza-music-feed"}>
    {post.media_type==="video"?<video ref={node=>{video.current=node;if(videoRef)videoRef.current=node;}} className={detail?"":"feed-media"} src={post.media_path} poster={post.thumbnail_url||post.poster_url||post.cover_url||undefined} playsInline loop preload="auto"  controls={false} disablePictureInPicture controlsList="nodownload noplaybackrate nofullscreen"/>:<img className={detail?"":"feed-media"} src={post.media_path} alt={post.caption||"Publicación en RIVYZA"}/>}
    {hasMusic&&<audio ref={music} src={post.music_path} preload="auto"/>}
  </div>;
}
