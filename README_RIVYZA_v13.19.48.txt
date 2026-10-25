RIVYZA v13.19.48 — PRIMERA INTEGRACIÓN LIVE (BETA PRIVADA)

BASE:
  app/page.js y app/globals.css de la versión v13.19.47 que Alex entregó
  en app.rar. NO usa el page.js antiguo del ZIP de GitHub.

RESULTADO VERIFICADO:
  npm install y npm run build terminaron correctamente con Next.js 15.
  La prueba de compilación NO demuestra aún que cámaras remotas funcionen
  con usuarios reales o que Vercel esté configurado.

INCLUYE:
  - LIVE visible desde la pestaña superior y el botón LIVE de la cámara.
  - Sala de LiveKit con cámara/audio del anfitrión.
  - Espectadores con permiso de visualización, sin publicar cámara.
  - Solicitud de cámara y aprobación del anfitrión.
  - Hasta nueve invitados aprobados, diez cámaras incluyendo anfitrión.
  - Controles locales de micrófono y cámara.
  - Listado de salas activas, almacenamiento en Supabase.

PREPARACIÓN TÉCNICA:
  1. Copiar todos los archivos de este paquete a la raíz del repositorio:
     app/*, supabase/*, package.json, package-lock.json.
     No subir las carpetas de desarrollo node_modules o .next.
  2. Crear un proyecto LiveKit Cloud (https://cloud.livekit.io).
  3. En Supabase SQL Editor ejecutar supabase/RIVYZA_v13.19.48_LIVE.sql.
  4. Configurar en Vercel, solo como variables del servidor:
     LIVEKIT_URL=wss://TU-PROYECTO.livekit.cloud
     LIVEKIT_API_KEY=...
     LIVEKIT_API_SECRET=...
     SUPABASE_SERVICE_ROLE_KEY=...
     RIVYZA_LIVE_BETA_ENABLED=true
     Conservar NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.
  5. Vercel: desplegar la nueva versión.

MUY IMPORTANTE: ESTA ENTREGA ES SOLO PARA PRUEBAS PRIVADAS.
  - El servidor solo permite al dueño RIVYZA iniciar una sala de prueba,
    usando el RPC rivyza_is_owner que ya existe en el panel de administración.
  - Aún falta la verificación obligatoria en el servidor de las sanciones
    de 3 X, las suspensiones manuales LIVE y la expulsión inmediata.
  - Aún falta controlar participantes activos (los nueve aprobados pueden
    desconectarse y seguir ocupando su cupo) y limpiar salas abandonadas.
  - Aún faltan moderadores, comentarios, regalos, LIVE preview de 15 s,
    avisos a seguidores y conexión OBS.
  - No exponer esta beta a usuarios generales ni activar un lanzamiento
    público antes de terminar permisos, pruebas multiusuario y moderación.
  - Si no se habilita RIVYZA_LIVE_BETA_ENABLED, la API permanecerá apagada.

NOTA DE SEGURIDAD: LIVEKIT_API_SECRET y SUPABASE_SERVICE_ROLE_KEY nunca
deben llevar el prefijo NEXT_PUBLIC ni incluirse en page.js.
