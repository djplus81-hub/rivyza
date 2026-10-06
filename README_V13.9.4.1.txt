RIVYZA v13.9.4.1 — FIX 'VER QUIÉN DIO LIKE'

Problema:
El panel de usuarios que dieron Like sí se abría, pero quedaba detrás del visor de la publicación.

Corrección:
El panel de Likes ahora aparece por encima del visor de foto/video.

No requiere SQL nuevo.
No modifica el sistema de Follow, cámara, publicaciones, borrar, pin ni navegación.

INSTALACIÓN:
1. Extract All / Extraer todo.
2. Sube SOLO:
   - app/page.js
   - app/globals.css
3. No ejecutes SQL en Supabase.
