"use client";
import { useEffect, useRef, useState } from "react";

const MARKDOWN = `# Fotosintesi
## Fase luminosa
- Avviene nei tilacoidi
- Produce ATP e NADPH
- Libera ossigeno
## Fase oscura
- Ciclo di Calvin
- Avviene nello stroma
- Fissa la CO2
## Fattori
- Luce
- Acqua
- Anidride carbonica
## Importanza
- Produce ossigeno
- Base della catena alimentare`;

export default function TestMappa() {
  const svgRef = useRef(null);
  const [status, setStatus] = useState("Caricamento...");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { Transformer } = await import("markmap-lib");
        const { Markmap } = await import("markmap-view");
        const transformer = new Transformer();
        const { root } = transformer.transform(MARKDOWN);
        if (cancelled || !svgRef.current) return;
        Markmap.create(svgRef.current, { color: () => "#c8f135", duration: 300 }, root);
        setStatus("Mappa caricata correttamente ✅");
      } catch (e) {
        setStatus("Errore: " + e.message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const exportPng = () => {
    try {
      const svg = svgRef.current;
      const { width, height } = svg.getBoundingClientRect();
      const clone = svg.cloneNode(true);
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clone.setAttribute("width", width);
      clone.setAttribute("height", height);
      clone.style.color = "#f0f0f0";
      const data = new XMLSerializer().serializeToString(clone);
      const url = URL.createObjectURL(new Blob([data], { type: "image/svg+xml;charset=utf-8" }));
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = width * 2;
        canvas.height = height * 2;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#111111";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        const a = document.createElement("a");
        a.download = "mappa-test.png";
        a.href = canvas.toDataURL("image/png");
        a.click();
        setStatus("Export PNG riuscito ✅");
      };
      img.onerror = () => setStatus("Export PNG fallito ❌");
      img.src = url;
    } catch (e) {
      setStatus("Export PNG fallito: " + e.message);
    }
  };

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", padding: 24, color: "#f0f0f0", fontFamily: "sans-serif" }}>
      <h1 style={{ marginBottom: 8 }}>Test mappa mentale</h1>
      <p style={{ color: "#888", marginBottom: 16 }}>{status}</p>
      <button onClick={exportPng} style={{ background: "#c8f135", border: "none", padding: "10px 24px", borderRadius: 100, cursor: "pointer", marginBottom: 16 }}>
        ⬇️ Esporta PNG
      </button>
      <div style={{ background: "#111111", border: "1px solid #222", borderRadius: 16, overflow: "hidden" }}>
        <svg ref={svgRef} style={{ width: "100%", height: 500, color: "#f0f0f0" }} />
      </div>
    </div>
  );
}