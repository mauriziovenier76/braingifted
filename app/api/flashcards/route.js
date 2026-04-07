import { NextResponse } from "next/server";
import { extractText } from "unpdf";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    const { text } = await extractText(buffer, { mergePages: true });
    const trimmedText = text?.slice(0, 8000) || "";

    console.log("Testo estratto (primi 200 char):", trimmedText.slice(0, 200));
    console.log("Lunghezza testo:", trimmedText.length);

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

    const data = await response.json();
    let raw = data.content[0].text;

    // Estrai direttamente tutto ciò che sta tra [ e ]
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    if (start === -1 || end === -1) throw new Error("JSON non trovato");
    const flashcards = JSON.parse(raw.slice(start, end + 1));
    return NextResponse.json({ flashcards });

  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}