"use client";

// Exportación local: solo se ejecuta cuando el dueño descarga una foto con música.
// No cambia la reproducción ni las publicaciones existentes.
export async function exportPhotoWithMusic(post, onProgress = () => {}) {
  if (!post?.media_path || !post?.music_path) throw new Error("Falta la foto o la música de esta publicación.");
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const { fetchFile, toBlobURL } = await import("@ffmpeg/util");
  const ffmpeg = new FFmpeg();
  const base = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";
  try {
    onProgress("Cargando el editor de video…");
    await ffmpeg.load({
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm")
    });
    const imageUrl = new URL(post.media_path, window.location.origin);
    const audioUrl = new URL(post.music_path, window.location.origin);
    if (!["http:", "https:"].includes(imageUrl.protocol) || !["http:", "https:"].includes(audioUrl.protocol)) {
      throw new Error("La foto o la música tienen una dirección no válida.");
    }
    onProgress("Preparando la foto y la canción…");
    const [imageResponse, audioResponse] = await Promise.all([
      fetch(imageUrl.toString(), { mode: "cors", credentials: "omit" }),
      fetch(audioUrl.toString(), { mode: "cors", credentials: "omit" })
    ]);
    if (!imageResponse.ok || !audioResponse.ok) throw new Error("No se pudo leer la foto o la música.");
    const imageType = imageResponse.headers.get("content-type") || "";
    const imageExt = imageType.includes("png") ? "png" : imageType.includes("webp") ? "webp" : "jpg";
    const audioType = audioResponse.headers.get("content-type") || "";
    const audioExt = audioType.includes("wav") ? "wav" : audioType.includes("ogg") ? "ogg" : audioType.includes("mp4") ? "m4a" : "mp3";
    await ffmpeg.writeFile(`foto.${imageExt}`, await fetchFile(await imageResponse.blob()));
    await ffmpeg.writeFile(`musica.${audioExt}`, await fetchFile(await audioResponse.blob()));
    const start = Math.max(0, Number(post.music_start_seconds) || 0);
    const duration = Math.max(1, Math.min(60, Number(post.music_clip_seconds) || 15));
    const volume = Math.max(0, Math.min(1, Number(post.music_volume ?? 50) / 100));
    onProgress("Creando video con música… Puede tardar un poco.");
    // Escala reducida para evitar sobrecargar la memoria de Safari iOS.
    // La imagen se mantiene completa sobre un fondo negro (sin recortar).
    const result = await ffmpeg.exec([
      "-loop", "1", "-framerate", "12", "-i", `foto.${imageExt}`,
      "-ss", String(start), "-t", String(duration), "-i", `musica.${audioExt}`,
      "-vf", "scale=480:854:force_original_aspect_ratio=decrease,pad=480:854:(ow-iw)/2:(oh-ih)/2,setsar=1",
      "-r", "12", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "29", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "128k", "-af", `volume=${volume}`,
      "-t", String(duration), "-movflags", "+faststart", "salida.mp4"
    ]);
    if (result !== 0) throw new Error("No se pudo convertir la foto con música en video.");
    const bytes = await ffmpeg.readFile("salida.mp4");
    if (!bytes?.length) throw new Error("El video generado está vacío.");
    const output = new Uint8Array(bytes.length);
    output.set(bytes);
    return new File([output], `RIVYZA-${post.id}.mp4`, { type: "video/mp4" });
  } finally {
    try { ffmpeg.terminate(); } catch (_) {}
  }
}
