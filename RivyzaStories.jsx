"use client";
import {useEffect,useRef,useState,useCallback} from 'react';
import {createPortal} from 'react-dom';
import MediaStickers,{bakeStickers} from './MediaStickers';
import {Heart,X,Plus,Eye,Send,Download,Trash2,ChevronUp} from 'lucide-react';

const MAX_STORIES=10;
const STORY_FILTERS={original:'none',warm:'sepia(.25) saturate(1.25)',cool:'saturate(.9) hue-rotate(18deg)',vivid:'saturate(1.55) contrast(1.08)',bw:'grayscale(1)'};

async function renderStoryPhoto(source,filter,overlays){
 const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('No se pudo abrir la foto'));img.src=URL.createObjectURL(source)});
 try{
 const scale=Math.min(1,1920/Math.max(image.naturalWidth,image.naturalHeight));const w=Math.max(1,Math.round(image.naturalWidth*scale)),h=Math.max(1,Math.round(image.naturalHeight*scale));
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas no disponible');
 ctx.filter=STORY_FILTERS[filter]||'none';ctx.drawImage(image,0,0,w,h);ctx.filter='none';
 for(const item of overlays){const size=Math.max(20,Math.round(w*(item.kind==='emoji'?.105:.075)));ctx.save();ctx.translate(w*item.x/100,h*item.y/100);ctx.rotate((item.rotation||0)*Math.PI/180);ctx.scale(item.scale||1,item.scale||1);ctx.font=`bold ${size}px system-ui, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.lineWidth=Math.max(3,size*.1);ctx.strokeStyle='#000b';const lines=String(item.text).split('\n');lines.forEach((line,i)=>{const y=(i-(lines.length-1)/2)*size*1.2;ctx.strokeText(line,0,y,w*.9);ctx.fillStyle=item.color||'#ffffff';ctx.fillText(line,0,y,w*.9)});ctx.restore();}
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('No se pudo guardar la imagen')),'image/jpeg',.85));return new File([blob],'historia-editada.jpg',{type:'image/jpeg'});
 }finally{URL.revokeObjectURL(image.src)}
}
const styles=`
.rz-story-own-wrap{position:relative;flex:0 0 67px;width:67px}.rz-story-plus-action{position:absolute;top:43px;right:0;bottom:auto;z-index:7;cursor:pointer;color:#fff;padding:0;display:grid;place-items:center;box-shadow:0 2px 7px #0008;touch-action:manipulation}.rz-story-plus-action:focus-visible{outline:2px solid #fff;outline-offset:2px}
.rz-stories-strip{position:relative;z-index:4;display:flex;gap:12px;overflow-x:auto;padding:12px 13px;background:#11121b;color:white;scrollbar-width:none;flex-shrink:0}.rz-stories-strip::-webkit-scrollbar{display:none}
.rz-story-avatar{display:flex;align-items:center;flex-direction:column;gap:5px;min-width:67px;max-width:67px;border:0;background:transparent;color:white;font-size:11px;cursor:pointer}.rz-story-ring{height:62px;width:62px;border-radius:50%;padding:3px;border:3px solid #19bafa;position:relative}.rz-story-ring.seen{border-color:#626777}.rz-story-ring.own{border-color:#8992a4}.rz-story-ring img,.rz-story-fallback{width:100%;height:100%;border-radius:50%;object-fit:cover}.rz-story-fallback{display:grid;place-items:center;background:#343f62;font-size:22px}.rz-story-plus{position:absolute;right:-3px;bottom:-3px;border:2px solid #111;background:#20baff;border-radius:50%;width:23px;height:23px;display:grid;place-items:center}
.rz-story-viewer{position:fixed;inset:0;z-index:2147483000;background:#050509;color:white;display:flex;align-items:center;justify-content:center}.rz-story-stage{position:relative;height:100dvh;width:min(100vw,calc(100dvh * 9 / 16));overflow:hidden;background:#0a0a0e}.rz-story-media{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;pointer-events:none;position:absolute;inset:0;width:100%;height:100%;object-fit:contain}.rz-story-shade{position:absolute;inset:0;pointer-events:none;background:linear-gradient(to bottom,rgba(0,0,0,.52),transparent 25%,transparent 70%,rgba(0,0,0,.55))}.rz-story-top{position:absolute;top:env(safe-area-inset-top,0px);left:0;right:0;padding:10px 12px;z-index:4;pointer-events:none}.rz-story-progress{display:flex;gap:3px;margin-bottom:12px}.rz-story-progress>span{height:3px;background:#ffffff55;border-radius:8px;flex:1;overflow:hidden}.rz-story-progress i{display:block;background:white;height:100%;transition:width .08s linear}.rz-story-header{display:flex;align-items:center;gap:8px}.rz-story-header img{width:33px;height:33px;object-fit:cover;border-radius:50%}.rz-story-header button{pointer-events:auto;border:0;color:white;background:transparent}.rz-story-hit{touch-action:manipulation;-webkit-touch-callout:none;user-select:none;position:absolute;top:90px;bottom:110px;width:40%;border:0;background:transparent;z-index:2}.rz-story-hit.left{left:0}.rz-story-hit.right{right:0}.rz-story-bottom{position:absolute;bottom:calc(env(safe-area-inset-bottom,0px) + 15px);left:12px;right:12px;z-index:5}.rz-story-heart{position:absolute;right:3px;bottom:68px;border:0;border-radius:50%;width:54px;height:54px;display:grid;place-items:center;color:white;background:#0005;cursor:pointer}.rz-story-heart svg{display:block;flex-shrink:0;margin:0;position:relative;left:0;top:0}.rz-story-heart{padding:0!important;display:flex!important;align-items:center!important;justify-content:center!important;line-height:0!important;box-sizing:border-box!important}.rz-story-heart.liked{color:#ff244b;animation:rz-beat .45s ease}.rz-story-heart.liked:after{content:"";position:absolute;inset:-7px;border-radius:50%;border:2px solid #ff4779;box-shadow:0 0 19px #ff315b,0 0 35px #ff478777;animation:rz-glow .55s ease-out both}@keyframes rz-beat{0%{transform:scale(.85)}45%{transform:scale(1.22)}100%{transform:scale(1)}}@keyframes rz-glow{from{opacity:1;transform:scale(.7)}to{opacity:0;transform:scale(1.7)}}
.rz-story-reply{width:100%;border:1px solid #ffffff99;border-radius:30px;background:#0006;color:white;padding:12px 16px;font-size:14px}.rz-story-send{display:flex;gap:7px}.rz-story-send input{flex:1;min-width:0}.rz-story-send button,.rz-story-owner-actions button{background:#ffffff25;color:white;border:1px solid #ffffff55;border-radius:25px;padding:9px;cursor:pointer}.rz-story-owner-actions{display:flex;align-items:center;gap:9px;flex-wrap:wrap}.rz-story-owner-actions button{display:flex;align-items:center;gap:5px;font-size:12px}.rz-story-people{position:absolute;z-index:8;bottom:0;left:0;right:0;max-height:65%;overflow-y:auto;background:#191a27;border-radius:20px 20px 0 0;padding:18px}.rz-story-person{display:flex;align-items:center;gap:10px;padding:8px 0}.rz-story-person img{width:34px;height:34px;border-radius:50%;object-fit:cover}.rz-story-upload{position:fixed;inset:0;z-index:2147483001;background:#000b;display:grid;place-items:center;color:white}.rz-story-upload-inner{width:min(94vw,420px);padding:24px;border-radius:18px;background:#1b2031;display:grid;gap:14px}.rz-story-upload button{padding:12px;border-radius:12px;border:0;background:#258ed9;color:white}.rz-story-upload button:disabled{opacity:.5}.rz-story-upload-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.rz-story-upload-head h3{margin:0 0 5px;font-size:20px}.rz-story-upload-head p{margin:0;color:#b7c0d4;font-size:13px}.rz-story-upload .rz-story-close{background:transparent;padding:5px;display:grid;place-items:center}.rz-story-preview{width:100%;aspect-ratio:9/12;max-height:48dvh;display:grid;place-items:center;overflow:hidden;border-radius:16px;background:#101626;border:1px dashed #4c658a;cursor:pointer}.rz-story-preview img,.rz-story-preview video{width:100%;height:100%;object-fit:contain}.rz-story-placeholder{display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;padding:18px}.rz-story-placeholder-icon{display:grid;place-items:center;width:60px;height:60px;border-radius:50%;background:#2368bc}.rz-story-placeholder small{color:#b7c0d4}.rz-story-file-input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}.rz-story-upload-details{display:flex;justify-content:space-between;gap:10px;font-size:12px;color:#c4d0e7}.rz-story-upload .rz-story-change{background:#303e5c}.rz-story-upload .rz-story-cancel{background:#30374c}.rz-story-upload-error{color:#ff9a9a;margin:0;font-size:12px}.rz-story-upload .rz-story-publish{background:linear-gradient(110deg,#167bd8,#cb348f);font-weight:700}
.rz-story-upload-inner{max-height:92dvh;overflow-y:auto}.rz-story-preview{position:relative;touch-action:none}.rz-editor-overlay{position:absolute;transform:translate(-50%,-50%);font-weight:800;text-shadow:0 2px 4px #000,0 0 8px #000;cursor:grab;touch-action:none;white-space:pre-wrap;max-width:90%;text-align:center;user-select:none}.rz-editor-tools{display:grid;gap:8px}.rz-editor-tabs,.rz-editor-row,.rz-editor-emojis{display:flex;gap:6px;flex-wrap:wrap}.rz-story-upload .rz-editor-tabs button,.rz-story-upload .rz-editor-emojis button{background:#34405e;padding:8px 10px;font-size:12px}.rz-editor-emojis button.selected{outline:2px solid #27baff}.rz-editor-row input[type=text],.rz-editor-row input:not([type]){flex:1;min-width:100px;background:#111827;color:white;border:1px solid #64748b;border-radius:9px;padding:9px}.rz-editor-row input[type=color]{width:38px;height:36px}.rz-story-upload .rz-editor-undo{background:transparent;text-align:left;color:#a9d9ff;padding:3px;font-size:12px}.rz-editor-hint{color:#c0c8da;font-size:11px}

/* RIVYZA: editor inmersivo de historias; visor y feed no cambian. */
.rz-story-upload{display:block!important;background:#000!important}
.rz-story-upload-inner{position:absolute!important;inset:0!important;width:100%!important;max-width:none!important;max-height:100dvh!important;height:100dvh!important;padding:0!important;border-radius:0!important;overflow:hidden!important;display:block!important;background:#000!important}
.rz-story-upload-head{position:absolute!important;top:0;left:0;right:0;z-index:12;padding:calc(12px + env(safe-area-inset-top,0px)) 15px 14px;background:linear-gradient(#000a,transparent);align-items:center}
.rz-story-upload-head h3{font-size:17px!important}.rz-story-upload-head p{display:none!important}
.rz-story-preview{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;max-height:none!important;aspect-ratio:auto!important;border:0!important;border-radius:0!important;background:#000!important;overflow:hidden!important;cursor:default}
.rz-story-preview img,.rz-story-preview video{width:100%!important;height:100%!important;object-fit:cover!important;border-radius:0!important}
.rz-story-upload .rz-editor-tools{position:absolute!important;top:calc(86px + env(safe-area-inset-top,0px));right:12px;z-index:13;width:min(245px,65vw);display:grid;justify-items:end;gap:9px;pointer-events:none}
.rz-story-upload .rz-editor-tools>*{pointer-events:auto}
.rz-story-upload .rz-editor-tabs{display:flex;flex-direction:column;align-items:flex-end;gap:8px}
.rz-story-upload .rz-editor-tabs button{background:#0009!important;border:1px solid #ffffff50!important;color:white!important;border-radius:16px!important;padding:11px 13px!important;backdrop-filter:blur(6px)}
.rz-story-upload .rz-editor-row,.rz-story-upload .rz-editor-emojis{background:#111d;border:1px solid #ffffff30;border-radius:12px;padding:9px;max-width:100%;max-height:38dvh;overflow:auto}
.rz-story-upload .rz-editor-row input[type=text]{width:130px;min-width:0}
.rz-story-upload .rz-editor-hint{display:none}
.rz-story-upload-details{position:absolute;left:14px;bottom:calc(150px + env(safe-area-inset-bottom,0px));z-index:12;right:14px;font-size:11px;text-shadow:0 1px 3px #000}
.rz-story-upload .rz-story-change{position:absolute;left:14px;bottom:calc(105px + env(safe-area-inset-bottom,0px));z-index:12;width:auto;max-width:calc(100% - 28px);padding:10px 14px;background:#0009!important;border:1px solid #ffffff40!important}
.rz-story-upload .rz-story-publish{position:absolute;left:14px;right:14px;bottom:calc(17px + env(safe-area-inset-bottom,0px));z-index:12;width:calc(100% - 28px);padding:14px!important}
.rz-story-upload .rz-story-cancel{display:none!important}
.rz-story-upload-error{position:absolute;left:14px;right:14px;bottom:calc(205px + env(safe-area-inset-bottom,0px));z-index:15;background:#400b;padding:8px;border-radius:8px}
.rz-story-upload-inner>small.rz-editor-hint{position:absolute;left:14px;right:14px;bottom:calc(205px + env(safe-area-inset-bottom,0px));z-index:12;background:#0009;padding:8px;border-radius:8px}
/* Barra compacta horizontal e inputs seguros para Safari iOS */
 .rz-story-upload .rz-editor-tools{top:calc(70px + env(safe-area-inset-top,0px))!important;left:8px!important;right:8px!important;width:auto!important;display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:5px!important}
 .rz-story-upload .rz-editor-tabs{display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important;justify-content:center!important;gap:5px!important;width:100%!important}
 .rz-story-upload .rz-editor-tabs button{flex:1 1 0;min-width:0;padding:8px 3px!important;border-radius:12px!important;font-size:11px!important;white-space:nowrap}
 .rz-story-upload .rz-editor-row{display:flex!important;flex-wrap:nowrap!important;align-items:center!important;max-height:none!important;padding:5px!important}
 .rz-story-upload .rz-editor-row input[type=text],.rz-story-upload .rz-editor-row input:not([type]){font-size:16px!important;min-width:0!important;flex:1!important;width:0!important}
 .rz-story-upload .rz-editor-row input[type=color]{flex:0 0 36px!important}
 .rz-story-upload .rz-editor-row button{font-size:12px!important;padding:10px 7px!important}
 .rz-story-upload .rz-editor-emojis{flex-wrap:nowrap!important;overflow-x:auto!important;max-height:55px!important}
 .rz-editor-hint-panel{background:#111b;border-radius:10px;padding:8px;font-size:12px;text-align:center}
 .rz-text-trash{position:absolute;left:50%;bottom:calc(100px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);background:#222d;color:white;border:2px solid #fff8;border-radius:50%;width:64px;height:64px;display:grid;place-items:center;z-index:20;pointer-events:none;transition:background .12s,transform .12s}
 .rz-text-trash.active{background:#e22d4a;transform:translateX(-50%) scale(1.2)}
 @media(min-width:700px){.rz-story-upload-inner{left:50%!important;right:auto!important;transform:translateX(-50%);width:min(100vw,calc(100dvh * 9 / 16))!important}}
`;
export default function RivyzaStories({supabase,user,profile,language='es',onOpenProfile}){
 const en=language==='en';const tx=(es,english)=>en?english:es;
 const [items,setItems]=useState([]),[seen,setSeen]=useState([]),[likes,setLikes]=useState([]),[people,setPeople]=useState([]),[showPeople,setShowPeople]=useState(false);
 const [viewer,setViewer]=useState(null),[index,setIndex]=useState(0),[upload,setUpload]=useState(false),[file,setFile]=useState(null),[filePreview,setFilePreview]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[draft,setDraft]=useState(''),[progress,setProgress]=useState(0),[paused,setPaused]=useState(false),[feedback,setFeedback]=useState('');
 const [editorText,setEditorText]=useState(''),[editorColor,setEditorColor]=useState('#ffffff'),[editorFilter,setEditorFilter]=useState('original'),[editorOverlays,setEditorOverlays]=useState([]),[editorTab,setEditorTab]=useState('text');
 const dragOverlay=useRef(null),previewBox=useRef(null),textTrashRef=useRef(null);
 const [stickers,setStickers]=useState([]);const [stickerOpenSignal,setStickerOpenSignal]=useState(0);
  const [draggingText,setDraggingText]=useState(false),[overTrash,setOverTrash]=useState(false);
  const gesture=useRef({points:new Map(),id:null,start:null});
  const [selectedText,setSelectedText]=useState(null);
 const resetEditor=()=>{setEditorText('');setEditorFilter('original');setEditorOverlays([]);setEditorTab('text');setStickers([]);setDraggingText(false);setSelectedText(null)};
 const addOverlay=(kind,value)=>{if(!value.trim())return;setEditorOverlays(v=>[...v,{id:Date.now()+Math.random(),kind,text:value,color:editorColor,x:50,y:50,scale:1,rotation:0}]);setEditorText('')};
   const trashHit=(x,y)=>{const r=textTrashRef.current?.getBoundingClientRect();return !!r&&x>=r.left-12&&x<=r.right+12&&y>=r.top-12&&y<=r.bottom+12};
  const textPointerDown=(e,o)=>{e.stopPropagation();e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);const g=gesture.current;if(g.id!==o.id){g.points.clear();g.id=o.id;g.start=null}g.points.set(e.pointerId,{x:e.clientX,y:e.clientY});g.base={...o};g.start=null;setSelectedText(o.id);setDraggingText(true)};
  const textPointerMove=(e)=>{const g=gesture.current;if(!g.points.has(e.pointerId)||!previewBox.current)return;e.stopPropagation();g.points.set(e.pointerId,{x:e.clientX,y:e.clientY});const r=previewBox.current.getBoundingClientRect();const pts=[...g.points.values()];if(!g.start){g.start={points:pts.map(p=>({...p})),base:{...g.base}}}const st=g.start;let patch={};if(pts.length>=2&&st.points.length>=2){const [a,b]=pts,[c,d]=st.points;const dist=Math.hypot(b.x-a.x,b.y-a.y),initial=Math.max(1,Math.hypot(d.x-c,d.y-c));const angle=Math.atan2(b.y-a.y,b.x-a.x)-Math.atan2(d.y-c,d.x-c);patch={scale:Math.max(.3,Math.min(5,st.base.scale*dist/initial)),rotation:st.base.rotation+angle*180/Math.PI,x:Math.max(5,Math.min(95,st.base.x+((a.x+b.x-c.x-d.x)/2)/r.width*100)),y:Math.max(5,Math.min(95,st.base.y+((a.y+b.y-c.y-d.y)/2)/r.height*100))}}else if(pts.length===1&&st.points.length===1){patch={x:Math.max(5,Math.min(95,st.base.x+(pts[0].x-st.points[0].x)/r.width*100)),y:Math.max(5,Math.min(95,st.base.y+(pts[0].y-st.points[0].y)/r.height*100))}}setEditorOverlays(v=>v.map(o=>o.id===g.id?{...o,...patch}:o));setOverTrash(trashHit(e.clientX,e.clientY))};
  const textPointerUp=(e)=>{const g=gesture.current;if(!g.points.has(e.pointerId))return;e.stopPropagation();const remove=trashHit(e.clientX,e.clientY)&&g.points.size===1;if(remove)setEditorOverlays(v=>v.filter(o=>o.id!==g.id));g.points.delete(e.pointerId);g.start=null;if(g.points.size===0){g.id=null;setDraggingText(false);setOverTrash(false);if(remove)setSelectedText(null)}};
const timer=useRef(null),lastTick=useRef(0),touch=useRef(null),video=useRef(null),fileInput=useRef(null);
 const now=Date.now();const active=items.filter(s=>new Date(s.expires_at).getTime()>now);const groups=[];
 for(const story of active){let g=groups.find(g=>g.id===story.user_id);if(!g){g={id:story.user_id,person:story.person,stories:[]};groups.push(g)}g.stories.push(story)}
 groups.sort((a,b)=>new Date(b.stories[b.stories.length-1]?.created_at)-new Date(a.stories[a.stories.length-1]?.created_at));
 const ordered=groups.flatMap(g=>g.stories.sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)));
 const own=groups.find(g=>g.id===user?.id);const others=groups.filter(g=>g.id!==user?.id);
 const story=viewer?ordered[index]:null;
 const isOwn=story?.user_id===user?.id;
 const storyLiked=!!story&&likes.includes(story.id);
 const load=useCallback(async()=>{
  if(!supabase||!user?.id)return;
  const [{data:out,error:e1},{data:incoming,error:e2}]=await Promise.all([supabase.from('follows').select('following_id').eq('follower_id',user.id),supabase.from('follows').select('follower_id').eq('following_id',user.id)]);
  if(e1||e2){setError(tx('No se pudieron cargar los amigos.','Could not load friends.'));return;}
  const mutual=new Set((incoming||[]).map(x=>x.follower_id));const ids=[user.id,...(out||[]).map(x=>x.following_id).filter(id=>mutual.has(id))];
  const {data:stories,error:se}=await supabase.from('rivyza_stories').select('id,user_id,media_path,media_type,created_at,expires_at').in('user_id',ids).gt('expires_at',new Date().toISOString()).order('created_at',{ascending:true}).limit(600);
  if(se){setError(tx('Configura el SQL de historias en Supabase.','Set up the stories SQL in Supabase.'));return;}
  const [{data:profiles},{data:views},{data:liked}]=await Promise.all([supabase.from('profiles').select('id,username,display_name,avatar_url').in('id',ids),supabase.from('rivyza_story_views').select('story_id').eq('viewer_id',user.id),supabase.from('rivyza_story_likes').select('story_id').eq('user_id',user.id)]);
  const pmap=new Map((profiles||[]).map(p=>[p.id,p]));
  setItems((stories||[]).map(s=>({...s,person:pmap.get(s.user_id)||null})));setSeen((views||[]).map(x=>x.story_id));setLikes((liked||[]).map(x=>x.story_id));setError('');
 },[supabase,user?.id,en]);
 useEffect(()=>{load();const t=setInterval(load,45000);return()=>clearInterval(t)},[load]);
 useEffect(()=>{if(!story||!user?.id||isOwn)return;supabase.from('rivyza_story_views').upsert({story_id:story.id,viewer_id:user.id,viewed_at:new Date().toISOString()},{onConflict:'story_id,viewer_id'}).then(()=>setSeen(v=>v.includes(story.id)?v:[...v,story.id]));},[story?.id,user?.id]);
 const next=()=>{setShowPeople(false);setDraft('');setProgress(0);if(index<ordered.length-1)setIndex(i=>i+1);else setViewer(null)};
 const prev=()=>{setShowPeople(false);setDraft('');setProgress(0);setIndex(i=>Math.max(0,i-1))};
 useEffect(()=>{if(!viewer||!story||story.media_type==='video'||paused||showPeople)return;lastTick.current=Date.now();timer.current=setInterval(()=>setProgress(v=>{const n=v+(Date.now()-lastTick.current)/50;lastTick.current=Date.now();return Math.min(n,100)}),50);return()=>clearInterval(timer.current)},[viewer,story?.id,paused,showPeople]);
 useEffect(()=>{if(viewer&&story&&story.media_type!=='video'&&progress>=100)next()},[progress,story?.id]);
 useEffect(()=>{if(video.current){if(paused||showPeople)video.current.pause();else video.current.play().catch(()=>{})}},[paused,showPeople,story?.id]);
 useEffect(()=>{if(!viewer)return;const key=e=>{if(e.key==='Escape')setViewer(null);if(e.key==='ArrowRight')next();if(e.key==='ArrowLeft')prev()};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key)},[viewer,index,ordered.length]);
 const open=(id)=>{const i=ordered.findIndex(s=>s.user_id===id);if(i<0)return;setIndex(i);setViewer(true);setProgress(0);setShowPeople(false)};
 const mediaUrl=(s)=>supabase.storage.from('rivyza-stories').getPublicUrl(s.media_path).data.publicUrl;
 async function publish(){if(!file||busy||!user?.id)return;setBusy(true);setError('');try{
  const count=items.filter(s=>s.user_id===user.id&&new Date(s.expires_at)>new Date()).length;if(count>=MAX_STORIES)throw Error(tx('Máximo 10 historias activas.','Maximum 10 active stories.'));
  if(file.size>50*1024*1024)throw Error(tx('Máximo 50 MB por historia.','Maximum 50 MB per story.'));
  if(!['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'].includes(file.type))throw Error(tx('Formato no permitido.','Unsupported format.'));
  const photoFile=file.type.startsWith('image/')&&(editorOverlays.length||editorFilter!=='original')?await renderStoryPhoto(file,editorFilter,editorOverlays):file;
   const finalFile=file.type.startsWith('image/')&&stickers.length?await bakeStickers(photoFile,stickers,supabase):photoFile;
  const ext=finalFile.name.split('.').pop().toLowerCase();const path=`${user.id}/${crypto.randomUUID()}.${ext}`;
  const {error:upErr}=await supabase.storage.from('rivyza-stories').upload(path,finalFile,{contentType:finalFile.type,upsert:false});if(upErr)throw upErr;
  const {error:dbErr}=await supabase.from('rivyza_stories').insert({user_id:user.id,media_path:path,media_type:file.type.startsWith('video/')?'video':'image'});
  if(dbErr){await supabase.storage.from('rivyza-stories').remove([path]);throw dbErr}setUpload(false);setFile(null);resetEditor();await load();
 }catch(e){setError(e.message||'Error')}finally{setBusy(false)}}
 async function toggleLike(){if(!story||isOwn)return;const was=storyLiked;setLikes(v=>was?v.filter(x=>x!==story.id):[...v,story.id]);const {error:e}=was?await supabase.from('rivyza_story_likes').delete().eq('story_id',story.id).eq('user_id',user.id):await supabase.from('rivyza_story_likes').insert({story_id:story.id,user_id:user.id});if(e){setLikes(v=>was?[...v,story.id]:v.filter(x=>x!==story.id));setFeedback(e.message)}}
 async function sendReply(){if(!story||!draft.trim()||busy)return;setBusy(true);const {error:e}=await supabase.from('rivyza_messages').insert({sender_id:user.id,recipient_id:story.user_id,body:draft.trim(),story_id:story.id});setBusy(false);if(e)setFeedback(e.message);else{setDraft('');setFeedback(tx('Mensaje enviado','Message sent'))}}
 async function loadPeople(){if(!story||!isOwn)return;const [v,l]=await Promise.all([supabase.from('rivyza_story_views').select('viewer_id,viewed_at').eq('story_id',story.id).order('viewed_at',{ascending:false}),supabase.from('rivyza_story_likes').select('user_id').eq('story_id',story.id)]);const ids=[...new Set((v.data||[]).map(x=>x.viewer_id))];const {data:p}=ids.length?await supabase.from('profiles').select('id,display_name,username,avatar_url').in('id',ids):{data:[]};const map=new Map((p||[]).map(x=>[x.id,x]));const likers=new Set((l.data||[]).map(x=>x.user_id));setPeople((v.data||[]).map(x=>({...x,person:map.get(x.viewer_id),liked:likers.has(x.viewer_id)})));setShowPeople(true)}
 async function removeStory(){if(!isOwn||!confirm(tx('¿Eliminar esta historia?','Delete this story?')))return;const path=story.media_path;const {error:e}=await supabase.from('rivyza_stories').delete().eq('id',story.id).eq('user_id',user.id);if(e){setFeedback(e.message);return}await supabase.storage.from('rivyza-stories').remove([path]);setViewer(null);await load()}
 async function downloadStory(){
  if(!isOwn||!story)return;
  setFeedback('');
  try{
    const {data,error:e}=await supabase.storage.from('rivyza-stories').download(story.media_path);
    if(e)throw e;
    const video=story.media_type==='video';
    const rawExt=(story.media_path.split('.').pop()||'').toLowerCase();
    const ext=video?(rawExt==='mov'?'mov':rawExt==='webm'?'webm':'mp4'):(rawExt==='png'?'png':rawExt==='webp'?'webp':'jpg');
    const mime=video?(ext==='mov'?'video/quicktime':ext==='webm'?'video/webm':'video/mp4'):(ext==='png'?'image/png':ext==='webp'?'image/webp':'image/jpeg');
    const filename=`RIVYZA-historia-${story.id}.${ext}`;
    const file=new File([data],filename,{type:mime});
    // En iPhone, Safari suele abrir los blobs como documentos en lugar de guardarlos.
    // La hoja nativa permite elegir «Guardar imagen» / «Guardar video».
    if(typeof navigator.share==='function' && typeof navigator.canShare==='function' && navigator.canShare({files:[file]})){
      try{
        await navigator.share({files:[file]});
        return;
      }catch(shareError){
        if(shareError?.name==='AbortError')return;
        // Si el sistema no permite compartir, intentar descarga tradicional.
      }
    }
    const url=URL.createObjectURL(file);
    const a=document.createElement('a');
    a.href=url;a.download=filename;a.style.display='none';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
    setFeedback(tx('Si se abre una vista previa, usa Compartir → Guardar imagen o Guardar video.','If a preview opens, use Share → Save Image or Save Video.'));
  }catch(e){setFeedback(e?.message||tx('No se pudo guardar la historia','Could not save story'))}
 }
 // Mientras se crea una historia, ningún medio del feed Amigos puede sonar detrás.
 // Capturamos también intentos de reproducción posteriores (autoplay y cambios de post).
 useEffect(()=>{
  if(!upload)return;
  const pauseBackground=()=>{
   document.querySelectorAll('audio,video').forEach(el=>{
    if(!el.closest('.rz-story-upload') && !el.paused){try{el.pause()}catch{}}
   });
  };
  const preventBackgroundPlay=e=>{
   if(e.target instanceof HTMLMediaElement && !e.target.closest('.rz-story-upload')){
    try{e.target.pause()}catch{}
   }
  };
  pauseBackground();
  window.dispatchEvent(new CustomEvent('rivyza:pause-background-media'));
  document.addEventListener('play',preventBackgroundPlay,true);
  const interval=window.setInterval(pauseBackground,350);
  return()=>{document.removeEventListener('play',preventBackgroundPlay,true);window.clearInterval(interval)};
 },[upload]);
 const closeUpload=()=>{if(busy)return;setUpload(false);setFile(null);resetEditor();setError('');};
  useEffect(()=>{if(!file){setFilePreview('');return;}const url=URL.createObjectURL(file);setFilePreview(url);return()=>URL.revokeObjectURL(url)},[file]);
  const avatar=(p)=>(p?.avatar_url?<img src={p.avatar_url} alt=""/>:<span className="rz-story-fallback">{(p?.display_name||p?.username||'R')[0].toUpperCase()}</span>);
 return <><style>{styles}</style><div className="rz-stories-strip" aria-label={tx('Historias de amigos','Friends stories')}>
 <div className="rz-story-own-wrap"><button className="rz-story-avatar" onClick={()=>own?open(user.id):setUpload(true)} aria-label={own?tx("Ver mis historias","View my stories"):tx("Crear historia","Create story")}><span className={"rz-story-ring own "+(own?"has-story":"")}>{avatar(profile)}</span><span>{tx('Tu historia','Your story')}</span>{own&&<small className="rz-story-count">{own.stories.length}/10</small>}</button><button type="button" className="rz-story-plus rz-story-plus-action" aria-label={tx("Agregar otra historia","Add another story")} onClick={(e)=>{e.stopPropagation();setError('');setFile(null);resetEditor();setUpload(true)}}><Plus size={15}/></button></div>
 {others.map(g=><button className="rz-story-avatar" key={g.id} onClick={()=>open(g.id)}><span className={'rz-story-ring '+(g.stories.every(s=>seen.includes(s.id))?'seen':'')}>{avatar(g.person)}</span><span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'100%'}}>{g.person?.display_name||g.person?.username||'Usuario'}</span></button>)}
 
 </div>{error&&<p style={{color:'#ff9a9a',padding:'4px 12px',fontSize:12}}>{error}</p>}
  {upload&&createPortal(<div className="rz-story-upload" onClick={e=>{if(e.target===e.currentTarget)closeUpload()}}><div className="rz-story-upload-inner">
    <div className="rz-story-upload-head"><div><h3>{tx('Nueva historia','New story')}</h3><p>{tx('Comparte un momento con tus amigos','Share a moment with your friends')}</p></div><button className="rz-story-close" onClick={closeUpload} aria-label={tx('Cerrar','Close')}><X size={22}/></button></div>
    <div className="rz-story-preview" ref={previewBox} onClick={()=>!file&&!busy&&fileInput.current?.click()}  role="group">
      {filePreview?(file?.type.startsWith('video/')?<video key={filePreview} src={filePreview} controls playsInline onClick={e=>e.stopPropagation()}/>:<img src={filePreview} style={{filter:STORY_FILTERS[editorFilter]}} alt={tx('Vista previa de tu historia','Your story preview')}/>):<div className="rz-story-placeholder"><span className="rz-story-placeholder-icon"><Plus size={32}/></span><strong>{tx('Seleccionar foto o video','Choose photo or video')}</strong><small>{tx('Toca aquí para abrir tus archivos','Tap here to open your files')}</small></div>}
      {file?.type.startsWith('image/')&&<MediaStickers supabase={supabase} items={stickers} onChange={setStickers} lang={language} hideLauncher openSignal={stickerOpenSignal}/>}
      {file?.type.startsWith('image/')&&editorOverlays.map(o=><span key={o.id} className="rz-editor-overlay" style={{left:`${o.x}%`,top:`${o.y}%`,color:o.color,fontSize:o.kind==='emoji'?32:23,transform:`translate(-50%,-50%) rotate(${o.rotation||0}deg) scale(${o.scale||1})`,outline:selectedText===o.id?"1px dashed #ffffff99":"none"}} onPointerDown={e=>textPointerDown(e,o)} onPointerMove={textPointerMove} onPointerUp={textPointerUp} onPointerCancel={textPointerUp}>{o.text}</span>)}
      {draggingText&&<div ref={textTrashRef} className={`rz-text-trash ${overTrash?"active":""}`}><Trash2 size={25}/></div>}
    </div>
    {file?.type.startsWith('image/')&&<div className="rz-editor-tools">
      <div className="rz-editor-tabs"><button onClick={()=>setEditorTab('text')}>Aa {tx('Texto','Text')}</button><button onClick={()=>setEditorTab('filters')}>◉ {tx('Filtros','Filters')}</button><button onClick={()=>{setEditorTab('');setStickerOpenSignal(v=>v+1)}}>✨ {tx('Stickers','Stickers')}</button><button onClick={()=>setEditorOverlays(v=>v.slice(0,-1))} disabled={!editorOverlays.length}>↶ {tx('Deshacer','Undo')}</button></div>
      {editorTab==='text'&&<div className="rz-editor-row"><input value={editorText} maxLength={100} onChange={e=>setEditorText(e.target.value)} placeholder={tx('Escribe sobre tu foto','Write on your photo')}/><input type="color" aria-label={tx('Color del texto','Text color')} value={editorColor} onChange={e=>setEditorColor(e.target.value)}/><button disabled={!editorText.trim()} onClick={()=>addOverlay('text',editorText)}>{tx('Añadir','Add')}</button></div>}
      {editorTab==='filters'&&<div className="rz-editor-emojis">{Object.keys(STORY_FILTERS).map(f=><button key={f} className={editorFilter===f?'selected':''} onClick={()=>setEditorFilter(f)}>{({original:tx('Original','Original'),warm:tx('Cálido','Warm'),cool:tx('Frío','Cool'),vivid:tx('Vivo','Vivid'),bw:tx('B/N','B/W')})[f]}</button>)}</div>}
      
      <small className="rz-editor-hint">{tx('Arrastra el texto o los stickers para moverlos','Drag text or stickers to move them')}</small>
    </div>}
    <input ref={fileInput} className="rz-story-file-input" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" onChange={e=>{setFile(e.target.files?.[0]||null);resetEditor();setError('');e.target.value=''}}/>
    <div className="rz-story-upload-details"><span>{tx('Historias activas','Active stories')}: {own?.stories.length||0}/10</span><span>{tx('Duración: 24 horas','Lasts 24 hours')}</span></div>
    {file?.type.startsWith('video/')&&<small className="rz-editor-hint">{tx('El editor de video y la compresión llegarán en otra actualización. Máximo 50 MB por ahora.','Video editing and compression will come in another update. 50 MB maximum for now.')}</small>}
    {file&&<button className="rz-story-change" onClick={()=>fileInput.current?.click()}>{tx('Cambiar foto o video','Change photo or video')} · {(file.size/1048576).toFixed(1)} MB</button>}
    {error&&<p className="rz-story-upload-error">{error}</p>}
    <button className="rz-story-publish" disabled={!file||busy||(own?.stories.length||0)>=MAX_STORIES} onClick={publish}>{busy?tx('Publicando…','Publishing…'):tx('Publicar historia','Post story')}</button>
    <button className="rz-story-cancel" disabled={busy} onClick={closeUpload}>{tx('Cancelar','Cancel')}</button>
  </div></div>,document.body)}
 {viewer&&story&&createPortal(<div className="rz-story-viewer"><div className="rz-story-stage">
 {story.media_type==='video'?<video key={story.id} ref={video} className="rz-story-media" src={mediaUrl(story)} autoPlay playsInline onEnded={next} onTimeUpdate={e=>setProgress(e.currentTarget.duration?100*e.currentTarget.currentTime/e.currentTarget.duration:0)}/>:<img className="rz-story-media" src={mediaUrl(story)} alt="Historia"/>}
 <div className="rz-story-shade"/><button aria-label="Historia anterior" className="rz-story-hit left" onClick={prev}/><button aria-label="Siguiente historia" className="rz-story-hit right" onClick={next}/>
 <div className="rz-story-top"><div className="rz-story-progress">{ordered.filter(s=>s.user_id===story.user_id).map(s=><span key={s.id}><i style={{width:ordered.indexOf(s)<index?'100%':ordered.indexOf(s)===index?`${progress}%`:'0%'}}/></span>)}</div><div className="rz-story-header">{avatar(story.person)}<strong style={{flex:1,fontSize:14}}>{story.person?.display_name||story.person?.username||'Usuario'}</strong><small>{new Date(story.created_at).toLocaleTimeString(en?'en-US':'es-US',{hour:'numeric',minute:'2-digit'})}</small><button aria-label="Cerrar" onClick={()=>setViewer(null)}><X/></button></div></div>
 <div className="rz-story-bottom">{isOwn?<div className="rz-story-owner-actions"><button onClick={loadPeople}><Eye size={17}/> {tx('Vistas y likes','Views & likes')}</button><button onClick={downloadStory}><Download size={17}/></button><button onClick={removeStory}><Trash2 size={17}/></button></div>:<><button className={'rz-story-heart '+(storyLiked?'liked':'')} key={`${story.id}-${storyLiked}`} onClick={toggleLike} aria-label={tx('Me gusta','Like')}><Heart size={31} fill={storyLiked?'currentColor':'none'} strokeWidth={1.8}/></button><div className="rz-story-send"><input className="rz-story-reply" placeholder={tx('Enviar mensaje…','Send message…')} value={draft} onFocus={()=>setPaused(true)} onBlur={()=>setPaused(false)} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.stopPropagation();sendReply()}}}/><button disabled={!draft.trim()||busy} onClick={sendReply} aria-label="Enviar"><Send size={20}/></button></div></>}{feedback&&<small style={{display:'block',marginTop:6}}>{feedback}</small>}</div>
 {showPeople&&<div className="rz-story-people"><button onClick={()=>setShowPeople(false)} style={{float:'right',background:'none',color:'white',border:0}}><X/></button><h3>{tx('Espectadores','Viewers')} · {people.length}</h3>{people.map(p=><div className="rz-story-person" key={p.viewer_id}>{avatar(p.person)}<span style={{flex:1}}>{p.person?.display_name||p.person?.username||'Usuario'}<small style={{display:'block',opacity:.65}}>{new Date(p.viewed_at).toLocaleString()}</small></span>{p.liked&&<Heart size={19} fill="#ff3156" color="#ff3156"/>}</div>)}</div>}
 </div></div>,document.body)}
 </>;
}
