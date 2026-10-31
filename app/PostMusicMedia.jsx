"use client";
import {useEffect,useRef,useState} from 'react';

// One active post at a time. Browser audio policies may require a first tap.
let activeStop=null;
export default function PostMusicMedia({post,detail=false,videoRef=null}){
 const root=useRef(null), video=useRef(null),music=useRef(null),[visible,setVisible]=useState(false);
 const hasMusic=Boolean(post.music_path);
 const start=Math.max(0,Number(post.music_start_seconds)||0);
 const length=Math.max(1,Number(post.music_clip_seconds)||15);
 const originalVolume=Math.max(0,Math.min(1,(Number(post.original_volume ?? 50))/100));
 const musicVolume=Math.max(0,Math.min(1,(Number(post.music_volume ?? 50))/100));
 useEffect(()=>{
   const el=root.current;if(!el)return;
   const obs=new IntersectionObserver(entries=>setVisible(entries[0]?.intersectionRatio>=0.65),{threshold:[0,.65,1]});
   obs.observe(el);return()=>obs.disconnect();
 },[]);
 useEffect(()=>{
   const v=video.current,a=music.current;
   const stop=()=>{v?.pause();a?.pause();};
   if(!visible){stop();return;}
   if(activeStop && activeStop!==stop)activeStop();activeStop=stop;
   if(v){v.volume=hasMusic?originalVolume:1;v.currentTime=0;v.play().catch(()=>{});}
   if(a){a.volume=musicVolume;a.currentTime=start;a.play().catch(()=>{});}
   const sync=()=>{if(a && a.currentTime>=start+length){a.currentTime=start;if(visible)a.play().catch(()=>{});}};
   a?.addEventListener('timeupdate',sync);
   return()=>{a?.removeEventListener('timeupdate',sync);stop();if(activeStop===stop)activeStop=null;};
 },[visible,post.id,hasMusic,start,length,originalVolume,musicVolume]);
 return <div ref={root} className={detail?'rivyza-music-detail':'rivyza-music-feed'}>
   {post.media_type==='video'?<video ref={node=>{video.current=node;if(videoRef)videoRef.current=node;}} className={detail?'':'feed-media'} src={post.media_path} playsInline loop preload="metadata" controls={detail}/>:<img className={detail?'':'feed-media'} src={post.media_path} alt={post.caption||'Publicación en RIVYZA'}/>}
   {hasMusic&&<><audio ref={music} src={post.music_path} preload="metadata"/><span className="rivyza-music-credit">♫ {post.music_title||'Muévelo Sin Pensar'} · DJ Plus</span></>}
 </div>;
}
