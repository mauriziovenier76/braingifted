"use client";
import { useEffect, useRef, useState } from "react";

/*
  Icona tonda del profilo in alto a destra.
  Cliccandola si apre un menu con: email, piano (Free/Pro), Storico, Esci.
  Il menu si chiude cliccando fuori o premendo Esc.
*/
export default function ProfileMenu({ email, plan, view, onToggleView, onUpgrade, onLogout }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  // Chiude il menu se clicco fuori o premo Esc
  useEffect(() => {
    if (!open) return;
    const onOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("touchstart", onOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("touchstart", onOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isPro = plan === "pro";
  const initial = (email || "?").charAt(0).toUpperCase();

  // Chiude il menu e poi esegue l'azione scelta
  const choose = (fn) => () => { setOpen(false); fn(); };

  const item = {
    display: "flex", alignItems: "center", gap: 10, width: "100%",
    background: "transparent", border: "none", borderRadius: 10,
    padding: "10px 12px", color: "var(--text)", fontFamily: "var(--font-body)",
    fontSize: "0.9rem", textAlign: "left", cursor: "pointer",
  };

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Il tuo profilo"
        aria-expanded={open}
        title={email}
        style={{
          width: 42, height: 42, borderRadius: "50%",
          background: isPro ? "var(--lime)" : "var(--surface2)",
          color: isPro ? "#000" : "var(--text)",
          border: isPro ? "none" : "1px solid var(--border)",
          fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.05rem",
          cursor: "pointer",
        }}
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute", right: 0, top: 52, width: 280, maxWidth: "calc(100vw - 48px)",
            background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16,
            padding: 12, boxShadow: "0 12px 40px rgba(0,0,0,0.6)", zIndex: 50,
          }}
        >
          {/* Dati del profilo */}
          <div style={{ padding: "6px 12px 12px" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: 4 }}>Accesso come</div>
            <div style={{ fontSize: "0.9rem", wordBreak: "break-all", marginBottom: 12 }}>{email}</div>

            {isPro ? (
              <span style={{ display: "inline-block", background: "rgba(200,241,53,0.1)", color: "var(--lime)", border: "1px solid rgba(200,241,53,0.3)", padding: "6px 14px", borderRadius: "100px", fontSize: "0.8rem", fontWeight: 500 }}>
                ⚡ Piano Pro
              </span>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Piano Free</span>
                <button
                  onClick={choose(onUpgrade)}
                  style={{ background: "var(--lime)", color: "#000", border: "none", padding: "6px 14px", borderRadius: "100px", fontFamily: "var(--font-body)", fontSize: "0.8rem", fontWeight: 500, cursor: "pointer" }}
                >
                  ⚡ Passa a Pro
                </button>
              </div>
            )}
          </div>

          <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0 6px" }} />

          <button role="menuitem" style={item} onClick={choose(onToggleView)}>
            {view === "upload" ? "📚 Storico documenti" : "⬆️ Carica un nuovo documento"}
          </button>
          <button role="menuitem" style={{ ...item, color: "#ff7a7a" }} onClick={choose(onLogout)}>
            🚪 Esci
          </button>
        </div>
      )}
    </div>
  );
}
