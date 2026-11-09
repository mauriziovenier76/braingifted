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

export default function SpeakButton({ text, label = "Ascolta" }) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const speakingRef = useRef(false);
  const sessionRef = useRef(0);
  const idRef = useRef(Math.random().toString(36).slice(2));

  const setSpeak = (value) => {
    speakingRef.current = value;
    setSpeaking(value);
  };

  // All'avvio: controlla che il browser supporti la voce
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);
    window.speechSynthesis.getVoices(); // fa caricare le voci

    // Se parte un altro bottone, questo si ferma
    const onOtherStart = (e) => {
      if (e.detail !== idRef.current) setSpeak(false);
    };
    window.addEventListener("bg-speak-start", onOtherStart);

    return () => {
      window.removeEventListener("bg-speak-start", onOtherStart);
      // Se cambio tab mentre parla, smette di parlare
      if (speakingRef.current) window.speechSynthesis.cancel();
    };
  }, []);

  // Se cambia il testo (es. giri la flashcard) la lettura si ferma
  useEffect(() => {
    if (speakingRef.current) {
      window.speechSynthesis.cancel();
      setSpeak(false);
    }
  }, [text]);

  const start = () => {
    const sentences = splitSentences(cleanText(text));
    if (!sentences.length) return;

    window.speechSynthesis.cancel();
    window.dispatchEvent(new CustomEvent("bg-speak-start", { detail: idRef.current }));

    const session = ++sessionRef.current;
    const voice = pickItalianVoice();

    sentences.forEach((sentence, i) => {
      const u = new SpeechSynthesisUtterance(sentence);
      u.lang = "it-IT";
      if (voice) u.voice = voice;
      u.rate = 0.95; // un filo più lento del normale
      if (i === sentences.length - 1) {
        u.onend = () => { if (sessionRef.current === session) setSpeak(false); };
      }
      u.onerror = () => { if (sessionRef.current === session) setSpeak(false); };
      window.speechSynthesis.speak(u);
    });

    setSpeak(true);
  };

  const stop = () => {
    sessionRef.current++;
    window.speechSynthesis.cancel();
    setSpeak(false);
  };

  if (!supported) return null;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation(); // importante: sulla flashcard il click non deve girare la carta
        speaking ? stop() : start();
      }}
      aria-label={speaking ? "Ferma la lettura" : "Leggi ad alta voce"}
      style={{
        background: speaking ? "var(--lime)" : "transparent",
        color: speaking ? "#000" : "var(--lime)",
        border: "1px solid rgba(200,241,53,0.3)",
        padding: "8px 18px",
        borderRadius: "100px",
        fontFamily: "var(--font-body)",
        fontSize: "0.85rem",
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 0.2s",
      }}
    >
      {speaking ? "⏹ Ferma" : `🔊 ${label}`}
    </button>
  );
}