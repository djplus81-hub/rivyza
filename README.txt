RIVYZA Profile v2

Esta versión agrega el perfil real del usuario después del login con Google.

Incluye:
- @usuario único
- Nombre para mostrar
- Bio de hasta 160 caracteres
- Foto de Google como avatar inicial
- Guarda el perfil en public.profiles de Supabase
- Mantiene el login de Google y la interfaz móvil de RIVYZA

IMPORTANTE:
- La tabla public.profiles debe existir en Supabase.
- En Vercel deben seguir configuradas NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.
- Sube este proyecto como nuevo deployment del mismo proyecto RIVYZA.
