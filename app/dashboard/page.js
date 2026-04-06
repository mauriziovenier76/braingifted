"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef();
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push("/login");
      else setUser(user);
    };
    getUser();
  }, []);

  const handleFile = async (file) => {
    if (!file || file.type !== "application/pdf") {
      setError("Per ora accettiamo solo file PDF.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Il file è troppo grande. Massimo 10MB.");
      return;
    }

    setUploading(true);
    setError("");
    setResult(null);

    try {
      // 1. Carica su Supabase Storage
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);
      if (uploadError) throw new Error("Errore durante l'upload.");

      // 2. Estrai testo dal PDF
      const text = await extractTextFromPDF(file);
      if (!text || text.length < 50) throw new Error("Non riesco a leggere il testo dal PDF.");

      // 3. Genera riassunto con AI
      const summary = await generateSummary(text);
      setResult({ fileName: file.name, summary });

    } catch (err) {
      setError(err.message || "Qualcosa è andato storto.");
    } finally {
      setUploading(false);
    }
  };

  const extractTextFromPDF = async (file) => {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  const maxPages = Math.min(pdf.numPages, 15);
  for (let i = 1; i <= maxPages; i++) {
    try {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .filter(item => item && typeof item.str === "string")
        .map(item => item.str)
        .join(" ");
      fullText += pageText + "\n";
    } catch (e) {
      console.warn(`Pagina ${i} saltata:`, e);
    }
  }
  return fullText;
};

  const generateSummary = async (text) => {
    const response = await fetch("/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.slice(0, 8000) }),
    });
    if (!response.ok) throw new Error("Errore nella generazione del riassunto.");
    const data = await response.json();
    return data.summary;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (!user) return null;

  return (
    <>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=clash-display@600,700&f[]=satoshi@300,400,500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --lime: #c8f135;
          --bg: #0a0a0a;
          --surface: #111111;
          --surface2: #1a1a1a;
          --border: #222222;
          --text: #f0f0f0;
          --muted: #666666;
          --font-display: 'Clash Display', sans-serif;
          --font-body: 'Satoshi', sans-serif;
        }
        body { background: var(--bg); color: var(--text); font-family: var(--font-body); }
        .page { min-height: 100vh; padding: 32px 24px; max-width: 860px; margin: 0 auto; }
        .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 48px; }
        .logo { font-family: var(--font-display); font-size: 1.4rem; font-weight: 700; }
        .logo span { color: var(--lime); }
        .btn-logout {
          background: transparent; border: 1px solid var(--border);
          color: var(--muted); padding: 8px 20px; border-radius: 100px;
          font-family: var(--font-body); font-size: 0.85rem; cursor: pointer;
          transition: all 0.2s;
        }
        .btn-logout:hover { border-color: #444; color: var(--text); }
        h1 { font-family: var(--font-display); font-size: 2rem; font-weight: 700; letter-spacing: -1px; margin-bottom: 6px; }
        .subtitle { color: var(--muted); margin-bottom: 40px; font-size: 0.95rem; }
        .email { color: var(--lime); }

        /* UPLOAD ZONE */
        .upload-zone {
          border: 2px dashed var(--border);
          border-radius: 20px;
          padding: 56px 32px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          background: var(--surface);
        }
        .upload-zone:hover, .upload-zone.drag-over {
          border-color: var(--lime);
          background: rgba(200,241,53,0.03);
        }
        .upload-icon { font-size: 2.5rem; margin-bottom: 16px; }
        .upload-title {
          font-family: var(--font-display);
          font-size: 1.3rem; font-weight: 700;
          margin-bottom: 8px;
        }
        .upload-subtitle { color: var(--muted); font-size: 0.9rem; margin-bottom: 24px; }
        .btn-upload {
          background: var(--lime); color: #000;
          border: none; padding: 12px 28px;
          border-radius: 100px;
          font-family: var(--font-body);
          font-size: 0.9rem; font-weight: 500;
          cursor: pointer; transition: all 0.2s;
        }
        .btn-upload:hover { opacity: 0.9; }
        .upload-note { font-size: 0.78rem; color: var(--muted); margin-top: 16px; }

        /* LOADING */
        .loading {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 20px; padding: 48px;
          text-align: center;
        }
        .spinner {
          width: 40px; height: 40px;
          border: 3px solid var(--border);
          border-top-color: var(--lime);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 20px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading p { color: var(--muted); font-size: 0.95rem; }

        /* ERROR */
        .error-box {
          background: rgba(255,80,80,0.08);
          border: 1px solid rgba(255,80,80,0.2);
          border-radius: 12px; padding: 16px 20px;
          color: #ff5050; font-size: 0.9rem;
          margin-bottom: 24px;
        }

        /* RESULT */
        .result { margin-top: 32px; }
        .result-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 20px;
        }
        .result-title {
          font-family: var(--font-display);
          font-size: 1.2rem; font-weight: 700;
        }
        .result-file { font-size: 0.8rem; color: var(--muted); margin-top: 2px; }
        .btn-new {
          background: transparent; border: 1px solid var(--border);
          color: var(--muted); padding: 8px 18px;
          border-radius: 100px; font-family: var(--font-body);
          font-size: 0.8rem; cursor: pointer; transition: all 0.2s;
        }
        .btn-new:hover { border-color: #444; color: var(--text); }
        .summary-box {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 16px; padding: 28px;
        }
        .summary-label {
          font-size: 0.7rem; letter-spacing: 2px;
          text-transform: uppercase; color: var(--lime);
          margin-bottom: 16px;
        }
        .summary-text {
          font-size: 0.95rem; line-height: 1.8;
          color: var(--text); white-space: pre-wrap;
        }
      `}</style>

      <div className="page">
        <div className="header">
          <div className="logo">Brain<span>Gifted</span></div>
          <button className="btn-logout" onClick={handleLogout}>Esci</button>
        </div>

        <h1>Ciao! 👋</h1>
        <p className="subtitle">Loggato come <span className="email">{user.email}</span></p>

        {error && <div className="error-box">⚠️ {error}</div>}

        {!uploading && !result && (
          <div
            className={`upload-zone ${dragOver ? "drag-over" : ""}`}
            onClick={() => fileInputRef.current.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          >
            <div className="upload-icon">📄</div>
            <div className="upload-title">Carica il tuo documento</div>
            <div className="upload-subtitle">Trascina qui il file oppure clicca per sceglierlo</div>
            <button className="btn-upload">Scegli PDF</button>
            <div className="upload-note">PDF · Max 10MB · Fino a 15 pagine (piano Free)</div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              style={{ display: "none" }}
              onChange={(e) => handleFile(e.target.files[0])}
            />
          </div>
        )}

        {uploading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Sto analizzando il documento e generando il riassunto...</p>
          </div>
        )}

        {result && (
          <div className="result">
            <div className="result-header">
              <div>
                <div className="result-title">Riassunto generato ✨</div>
                <div className="result-file">📄 {result.fileName}</div>
              </div>
              <button className="btn-new" onClick={() => setResult(null)}>+ Nuovo documento</button>
            </div>
            <div className="summary-box">
              <div className="summary-label">⚡ Riassunto AI</div>
              <div className="summary-text">{result.summary}</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}