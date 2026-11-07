"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "../../lib/supabase";
import { useRouter } from "next/navigation";

/* ---------- MAPPA MENTALE: dati di esempio e funzioni di export ---------- */

const SAMPLE_MINDMAP = `# Fotosintesi
## Fase luminosa
- Avviene nei tilacoidi
- Produce ATP e NADPH
## Fase oscura
- Ciclo di Calvin
- Fissa la CO2
## Fattori
- Luce
- Acqua
- Anidride carbonica`;

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

const TAB_INFO = {
  summary: {
    icon: "📝", title: "Riassunto", badge: "",
    text: "Un riassunto chiaro e ordinato del tuo documento, con i concetti principali in evidenza. Perfetto per avere subito il quadro d'insieme prima di iniziare a studiare.",
  },
  flashcards: {
    icon: "🃏", title: "Flashcard", badge: "",
    text: "Domande e risposte a schede da girare, per ripassare in modo attivo e ricordare di più. Segni cosa sapevi e cosa no, e alla fine vedi il tuo punteggio.",
  },
  quiz: {
    icon: "🧠", title: "Quiz", badge: "",
    text: "Un quiz a risposta multipla creato dal tuo documento per verificare quanto hai davvero imparato. Rispondi, consegna e scopri subito il risultato.",
  },
  explain: {
    icon: "💡", title: "Spiegazioni", badge: "Pro",
    text: "Incolla un paragrafo difficile e BrainGifted te lo spiega in modo semplice, con esempi pratici. Ideale per i passaggi che proprio non ti entrano in testa.",
  },
  slides: {
    icon: "🎤", title: "Discorso", badge: "",
    text: "Trasforma il documento nella struttura di una presentazione o di un'interrogazione: apertura, punti chiave e chiusura. Con il piano Pro hai più slide e l'export in PowerPoint.",
  },
  mindmap: {
    icon: "🗺️", title: "Mappa", badge: "Pro",
    text: "Una mappa mentale interattiva dei concetti del documento, per vedere come sono collegati tra loro. Con il piano Pro la generi e la scarichi in PNG o SVG.",
  },
};

