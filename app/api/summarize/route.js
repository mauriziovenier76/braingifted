import { NextResponse } from "next/server";
import pdfParse from "pdf-parse/lib/pdf-parse.js";

export async function POST(request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!file) {
    return NextResponse.json({ error: "Nessun file ricevuto" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const pdfData = await pdfParse(buffer);
  const text = pdfData.text.slice(0, 8000);

  if (!text || text.length < 50) {
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
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Sei un assistente di studio. Analizza questo testo e crea un riassunto chiaro in italiano.

📌 PUNTI CHIAVE
- elenca i concetti principali

📝 RIASSUNTO
scrivi un riassunto dettagliato ma conciso

Testo:
${text}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Errore API AI" }, { status: 500 });
  }

  const data = await response.json();
  const summary = data.content[0].text;
  return NextResponse.json({ summary });
}