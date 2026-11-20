 "use client";
import React from "react";

export function getPostMark(post) {
  const username = post?.creator?.username || post?.author?.username || post?.username || "";
  return { username: String(username).replace(/^@/, "").trim().slice(0,40), song: String(post?.music_title || post?.music_name || "").slice(0,90) };
}
export default function RIVYZAWatermark({post}) {
  const {username,song}=getPostMark(post);
  return <div className="rivyza-media-mark" aria-label={`RIVYZA, @${username}`}>
    <div className="rivyza-media-brand">RIVYZA</div>
    {username && <div className="rivyza-media-user">@{username}</div>}
    {post?.music_path && song && <div className="rivyza-media-song">♫ {song}</div>}
    <div className="rivyza-media-glow"/>
  </div>;
}
export async function makeWatermarkPNG(post,width=480,height=854) {
  const {username,song}=getPostMark(post);
  const canvas=document.createElement("canvas"); canvas.width=width; canvas.height=height;
  const ctx=canvas.getContext("2d"); if(!ctx)throw new Error("No se pudo preparar la marca.");
  const scale=width/480, x=18*scale, bottom=70*scale;
  const lines=post?.music_path && song ? 3 : 2;
  const brandY=height-bottom-(lines===3?54:37)*scale;
  ctx.textBaseline="alphabetic";ctx.shadowColor="rgba(0,0,0,.65)";ctx.shadowBlur=4*scale;
  ctx.font=`800 ${24*scale}px Arial, sans-serif`;
  const grad=ctx.createLinearGradient(x,0,x+126*scale,0);
  grad.addColorStop(0,"#00cfff");grad.addColorStop(.45,"#075cff");grad.addColorStop(.72,"#8b2cff");grad.addColorStop(1,"#ff36d2");
  ctx.fillStyle=grad;ctx.fillText("RIVYZA",x,brandY);
  ctx.font=`600 ${15*scale}px Arial, sans-serif`;ctx.fillStyle="#fff";
  if(username)ctx.fillText(`@${username}`,x,brandY+21*scale,390*scale);
  if(lines===3){ctx.font=`500 ${13*scale}px Arial, sans-serif`;ctx.fillText(`♫ ${song}`,x,brandY+40*scale,390*scale);}
  ctx.shadowBlur=0;
  const lineY=brandY+(lines===3?51:32)*scale;
  const line=ctx.createLinearGradient(x,0,x+130*scale,0);
  line.addColorStop(0,"#00cfff");line.addColorStop(.52,"#8030ff");line.addColorStop(1,"#ff36d2");
  ctx.fillStyle=line;ctx.fillRect(x,lineY,130*scale,2.5*scale);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));
  if(!blob)throw new Error("No se pudo generar la marca.");
  return blob;
}
export async function markPhoto(post) {
  const img=new Image();img.crossOrigin="anonymous";
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=post.media_path;});
  const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=1920;
  const ctx=canvas.getContext("2d");
  // Igual que la visualización sin zoom: imagen completa y bandas negras si sobran espacios.
  ctx.fillStyle="#000";
  ctx.fillRect(0,0,canvas.width,canvas.height);
  const fit=Math.min(canvas.width/img.naturalWidth,canvas.height/img.naturalHeight);
  const w=img.naturalWidth*fit,h=img.naturalHeight*fit;
  ctx.drawImage(img,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
  const mark=await makeWatermarkPNG(post,1080,1920);
  const overlay=new Image();const url=URL.createObjectURL(mark);
  try {await new Promise((resolve,reject)=>{overlay.onload=resolve;overlay.onerror=reject;overlay.src=url;});ctx.drawImage(overlay,0,0);}
  finally{URL.revokeObjectURL(url);}
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",.91));
  if(!blob)throw new Error("No se pudo preparar la foto.");
  return new File([blob],`RIVYZA-${post.id}.jpg`,{type:"image/jpeg"});
}
