import { NextResponse } from "next/server";
import { extractText } from "unpdf";
import { getUserFromRequest } from "../../../lib/auth-server";
import { canUse, recordUsage } from "../../../lib/usage-server";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    // 🔒 Chi sta chiamando? Se non è loggato, stop.
    const auth = await getUserFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "Devi effettuare l'accesso." }, { status: 401 });
    }

    // 🔒 Può ancora usare questa funzione questo mese?
    const check = await canUse(auth, "slides");
    if (!check.allowed) {
      return NextResponse.json({ error: check.error, reason: check.reason }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const plan = auth.plan; // il piano lo legge il server, non il browser

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    const { text } = await extractText(buffer, { mergePages: true });
    const trimmedText = text?.slice(0, 8000) || "";

    const slideCount = plan === "pro" ? 10 : 7;
    const pointCount = plan === "pro" ? 5 : 3;

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
            content: `Sei un esperto di comunicazione e presentazioni. Dal testo seguente crea una struttura per una presentazione orale in italiano.

La struttura deve avere:
- 1 slide di apertura (titolo + sottotitolo + 1 frase di hook)
- ${slideCount} slide di contenuto (titolo + esattamente ${pointCount} punti chiave brevi)
- 1 slide di chiusura (titolo + messaggio finale + 1 call to action)

Rispondi SOLO con un array JSON puro, senza markdown, senza backtick:
[
  {
    "tipo": "apertura",
    "titolo": "...",
    "sottotitolo": "...",
    "hook": "..."
  },
  {
    "tipo": "contenuto",
    "titolo": "...",
    "punti": ["...", "...", "..."]
  },
  {
    "tipo": "chiusura",
    "titolo": "...",
    "messaggio": "...",
    "cta": "..."
  }
]

Testo:
${trimmedText}`,
          },
        ],
      }),
    });

    const data = await response.json();
    let raw = data.content[0].text;
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    const slides = JSON.parse(raw.slice(start, end + 1));
    // ✅ Tutto ok: registra l'utilizzo
    await recordUsage(auth, "slides");
    return NextResponse.json({ slides });

  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Errore nella generazione. Riprova." }, { status: 500 });
  }
}