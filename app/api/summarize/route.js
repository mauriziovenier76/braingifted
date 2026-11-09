import { NextResponse } from "next/server";
import { getUserFromRequest } from "../../../lib/auth-server";
import { canUse, recordUsage } from "../../../lib/usage-server";
import { getStudyText } from "../../../lib/get-text";

export const runtime = "nodejs";
export const maxDuration = 60;

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
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: `Sei un assistente di studio. Analizza questo testo e crea un riassunto chiaro in italiano.
Il testo può essere lungo: copri TUTTI gli argomenti, dall'inizio alla fine, non solo i primi.

📌 PUNTI CHIAVE
- elenca i concetti principali

📝 RIASSUNTO
scrivi un riassunto dettagliato ma conciso

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
    const summary = data.content[0].text;

    // ✅ 4. Tutto ok: registra l'utilizzo
    await recordUsage(auth, "summary");

    return NextResponse.json({ summary, truncated: doc.truncated, maxPages: doc.maxPages });

  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}
