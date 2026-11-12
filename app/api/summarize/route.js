import { NextResponse } from "next/server";
import { getUserFromRequest } from "../../../lib/auth-server";
import { canUse, recordUsage } from "../../../lib/usage-server";
import { getStudyText } from "../../../lib/get-text";

export const runtime = "nodejs";
export const maxDuration = 60;

// Prompt del riassunto: normale oppure semplificato
function buildPrompt(mode, text) {
  if (mode === "simple") {
    return `Sei un tutor per studenti con DSA (dislessia e altri disturbi dell'apprendimento).
Crea un riassunto SEMPLIFICATO in italiano di questo testo.
Il testo può essere lungo: copri TUTTI gli argomenti, dall'inizio alla fine, non solo i primi.

Regole di scrittura (rispettale sempre):
- Frasi brevi: massimo 15 parole per frase.
- Un solo concetto per frase.
- Parole semplici e di uso comune. Niente giri di parole.
- Usa la forma attiva ("Il cuore pompa il sangue"), non la passiva.
- Quando usi un termine tecnico o difficile, scrivilo in grassetto con **due asterischi** e spiegalo subito tra parentesi con parole semplici. Spiegalo solo la prima volta.
- Usa elenchi puntati con il trattino "- ".
- Niente tabelle, niente corsivo, niente note a piè di pagina.

Struttura (usa esattamente questi titoli):

📌 IN BREVE
2 o 3 frasi che dicono di cosa parla il testo.

🧩 I CONCETTI PRINCIPALI
Per ogni argomento: una riga con il nome dell'argomento, poi 2-4 punti brevi.

📖 PAROLE DA RICORDARE
- **termine**: spiegazione semplice in una frase.

Testo:
${text}`;
  }

  return `Sei un assistente di studio. Analizza questo testo e crea un riassunto chiaro in italiano.
Il testo può essere lungo: copri TUTTI gli argomenti, dall'inizio alla fine, non solo i primi.

📌 PUNTI CHIAVE
- elenca i concetti principali

📝 RIASSUNTO
scrivi un riassunto dettagliato ma conciso

Testo:
${text}`;
}

export async function POST(request) {
  try {
    // 🔒 1. Chi sta chiamando? Se non è loggato, stop.
    const auth = await getUserFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "Devi effettuare l'accesso." }, { status: 401 });
    }

    // 🔒 2. Può ancora usare questa funzione questo mese?
    const check = await canUse(auth, "summary");
    if (!check.allowed) {
      return NextResponse.json({ error: check.error, reason: check.reason }, { status: 403 });
    }

    // 3. Testo dal PDF o dalle foto, con il limite del piano
    const formData = await request.formData();
    const doc = await getStudyText(formData, auth.plan);
    // "simple" = riassunto semplificato (DSA), altrimenti quello normale
    const mode = formData.get("mode") === "simple" ? "simple" : "normal";
    if (doc.error) {
      return NextResponse.json({ error: doc.error }, { status: 400 });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: mode === "simple" ? 3000 : 2048, // il semplificato ha anche il glossario
        messages: [{ role: "user", content: buildPrompt(mode, doc.text) }],
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      console.error("Anthropic error:", errData);
      return NextResponse.json({ error: "Errore API AI" }, { status: 500 });
    }

    const data = await response.json();
    const summary = data.content[0].text;

    // ✅ 4. Tutto ok: registra l'utilizzo
    await recordUsage(auth, "summary");

    return NextResponse.json({ summary, mode, truncated: doc.truncated, maxPages: doc.maxPages });

  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}
