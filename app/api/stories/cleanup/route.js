import {createClient} from '@supabase/supabase-js';
export const runtime='nodejs';
export async function GET(request){
 const secret=process.env.CRON_SECRET;
 if(!secret || request.headers.get('authorization')!==`Bearer ${secret}`)return Response.json({error:'Unauthorized'},{status:401});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return Response.json({error:'Missing server configuration'},{status:500});
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await db.from('rivyza_stories').select('id,media_path').lt('expires_at',new Date().toISOString()).limit(100);
 if(error)return Response.json({error:error.message},{status:500});
 let removed=0;const failures=[];
 for(const story of data||[]){
  const {error:storageError}=await db.storage.from('rivyza-stories').remove([story.media_path]);
  if(storageError){failures.push(story.id);continue}
  const {error:deleteError}=await db.from('rivyza_stories').delete().eq('id',story.id);
  if(deleteError)failures.push(story.id);else removed++;
 }
 return Response.json({removed,failures},{status:failures.length?500:200});
}
