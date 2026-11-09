import { NextResponse } from "next/server";
import { getUserFromRequest } from "../../../lib/auth-server";

export const runtime = "nodejs";
export const maxDuration = 60; // leggere 5 foto può richiedere 20-30 secondi

const MAX_PER_REQUEST = 5;                 // foto per singola chiamata (limite di Vercel sul peso)
const MAX_BYTES = 4 * 1024 * 1024;         // 4 MB per foto
const TYPES = ["image/jpeg", "image/png", "image/webp"];

const PROMPT = `Sei un trascrittore di appunti scolastici. Trascrivi fedelmente in italiano il testo delle foto, nell'ordine in cui le ricevi.

Regole:
- Trascrivi SOLO il foglio principale, quello in primo piano.
- IGNORA il testo che si vede in trasparenza dal retro del foglio (appare al contrario e sbiadito).
- IGNORA i pezzi di altri fogli che spuntano ai bordi della foto.
- Mantieni titoli, elenchi puntati e numerati.
- Le note scritte a mano a margine o sui post-it includile nel punto giusto, così: [Nota a mano: ...]
- Se una parola non si legge, scrivi [illeggibile].
- Non aggiungere commenti, spiegazioni o riassunti: solo il testo trascritto.`;

export async function POST(request) {
  try {
    // 🔒 1. Solo utenti loggati
    const auth = await getUserFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "Devi effettuare l'accesso." }, { status: 401 });
    }

    // 2. Prende le foto dal form
    const formData = await request.formData();
    const photos = formData.getAll("photos").filter((f) => f && typeof f === "object");

    if (!photos.length) {
      return NextResponse.json({ error: "Nessuna foto ricevuta." }, { status: 400 });
    }
    if (photos.length > MAX_PER_REQUEST) {
      return NextResponse.json({ error: `Massimo ${MAX_PER_REQUEST} foto per volta.` }, { status: 400 });
    }

    // 3. Prepara le immagini per Claude
    const content = [];
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      if (!TYPES.includes(photo.type)) {
        return NextResponse.json({ error: "Formato non supportato. Usa JPG o PNG." }, { status: 400 });
      }
      if (photo.size > MAX_BYTES) {
        return NextResponse.json({ error: "Una delle foto è troppo pesante." }, { status: 400 });
      }
      const base64 = Buffer.from(await photo.arrayBuffer()).toString("base64");
      content.push({ type: "text", text: `Foto ${i + 1}:` });
      content.push({ type: "image", source: { type: "base64", media_type: photo.type, data: base64 } });
    }
    content.push({ type: "text", text: PROMPT });

    // 4. Chiede a Claude di trascrivere
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 8000,
        messages: [{ role: "user", content }],
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      console.error("OCR Anthropic error:", errData);
      return NextResponse.json({ error: "Errore nella lettura delle foto." }, { status: 500 });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text?.trim() || "";

    if (text.length < 50) {
      return NextResponse.json({ error: "Non sono riuscito a leggere testo nelle foto. Prova con foto più nitide." }, { status: 400 });
    }

    return NextResponse.json({ text });

  } catch (err) {
    console.error("OCR server error:", err);
    return NextResponse.json({ error: "Errore del server." }, { status: 500 });
  }
}
