"use client";
import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "../../lib/supabase";

const API_URL = "/api/christian-words";
const HEADER_WORDS = ["italiano", "inglese", "italian", "english", "ita", "eng", "parola", "traduzione"];

// Normalizza una risposta: niente maiuscole, niente spazi in più
const normalize = (s) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

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

export default function WordTest() {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [loadInfo, setLoadInfo] = useState("");
  const [error, setError] = useState("");
  const [count, setCount] = useState(10);

  // Stato del test
  const [phase, setPhase] = useState("setup"); // setup | test | result
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(null); // null | { ok, correct }
  const [results, setResults] = useState([]);

  const fileInputRef = useRef(null);
  const answerRef = useRef(null);
  const nextRef = useRef(null);
  const supabase = createClient();

  // Se sei loggato, manda il token: così il server capisce se sei l'amministratore
  const authHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session ? { Authorization: `Bearer ${session.access_token}` } : {};
  };

  // All'apertura scarica la lista dal server
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(API_URL, { headers: await authHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        const list = data.words || [];
        setWords(list);
        setCount(Math.min(10, list.length) || 10);
        setCanEdit(!!data.canEdit);
      } catch (err) {
        console.error(err);
        setError("Non riesco a caricare la lista di parole. Riprova tra poco.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Mette il cursore nel campo giusto a ogni domanda
  useEffect(() => {
    if (phase !== "test") return;
    if (feedback) nextRef.current?.focus();
    else answerRef.current?.focus();
  }, [phase, current, feedback]);

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

    // Salva la lista sul server, così Christian la trova da qualsiasi dispositivo
    setSaving(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ words: list }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Salvataggio non riuscito.");
      setWords(data.words);
      setCount(Math.min(10, data.words.length));
      setLoadInfo(`✅ Salvate ${data.words.length} parole${duplicates ? ` (${duplicates} doppioni ignorati)` : ""}. Christian le vede già.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const startTest = () => {
    const n = Math.max(1, Math.min(Number(count) || 1, words.length));
    setQuestions(shuffle(words).slice(0, n));
    setCurrent(0); setAnswer(""); setFeedback(null); setResults([]);
    setPhase("test");
  };

  const checkAnswer = (e) => {
    e.preventDefault();
    if (feedback || !answer.trim()) return;
    const q = questions[current];
    const ok = normalize(answer) === normalize(q.en);
    setFeedback({ ok, correct: q.en });
    setResults((prev) => [...prev, { ...q, given: answer.trim(), ok }]);
  };

  const nextQuestion = () => {
    if (current + 1 >= questions.length) { setPhase("result"); return; }
    setCurrent((c) => c + 1); setAnswer(""); setFeedback(null);
  };

  const correctCount = results.filter((r) => r.ok).length;
  const percent = results.length ? Math.round((correctCount / results.length) * 100) : 0;

  return (
    <>
      <style>{`
        .wt { min-height: 100vh; background: #0a0a0a; color: #f0f0f0; font-family: 'Satoshi', system-ui, sans-serif; padding: 48px 16px; }
        .wt-inner { max-width: 640px; margin: 0 auto; }
        .wt h1 { font-size: 2.2rem; margin-bottom: 8px; letter-spacing: -1px; }
        .wt h1 span { color: #c8f135; }
        .wt-sub { color: #999; margin-bottom: 32px; line-height: 1.6; }
        .wt-card { background: #111; border: 1px solid #222; border-radius: 20px; padding: 28px; margin-bottom: 20px; }
        .wt-label { font-size: 0.72rem; letter-spacing: 2px; text-transform: uppercase; color: #c8f135; margin-bottom: 12px; }
        .wt-btn { background: #c8f135; color: #000; border: none; padding: 14px 28px; border-radius: 100px; font-size: 1rem; font-weight: 600; cursor: pointer; }
        .wt-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .wt-btn-ghost { background: transparent; color: #ccc; border: 1px solid #333; padding: 12px 24px; border-radius: 100px; font-size: 0.9rem; cursor: pointer; }
        .wt-input { width: 100%; padding: 14px 16px; background: #0a0a0a; border: 1px solid #333; border-radius: 12px; color: #f0f0f0; font-size: 1.1rem; outline: none; }
        .wt-input:focus { border-color: #c8f135; }
        .wt-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        .wt-muted { color: #999; font-size: 0.9rem; }
        .wt-error { background: rgba(255,80,80,0.08); border: 1px solid rgba(255,80,80,0.3); color: #ff6b6b; border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; }
        .wt-progress { height: 6px; background: #222; border-radius: 3px; overflow: hidden; margin-bottom: 24px; }
        .wt-progress div { height: 100%; background: #c8f135; transition: width 0.3s; }
        .wt-word { font-size: 2.4rem; font-weight: 700; text-align: center; margin: 8px 0 28px; letter-spacing: 1px; text-transform: uppercase; word-break: break-word; }
        .wt-ok { background: rgba(200,241,53,0.1); border: 1px solid rgba(200,241,53,0.4); color: #c8f135; border-radius: 12px; padding: 16px; text-align: center; font-size: 1.3rem; font-weight: 700; margin-top: 16px; }
        .wt-ko { background: rgba(255,80,80,0.08); border: 1px solid rgba(255,80,80,0.3); color: #ff6b6b; border-radius: 12px; padding: 16px; text-align: center; margin-top: 16px; }
        .wt-ko strong { color: #f0f0f0; font-size: 1.3rem; text-transform: uppercase; }
        .wt-score { font-size: 4.5rem; font-weight: 800; color: #c8f135; text-align: center; line-height: 1; }
        .wt-list { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
        .wt-item { display: flex; justify-content: space-between; gap: 12px; background: #1a1a1a; border-radius: 10px; padding: 10px 14px; font-size: 0.9rem; flex-wrap: wrap; }
      `}</style>

      <div className="wt">
        <div className="wt-inner">
          <h1>Ciao <span>Christian</span> 👋</h1>
          <p className="wt-sub">Allenati con le parole di inglese: ti mostro la parola in italiano, tu scrivi la traduzione.</p>

          {error && <div className="wt-error">⚠️ {error}</div>}

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
                <div className="wt-label">1 · Lista di parole</div>
                <p className="wt-muted" style={{ marginBottom: 16 }}>
                  File Excel con 2 colonne: <strong>A = italiano</strong>, <strong>B = inglese</strong>. Puoi ricaricarlo quando vuoi: la nuova lista sostituisce la vecchia per tutti.
                </p>
                <div className="wt-row">
                  <button className="wt-btn-ghost" onClick={() => fileInputRef.current?.click()} disabled={saving}>
                    {saving ? "⏳ Salvataggio..." : `📄 ${words.length ? "Ricarica file" : "Carica file Excel"}`}
                  </button>
                  <span className="wt-muted">{words.length ? `${words.length} parole pronte` : "Nessuna lista caricata"}</span>
                </div>
                {loadInfo && <p style={{ marginTop: 12, color: "#c8f135", fontSize: "0.9rem" }}>{loadInfo}</p>}
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
              </div>
              )}

              {words.length > 0 && (
                <div className="wt-card">
                  <div className="wt-label">{canEdit ? "2 · " : ""}Quante domande?</div>
                  <div className="wt-row">
                    <input
                      className="wt-input"
                      type="number"
                      min={1}
                      max={words.length}
                      value={count}
                      onChange={(e) => setCount(e.target.value)}
                      style={{ width: 110 }}
                    />
                    <span className="wt-muted">su {words.length} disponibili</span>
                  </div>
                  <div style={{ marginTop: 20 }}>
                    <button className="wt-btn" onClick={startTest} disabled={!Number(count) || Number(count) < 1}>
                      Inizia il test →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ---------- TEST ---------- */}
          {phase === "test" && questions[current] && (
            <div className="wt-card">
              <div className="wt-row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
                <span className="wt-muted">Domanda {current + 1} di {questions.length}</span>
                <span className="wt-muted">✅ {correctCount}</span>
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

              {feedback?.ok && <div className="wt-ok">🎉 BRAVO!</div>}
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
                <div className="wt-row" style={{ justifyContent: "center", marginTop: 24 }}>
                  <button className="wt-btn" onClick={startTest}>🔄 Nuovo test</button>
                  <button className="wt-btn-ghost" onClick={() => setPhase("setup")}>Cambia impostazioni</button>
                </div>
              </div>

              {results.some((r) => !r.ok) && (
                <div className="wt-card">
                  <div className="wt-label">Da ripassare</div>
                  <div className="wt-list">
                    {results.filter((r) => !r.ok).map((r, i) => (
                      <div key={i} className="wt-item">
                        <span><strong>{r.it}</strong> → <span style={{ color: "#c8f135" }}>{r.en}</span></span>
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
