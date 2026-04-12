"use client";
import { useState } from "react";

export default function Contatti() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", messaggio: "" });

  const handleSubmit = async () => {
    if (!form.nome || !form.email || !form.messaggio) return;
    
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (response.ok) {
      setSent(true);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=clash-display@600,700&f[]=satoshi@300,400,500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --lime: #c8f135; --bg: #0a0a0a; --surface: #111111;
          --border: #222222; --text: #f0f0f0; --muted: #666666;
          --font-display: 'Clash Display', sans-serif;
          --font-body: 'Satoshi', sans-serif;
        }
        body { background: var(--bg); color: var(--text); font-family: var(--font-body); }
        .page { max-width: 600px; margin: 0 auto; padding: 80px 24px; }
        .logo { font-family: var(--font-display); font-size: 1.2rem; font-weight: 700; color: var(--text); text-decoration: none; margin-bottom: 48px; display: block; }
        .logo span { color: var(--lime); }
        .back { display: inline-flex; align-items: center; gap: 8px; color: var(--muted); text-decoration: none; font-size: 0.9rem; margin-bottom: 48px; transition: color 0.2s; }
        .back:hover { color: var(--text); }
        h1 { font-family: var(--font-display); font-size: 2.5rem; font-weight: 700; letter-spacing: -1px; margin-bottom: 8px; }
        .subtitle { color: var(--muted); margin-bottom: 40px; line-height: 1.6; }
        .field { margin-bottom: 20px; }
        label { display: block; font-size: 0.8rem; color: var(--muted); margin-bottom: 8px; }
        input, textarea {
          width: 100%; padding: 14px 16px;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 12px; color: var(--text);
          font-family: var(--font-body); font-size: 0.95rem;
          outline: none; transition: border-color 0.2s;
        }
        input:focus, textarea:focus { border-color: var(--lime); }
        textarea { min-height: 140px; resize: vertical; }
        .btn {
          width: 100%; padding: 15px;
          background: var(--lime); color: #000;
          border: none; border-radius: 100px;
          font-family: var(--font-body); font-size: 1rem; font-weight: 500;
          cursor: pointer; transition: all 0.2s; margin-top: 8px;
        }
        .btn:hover { opacity: 0.9; }
        .success { text-align: center; padding: 48px 0; }
        .success h2 { font-family: var(--font-display); font-size: 1.8rem; font-weight: 700; margin-bottom: 12px; }
        .success p { color: var(--muted); }
      `}</style>
      <div className="page">
        <a href="/" className="logo">Brain<span>Gifted</span></a>
        <a href="/" className="back">← Torna alla home</a>

        {sent ? (
          <div className="success">
            <div style={{fontSize:"3rem", marginBottom:24}}>📬</div>
            <h2>Messaggio inviato!</h2>
            <p>Ti risponderemo il prima possibile.</p>
          </div>
        ) : (
          <>
            <h1>Contattaci</h1>
            <p className="subtitle">Hai domande, suggerimenti o problemi? Scrivici e ti risponderemo entro 24 ore.</p>
            <div className="field">
              <label>Nome</label>
              <input type="text" placeholder="Il tuo nome" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" placeholder="tu@email.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            </div>
            <div className="field">
              <label>Messaggio</label>
              <textarea placeholder="Scrivi il tuo messaggio..." value={form.messaggio} onChange={e => setForm({...form, messaggio: e.target.value})} />
            </div>
            <button className="btn" onClick={handleSubmit}>Invia messaggio →</button>
          </>
        )}
      </div>
    </>
  );
}
