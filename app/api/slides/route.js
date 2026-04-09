import { NextResponse } from "next/server";
import { extractText } from "unpdf";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const plan = formData.get("plan") || "free";

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
    return NextResponse.json({ slides });

  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}