/* ---------------------------- DASHBOARD ---------------------------- */

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [plan, setPlan] = useState("free");
  const [view, setView] = useState("upload");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");

  // Flashcard
  const [flashcards, setFlashcards] = useState([]);
  const [loadingFlashcards, setLoadingFlashcards] = useState(false);
  const [currentCard, setCurrentCard] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState([]);

  // Quiz
  const [questions, setQuestions] = useState([]);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  // Spiegazioni
  const [explanation, setExplanation] = useState("");
  const [explainText, setExplainText] = useState("");
  const [loadingExplain, setLoadingExplain] = useState(false);

  // Discorso
  const [slides, setSlides] = useState([]);
  const [loadingSlides, setLoadingSlides] = useState(false);
  const [exportingPptx, setExportingPptx] = useState(false);
  const [exportingWord, setExportingWord] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Mappa mentale
  const [mindmapMd, setMindmapMd] = useState("");
  const [loadingMindmap, setLoadingMindmap] = useState(false);
  const mindmapSvgRef = useRef(null);
  const mindmapRootRef = useRef(null);

  // Storico
  const [documents, setDocuments] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);

  const fileRef = useRef(null);
  const documentIdRef = useRef(null);
  const docPromiseRef = useRef(null);
  const fileInputRef = useRef();
  const supabase = createClient();
  const router = useRouter();

  /* ----- Caricamento utente e piano ----- */
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      } else {
        setUser(user);
        const { data: profile } = await supabase
          .from("profiles")
          .select("plan")
          .eq("id", user.id)
          .single();
        if (profile) setPlan(profile.plan);
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      window.history.replaceState({}, "", "/dashboard");
    }
  }, []);

  useEffect(() => {
    if (user) loadHistory();
  }, [user, plan]);

  /* ----- Disegno della mappa mentale (Markmap) ----- */
  useEffect(() => {
    if (activeTab !== "mindmap") return;
    const md = plan === "pro" ? mindmapMd : SAMPLE_MINDMAP;
    if (!md || loadingMindmap) return;
    let cancelled = false;
    (async () => {
      const { Transformer } = await import("markmap-lib");
      const { Markmap } = await import("markmap-view");
      if (cancelled || !mindmapSvgRef.current) return;
      const { root } = new Transformer().transform(md);
      mindmapSvgRef.current.innerHTML = "";
      mindmapRootRef.current = root;
      Markmap.create(mindmapSvgRef.current, { color: () => "#c8f135", duration: 300 }, root);
    })();
    return () => { cancelled = true; };
  }, [activeTab, mindmapMd, plan, loadingMindmap]);

  /* ----- Funzioni di supporto ----- */
  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch(`/api/documents?userId=${user.id}&plan=${plan}`);
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error("Errore caricamento storico:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

    // Restituisce l'header con il token di login, da mandare alle API
  const authHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session ? { Authorization: `Bearer ${session.access_token}` } : {};
  };

  const checkUsage = async (feature) => {
    const response = await fetch("/api/usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, feature }),
    });
    return await response.json();
  };

  const saveResult = async (feature, content) => {
    if (!fileRef.current) return;

    // Il documento nello storico viene creato al primo risultato generato
    if (!documentIdRef.current) {
      if (!docPromiseRef.current) {
        docPromiseRef.current = (async () => {
          const res = await fetch("/api/documents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user.id, fileName: fileRef.current.name, feature, content }),
          });
          const d = await res.json();
          if (d.document) documentIdRef.current = d.document.id;
        })();
        await docPromiseRef.current;
        docPromiseRef.current = null;
        loadHistory();
        return;
      }
      await docPromiseRef.current;
      if (!documentIdRef.current) return;
    }

    await fetch("/api/documents", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: documentIdRef.current,
        userId: user.id,
        feature,
        content,
      }),
    });
    loadHistory();
  };

  /* ----- Upload + riassunto ----- */
  const handleFile = async (file) => {
    if (!file || file.type !== "application/pdf") { setError("Per ora accettiamo solo file PDF."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("Il file è troppo grande. Massimo 10MB."); return; }

    // Il PDF viene solo caricato: l'utente sceglie poi quale aiuto usare
    fileRef.current = file;
    documentIdRef.current = null;
    docPromiseRef.current = null;
    setError("");
    setFlashcards([]); setQuestions([]); setSlides([]); setMindmapMd("");
    setExplanation(""); setExplainText("");
    setCurrentCard(0); setKnown([]); setAnswers({}); setSubmitted(false);
    setResult({ fileName: file.name, summary: "" });
  };

  /* ----- Riassunto (su richiesta) ----- */
  const handleGenerateSummary = async () => {
    if (!fileRef.current) return;

    const usage = await checkUsage("summary");
    if (!usage.allowed) {
      if (usage.reason === "limit_reached") setError(`Hai raggiunto il limite di ${usage.limit} riassunti/mese del piano Free. Passa a Pro per continuare!`);
      if (usage.reason === "pro_only") setError("Questa funzione è disponibile solo per il piano Pro.");
      return;
    }

    setLoadingSummary(true); setError("");
    try {
      const formData = new FormData();
      formData.append("file", fileRef.current);
            const response = await fetch("/api/summarize", { method: "POST", headers: await authHeaders(), body: formData });
      if (!response.ok) throw new Error("Errore nella generazione del riassunto.");
      const data = await response.json();
      setResult(prev => ({ ...prev, summary: data.summary }));
      setActiveTab("summary");
      await saveResult("summary", { summary: data.summary });
    } catch (err) {
      setError(err.message || "Qualcosa è andato storto.");
    } finally {
      setLoadingSummary(false);
    }
  };

  /* ----- Flashcard ----- */
  const handleGenerateFlashcards = async () => {
    if (!fileRef.current) return;

    const usage = await checkUsage("flashcards");
    if (!usage.allowed) {
      if (usage.reason === "limit_reached") setError(`Hai raggiunto il limite di ${usage.limit} flashcard/mese del piano Free. Passa a Pro!`);
      if (usage.reason === "pro_only") setError("Questa funzione è disponibile solo per il piano Pro.");
      return;
    }

    setLoadingFlashcards(true); setFlipped(false); setCurrentCard(0); setKnown([]);
    try {
      const formData = new FormData();
      formData.append("file", fileRef.current);
      const response = await fetch("/api/flashcards", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Errore nella generazione delle flashcard.");
      const data = await response.json();
      setFlashcards(data.flashcards);
      setActiveTab("flashcards");
      await saveResult("flashcards", { flashcards: data.flashcards });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingFlashcards(false);
    }
  };

  const handleKnown = (knownIt) => {
    setKnown(prev => [...prev, { index: currentCard, known: knownIt }]);
    setFlipped(false);
    setTimeout(() => { if (currentCard < flashcards.length - 1) setCurrentCard(prev => prev + 1); }, 200);
  };

  /* ----- Quiz ----- */
  const handleGenerateQuiz = async () => {
    if (!fileRef.current) return;

    const usage = await checkUsage("quiz");
    if (!usage.allowed) {
      if (usage.reason === "limit_reached") setError(`Hai raggiunto il limite di ${usage.limit} quiz/mese del piano Free. Passa a Pro!`);
      if (usage.reason === "pro_only") setError("Questa funzione è disponibile solo per il piano Pro.");
      return;
    }

    setLoadingQuiz(true); setAnswers({}); setSubmitted(false);
    try {
      const formData = new FormData();
      formData.append("file", fileRef.current);
      const response = await fetch("/api/quiz", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Errore nella generazione del quiz.");
      const data = await response.json();
      setQuestions(data.questions);
      setActiveTab("quiz");
      await saveResult("quiz", { questions: data.questions });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleAnswer = (qIndex, aIndex) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qIndex]: aIndex }));
  };

  /* ----- Spiegazioni ----- */
  const handleExplain = async () => {
    if (!explainText || explainText.trim().length < 20) {
      setError("Inserisci almeno una frase da spiegare.");
      return;
    }

    const usage = await checkUsage("explain");
    if (!usage.allowed) {
      if (usage.reason === "limit_reached") setError("Hai raggiunto il limite del piano Free. Passa a Pro!");
      if (usage.reason === "pro_only") setError("Le spiegazioni sono disponibili solo per il piano Pro. Passa a Pro per sbloccarle!");
      return;
    }

    setLoadingExplain(true); setExplanation("");
    try {
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: explainText }),
      });
      if (!response.ok) throw new Error("Errore nella spiegazione.");
      const data = await response.json();
      setExplanation(data.explanation);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingExplain(false);
    }
  };

  /* ----- Discorso ----- */
  const handleGenerateSlides = async () => {
    if (!fileRef.current) return;

    const usage = await checkUsage("slides");
    if (!usage.allowed) {
      if (usage.reason === "limit_reached") setError(`Hai raggiunto il limite di ${usage.limit} presentazioni/mese del piano Free. Passa a Pro!`);
      if (usage.reason === "pro_only") setError("Questa funzione è disponibile solo per il piano Pro.");
      return;
    }

    setLoadingSlides(true); setSlides([]);
    try {
      const formData = new FormData();
      formData.append("file", fileRef.current);
      formData.append("plan", plan);
      const response = await fetch("/api/slides", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Errore nella generazione delle slide.");
      const data = await response.json();
      setSlides(data.slides);
      setActiveTab("slides");
      await saveResult("slides", { slides: data.slides });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingSlides(false);
    }
  };

  const handleExportPptx = async () => {
    if (!slides.length) return;
    setExportingPptx(true);
    try {
      const response = await fetch("/api/export-pptx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slides, title: result?.fileName }),
      });
      if (!response.ok) throw new Error("Errore nell'export.");
      const blob = await response.blob();
      download(blob, "braingifted-presentazione.pptx");
    } catch (err) {
      setError(err.message);
    } finally {
      setExportingPptx(false);
    }
  };

  /* ----- Export Word (Pro) ----- */
  const handleExportWord = async () => {
    if (!result?.summary) return;
    if (plan !== "pro") {
      setError("L'export in Word è disponibile solo per il piano Pro.");
      return;
    }
    setExportingWord(true);
    try {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");
      const clean = (s) => s.replace(/\*\*(.*?)\*\*/g, "$1").replace(/^#+\s*/, "").trim();
      const children = [
        new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: "Riassunto", bold: true })] }),
        new Paragraph({ children: [new TextRun({ text: result.fileName || "", italics: true, color: "666666" })], spacing: { after: 300 } }),
      ];
      result.summary.split("\n").forEach((raw) => {
        const line = raw.trim();
        if (!line) return;
        if (/^#{1,3}\s/.test(line)) {
          children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: clean(line), bold: true })], spacing: { before: 240, after: 120 } }));
        } else if (/^[-•*]\s+/.test(line)) {
          children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun(clean(line.replace(/^[-•*]\s+/, "")))], spacing: { after: 80 } }));
        } else {
          children.push(new Paragraph({ children: [new TextRun(clean(line))], spacing: { after: 120 } }));
        }
      });
      const doc = new Document({ sections: [{ children }] });
      const blob = await Packer.toBlob(doc);
      download(blob, "braingifted-riassunto.docx");
    } catch (err) {
      setError("Errore nell'export in Word.");
    } finally {
      setExportingWord(false);
    }
  };

  /* ----- Mappa mentale ----- */
  const handleGenerateMindmap = async () => {
    if (!fileRef.current) return;

    const usage = await checkUsage("mindmap");
    if (!usage.allowed) {
      setError("La mappa mentale è disponibile solo per il piano Pro.");
      return;
    }

    setLoadingMindmap(true);
    try {
      const formData = new FormData();
      formData.append("file", fileRef.current);
      const response = await fetch("/api/mindmap", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Errore nella generazione della mappa.");
      const data = await response.json();
      setMindmapMd(data.markdown);
      setActiveTab("mindmap");
      await saveResult("mindmap", { markdown: data.markdown });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMindmap(false);
    }
  };

  const exportMindmapSvg = () => {
    if (!mindmapRootRef.current) return;
    const { svg } = buildExportSvg(mindmapRootRef.current);
    download(new Blob([svg], { type: "image/svg+xml" }), "braingifted-mappa.svg");
  };

  const exportMindmapPng = () => {
    if (!mindmapRootRef.current) return;
    const { svg, width, height } = buildExportSvg(mindmapRootRef.current);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width * 2;
      canvas.height = height * 2;
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) download(blob, "braingifted-mappa.png");
        else setError("Export PNG fallito.");
      }, "image/png");
    };
    img.onerror = () => setError("Export PNG fallito.");
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  };

  /* ----- Piano e logout ----- */
  const handleUpgradeToPro = async () => {
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      });
      const data = await response.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      setError("Errore nel checkout. Riprova.");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (!user) return null;

  const quizScore = submitted ? questions.filter((q, i) => answers[i] === q.corretta).length : 0;
  const isLastCard = known.length === flashcards.length && flashcards.length > 0;
  const knownCards = known.filter(k => k.known).length;

  const renderIntro = (key) => {
    const info = TAB_INFO[key];
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: "1.4rem" }}>{info.icon}</span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 700 }}>{info.title}</span>
          {info.badge && (
            <span style={{ fontSize: "0.65rem", background: "rgba(200,241,53,0.1)", color: "var(--lime)", border: "1px solid rgba(200,241,53,0.3)", padding: "2px 10px", borderRadius: "100px" }}>⚡ {info.badge}</span>
          )}
        </div>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.6 }}>{info.text}</p>
      </div>
    );
  };

  const tabsRow = (
    <div className="tabs">
      {Object.keys(TAB_INFO).map((key) => (
        <button key={key} className={`tab-btn ${activeTab === key ? "active" : ""}`} onClick={() => setActiveTab(key)}>
          {TAB_INFO[key].icon} {TAB_INFO[key].title}
        </button>
      ))}
    </div>
  );

  const featureLabel = (f) =>
    f === "summary" ? "📝 Riassunto" :
    f === "flashcards" ? "🃏 Flashcard" :
    f === "quiz" ? "🧠 Quiz" :
    f === "slides" ? "🎤 Discorso" :
    f === "mindmap" ? "🗺️ Mappa" : "💡 Spiegazione";

  const featureIcon = (f) =>
    f === "summary" ? "📝" :
    f === "flashcards" ? "🃏" :
    f === "quiz" ? "🧠" :
    f === "slides" ? "🎤" :
    f === "mindmap" ? "🗺️" : "💡";

  return (
    <>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=clash-display@600,700&f[]=satoshi@300,400,500&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --lime: #c8f135; --bg: #0a0a0a; --surface: #111111; --surface2: #1a1a1a;
          --border: #222222; --text: #f0f0f0; --muted: #666666;
          --font-display: 'Clash Display', sans-serif; --font-body: 'Satoshi', sans-serif;
        }
        body { background: var(--bg); color: var(--text); font-family: var(--font-body); }
        .page { min-height: 100vh; padding: 32px 24px; max-width: 1280px; width: 100%; margin: 0 auto; }
        @media (min-width: 1500px) { .page { max-width: 1440px; } }
        .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 48px; flex-wrap: wrap; gap: 12px; }
        .logo { font-family: var(--font-display); font-size: 1.4rem; font-weight: 700; }
        .logo span { color: var(--lime); }
        .btn-logout { background: transparent; border: 1px solid var(--border); color: var(--muted); padding: 8px 20px; border-radius: 100px; font-family: var(--font-body); font-size: 0.85rem; cursor: pointer; transition: all 0.2s; }
        .btn-logout:hover { border-color: #444; color: var(--text); }
        h1 { font-family: var(--font-display); font-size: 2rem; font-weight: 700; letter-spacing: -1px; margin-bottom: 6px; }
        .subtitle { color: var(--muted); margin-bottom: 40px; font-size: 0.95rem; }
        .email { color: var(--lime); }

        .upload-zone { border: 2px dashed var(--border); border-radius: 20px; padding: 56px 32px; text-align: center; cursor: pointer; transition: all 0.2s; background: var(--surface); }
        .upload-zone:hover, .upload-zone.drag-over { border-color: var(--lime); background: rgba(200,241,53,0.03); }
        .upload-icon { font-size: 2.5rem; margin-bottom: 16px; }
        .upload-title { font-family: var(--font-display); font-size: 1.3rem; font-weight: 700; margin-bottom: 8px; }
        .upload-subtitle { color: var(--muted); font-size: 0.9rem; margin-bottom: 24px; }
        .btn-upload { background: var(--lime); color: #000; border: none; padding: 12px 28px; border-radius: 100px; font-family: var(--font-body); font-size: 0.9rem; font-weight: 500; cursor: pointer; }
        .upload-note { font-size: 0.78rem; color: var(--muted); margin-top: 16px; }

        .loading { background: var(--surface); border: 1px solid var(--border); border-radius: 20px; padding: 48px; text-align: center; }
        .spinner { width: 40px; height: 40px; border: 3px solid var(--border); border-top-color: var(--lime); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 20px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading p { color: var(--muted); font-size: 0.95rem; }
        .error-box { background: rgba(255,80,80,0.08); border: 1px solid rgba(255,80,80,0.2); border-radius: 12px; padding: 16px 20px; color: #ff5050; font-size: 0.9rem; margin-bottom: 24px; }

        .result-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .result-title { font-family: var(--font-display); font-size: 1.2rem; font-weight: 700; }
        .result-file { font-size: 0.8rem; color: var(--muted); margin-top: 2px; }
        .btn-new { background: transparent; border: 1px solid var(--border); color: var(--muted); padding: 8px 18px; border-radius: 100px; font-family: var(--font-body); font-size: 0.8rem; cursor: pointer; transition: all 0.2s; }
        .btn-new:hover { border-color: #444; color: var(--text); }
        .tabs { display: flex; gap: 8px; border-bottom: 1px solid var(--border); margin-bottom: 24px; overflow-x: auto; }
        .tab-btn { background: none; border: none; padding: 10px 20px; font-family: var(--font-body); font-size: 0.9rem; color: var(--muted); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all 0.2s; white-space: nowrap; }
        .tab-btn.active { color: var(--lime); border-bottom-color: var(--lime); }

        .summary-box { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 28px; }
        .summary-label { font-size: 0.7rem; letter-spacing: 2px; text-transform: uppercase; color: var(--lime); margin-bottom: 16px; }
        .summary-text { font-size: 0.95rem; line-height: 1.8; color: var(--text); white-space: pre-wrap; }
        .btn-generate { width: 100%; padding: 14px; background: transparent; border: 1px dashed rgba(200,241,53,0.3); border-radius: 12px; color: var(--lime); font-family: var(--font-body); font-size: 0.9rem; cursor: pointer; transition: all 0.2s; margin-top: 16px; }
        .btn-generate:hover { background: rgba(200,241,53,0.05); border-color: var(--lime); }
        .btn-generate:disabled { opacity: 0.4; cursor: not-allowed; }

        .fc-progress { display: flex; gap: 4px; margin-bottom: 20px; }
        .fc-dot { height: 4px; flex: 1; border-radius: 2px; background: var(--border); transition: background 0.3s; }
        .fc-dot.done-known { background: var(--lime); }
        .fc-dot.done-unknown { background: #ff5050; }
        .fc-dot.current { background: #555; }
        .flashcard { background: var(--surface); border: 1px solid var(--border); border-radius: 20px; padding: 48px 32px; text-align: center; min-height: 220px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
        .flashcard:hover { border-color: #333; }
        .fc-counter { font-size: 0.75rem; color: var(--muted); margin-bottom: 16px; }
        .fc-type { font-size: 0.7rem; letter-spacing: 2px; text-transform: uppercase; color: var(--lime); margin-bottom: 16px; }
        .fc-text { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.1rem; font-weight: 500; letter-spacing: 0; line-height: 1.6; }
        .fc-hint { font-size: 0.78rem; color: var(--muted); margin-top: 20px; }
        .fc-actions { display: flex; gap: 12px; margin-top: 16px; }
        .fc-btn { flex: 1; padding: 14px; border-radius: 12px; border: none; font-family: var(--font-body); font-size: 0.9rem; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .fc-btn.wrong { background: rgba(255,80,80,0.1); color: #ff5050; border: 1px solid rgba(255,80,80,0.2); }
        .fc-btn.right { background: rgba(200,241,53,0.1); color: var(--lime); border: 1px solid rgba(200,241,53,0.2); }
        .fc-result { background: var(--surface); border: 1px solid var(--border); border-radius: 20px; padding: 48px; text-align: center; }
        .fc-result h3 { font-family: var(--font-display); font-size: 2rem; font-weight: 700; letter-spacing: -1px; margin-bottom: 8px; }
        .fc-result p { color: var(--muted); margin-bottom: 24px; }
        .fc-score { font-family: var(--font-display); font-size: 4rem; font-weight: 700; color: var(--lime); }
        .btn-restart { background: var(--lime); color: #000; border: none; padding: 12px 28px; border-radius: 100px; font-family: var(--font-body); font-size: 0.9rem; font-weight: 500; cursor: pointer; margin-top: 8px; }

        .quiz-list { display: flex; flex-direction: column; gap: 24px; }
        .quiz-item { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 24px; }
        .quiz-num { font-size: 0.75rem; color: var(--lime); margin-bottom: 10px; letter-spacing: 1px; }
        .quiz-q { font-size: 1rem; font-weight: 500; margin-bottom: 16px; line-height: 1.5; }
        .quiz-options { display: flex; flex-direction: column; gap: 8px; }
        .quiz-opt { padding: 12px 16px; border-radius: 10px; border: 1px solid var(--border); font-size: 0.9rem; color: var(--muted); cursor: pointer; transition: all 0.2s; text-align: left; background: transparent; font-family: var(--font-body); width: 100%; }
        .quiz-opt:hover:not(:disabled) { border-color: #444; color: var(--text); }
        .quiz-opt.selected { border-color: var(--lime); color: var(--lime); background: rgba(200,241,53,0.05); }
        .quiz-opt.correct { border-color: var(--lime); color: var(--lime); background: rgba(200,241,53,0.08); }
        .quiz-opt.wrong { border-color: #ff5050; color: #ff5050; background: rgba(255,80,80,0.08); }
        .quiz-submit { background: var(--lime); color: #000; border: none; padding: 14px 32px; border-radius: 100px; font-family: var(--font-body); font-size: 1rem; font-weight: 500; cursor: pointer; margin-top: 24px; transition: all 0.2s; }
        .quiz-submit:disabled { opacity: 0.4; cursor: not-allowed; }
        .quiz-result { background: var(--surface); border: 1px solid var(--border); border-radius: 20px; padding: 48px; text-align: center; margin-top: 24px; }
        .quiz-result h3 { font-family: var(--font-display); font-size: 2rem; font-weight: 700; letter-spacing: -1px; margin-bottom: 8px; }
        .quiz-result p { color: var(--muted); }
        .quiz-score { font-family: var(--font-display); font-size: 4rem; font-weight: 700; color: var(--lime); }
      `}</style>

      <div className="page">
        {/* HEADER */}
        <div className="header">
          <div className="logo">Brain<span>Gifted</span></div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => setView(view === "upload" ? "history" : "upload")}
              style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted)", padding: "8px 20px", borderRadius: "100px", fontFamily: "var(--font-body)", fontSize: "0.85rem", cursor: "pointer", transition: "all 0.2s" }}
            >
              {view === "upload" ? "📚 Storico" : "⬆️ Nuovo"}
            </button>
            {plan === "pro" ? (
              <span style={{ background: "rgba(200,241,53,0.1)", color: "var(--lime)", border: "1px solid rgba(200,241,53,0.3)", padding: "8px 20px", borderRadius: "100px", fontSize: "0.85rem", fontWeight: 500 }}>
                ⚡ Piano Pro
              </span>
            ) : (
              <button onClick={handleUpgradeToPro} style={{ background: "var(--lime)", color: "#000", border: "none", padding: "8px 20px", borderRadius: "100px", fontFamily: "var(--font-body)", fontSize: "0.85rem", fontWeight: 500, cursor: "pointer" }}>
                ⚡ Passa a Pro
              </button>
            )}
            <button className="btn-logout" onClick={handleLogout}>Esci</button>
          </div>
        </div>

        <h1>Ciao! 👋</h1>
        <p className="subtitle">Loggato come <span className="email">{user.email}</span></p>

        {error && <div className="error-box">⚠️ {error}</div>}

        {/* ---------- STORICO ---------- */}
        {view === "history" && (
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", fontWeight: 700, letterSpacing: "-1px", marginBottom: 8 }}>
              I tuoi documenti 📚
            </h2>
            <p style={{ color: "var(--muted)", marginBottom: 32, fontSize: "0.9rem" }}>
              {plan === "free" ? "Ultimi 3 documenti (piano Free)" : "Tutti i tuoi documenti (piano Pro)"}
            </p>

            {loadingHistory && <div className="loading"><div className="spinner"></div><p>Caricando lo storico...</p></div>}

            {!loadingHistory && documents.length === 0 && (
              <div className="summary-box" style={{ textAlign: "center" }}>
                <p style={{ color: "var(--muted)" }}>Nessun documento ancora. Carica il tuo primo PDF!</p>
              </div>
            )}

            {!loadingHistory && documents.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {documents.map(doc => (
                  <div
                    key={doc.id}
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 24px", cursor: "pointer", transition: "all 0.2s" }}
                    onClick={() => setSelectedDoc(selectedDoc?.id === doc.id ? null : doc)}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>📄 {doc.file_name}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                          {new Date(doc.created_at).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {doc.results?.map(r => (
                          <span key={r.id} style={{ fontSize: "0.7rem", background: "rgba(200,241,53,0.1)", color: "var(--lime)", border: "1px solid rgba(200,241,53,0.2)", padding: "4px 10px", borderRadius: "100px" }}>
                            {featureIcon(r.feature)} {r.feature}
                          </span>
                        ))}
                      </div>
                    </div>

                    {selectedDoc?.id === doc.id && (
                      <div style={{ marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 20 }} onClick={(e) => e.stopPropagation()}>
                        {doc.results?.map(r => (
                          <div key={r.id} style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: "0.75rem", letterSpacing: 2, textTransform: "uppercase", color: "var(--lime)", marginBottom: 8 }}>
                              {featureLabel(r.feature)}
                            </div>

                            {r.feature === "summary" && (
                              <div style={{ fontSize: "0.9rem", lineHeight: 1.8, color: "var(--text)", whiteSpace: "pre-wrap" }}>{r.content.summary}</div>
                            )}

                            {r.feature === "flashcards" && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {r.content.flashcards?.map((fc, i) => (
                                  <div key={i} style={{ background: "var(--surface2)", borderRadius: 8, padding: "10px 14px", fontSize: "0.85rem" }}>
                                    <div style={{ color: "var(--lime)", marginBottom: 4 }}>D: {fc.domanda}</div>
                                    <div style={{ color: "var(--muted)" }}>R: {fc.risposta}</div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {r.feature === "quiz" && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {r.content.questions?.map((q, i) => (
                                  <div key={i} style={{ background: "var(--surface2)", borderRadius: 8, padding: "10px 14px", fontSize: "0.85rem" }}>
                                    <div style={{ color: "var(--text)", marginBottom: 6, fontWeight: 500 }}>{i + 1}. {q.domanda}</div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                      {q.opzioni?.map((opt, j) => (
                                        <div key={j} style={{ color: j === q.corretta ? "var(--lime)" : "var(--muted)", fontSize: "0.8rem" }}>
                                          {j === q.corretta ? "✓ " : "  "}{opt}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {r.feature === "slides" && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {r.content.slides?.map((slide, i) => (
                                  <div key={i} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderLeft: "3px solid var(--lime)", borderRadius: 8, padding: "10px 14px" }}>
                                    <div style={{ fontSize: "0.65rem", color: "var(--lime)", marginBottom: 4 }}>
                                      {slide.tipo === "apertura" ? "🎬 Apertura" : slide.tipo === "chiusura" ? "🎯 Chiusura" : `📌 Slide ${i}`}
                                    </div>
                                    <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: 4 }}>{slide.titolo}</div>
                                    {slide.tipo === "contenuto" && (
                                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                        {slide.punti?.map((punto, j) => (
                                          <div key={j} style={{ fontSize: "0.8rem", color: "var(--muted)", display: "flex", gap: 6 }}>
                                            <span style={{ color: "var(--lime)" }}>·</span>{punto}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    {slide.tipo === "apertura" && <div style={{ fontSize: "0.8rem", color: "var(--muted)", fontStyle: "italic" }}>"{slide.hook}"</div>}
                                    {slide.tipo === "chiusura" && <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{slide.messaggio}</div>}
                                  </div>
                                ))}
                              </div>
                            )}

                            {r.feature === "mindmap" && (
                              <div style={{ fontSize: "0.85rem", color: "var(--muted)", whiteSpace: "pre-wrap", background: "var(--surface2)", borderRadius: 8, padding: "10px 14px" }}>
                                {r.content.markdown}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {plan === "free" && documents.length >= 3 && (
              <div style={{ marginTop: 24, background: "rgba(200,241,53,0.05)", border: "1px solid rgba(200,241,53,0.2)", borderRadius: 16, padding: "20px 24px", textAlign: "center" }}>
                <p style={{ color: "var(--text)", marginBottom: 12 }}>Hai raggiunto il limite di 3 documenti nel piano Free.</p>
                <button onClick={handleUpgradeToPro} style={{ background: "var(--lime)", color: "#000", border: "none", padding: "10px 24px", borderRadius: "100px", fontFamily: "var(--font-body)", fontSize: "0.9rem", fontWeight: 500, cursor: "pointer" }}>
                  ⚡ Passa a Pro — storico illimitato
                </button>
              </div>
            )}
          </div>
        )}

        {/* ---------- UPLOAD E RISULTATI ---------- */}
        {view === "upload" && (
          <div>
            {!result && (
              <div style={{ marginBottom: 24 }}>
                <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: 12 }}>Scopri cosa può fare BrainGifted per te 👇</p>
                {tabsRow}
                <div className="summary-box">{renderIntro(activeTab)}</div>
              </div>
            )}

            {!result && (
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
                <div className="upload-note">
                  {plan === "pro"
                    ? "PDF · Max 10MB · Pagine illimitate · Piano Pro ⚡"
                    : "PDF · Max 10MB · Fino a 15 pagine · Piano Free"}
                </div>
                <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
              </div>
            )}

            {result && (
              <div>
                <div className="result-header">
                  <div>
                    <div className="result-title">Documento caricato ✨ Scegli cosa vuoi fare</div>
                    <div className="result-file">📄 {result.fileName}</div>
                  </div>
                  <button
                    className="btn-new"
                    onClick={() => {
                      setResult(null); setFlashcards([]); setQuestions([]); setSlides([]);
                      setMindmapMd(""); setExplanation(""); setExplainText("");
                      fileRef.current = null; documentIdRef.current = null; docPromiseRef.current = null;
                    }}
                  >
                    + Nuovo
                  </button>
                </div>

                {tabsRow}

                {/* RIASSUNTO */}
                {activeTab === "summary" && (
                  <div>
                    {loadingSummary && <div className="loading"><div className="spinner"></div><p>Generando il riassunto...</p></div>}
                    {!loadingSummary && !result.summary && (
                      <div className="summary-box" style={{ textAlign: "center" }}>
                        {renderIntro("summary")}
                        <button className="btn-generate" onClick={handleGenerateSummary}>📝 Genera riassunto</button>
                      </div>
                    )}
                    {!loadingSummary && result.summary && (<>
                    <div className="summary-box">
                      <div className="summary-label">⚡ Riassunto AI</div>
                      <div className="summary-text">{result.summary}</div>
                      <div style={{ marginTop: 20 }}>
                        <button onClick={handleExportWord} disabled={exportingWord} style={{ background: plan === "pro" ? "var(--lime)" : "transparent", color: plan === "pro" ? "#000" : "var(--muted)", border: plan === "pro" ? "none" : "1px solid var(--border)", padding: "8px 20px", borderRadius: "100px", fontFamily: "var(--font-body)", fontSize: "0.85rem", fontWeight: 500, cursor: "pointer" }}>
                          {exportingWord ? "⏳ Esportando..." : plan === "pro" ? "⬇️ Esporta in Word" : "🔒 Esporta in Word (Pro)"}
                        </button>
                      </div>
                    </div>
                    <button className="btn-generate" onClick={handleGenerateFlashcards} disabled={loadingFlashcards}>
                      {loadingFlashcards ? "⏳ Generando flashcard..." : "🃏 Genera flashcard"}
                    </button>
                    <button className="btn-generate" onClick={handleGenerateQuiz} disabled={loadingQuiz}>
                      {loadingQuiz ? "⏳ Generando quiz..." : "🧠 Genera quiz"}
                    </button>
                    </>)}
                  </div>
                )}

                {/* FLASHCARD */}
                {activeTab === "flashcards" && (
                  <div>
                    {loadingFlashcards && <div className="loading"><div className="spinner"></div><p>Generando le flashcard...</p></div>}
                    {!loadingFlashcards && flashcards.length === 0 && (
                      <div className="summary-box" style={{ textAlign: "center" }}>
                        {renderIntro("flashcards")}
                        <button className="btn-generate" onClick={handleGenerateFlashcards}>🃏 Genera flashcard</button>
                      </div>
                    )}
                    {!loadingFlashcards && flashcards.length > 0 && !isLastCard && (
                      <div>
                        <div className="fc-progress">
                          {flashcards.map((_, i) => {
                            const k = known.find(k => k.index === i);
                            return <div key={i} className={`fc-dot ${k ? (k.known ? "done-known" : "done-unknown") : i === currentCard ? "current" : ""}`}></div>;
                          })}
                        </div>
                        <div className="flashcard" onClick={() => setFlipped(!flipped)}>
                          <div className="fc-counter">{currentCard + 1} / {flashcards.length}</div>
                          <div className="fc-type">{flipped ? "RISPOSTA" : "DOMANDA"}</div>
                          <div className="fc-text">{flipped ? flashcards[currentCard].risposta : flashcards[currentCard].domanda}</div>
                          {!flipped && <div className="fc-hint">Clicca per vedere la risposta</div>}
                        </div>
                        {flipped && (
                          <div className="fc-actions">
                            <button className="fc-btn wrong" onClick={() => handleKnown(false)}>✗ Non sapevo</button>
                            <button className="fc-btn right" onClick={() => handleKnown(true)}>✓ Sapevo</button>
                          </div>
                        )}
                      </div>
                    )}
                    {!loadingFlashcards && isLastCard && (
                      <div className="fc-result">
                        <div className="fc-score">{knownCards}/{flashcards.length}</div>
                        <h3>Sessione completata!</h3>
                        <p>Hai risposto correttamente a {knownCards} domande su {flashcards.length}.</p>
                        <button className="btn-restart" onClick={() => { setCurrentCard(0); setKnown([]); setFlipped(false); }}>🔄 Riprova</button>
                      </div>
                    )}
                  </div>
                )}

                {/* QUIZ */}
                {activeTab === "quiz" && (
                  <div>
                    {loadingQuiz && <div className="loading"><div className="spinner"></div><p>Generando il quiz...</p></div>}
                    {!loadingQuiz && questions.length === 0 && (
                      <div className="summary-box" style={{ textAlign: "center" }}>
                        {renderIntro("quiz")}
                        <button className="btn-generate" onClick={handleGenerateQuiz}>🧠 Genera quiz</button>
                      </div>
                    )}
                    {!loadingQuiz && questions.length > 0 && (
                      <div>
                        <div className="quiz-list">
                          {questions.map((q, qi) => (
                            <div key={qi} className="quiz-item">
                              <div className="quiz-num">DOMANDA {qi + 1} / {questions.length}</div>
                              <div className="quiz-q">{q.domanda}</div>
                              <div className="quiz-options">
                                {q.opzioni.map((opt, oi) => {
                                  let cls = "quiz-opt";
                                  if (answers[qi] === oi) cls += " selected";
                                  if (submitted && oi === q.corretta) cls += " correct";
                                  if (submitted && answers[qi] === oi && oi !== q.corretta) cls += " wrong";
                                  return (
                                    <button key={oi} className={cls} onClick={() => handleAnswer(qi, oi)} disabled={submitted}>
                                      {String.fromCharCode(65 + oi)}. {opt}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                        {!submitted && (
                          <button className="quiz-submit" onClick={() => setSubmitted(true)} disabled={Object.keys(answers).length < questions.length}>
                            Consegna quiz →
                          </button>
                        )}
                        {submitted && (
                          <div className="quiz-result">
                            <div className="quiz-score">{quizScore}/{questions.length}</div>
                            <h3>Quiz completato!</h3>
                            <p>Hai risposto correttamente a {quizScore} domande su {questions.length}.</p>
                            <button className="btn-restart" style={{ marginTop: 24 }} onClick={() => { setAnswers({}); setSubmitted(false); setQuestions([]); }}>
                              🔄 Nuovo quiz
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* SPIEGAZIONI */}
                {activeTab === "explain" && (
                  <div>
                    <div className="summary-box" style={{ marginBottom: 16 }}>
                      {renderIntro("explain")}
                      <textarea
                        value={explainText}
                        onChange={(e) => setExplainText(e.target.value)}
                        placeholder="Incolla qui il testo che vuoi capire meglio..."
                        style={{ width: "100%", minHeight: 140, padding: "14px 16px", background: "#0a0a0a", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text)", fontFamily: "var(--font-body)", fontSize: "0.9rem", resize: "vertical", outline: "none", lineHeight: 1.6 }}
                      />
                      <button className="btn-generate" onClick={handleExplain} disabled={loadingExplain || explainText.trim().length < 20} style={{ marginTop: 12 }}>
                        {loadingExplain ? "⏳ Spiegando..." : "💡 Spiegamelo semplice"}
                      </button>
                    </div>
                    {loadingExplain && <div className="loading"><div className="spinner"></div><p>Sto elaborando una spiegazione semplice...</p></div>}
                    {explanation && !loadingExplain && (
                      <div className="summary-box">
                        <div className="summary-label">✨ Spiegazione</div>
                        <div className="summary-text">{explanation}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* DISCORSO */}
                {activeTab === "slides" && (
                  <div>
                    {loadingSlides && <div className="loading"><div className="spinner"></div><p>Generando la struttura del discorso...</p></div>}

                    {!loadingSlides && slides.length === 0 && (
                      <div className="summary-box" style={{ textAlign: "center" }}>
                        {renderIntro("slides")}
                        <p style={{ color: "var(--muted)", marginBottom: 12, fontSize: "0.8rem" }}>
                          {plan === "pro" ? "10 slide con 5 punti chiave + export PowerPoint ⚡" : "7 slide con 3 punti chiave per il piano Free"}
                        </p>
                        <button className="btn-generate" onClick={handleGenerateSlides}>🎤 Genera struttura discorso</button>
                      </div>
                    )}

                    {!loadingSlides && slides.length > 0 && (
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
                          <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{slides.length} slide generate</div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {plan === "pro" ? (
                              <button onClick={handleExportPptx} disabled={exportingPptx} style={{ background: "var(--lime)", color: "#000", border: "none", padding: "8px 20px", borderRadius: "100px", fontFamily: "var(--font-body)", fontSize: "0.85rem", fontWeight: 500, cursor: "pointer" }}>
                                {exportingPptx ? "⏳ Esportando..." : "⬇️ Scarica PowerPoint"}
                              </button>
                            ) : (
                              <button onClick={handleUpgradeToPro} style={{ background: "transparent", border: "1px solid rgba(200,241,53,0.3)", color: "var(--lime)", padding: "8px 20px", borderRadius: "100px", fontFamily: "var(--font-body)", fontSize: "0.85rem", cursor: "pointer" }}>
                                ⚡ Pro per scaricare il PowerPoint
                              </button>
                            )}
                            <button className="btn-new" onClick={() => setSlides([])}>↺ Rigenera</button>
                          </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                          {slides.map((slide, i) => (
                            <div key={i} style={{ background: slide.tipo === "apertura" || slide.tipo === "chiusura" ? "var(--bg)" : "var(--surface)", border: `1px solid ${slide.tipo === "apertura" || slide.tipo === "chiusura" ? "rgba(200,241,53,0.2)" : "var(--border)"}`, borderRadius: 16, padding: "24px 28px", borderLeft: "3px solid var(--lime)" }}>
                              <div style={{ fontSize: "0.7rem", letterSpacing: 2, textTransform: "uppercase", color: "var(--lime)", marginBottom: 10 }}>
                                {slide.tipo === "apertura" ? "🎬 Apertura" : slide.tipo === "chiusura" ? "🎯 Chiusura" : `📌 Slide ${i}`}
                              </div>
                              <div style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 700, marginBottom: 12 }}>{slide.titolo}</div>

                              {slide.tipo === "apertura" && (
                                <>
                                  <div style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 8 }}>{slide.sottotitolo}</div>
                                  <div style={{ background: "rgba(200,241,53,0.06)", border: "1px solid rgba(200,241,53,0.15)", borderRadius: 8, padding: "10px 14px", fontSize: "0.875rem", color: "var(--lime)", fontStyle: "italic" }}>
                                    "{slide.hook}"
                                  </div>
                                </>
                              )}

                              {slide.tipo === "contenuto" && (
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                  {(slide.punti || []).map((punto, j) => (
                                    <div key={j} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--lime)", flexShrink: 0, marginTop: 6 }}></div>
                                      <div style={{ fontSize: "0.9rem", color: "var(--muted)", lineHeight: 1.5 }}>{punto}</div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {slide.tipo === "chiusura" && (
                                <>
                                  <div style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 12 }}>{slide.messaggio}</div>
                                  <div style={{ background: "var(--lime)", borderRadius: 8, padding: "10px 16px", fontSize: "0.875rem", color: "#000", fontWeight: 600, textAlign: "center" }}>
                                    {slide.cta}
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* MAPPA MENTALE */}
                {activeTab === "mindmap" && (
                  <div>
                    {plan === "pro" && !mindmapMd && !loadingMindmap && (
                      <div className="summary-box" style={{ textAlign: "center" }}>
                        {renderIntro("mindmap")}
                        <button className="btn-generate" onClick={handleGenerateMindmap}>🗺️ Genera mappa mentale</button>
                      </div>
                    )}

                    {loadingMindmap && (
                      <div className="loading"><div className="spinner"></div><p>Generando la mappa mentale...</p></div>
                    )}

                    {plan === "pro" && mindmapMd && !loadingMindmap && (
                      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                        <button onClick={exportMindmapPng} style={{ background: "var(--lime)", color: "#000", border: "none", padding: "8px 20px", borderRadius: "100px", fontFamily: "var(--font-body)", fontSize: "0.85rem", fontWeight: 500, cursor: "pointer" }}>⬇️ Scarica PNG</button>
                        <button onClick={exportMindmapSvg} style={{ background: "transparent", color: "var(--lime)", border: "1px solid rgba(200,241,53,0.3)", padding: "8px 20px", borderRadius: "100px", fontFamily: "var(--font-body)", fontSize: "0.85rem", cursor: "pointer" }}>⬇️ Scarica SVG</button>
                        <button className="btn-new" onClick={handleGenerateMindmap}>↺ Rigenera</button>
                      </div>
                    )}

                    {(plan !== "pro" || (mindmapMd && !loadingMindmap)) && (
                      <div style={{ position: "relative", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
                        <svg ref={mindmapSvgRef} style={{ width: "100%", height: 600, color: "#f0f0f0", filter: plan === "pro" ? "none" : "blur(4px)" }} />
                        {plan !== "pro" && (
                          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(10,10,10,0.55)", textAlign: "center", padding: 24 }}>
                            <p style={{ fontWeight: 600, marginBottom: 6 }}>🗺️ Mappe mentali dei tuoi documenti</p>
                            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 16 }}>Genera ed esporta in PNG/SVG con il piano Pro.</p>
                            <button onClick={handleUpgradeToPro} style={{ background: "var(--lime)", color: "#000", border: "none", padding: "10px 24px", borderRadius: "100px", fontFamily: "var(--font-body)", fontSize: "0.9rem", fontWeight: 500, cursor: "pointer" }}>⚡ Passa a Pro</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}