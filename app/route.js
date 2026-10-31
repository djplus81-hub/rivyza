import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) return NextResponse.json({error:'La eliminación de cuentas todavía no está configurada en el servidor.'},{status:503});
  const token = (request.headers.get('authorization') || '').match(/^Bearer (.+)$/i)?.[1];
  if (!token) return NextResponse.json({error:'Sesión no válida.'},{status:401});
  const publicClient = createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError} = await publicClient.auth.getUser(token);
  if (authError || !user) return NextResponse.json({error:'Inicia sesión nuevamente.'},{status:401});
  const admin = createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  // IMPORTANT: auth deletion succeeds only if all related database references are
  // configured with appropriate cascades or are cleaned by server-side policies.
  // Never expose the service-role key to the browser.
  const {error} = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error('Account deletion failed:',error.message);
    return NextResponse.json({error:'No se pudo completar la eliminación. Contacta con soporte de RIVYZA.'},{status:500});
  }
  return NextResponse.json({success:true});
}
