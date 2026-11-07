"use client";
import { useEffect, useRef, useState } from "react";

// Prueba aislada: no altera la cámara ni la grabación de RIVYZA.
export default function DeepARTest() {
  const previewRef = useRef(null);
  const instanceRef = useRef(null);
  const [status, setStatus] = useState("Esperando inicio");
  const [running, setRunning] = useState(false);

  async function start() {
    if (instanceRef.current || !previewRef.current) return;
    const licenseKey = process.env.NEXT_PUBLIC_DEEPAR_LICENSE_KEY;
    if (!licenseKey) { setStatus("Falta configurar NEXT_PUBLIC_DEEPAR_LICENSE_KEY en Vercel."); return; }
    setStatus("Iniciando DeepAR...");
    try {
      const deepar = await import("deepar");
      const instance = await deepar.initialize({
        licenseKey,
        previewElement: previewRef.current,
        additionalOptions: { cameraConfig: { facingMode: "user" } },
      });
      instanceRef.current = instance;
      setRunning(true);
      setStatus("DeepAR iniciado. Cámara de prueba lista.");
    } catch (error) {
      setStatus(`No se pudo iniciar DeepAR: ${error?.message || "error desconocido"}`);
    }
  }

  async function stop() {
    const instance = instanceRef.current;
    instanceRef.current = null;
    try { if (instance?.shutdown) await instance.shutdown(); } catch (_) {}
    setRunning(false);
    setStatus("Prueba detenida");
  }

  useEffect(() => () => {
    const instance = instanceRef.current;
    instanceRef.current = null;
    if (instance?.shutdown) Promise.resolve(instance.shutdown()).catch(() => {});
  }, []);

  return <section style={{background:"#111",color:"white",padding:12,borderRadius:12}}>
    <h3>Prueba DeepAR · RIVYZA</h3>
    <div ref={previewRef} style={{width:"100%",aspectRatio:"9 / 16",maxHeight:"70vh"}} />
    <p role="status">{status}</p>
    <button type="button" onClick={running ? stop : start}>{running ? "Detener prueba" : "Iniciar prueba"}</button>
  </section>;
}
