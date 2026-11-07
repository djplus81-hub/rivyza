import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const required=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','WORKER_SECRET'];
for(const k of required) if(!process.env[k]) throw new Error(`Missing ${k}`);
const supabase=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const app=express();app.use(express.json({limit:'12kb'}));
const bucket=process.env.MEDIA_BUCKET||'media';
const maxBytes=100*1024*1024;
const safePath=s=>typeof s==='string'&&s.length<400&&!s.startsWith('/')&&!s.includes('..')&&/^[a-zA-Z0-9_./-]+$/.test(s);
const clamp=(v,min,max)=>Math.min(max,Math.max(min,Number.isFinite(Number(v))?Number(v):min));
function run(bin,args){return new Promise((resolve,reject)=>{let stderr='';const p=spawn(bin,args,{stdio:['ignore','ignore','pipe']});p.stderr.on('data',d=>{stderr+=d.toString();if(stderr.length>12000)stderr=stderr.slice(-12000);});p.on('error',reject);p.on('close',code=>code===0?resolve(stderr):reject(new Error(`${bin} failed (${code}): ${stderr.slice(-900)}`)));});}
async function download(storageBucket,objectPath,destination){const {data,error}=await supabase.storage.from(storageBucket).download(objectPath);if(error)throw error;if(data.size>maxBytes)throw new Error('File exceeds 100 MB');await writeFile(destination,Buffer.from(await data.arrayBuffer()));}
async function probe(file){let out='';await new Promise((resolve,reject)=>{const p=spawn('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',file]);p.stdout.on('data',d=>out+=d);p.on('error',reject);p.on('close',code=>code===0?resolve():reject(new Error('Cannot inspect video')));});return Number(out.trim());}
app.get('/health',(_,res)=>res.json({ok:true}));
app.post('/render',async(req,res)=>{
  const token=req.get('x-worker-secret')||'';
  const expected=Buffer.from(process.env.WORKER_SECRET);
  const actual=Buffer.from(token);
  if(actual.length!==expected.length||!crypto.timingSafeEqual(actual,expected))return res.status(401).json({error:'Unauthorized'});
  const {videoPath,musicPath,outputPath,musicStartSeconds,originalVolume,musicVolume}=req.body||{};
  if(!safePath(videoPath)||!safePath(outputPath)||!safePath(musicPath))return res.status(400).json({error:'Invalid storage paths'});
  if(videoPath===outputPath)return res.status(400).json({error:'Output path must differ'});
  const renderStarted=Date.now();
  const dir=await mkdtemp(path.join(os.tmpdir(),'rivyza-'));
  try{
    const video=path.join(dir,'input.mp4'),music=path.join(dir,'music.mp3'),output=path.join(dir,'final.mp4');
    await Promise.all([download(bucket,videoPath,video),download(process.env.MUSIC_BUCKET||bucket,musicPath,music)]);
    const downloadMs=Date.now()-renderStarted;
    const duration=await probe(video);
    if(!Number.isFinite(duration)||duration<=0||duration>60.5)throw new Error('Video must be 60 seconds or less');
    const start=clamp(musicStartSeconds,0,86400),voice=clamp(originalVolume,0,100)/100,song=clamp(musicVolume,0,100)/100;
    // First video audio stream, if absent, replace it with silence in a fallback pass.
    const base=['-hide_banner','-loglevel','error','-y','-i',video,'-stream_loop','-1','-ss',String(start),'-i',music];
    const opts=['-map','0:v:0','-c:v','libx264','-preset','superfast','-crf','23','-vf','scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-t',String(duration),'-movflags','+faststart',output];
    try{
      await run('ffmpeg',[...base,'-filter_complex',`[0:a:0]volume=${voice}[voice];[1:a:0]volume=${song}[song];[voice][song]amix=inputs=2:duration=longest:dropout_transition=0:normalize=0,atrim=duration=${duration},asetpts=N/SR/TB[a]`,'-map','[a]',...opts]);
    }catch(err){
      // For videos without an audio track, preserve music rather than fail.
      if(!String(err.message).includes('matches no streams'))throw err;
      await run('ffmpeg',[...base,'-filter_complex',`[1:a:0]volume=${song}[a]`,'-map','[a]',...opts]);
    }
    const encodeMs=Date.now()-renderStarted-downloadMs;
    const bytes=await readFile(output);
    const {error}=await supabase.storage.from(bucket).upload(outputPath,bytes,{contentType:'video/mp4',upsert:false,cacheControl:'3600'});
    if(error)throw error;
    console.info('render timings ms',{download:downloadMs,encode:encodeMs,upload:Date.now()-renderStarted-downloadMs-encodeMs,total:Date.now()-renderStarted});
    return res.json({ok:true,outputPath,durationSeconds:Math.ceil(duration),bytes:bytes.length});
  }catch(err){console.error('render failed:',err);return res.status(422).json({error:String(err.message||err).slice(0,500)});}
  finally{await rm(dir,{recursive:true,force:true});}
});
app.listen(Number(process.env.PORT)||8080,'0.0.0.0');
