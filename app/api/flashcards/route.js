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
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: `Sei un assistente di studio. Dal testo seguente estrai i concetti chiave e crea esattamente 10 flashcard domanda/risposta in italiano.

Rispondi SOLO con un JSON valido, senza testo aggiuntivo, in questo formato:
[
  {"domanda": "...", "risposta": "..."},
  {"domanda": "...", "risposta": "..."}
]

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
    const raw = data.content[0].text;
    const flashcards = JSON.parse(raw);
    return NextResponse.json({ flashcards });

  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}