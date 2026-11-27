"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "../../lib/supabase";

const WORDS_API = "/api/christian-words";
const TESTS_API = "/api/christian-tests";
const HEADER_WORDS = ["italiano", "inglese", "italian", "english", "ita", "eng", "parola", "traduzione"];
const MAX_ROWS_SHOWN = 200;

// Normalizza una risposta: niente maiuscole, niente spazi in più
const normalize = (s) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

// Chiave per confrontare le risposte: ignora maiuscole, spazi, trattini e punteggiatura
// (così "STEP-BROTHER", "step brother" e "stepbrother" valgono uguale)
const answerKey = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[\s\-–—_'’`.,;:!?"()\/]/g, "");

// Più traduzioni giuste separate da ";" (es. "step-brother; half-brother")
const alternatives = (en) => String(en ?? "").split(";").map((x) => x.trim()).filter(Boolean);

// Mescola un array (algoritmo di Fisher-Yates)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Legge il file Excel e restituisce le coppie { it, en } senza doppioni
function parseWorkbook(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });

  const seen = new Set();
  const words = [];
  let duplicates = 0;

  rows.forEach((row, index) => {
    const it = String(row[0] ?? "").trim();
    const en = String(row[1] ?? "").trim();
    if (!it || !en) return;

    // Salta la riga di intestazione (es. "Italiano | Inglese")
    if (index === 0 && HEADER_WORDS.includes(normalize(it)) && HEADER_WORDS.includes(normalize(en))) return;

    // Doppioni: se la parola italiana c'è già, tengo solo la prima
    const key = normalize(it);
    if (seen.has(key)) { duplicates++; return; }
    seen.add(key);
    words.push({ it, en });
  });

  return { words, duplicates };
}

const formatDate = (iso) =>
  new Date(iso).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const pct = (correct, total) => (total ? Math.round((correct / total) * 100) : 0);

