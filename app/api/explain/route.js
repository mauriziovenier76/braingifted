import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { text } = await request.json();

    if (!text || text.trim().length < 20) {
      return NextResponse.json({ error: "Testo troppo breve." }, { status: 400 });
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
            content: `Sei un insegnante brillante. Spiega il seguente concetto in modo semplice e chiaro, come se lo spiegassi ad uno studente di 14 anni. Usa esempi pratici e analogie della vita quotidiana. Rispondi in italiano.

Concetto da spiegare:
${text}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Errore API AI" }, { status: 500 });
    }

    const data = await response.json();
    const explanation = data.content[0].text;
    return NextResponse.json({ explanation });

  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}