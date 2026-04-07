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
            content: `Sei un assistente di studio. Dal testo seguente crea 10 flashcard domanda/risposta in italiano.

Rispondi SOLO con un array JSON, senza markdown, senza backtick, senza spiegazioni. Solo JSON puro:
[{"domanda":"...","risposta":"..."},{"domanda":"...","risposta":"..."}]

Testo:
${trimmedText}`,
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
    let raw = data.content[0].text.trim();

    // Rimuove eventuali backtick o markdown
    raw = raw.replace(/```json/g, "").replace(/```/g, "").trim();

    // Estrae solo la parte JSON
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    if (start === -1 || end === -1) throw new Error("JSON non trovato nella risposta");
    const jsonStr = raw.slice(start, end + 1);

    const flashcards = JSON.parse(jsonStr);
    return NextResponse.json({ flashcards });

  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}