export default function WordTest() {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [loadInfo, setLoadInfo] = useState("");
  const [error, setError] = useState("");
  const [count, setCount] = useState(10);

  // Schermata: setup | edit | test | result
  const [phase, setPhase] = useState("setup");

  // Test
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(null); // null | { ok, correct }
  const [results, setResults] = useState([]);

  // Storico
  const [history, setHistory] = useState([]);

  // Accesso amministratore direttamente in pagina
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Modifica vocaboli
  const [draft, setDraft] = useState([]); // [{ key, it, en }]
  const [search, setSearch] = useState("");
  const [dirty, setDirty] = useState(false);
  const keyCounter = useRef(0);

  const fileInputRef = useRef(null);
  const answerRef = useRef(null);
  const nextRef = useRef(null);
  const supabase = createClient();

  // Se sei loggato, manda il token: così il server capisce se sei l'amministratore
  const authHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session ? { Authorization: `Bearer ${session.access_token}` } : {};
  };

  const loadHistory = async () => {
    try {
      const res = await fetch(TESTS_API);
      const data = await res.json();
      if (res.ok) setHistory(data.tests || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Scarica la lista di parole (e scopre se sei l'amministratore)
  const loadWords = async () => {
    try {
      const res = await fetch(WORDS_API, { headers: await authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const list = data.words || [];
      setWords(list);
      setCount(Math.min(10, list.length) || 10);
      setCanEdit(!!data.canEdit);
      return !!data.canEdit;
    } catch (err) {
      console.error(err);
      setError("Non riesco a caricare la lista di parole. Riprova tra poco.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // All'apertura scarica la lista di parole e lo storico
  useEffect(() => {
    loadWords();
    loadHistory();
  }, []);

  /* ---------- Accesso amministratore ---------- */
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError(""); setLoggingIn(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) { setLoginError("Email o password non corretti."); return; }
      const admin = await loadWords();
      if (!admin) {
        setLoginError("Accesso riuscito, ma questo account non è amministratore.");
        return;
      }
      setPassword(""); setShowLogin(false);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCanEdit(false); setLoadInfo(""); setPhase("setup");
  };

  // Mette il cursore nel campo giusto a ogni domanda
  useEffect(() => {
    if (phase !== "test") return;
    if (feedback) nextRef.current?.focus();
    else answerRef.current?.focus();
  }, [phase, current, feedback]);

  /* ---------- Salvataggio della lista sul server ---------- */
  const saveWords = async (list) => {
    const res = await fetch(WORDS_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ words: list }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Salvataggio non riuscito.");
    setWords(data.words);
    setCount((c) => Math.min(Number(c) || 10, data.words.length) || 1);
    return data.words;
  };

  /* ---------- Caricamento Excel ---------- */
  const handleFile = async (file) => {
    if (!file) return;
    setError(""); setLoadInfo("");
    let parsed;
    try {
      parsed = parseWorkbook(await file.arrayBuffer());
    } catch (err) {
      console.error(err);
      setError("Non riesco a leggere il file. Usa un file Excel (.xlsx o .xls) oppure .csv.");
      return;
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }

    const { words: list, duplicates } = parsed;
    if (!list.length) {
      setError("Non ho trovato parole nel file. Servono 2 colonne: italiano (A) e inglese (B).");
      return;
    }

    setSaving(true);
    try {
      const saved = await saveWords(list);
      setCount(Math.min(10, saved.length));
      setLoadInfo(`✅ Salvate ${saved.length} parole${duplicates ? ` (${duplicates} doppioni ignorati)` : ""}. Christian le vede già.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Modifica vocaboli ---------- */
  const openEditor = () => {
    setDraft(words.map((w) => ({ key: ++keyCounter.current, it: w.it, en: w.en })));
    setSearch(""); setDirty(false); setError(""); setLoadInfo("");
    setPhase("edit");
  };

  const closeEditor = () => {
    if (dirty && !window.confirm("Hai modifiche non salvate. Vuoi uscire senza salvarle?")) return;
    setPhase("setup");
  };

  const updateRow = (key, field, value) => {
    setDraft((d) => d.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
    setDirty(true);
  };

  const deleteRow = (key) => {
    setDraft((d) => d.filter((r) => r.key !== key));
    setDirty(true);
  };

  const addRow = () => {
    setSearch("");
    setDraft((d) => [{ key: ++keyCounter.current, it: "", en: "" }, ...d]);
    setDirty(true);
  };

  const saveDraft = async () => {
    setError(""); setLoadInfo("");
    const cleaned = draft
      .map((r) => ({ it: r.it.trim(), en: r.en.trim() }))
      .filter((r) => r.it && r.en);
    const incomplete = draft.length - cleaned.length;

    if (!cleaned.length) {
      setError("La lista non può essere vuota.");
      return;
    }

    setSaving(true);
    try {
      const saved = await saveWords(cleaned);
      const duplicates = cleaned.length - saved.length;
      setDraft(saved.map((w) => ({ key: ++keyCounter.current, it: w.it, en: w.en })));
      setDirty(false);
      const notes = [];
      if (duplicates) notes.push(`${duplicates} doppioni rimossi`);
      if (incomplete) notes.push(`${incomplete} righe incomplete scartate`);
      setLoadInfo(`✅ Salvate ${saved.length} parole${notes.length ? ` (${notes.join(", ")})` : ""}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredDraft = useMemo(() => {
    const q = normalize(search);
    if (!q) return draft;
    return draft.filter((r) => normalize(r.it).includes(q) || normalize(r.en).includes(q));
  }, [draft, search]);

  /* ---------- Test ---------- */
  const startTest = () => {
    const n = Math.max(1, Math.min(Number(count) || 1, words.length));
    setQuestions(shuffle(words).slice(0, n));
    setCurrent(0); setAnswer(""); setFeedback(null); setResults([]);
    setError(""); setLoadInfo("");
    setPhase("test");
  };

  const stopTest = () => {
    if (!window.confirm("Vuoi interrompere il test? Non verrà salvato nello storico.")) return;
    setPhase("setup");
  };

  const checkAnswer = (e) => {
    e.preventDefault();
    if (feedback || !answer.trim()) return;
    const q = questions[current];
    const given = answerKey(answer);
    const options = alternatives(q.en);
    const ok = given !== "" && options.some((opt) => answerKey(opt) === given);
    setFeedback({ ok, correct: options.join(" / "), others: options.filter((opt) => answerKey(opt) !== given) });
    setResults((prev) => [...prev, { ...q, given: answer.trim(), ok }]);
  };

  const saveTest = async (total, correct) => {
    try {
      const res = await fetch(TESTS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ total, correct }),
      });
      const data = await res.json();
      if (res.ok && data.test) setHistory((h) => [data.test, ...h]);
    } catch (err) {
      console.error("Salvataggio test non riuscito:", err);
    }
  };

  const nextQuestion = () => {
    if (current + 1 >= questions.length) {
      saveTest(results.length, results.filter((r) => r.ok).length);
      setPhase("result");
      return;
    }
    setCurrent((c) => c + 1); setAnswer(""); setFeedback(null);
  };

  const correctCount = results.filter((r) => r.ok).length;
  const percent = pct(correctCount, results.length);

  return (
    <>
      <style>{`
        .wt { min-height: 100vh; background: #0a0a0a; color: #f0f0f0; font-family: 'Satoshi', system-ui, sans-serif; padding: 48px 16px; }
        .wt-inner { max-width: 680px; margin: 0 auto; }
        .wt h1 { font-size: 2.2rem; margin-bottom: 8px; letter-spacing: -1px; }
        .wt h1 span { color: #c8f135; }
        .wt-sub { color: #999; margin-bottom: 32px; line-height: 1.6; }
        .wt-card { background: #111; border: 1px solid #222; border-radius: 20px; padding: 28px; margin-bottom: 20px; }
        .wt-label { font-size: 0.72rem; letter-spacing: 2px; text-transform: uppercase; color: #c8f135; margin-bottom: 12px; }
        .wt-btn { background: #c8f135; color: #000; border: none; padding: 14px 28px; border-radius: 100px; font-size: 1rem; font-weight: 600; cursor: pointer; }
        .wt-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .wt-btn-ghost { background: transparent; color: #ccc; border: 1px solid #333; padding: 12px 24px; border-radius: 100px; font-size: 0.9rem; cursor: pointer; }
        .wt-btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }
        .wt-input { width: 100%; padding: 14px 16px; background: #0a0a0a; border: 1px solid #333; border-radius: 12px; color: #f0f0f0; font-size: 1.1rem; outline: none; }
        .wt-input:focus { border-color: #c8f135; }
        .wt-input-sm { padding: 10px 12px; font-size: 0.95rem; border-radius: 10px; }
        .wt-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        .wt-muted { color: #999; font-size: 0.9rem; }
        .wt-error { background: rgba(255,80,80,0.08); border: 1px solid rgba(255,80,80,0.3); color: #ff6b6b; border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; }
        .wt-info { background: rgba(200,241,53,0.06); border: 1px solid rgba(200,241,53,0.25); color: #c8f135; border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; }
        .wt-progress { height: 6px; background: #222; border-radius: 3px; overflow: hidden; margin-bottom: 24px; }
        .wt-progress div { height: 100%; background: #c8f135; transition: width 0.3s; }
        .wt-word { font-size: 2.4rem; font-weight: 700; text-align: center; margin: 8px 0 28px; letter-spacing: 1px; text-transform: uppercase; word-break: break-word; }
        .wt-ok { background: rgba(200,241,53,0.1); border: 1px solid rgba(200,241,53,0.4); color: #c8f135; border-radius: 12px; padding: 16px; text-align: center; font-size: 1.3rem; font-weight: 700; margin-top: 16px; }
        .wt-ko { background: rgba(255,80,80,0.08); border: 1px solid rgba(255,80,80,0.3); color: #ff6b6b; border-radius: 12px; padding: 16px; text-align: center; margin-top: 16px; }
        .wt-ko strong { color: #f0f0f0; font-size: 1.3rem; text-transform: uppercase; }
        .wt-score { font-size: 4.5rem; font-weight: 800; color: #c8f135; text-align: center; line-height: 1; }
        .wt-list { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
        .wt-item { display: flex; justify-content: space-between; gap: 12px; background: #1a1a1a; border-radius: 10px; padding: 10px 14px; font-size: 0.9rem; flex-wrap: wrap; align-items: center; }
        .wt-edit-row { display: grid; grid-template-columns: 1fr 1fr auto; gap: 8px; align-items: center; }
        .wt-del { background: transparent; border: 1px solid #333; color: #ff6b6b; width: 40px; height: 40px; border-radius: 10px; cursor: pointer; font-size: 1rem; }
        .wt-sticky { position: sticky; top: 0; background: #111; padding-bottom: 12px; z-index: 1; }
        .wt-link { background: none; border: none; color: #555; font-size: 0.8rem; cursor: pointer; text-decoration: underline; }
        .wt-link:hover { color: #999; }
        .wt-badge { font-weight: 700; padding: 2px 10px; border-radius: 100px; font-size: 0.85rem; }
        @media (max-width: 520px) { .wt-edit-row { grid-template-columns: 1fr auto; } .wt-edit-row input:nth-child(2) { grid-column: 1; } .wt-edit-row .wt-del { grid-row: 1 / span 2; grid-column: 2; } }
      `}</style>

      <div className="wt">
        <div className="wt-inner">
          <h1>Ciao <span>Christian</span> 👋</h1>
          <p className="wt-sub">Allenati con le parole di inglese: ti mostro la parola in italiano, tu scrivi la traduzione.</p>

          {error && <div className="wt-error">⚠️ {error}</div>}
          {loadInfo && (phase === "setup" || phase === "edit") && <div className="wt-info">{loadInfo}</div>}

          {/* ---------- PREPARAZIONE ---------- */}
          {phase === "setup" && loading && (
            <div className="wt-card"><p className="wt-muted">Caricamento delle parole...</p></div>
          )}

          {phase === "setup" && !loading && (
            <>
              {!canEdit && words.length === 0 && (
                <div className="wt-card"><p className="wt-muted">La lista di parole non è ancora pronta. Riprova più tardi! 📚</p></div>
              )}

              {canEdit && (
                <div className="wt-card">
                  <div className="wt-label">Lista di parole · {words.length}</div>
                  <p className="wt-muted" style={{ marginBottom: 16 }}>
                    File Excel con 2 colonne: <strong>A = italiano</strong>, <strong>B = inglese</strong>. Un nuovo file sostituisce la lista per tutti.
                  </p>
                  <div className="wt-row">
                    <button className="wt-btn-ghost" onClick={() => fileInputRef.current?.click()} disabled={saving}>
                      {saving ? "⏳ Salvataggio..." : `📄 ${words.length ? "Ricarica file" : "Carica file Excel"}`}
                    </button>
                    {words.length > 0 && (
                      <button className="wt-btn-ghost" onClick={openEditor} disabled={saving}>✏️ Verifica e correggi vocaboli</button>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
                </div>
              )}

              {words.length > 0 && (
                <div className="wt-card">
                  <div className="wt-label">Quante domande?</div>
                  <form onSubmit={(e) => { e.preventDefault(); startTest(); }}>
                    <div className="wt-row">
                      <input
                        className="wt-input"
                        type="number"
                        min={1}
                        max={words.length}
                        value={count}
                        onChange={(e) => setCount(e.target.value)}
                        style={{ width: 110 }}
                        autoFocus
                      />
                      <span className="wt-muted">su {words.length} disponibili</span>
                    </div>
                    <div style={{ marginTop: 20 }}>
                      <button className="wt-btn" type="submit" disabled={!Number(count) || Number(count) < 1}>
                        Inizia il test →
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {history.length > 0 && (
                <div className="wt-card">
                  <div className="wt-label">Storico dei test · {history.length}</div>
                  <p className="wt-muted" style={{ marginBottom: 4 }}>
                    Media: <strong style={{ color: "#c8f135" }}>
                      {pct(history.reduce((s, t) => s + t.correct, 0), history.reduce((s, t) => s + t.total, 0))}%
                    </strong>
                  </p>
                  <div className="wt-list">
                    {history.map((t) => {
                      const p = pct(t.correct, t.total);
                      const color = p >= 80 ? "#c8f135" : p >= 60 ? "#f0c040" : "#ff6b6b";
                      return (
                        <div key={t.id} className="wt-item">
                          <span className="wt-muted">{formatDate(t.created_at)}</span>
                          <span>{t.correct}/{t.total} giuste</span>
                          <span className="wt-badge" style={{ color, border: `1px solid ${color}` }}>{p}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ---------- ACCESSO AMMINISTRATORE (in fondo, discreto) ---------- */}
          {phase === "setup" && !loading && (
            <div style={{ marginTop: 32, textAlign: "center" }}>
              {canEdit ? (
                <button className="wt-link" onClick={handleLogout}>🔓 Esci dall'area amministratore</button>
              ) : !showLogin ? (
                <button className="wt-link" onClick={() => { setShowLogin(true); setLoginError(""); }}>🔒 Area amministratore</button>
              ) : (
                <div className="wt-card" style={{ textAlign: "left" }}>
                  <div className="wt-label">Area amministratore</div>
                  <form onSubmit={handleLogin}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <input className="wt-input wt-input-sm" type="email" placeholder="Email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
                      <input className="wt-input wt-input-sm" type="password" placeholder="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    {loginError && <p style={{ color: "#ff6b6b", fontSize: "0.9rem", marginTop: 10 }}>{loginError}</p>}
                    <div className="wt-row" style={{ marginTop: 16 }}>
                      <button className="wt-btn" type="submit" disabled={loggingIn || !email.trim() || !password}>
                        {loggingIn ? "⏳ Accesso..." : "Entra"}
                      </button>
                      <button className="wt-btn-ghost" type="button" onClick={() => setShowLogin(false)}>Annulla</button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* ---------- MODIFICA VOCABOLI (solo amministratore, mai durante un test) ---------- */}
          {phase === "edit" && canEdit && (
            <div className="wt-card">
              <div className="wt-sticky">
                <div className="wt-row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
                  <div className="wt-label" style={{ marginBottom: 0 }}>Vocaboli · {draft.length}</div>
                  {dirty && <span style={{ color: "#f0c040", fontSize: "0.85rem" }}>● Modifiche non salvate</span>}
                </div>
                <input
                  className="wt-input wt-input-sm"
                  placeholder="🔍 Cerca in italiano o in inglese..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="wt-row" style={{ marginTop: 12 }}>
                  <button className="wt-btn" onClick={saveDraft} disabled={saving || !dirty}>
                    {saving ? "⏳ Salvataggio..." : "💾 Salva modifiche"}
                  </button>
                  <button className="wt-btn-ghost" onClick={addRow} disabled={saving}>＋ Aggiungi parola</button>
                  <button className="wt-btn-ghost" onClick={closeEditor} disabled={saving}>← Indietro</button>
                </div>
              </div>

              {search && <p className="wt-muted" style={{ margin: "8px 0" }}>{filteredDraft.length} risultati</p>}

              <div className="wt-list">
                {filteredDraft.slice(0, MAX_ROWS_SHOWN).map((r) => (
                  <div key={r.key} className="wt-edit-row">
                    <input className="wt-input wt-input-sm" value={r.it} placeholder="Italiano" onChange={(e) => updateRow(r.key, "it", e.target.value)} />
                    <input className="wt-input wt-input-sm" value={r.en} placeholder="Inglese" onChange={(e) => updateRow(r.key, "en", e.target.value)} />
                    <button className="wt-del" title="Elimina" onClick={() => deleteRow(r.key)}>🗑️</button>
                  </div>
                ))}
              </div>

              {filteredDraft.length > MAX_ROWS_SHOWN && (
                <p className="wt-muted" style={{ marginTop: 12 }}>
                  Mostro le prime {MAX_ROWS_SHOWN} parole su {filteredDraft.length}: usa la ricerca per trovare le altre.
                </p>
              )}
              {filteredDraft.length === 0 && <p className="wt-muted" style={{ marginTop: 12 }}>Nessuna parola trovata.</p>}
            </div>
          )}

          {/* ---------- TEST ---------- */}
          {phase === "test" && questions[current] && (
            <div className="wt-card">
              <div className="wt-row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
                <span className="wt-muted">Domanda {current + 1} di {questions.length}</span>
                <span className="wt-row" style={{ gap: 16 }}>
                  <span className="wt-muted">✅ {correctCount}</span>
                  <button className="wt-btn-ghost" style={{ padding: "6px 14px", fontSize: "0.8rem" }} onClick={stopTest}>✕ Interrompi</button>
                </span>
              </div>
              <div className="wt-progress"><div style={{ width: `${(current / questions.length) * 100}%` }} /></div>

              <div className="wt-label" style={{ textAlign: "center" }}>Come si dice in inglese?</div>
              <div className="wt-word">{questions[current].it}</div>

              <form onSubmit={checkAnswer}>
                <div className="wt-row">
                  <input
                    ref={answerRef}
                    className="wt-input"
                    style={{ flex: 1, minWidth: 180 }}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    disabled={!!feedback}
                    placeholder="Scrivi qui in inglese..."
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  {!feedback && <button className="wt-btn" type="submit" disabled={!answer.trim()}>Controlla</button>}
                </div>
              </form>

              {feedback?.ok && (
                <div className="wt-ok">
                  🎉 BRAVO!
                  {feedback.others.length > 0 && (
                    <div style={{ fontSize: "0.85rem", fontWeight: 400, marginTop: 6, color: "#999" }}>
                      Andava bene anche: <span style={{ textTransform: "uppercase" }}>{feedback.others.join(", ")}</span>
                    </div>
                  )}
                </div>
              )}
              {feedback && !feedback.ok && (
                <div className="wt-ko">
                  ❌ Non è giusto. La risposta corretta è<br />
                  <strong>{feedback.correct}</strong>
                </div>
              )}

              {feedback && (
                <div style={{ marginTop: 20, textAlign: "center" }}>
                  <button ref={nextRef} className="wt-btn" onClick={nextQuestion}>
                    {current + 1 >= questions.length ? "Vedi il risultato →" : "Avanti →"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ---------- RISULTATO ---------- */}
          {phase === "result" && (
            <>
              <div className="wt-card" style={{ textAlign: "center" }}>
                <div className="wt-label">Risultato</div>
                <div className="wt-score">{percent}%</div>
                <p style={{ marginTop: 12, fontSize: "1.1rem" }}>
                  {correctCount} risposte giuste su {results.length}
                </p>
                <p className="wt-muted" style={{ marginTop: 6 }}>
                  {percent === 100 ? "Perfetto! 🏆" : percent >= 80 ? "Ottimo lavoro! 💪" : percent >= 60 ? "Bene, continua così! 👍" : "Ripassale e riprova! 📚"}
                </p>
                <div style={{ marginTop: 24 }}>
                  <button className="wt-btn" onClick={() => setPhase("setup")}>🔄 Nuovo test</button>
                </div>
              </div>

              {results.some((r) => !r.ok) && (
                <div className="wt-card">
                  <div className="wt-label">Da ripassare</div>
                  <div className="wt-list">
                    {results.filter((r) => !r.ok).map((r, i) => (
                      <div key={i} className="wt-item">
                        <span><strong>{r.it}</strong> → <span style={{ color: "#c8f135" }}>{alternatives(r.en).join(" oppure ")}</span></span>
                        <span style={{ color: "#ff6b6b" }}>hai scritto: {r.given}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
