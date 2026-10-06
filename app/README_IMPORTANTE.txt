RIVYZA v13.6 — CORRECCIÓN VERIFICADA

Reemplaza:
app/page.js
app/globals.css

Verificado:
- TOKEN_REFRESHED/USER_UPDATED no devuelven la interfaz a Inicio.
- Publicar termina en publicProfile.
- El INSERT devuelve el post real de Supabase con created_at.
- El nuevo post aparece inmediatamente en el perfil.
- Al abrirlo, el stamp se muestra debajo de la descripción usando selectedPost.created_at.
- No hay fecha/hora fija.
- No se modificó el botón + ni la cámara.
