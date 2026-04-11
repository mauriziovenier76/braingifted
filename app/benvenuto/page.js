"use client";
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function Benvenuto() {
  const [user, setUser] = useState(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push("/login");
      else setUser(user);
    };
    getUser();
  }, []);

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
          position: relative; overflow: hidden;
        }
        .page::before {
          content: '';
          position: absolute; top: -200px; left: 50%; transform: translateX(-50%);
          width: 600px; height: 600px;
          background: radial-gradient(ellipse at center, rgba(200,241,53,0.08) 0%, transparent 70%);
          pointer-events: none;
        }
        .card {
          width: 100%; max-width: 520px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 32px;
          padding: 56px 48px;
          text-align: center;
          position: relative;
        }
        .check-circle {
          width: 80px; height: 80px;
          background: rgba(200,241,53,0.1);
          border: 2px solid rgba(200,241,53,0.3);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 32px;
          font-size: 2rem;
          animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
        }
        @keyframes popIn {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .logo {
          font-family: var(--font-display);
          font-size: 1.2rem; font-weight: 700;
          text-decoration: none; color: var(--text);
          display: block; margin-bottom: 40px;
        }
        .logo span { color: var(--lime); }
        h1 {
          font-family: var(--font-display);
          font-size: 2.2rem; font-weight: 700;
          letter-spacing: -1px; margin-bottom: 12px;
          line-height: 1.1;
        }
        h1 em { font-style: normal; color: var(--lime); }
        .subtitle { color: var(--muted); font-size: 1rem; margin-bottom: 40px; line-height: 1.6; }
        .email-badge {
          display: inline-block;
          background: rgba(200,241,53,0.08);
          border: 1px solid rgba(200,241,53,0.2);
          border-radius: 100px;
          padding: 6px 16px;
          font-size: 0.85rem;
          color: var(--lime);
          margin-bottom: 40px;
        }
        .features {
          display: flex; flex-direction: column; gap: 12px;
          margin-bottom: 40px; text-align: left;
        }
        .feature {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 16px;
          background: rgba(200,241,53,0.04);
          border: 1px solid rgba(200,241,53,0.1);
          border-radius: 12px;
          font-size: 0.9rem; color: var(--muted);
        }
        .feature-icon { font-size: 1.1rem; }
        .btn {
          width: 100%; padding: 16px;
          background: var(--lime); color: #000;
          border: none; border-radius: 100px;
          font-family: var(--font-body);
          font-size: 1rem; font-weight: 500;
          cursor: pointer; transition: all 0.2s;
          text-decoration: none; display: block;
        }
        .btn:hover { opacity: 0.9; transform: translateY(-2px); }
      `}</style>

      <div className="page">
        <div className="card">
          <a href="/" className="logo">Brain<span>Gifted</span></a>

          <div className="check-circle">✅</div>

          <h1>Account <em>verificato</em>!</h1>
          <p className="subtitle">
            Benvenuto su BrainGifted! Il tuo account è stato attivato con successo. Sei pronto per studiare in modo più intelligente.
          </p>

          <div className="email-badge">
            📧 {user.email}
          </div>

          <div className="features">
            <div className="feature">
              <span className="feature-icon">📄</span>
              Carica i tuoi PDF e ottieni riassunti istantanei
            </div>
            <div className="feature">
              <span className="feature-icon">🃏</span>
              Genera flashcard automatiche dal tuo materiale
            </div>
            <div className="feature">
              <span className="feature-icon">🧠</span>
              Metti alla prova le tue conoscenze con i quiz
            </div>
            <div className="feature">
              <span className="feature-icon">🎤</span>
              Struttura il tuo discorso per le presentazioni
            </div>
          </div>

          <a href="/dashboard" className="btn">
            Vai alla dashboard →
          </a>
        </div>
      </div>
    </>
  );
}