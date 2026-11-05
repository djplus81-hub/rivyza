import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const SONG = 'system/music/muevelo-sin-pensar.mp3';
const WORKER_DEFAULT = 'https://rivyza-video-processor-496345853381.us-east1.run.app';
const fail = (error, status = 400) => Response.json({ ok: false, error }, { status, headers: { 'Cache-Control': 'no-store' } });
const validPath = p => typeof p === 'string' && p.length < 400 && !p.includes('..') && !p.startsWith('/') && /^[a-zA-Z0-9_./-]+$/.test(p);
const volume = n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100;

export async function POST(req) {
  try {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const secret = process.env.WORKER_SECRET;
    const worker = process.env.VIDEO_PROCESSOR_URL || WORKER_DEFAULT;
    const missing = [!url && 'SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL', !anon && 'NEXT_PUBLIC_SUPABASE_ANON_KEY', !service && 'SUPABASE_SERVICE_ROLE_KEY', !secret && 'WORKER_SECRET'].filter(Boolean);
    if (missing.length) {
      console.error('[render-video] Missing environment variables:', missing.join(', '));
      return fail('Faltan variables de configuración en Vercel: ' + missing.join(', '), 503);
    }

    const bearer = req.headers.get('authorization') || '';
    if (!bearer.startsWith('Bearer ')) return fail('Debes iniciar sesión.', 401);
    const auth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user } = {}, error: authError } = await auth.auth.getUser(bearer.slice(7));
    if (authError || !user) return fail('Tu sesión no es válida.', 401);

    let body;
    try { body = await req.json(); } catch { return fail('Datos inválidos.'); }
    const { videoPath, musicStartSeconds, originalVolume, musicVolume } = body || {};
    if (!validPath(videoPath) || !videoPath.startsWith(user.id + '/') || !/\.(mp4|webm|mov)$/i.test(videoPath)) return fail('Ruta de video no válida.');
    if (!volume(originalVolume) || !volume(musicVolume) || typeof musicStartSeconds !== 'number' || !Number.isFinite(musicStartSeconds) || musicStartSeconds < 0 || musicStartSeconds > 86400) return fail('Volúmenes o tiempo inválidos.');

    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    let localMusic;
    try {
      localMusic = await readFile(path.join(process.cwd(), 'public', 'music', 'muevelo-sin-pensar.mp3'));
    } catch (e) {
      console.error('[render-video] Music file missing in deployment:', e?.code || e?.message);
      return fail('El archivo de música no está disponible en el despliegue de Vercel.', 503);
    }

    const { error: musicError } = await admin.storage.from('media').upload(SONG, localMusic, {
      contentType: 'audio/mpeg', cacheControl: '3600', upsert: true
    });
    if (musicError) {
      console.error('[render-video] Supabase music upload failed:', musicError.message);
      return fail('No se pudo preparar la música en Supabase: ' + musicError.message, 503);
    }

    const outputPath = `${user.id}/rendered-${randomUUID()}.mp4`;
    let workerResponse;
    try {
      workerResponse = await fetch(worker.replace(/\/$/, '') + '/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-worker-secret': secret },
        body: JSON.stringify({ videoPath, musicPath: SONG, outputPath, musicStartSeconds, originalVolume, musicVolume }),
        signal: AbortSignal.timeout(230000),
        cache: 'no-store'
      });
    } catch (e) {
      console.error('[render-video] Worker request failed:', e?.message);
      return fail('El procesador de video no respondió: ' + (e?.message || 'Error de conexión'), 502);
    }
    const result = await workerResponse.json().catch(() => ({}));
    if (!workerResponse.ok || !result.ok || result.outputPath !== outputPath) {
      console.error('[render-video] Worker returned failure:', workerResponse.status, result.error || 'Invalid response');
      return fail('Error del procesador: ' + (result.error || `HTTP ${workerResponse.status}`), 502);
    }
    return Response.json({ ok: true, outputPath }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[render-video] Unexpected error:', e?.message || e);
    return fail('Error interno al preparar el video. Revisa los registros de Vercel.', 500);
  }
}
