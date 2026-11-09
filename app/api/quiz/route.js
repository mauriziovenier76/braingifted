import { NextResponse } from "next/server";
import { getUserFromRequest } from "../../../lib/auth-server";
import { canUse, recordUsage } from "../../../lib/usage-server";
import { getStudyText } from "../../../lib/get-text";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request) {
  try {
    // 🔒 Chi sta chiamando? Se non è loggato, stop.
    const auth = await getUserFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "Devi effettuare l'accesso." }, { status: 401 });
    }

    // 🔒 Può ancora usare questa funzione questo mese?
    const check = await canUse(auth, "quiz");
    if (!check.allowed) {
      return NextResponse.json({ error: check.error, reason: check.reason }, { status: 403 });
    }

    // Testo dal PDF o dalle foto, con il limite del piano
    const formData = await request.formData();
    const doc = await getStudyText(formData, auth.plan);
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
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: `Sei un assistente di studio. Dal testo seguente crea 10 domande a scelta multipla in italiano.
Distribuisci le domande su TUTTO il testo, dall'inizio alla fine, non solo sulla prima parte.

Ogni domanda deve avere 4 opzioni di risposta (a, b, c, d) e una sola risposta corretta.

Rispondi SOLO con un array JSON puro, senza markdown, senza backtick:
[
  {
    "domanda": "...",
    "opzioni": ["...", "...", "...", "..."],
    "corretta": 0
  }
]

Il campo "corretta" è l'indice (0-3) dell'opzione corretta nell'array "opzioni".

Testo:
${doc.text}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      console.error("Anthropic error:", errData);
      return NextResponse.json({ error: "Errore API AI" }, { status: 500 });
    }

    const data = await response.json();
    const raw = data.content[0].text;
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    if (start === -1 || end === -1) throw new Error("JSON non trovato");
    const questions = JSON.parse(raw.slice(start, end + 1));

    // ✅ Tutto ok: registra l'utilizzo
    await recordUsage(auth, "quiz");
    return NextResponse.json({ questions, truncated: doc.truncated, maxPages: doc.maxPages });

  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Errore nella generazione. Riprova." }, { status: 500 });
  }
}
