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

const FONT_FAMILY = "Helvetica, Arial, sans-serif";

function toPlainText(html) {
  const d = document.createElement("div");
  d.innerHTML = html || "";
  return d.textContent || "";
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Costruisce un SVG "pulito" (senza foreignObject) dall'albero di Markmap
function buildExportSvg(rootNode) {
  const ctx = document.createElement("canvas").getContext("2d");
  const ROW = 36, PAD = 32, GAP = 60, MAXCH = 48;
  const LIME = "#c8f135";

  let root = rootNode;
  while (!toPlainText(root.content).trim() && root.children?.length === 1) {
    root = root.children[0];
  }

  let leaf = 0;
  const maxW = [];

  const walk = (node, depth) => {
    let text = toPlainText(node.content).trim();
    if (text.length > MAXCH) text = text.slice(0, MAXCH - 1) + "…";
    ctx.font = depth === 0 ? `bold 17px ${FONT_FAMILY}` : `14px ${FONT_FAMILY}`;
    const w = ctx.measureText(text).width + 24;
    maxW[depth] = Math.max(maxW[depth] || 0, w);
    const children = (node.children || []).map((c) => walk(c, depth + 1));
    const y = children.length
      ? (children[0].y + children[children.length - 1].y) / 2
      : leaf++ * ROW;
    return { text, w, depth, y, children };
  };

  const tree = walk(root, 0);

  const xs = [PAD];
  for (let d = 1; d < maxW.length; d++) xs[d] = xs[d - 1] + maxW[d - 1] + GAP;
  const width = Math.ceil(xs[xs.length - 1] + maxW[maxW.length - 1] + PAD);
  const height = Math.max(leaf, 1) * ROW + PAD * 2;

  const links = [];
  const texts = [];

  const draw = (n) => {
    const x = xs[n.depth];
    const cy = n.y + PAD + ROW / 2;
    texts.push(
      n.depth === 0
        ? `<text x="${x + 12}" y="${cy + 6}" font-family="${FONT_FAMILY}" font-size="17" font-weight="bold" fill="${LIME}">${esc(n.text)}</text>`
        : `<text x="${x + 12}" y="${cy + 5}" font-family="${FONT_FAMILY}" font-size="14" fill="#f0f0f0">${esc(n.text)}</text>`
    );
    n.children.forEach((c) => {
      const x1 = x + n.w;
      const x2 = xs[c.depth];
      const cy2 = c.y + PAD + ROW / 2;
      const mid = (x1 + x2) / 2;
      links.push(
        `<path d="M${x1} ${cy} C${mid} ${cy}, ${mid} ${cy2}, ${x2} ${cy2}" fill="none" stroke="${LIME}" stroke-width="2" stroke-opacity="0.7"/>`
      );
      draw(c);
    });
  };
  draw(tree);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#111111"/>${links.join("")}${texts.join("")}</svg>`;
  return { svg, width, height };
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function TestMappa() {
  const svgRef = useRef(null);
  const rootRef = useRef(null);
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
        rootRef.current = root;
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
      const { svg, width, height } = buildExportSvg(rootRef.current);
      const img = new Image();
      img.onload = () => {
        const scale = 2;
        const canvas = document.createElement("canvas");
        canvas.width = width * scale;
        canvas.height = height * scale;
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob) { setStatus("Export PNG fallito ❌"); return; }
          download(blob, "mappa-test.png");
          setStatus("Export PNG riuscito ✅");
        }, "image/png");
      };
      img.onerror = () => setStatus("Export PNG fallito ❌ (immagine non caricata)");
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    } catch (e) {
      setStatus("Export PNG fallito: " + e.message);
    }
  };

  const exportSvg = () => {
    try {
      const { svg } = buildExportSvg(rootRef.current);
      download(new Blob([svg], { type: "image/svg+xml" }), "mappa-test.svg");
      setStatus("Export SVG riuscito ✅");
    } catch (e) {
      setStatus("Export SVG fallito: " + e.message);
    }
  };

  const btn = { background: "#c8f135", border: "none", padding: "10px 24px", borderRadius: 100, cursor: "pointer", marginRight: 8 };

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", padding: 24, color: "#f0f0f0", fontFamily: "sans-serif" }}>
      <h1 style={{ marginBottom: 8 }}>Test mappa mentale</h1>
      <p style={{ color: "#888", marginBottom: 16 }}>{status}</p>
      <div style={{ marginBottom: 16 }}>
        <button onClick={exportPng} style={btn}>⬇️ Esporta PNG</button>
        <button onClick={exportSvg} style={btn}>⬇️ Esporta SVG</button>
      </div>
      <div style={{ background: "#111111", border: "1px solid #222", borderRadius: 16, overflow: "hidden" }}>
        <svg ref={svgRef} style={{ width: "100%", height: 500, color: "#f0f0f0" }} />
      </div>
    </div>
  );
}