RIVYZA v13.19.51f — Moderadores y menu de camaras (BETA)

1. EJECUTAR supabase/RIVYZA_v13.19.51f_MODERADORES.sql en Supabase SQL Editor.
2. Subir los archivos de este ZIP a la raiz del repositorio GitHub (no el ZIP como archivo suelto).
3. Verificar variables LiveKit y Supabase en Vercel.
4. Probar con dos telefonos y dos usuarios.

Incluye: asignar y quitar varios moderadores; menus al tocar invitado con X; silenciar, apagar camara, bajar, mover y expulsar con motivo; reporte pendiente en tabla separada; controles de solicitudes para moderadores; nombre de participante desde token y corona en anfitrion; anfitrion primero en la cuadricula.

LIMITACIONES: BETA SIN PRUEBA REAL MULTIUSUARIO. La asignacion de moderadores se actualiza en token con sondeo; el anfitrion no puede ser moderado. El reporte se guarda en nueva tabla pero aun NO esta integrado al panel global de casos, avisos y apelaciones. La expulsion desconecta la sesion actual pero aun falta bloquear reingreso al mismo LIVE. La cuadricula no garantiza sincronizacion de posiciones para nuevos espectadores que entran tarde. La cuenta de espectadores en vivo no esta implementada.
