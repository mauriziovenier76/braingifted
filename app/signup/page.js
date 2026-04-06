"use client";
import { useState } from "react";
import { createClient } from "../../lib/supabase";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  const handleSignup = async () => {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  return (
    <>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=clash-display@600,700&f[]=satoshi@300,400,500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --lime: #c8f135;
          --bg: #0a0a0a;
          --surface: #111111;
          --border: #222222;
          --text: #f0f0f0;
          --muted: #666666;
          --font-display: 'Clash Display', sans-serif;
          --font-body: 'Satoshi', sans-serif;
        }
        body { background: var(--bg); color: var(--text); font-family: var(--font-body); }
        .page {
          min-height: 100vh;
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
        }
        .card {
          width: 100%; max-width: 420px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 48px 40px;
        }
        .logo {
          font-family: var(--font-display);
          font-size: 1.4rem; font-weight: 700;
          text-decoration: none; color: var(--text);
          display: block; margin-bottom: 32px;
        }
        .logo span { color: var(--lime); }
        h1 {
          font-family: var(--font-display);
          font-size: 1.8rem; font-weight: 700;
          letter-spacing: -1px; margin-bottom: 8px;
        }
        .subtitle { color: var(--muted); font-size: 0.9rem; margin-bottom: 32px; }
        .field { margin-bottom: 16px; }
        label { display: block; font-size: 0.8rem; color: var(--muted); margin-bottom: 8px; }
        input {
          width: 100%; padding: 14px 16px;
          background: #0a0a0a;
          border: 1px solid var(--border);
          border-radius: 12px;
          color: var(--text);
          font-family: var(--font-body);
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.2s;
        }
        input:focus { border-color: var(--lime); }
        .error {
          background: rgba(255,80,80,0.08);
          border: 1px solid rgba(255,80,80,0.2);
          border-radius: 10px;
          padding: 12px 16px;
          font-size: 0.85rem; color: #ff5050;
          margin-bottom: 16px;
        }
        .success {
          background: rgba(200,241,53,0.06);
          border: 1px solid rgba(200,241,53,0.2);
          border-radius: 16px;
          padding: 32px;
          text-align: center;
        }
        .success h2 {
          font-family: var(--font-display);
          font-size: 1.4rem; margin-bottom: 8px;
        }
        .success p { color: var(--muted); font-size: 0.9rem; }
        .btn {
          width: 100%; padding: 15px;
          background: var(--lime); color: #000;
          border: none; border-radius: 100px;
          font-family: var(--font-body);
          font-size: 1rem; font-weight: 500;
          cursor: pointer; margin-top: 8px;
          transition: all 0.2s;
        }
        .btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .footer-link {
          text-align: center; margin-top: 24px;
          font-size: 0.875rem; color: var(--muted);
        }
        .footer-link a { color: var(--lime); text-decoration: none; }
        .terms { font-size: 0.78rem; color: var(--muted); text-align: center; margin-top: 16px; line-height: 1.5; }
      `}</style>
      <div className="page">
        <div className="card">
          <a href="/" className="logo">Brain<span>Gifted</span></a>
          {success ? (
            <div className="success">
              <div style={{fontSize: "2rem", marginBottom: 16}}>📬</div>
              <h2>Controlla la tua email!</h2>
              <p>Ti abbiamo inviato un link di conferma. Clicca sul link per attivare il tuo account.</p>
            </div>
          ) : (
            <>
              <h1>Inizia gratis</h1>
              <p className="subtitle">Crea il tuo account e studia in modo più intelligente.</p>
              {error && <div className="error">{error}</div>}
              <div className="field">
                <label>Email</label>
                <input type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="field">
                <label>Password</label>
                <input type="password" placeholder="Minimo 6 caratteri" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <button className="btn" onClick={handleSignup} disabled={loading}>
                {loading ? "Registrazione..." : "Crea account gratis →"}
              </button>
              <div className="footer-link">
                Hai già un account? <a href="/login">Accedi</a>
              </div>
              <p className="terms">Registrandoti accetti i nostri Termini di servizio e la Privacy Policy.</p>
            </>
          )}
        </div>
      </div>
    </>
  );
}