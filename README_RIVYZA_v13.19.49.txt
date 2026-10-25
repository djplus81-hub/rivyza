RIVYZA v13.19.49 LIVE CUADRICULA BETA

Partiendo del ZIP v13.19.48 proporcionado.

Cambios:
- Dos cámaras grandes cuadradas arriba.
- Ocho cámaras cuadradas abajo, dos filas de cuatro.
- Encuadre del video centrado con object-fit cover.
- El anfitrión puede tocar dos posiciones para intercambiarlas en su propia pantalla.

LIMITACIONES IMPORTANTES:
- Los intercambios de posición NO se sincronizan todavía entre espectadores ni se guardan en Supabase.
- Permisos y acciones de moderadores aún NO están implementados; no se ha concedido a moderadores control de cámaras.
- El encuadre CSS mejora el recorte, pero si el sensor o captura tiene orientación incorrecta se necesita diagnóstico en dispositivo.
- No se han cambiado SQL ni API de LiveKit ni los controles existentes de cámara/micrófono.

Prueba primero en Vercel y confirma encuadre y posiciones antes de añadir moderadores y sincronización segura.
