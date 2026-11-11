"use client";
import { useEffect, useRef, useState } from "react";

// Toglie i simboli markdown (**, #, -) che la voce leggerebbe male
function cleanText(text) {
  return (text || "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/^[-•*]\s+/gm, "")
    .replace(/[_`>]/g, "")
    .trim();
}

// Divide il testo in frasi: Chrome si blocca se gli dai un testo troppo lungo
function splitSentences(text) {
  const parts = text.match(/[^.!?\n]+[.!?]*/g) || [];
  return parts.map((p) => p.trim()).filter(Boolean);
}

// Cerca una voce italiana tra quelle installate
function pickItalianVoice() {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === "it-IT") ||
    voices.find((v) => v.lang && v.lang.startsWith("it")) ||
    null
  );
}

/*
  Stati del bottone:
  - "idle"     → fermo:      [🔊 Ascolta]
  - "playing"  → sta leggendo: [⏸ Pausa] [⏹]
  - "paused"   → in pausa:   [▶ Riprendi] [⏹]

  La pausa la gestiamo noi, frase per frase: ci ricordiamo a che frase eravamo
  e alla ripresa ripartiamo da lì. È più affidabile di speechSynthesis.pause(),
  che su alcuni browser (es. Chrome su Android) non funziona bene.
*/
export default function SpeakButton({ text, label = "Ascolta" }) {
  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState("idle");
  const statusRef = useRef("idle");
  const sentencesRef = useRef([]);
  const indexRef = useRef(0);   // frase da leggere
  const sessionRef = useRef(0); // ogni avvio/stop crea una nuova "sessione"
  const idRef = useRef(Math.random().toString(36).slice(2));

  const setState = (value) => {
    statusRef.current = value;
    setStatus(value);
  };

  // All'avvio: controlla che il browser supporti la voce
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);
    window.speechSynthesis.getVoices(); // fa caricare le voci

    // Se parte un altro bottone, questo si ferma del tutto
    const onOtherStart = (e) => {
      if (e.detail !== idRef.current && statusRef.current !== "idle") {
        sessionRef.current++;
        setState("idle");
      }
    };
    window.addEventListener("bg-speak-start", onOtherStart);

    return () => {
      window.removeEventListener("bg-speak-start", onOtherStart);
      // Se cambio tab mentre parla, smette di parlare
      if (statusRef.current === "playing") window.speechSynthesis.cancel();
      sessionRef.current++;
    };
  }, []);

  // Se cambia il testo (es. giri la flashcard) si ricomincia da capo
  useEffect(() => {
    if (statusRef.current !== "idle") {
      sessionRef.current++;
      window.speechSynthesis.cancel();
      setState("idle");
    }
    indexRef.current = 0;
  }, [text]);

  // Legge una frase alla volta, poi passa alla successiva
  const speakFrom = (session) => {
    if (sessionRef.current !== session) return; // nel frattempo è stato messo in pausa o fermato
    const sentences = sentencesRef.current;
    if (indexRef.current >= sentences.length) {
      indexRef.current = 0;
      setState("idle");
      return;
    }
    const u = new SpeechSynthesisUtterance(sentences[indexRef.current]);
    u.lang = "it-IT";
    const voice = pickItalianVoice();
    if (voice) u.voice = voice;
    u.rate = 0.95; // un filo più lento del normale
    u.onend = () => {
      if (sessionRef.current !== session) return;
      indexRef.current++;
      speakFrom(session);
    };
    u.onerror = () => {
      if (sessionRef.current !== session) return;
      setState("idle");
    };
    window.speechSynthesis.speak(u);
  };

  const play = () => {
    // Se è fermo, prepara le frasi e parte dall'inizio
    if (statusRef.current === "idle") {
      sentencesRef.current = splitSentences(cleanText(text));
      indexRef.current = 0;
      if (!sentencesRef.current.length) return;
    }
    window.speechSynthesis.cancel();
    window.dispatchEvent(new CustomEvent("bg-speak-start", { detail: idRef.current }));
    const session = ++sessionRef.current;
    setState("playing");
    speakFrom(session);
  };

  const pause = () => {
    sessionRef.current++;            // la frase in corso non farà partire la successiva
    window.speechSynthesis.cancel(); // indexRef resta sulla frase interrotta: si riprende da lì
    setState("paused");
  };

  const stop = () => {
    sessionRef.current++;
    window.speechSynthesis.cancel();
    indexRef.current = 0;
    setState("idle");
  };

  if (!supported) return null;

  const base = {
    border: "1px solid rgba(200,241,53,0.3)",
    padding: "8px 18px",
    borderRadius: "100px",
    fontFamily: "inherit",
    fontSize: "0.85rem",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s",
  };
  const on = { ...base, background: "var(--lime)", color: "#000" };
  const off = { ...base, background: "transparent", color: "var(--lime)" };

  // stopPropagation: sulla flashcard il click non deve girare la carta
  const click = (fn) => (e) => { e.stopPropagation(); fn(); };

  if (status === "idle") {
    return (
      <button onClick={click(play)} aria-label="Leggi ad alta voce" style={off}>
        🔊 {label}
      </button>
    );
  }

  return (
    <span style={{ display: "inline-flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
      {status === "playing" ? (
        <button onClick={click(pause)} aria-label="Metti in pausa" style={on}>⏸ Pausa</button>
      ) : (
        <button onClick={click(play)} aria-label="Riprendi la lettura" style={on}>▶ Riprendi</button>
      )}
      <button onClick={click(stop)} aria-label="Ferma e torna all'inizio" style={off}>⏹ Stop</button>
    </span>
  );
}
