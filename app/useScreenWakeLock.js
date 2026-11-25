"use client";
import { useEffect } from 'react';

// Shared screen lock: multiple mounted media views use a single sentinel.
let users = 0, lock = null, pending = false, generation = 0;
function release() {
  generation++;
  const old = lock; lock = null;
  if (old && !old.released) old.release().catch(() => {});
}
async function acquire() {
  if (!users || document.visibilityState !== 'visible' || !navigator.wakeLock?.request || pending || (lock && !lock.released)) return;
  pending = true;
  const version = generation;
  try {
    const next = await navigator.wakeLock.request('screen');
    if (!users || version !== generation || document.visibilityState !== 'visible') {
      await next.release().catch(() => {});
    } else {
      lock = next;
      next.addEventListener('release', () => { if (lock === next) lock = null; }, { once: true });
    }
  } catch { /* Unsupported or denied by the OS: keep media working normally. */ }
  finally { pending = false; if (version !== generation && users && document.visibilityState === 'visible') void acquire(); }
}
function visibility() { if (document.visibilityState === 'visible') void acquire(); else release(); }
function hide() { release(); }
export default function useScreenWakeLock(enabled = true) {
  useEffect(() => {
    if (!enabled || !navigator.wakeLock?.request) return;
    users++;
    if (users === 1) {
      document.addEventListener('visibilitychange', visibility);
      window.addEventListener('pageshow', visibility);
      window.addEventListener('pagehide', hide);
      document.addEventListener('pointerdown', acquire);
    }
    void acquire();
    const timer = setInterval(acquire, 15000);
    return () => {
      clearInterval(timer);
      if (--users === 0) {
        document.removeEventListener('visibilitychange', visibility);
        window.removeEventListener('pageshow', visibility);
        window.removeEventListener('pagehide', hide);
        document.removeEventListener('pointerdown', acquire);
        release();
      }
    };
  }, [enabled]);
}
