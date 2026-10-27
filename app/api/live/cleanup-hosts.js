import { RoomServiceClient } from 'livekit-server-sdk';
function roomService() {
 const url=process.env.LIVEKIT_URL;
 return new RoomServiceClient(url.replace(/^wss:/,'https:').replace(/^ws:/,'http:'),process.env.LIVEKIT_API_KEY,process.env.LIVEKIT_API_SECRET);
}
// Called by room discovery and an optional external scheduler.
// Presence is checked on the LiveKit server; other guests do not keep a hostless room alive.
export async function cleanupAbsentHosts(db) {
  const { data: rooms, error } = await db.from('rivyza_live_rooms')
    .select('id,host_id,host_absent_since').eq('status', 'live').limit(100);
  if (error) throw error;
  const now = Date.now();
  for (const live of rooms || []) {
    try {
      const participants = await roomService().listParticipants(`rivyza-${live.id}`);
      const hostPresent = participants.some(p => p.identity === live.host_id);
      if (hostPresent) {
        if (live.host_absent_since) await db.from('rivyza_live_rooms')
          .update({ host_absent_since: null }).eq('id', live.id).eq('status', 'live');
      } else if (!live.host_absent_since) {
        await db.from('rivyza_live_rooms').update({ host_absent_since: new Date(now).toISOString() })
          .eq('id', live.id).eq('status', 'live').is('host_absent_since', null);
      } else if (now - new Date(live.host_absent_since).getTime() >= 180000) {
        const { data: ended, error: endError } = await db.from('rivyza_live_rooms')
          .update({ status: 'ended', ended_at: new Date(now).toISOString() })
          .eq('id', live.id).eq('status', 'live').eq('host_absent_since', live.host_absent_since).select('id');
        if (endError) throw endError;
        if (ended?.length) await roomService().deleteRoom(`rivyza-${live.id}`).catch(() => {});
      }
    } catch (e) { console.error('Host presence check failed', live.id, e); }
  }
}

