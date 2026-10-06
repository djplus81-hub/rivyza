RIVYZA v13.6 — actualización real de publicación

Partimos de la v13.6 FIXED confirmada: fotos y videos abren correctamente.

Incluye:
- Fecha/hora real de created_at visible debajo de los controles.
- Like + contador (requiere ejecutar el SQL una vez).
- Botón Comentarios + contador visual; bandeja preparada para conectar comentarios.
- Compartir dentro de RIVYZA preparado para el futuro sistema de Mensajes.
- Menú •••.
- Copiar enlace.
- Fijar publicación en posición 1 o 2; quitar pin.
- Eliminar publicación con confirmación, solo si eres el dueño.

IMPORTANTE:
Ejecuta una sola vez: supabase/V13.6_PUBLICATION_FEATURES.sql
La fecha/hora NO necesita SQL nuevo: usa posts.created_at, que ya existe.


FINAL STAMP UPDATE: Public posts now show a permanent server-backed publication stamp: Publicado · date · time. No relative time.
