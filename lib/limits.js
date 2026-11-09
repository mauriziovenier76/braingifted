export const LIMITS = {
  free: {
    summary: 3,
    flashcards: 3,
    quiz: 3,
    explain: 0,
    slides: 3,
    mindmap: 0,
  },
  pro: {
    summary: Infinity,
    flashcards: Infinity,
    quiz: Infinity,
    explain: Infinity,
    slides: Infinity,
    mindmap: Infinity,
  },
};

export const FEATURE_NAMES = {
  summary: "Riassunti",
  flashcards: "Flashcard",
  quiz: "Quiz",
  explain: "Spiegazioni",
  slides: "Struttura del discorso",
  mindmap: "Mappa mentale",
};

// Quante foto si possono caricare per ogni documento
export const PHOTO_LIMITS = {
  free: 5,
  pro: 20,
};

// Quanto testo legge l'AI per ogni documento (1 pagina ≈ 2.500 caratteri).
// "pages" serve solo per mostrarlo all'utente in modo chiaro.
export const TEXT_LIMITS = {
  free: { chars: 20000, pages: 8 },
  pro: { chars: 60000, pages: 25 },
};
