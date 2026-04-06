import { NextResponse } from "next/server";

export async function POST(request) {
  const { text } = await request.json();

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
          content: `Sei un assistente di studio. Analizza questo testo e crea un riassunto chiaro e ben strutturato in italiano. 
          
Organizza il riassunto così:
📌 PUNTI CHIAVE
- elenca i concetti principali

📝 RIASSUNTO
scrivi un riassunto dettagliato ma conciso

Testo da analizzare:
${text}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Errore API" }, { status: 500 });
  }

  const data = await response.json();
  const summary = data.content[0].text;
  return NextResponse.json({ summary });
}