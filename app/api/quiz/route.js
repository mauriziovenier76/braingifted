import { NextResponse } from "next/server";
import { extractText } from "unpdf";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "Nessun file ricevuto" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    const { text } = await extractText(buffer, { mergePages: true });
    const trimmedText = text?.slice(0, 8000) || "";

    if (!trimmedText || trimmedText.trim().length < 50) {
      return NextResponse.json({ error: "Impossibile estrarre testo dal PDF" }, { status: 400 });
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
${trimmedText}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Errore API AI" }, { status: 500 });
    }

    const data = await response.json();
    let raw = data.content[0].text;
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    if (start === -1 || end === -1) throw new Error("JSON non trovato");
    const questions = JSON.parse(raw.slice(start, end + 1));
    return NextResponse.json({ questions });

  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}