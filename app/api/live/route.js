import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cleanupAbsentHosts } from '../cleanup-hosts';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(req) {
  const secret = process.env.RIVYZA_LIVE_CLEANUP_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`)
    return NextResponse.json({error:'No autorizado'},{status:401});
  try {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
    await cleanupAbsentHosts(db);
    return NextResponse.json({ok:true});
  } catch(e) {return NextResponse.json({error:e.message},{status:500});}
}
