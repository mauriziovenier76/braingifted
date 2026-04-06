"use client";
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      } else {
        setUser(user);
      }
    };
    getUser();
  }, []);

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
          --border: #222222;
          --text: #f0f0f0;
          --muted: #666666;
          --font-display: 'Clash Display', sans-serif;
          --font-body: 'Satoshi', sans-serif;
        }
        body { background: var(--bg); color: var(--text); font-family: var(--font-body); }
        .page { min-height: 100vh; padding: 48px 24px; max-width: 800px; margin: 0 auto; }
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
        h1 { font-family: var(--font-display); font-size: 2.5rem; font-weight: 700; letter-spacing: -1px; margin-bottom: 8px; }
        .subtitle { color: var(--muted); margin-bottom: 48px; }
        .email { color: var(--lime); }
        .card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 20px; padding: 40px; text-align: center;
        }
        .card p { color: var(--muted); }
      `}</style>
      <div className="page">
        <div className="header">
          <div className="logo">Brain<span>Gifted</span></div>
          <button className="btn-logout" onClick={handleLogout}>Esci</button>
        </div>
        <h1>Ciao! 👋</h1>
        <p className="subtitle">Sei loggato come <span className="email">{user.email}</span></p>
        <div className="card">
          <p>🚧 Dashboard in costruzione — presto potrai caricare i tuoi documenti!</p>
        </div>
      </div>
    </>
  );
}