import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserFromRequest } from "../../../lib/auth-server";

export const runtime = "nodejs";
export const maxDuration = 60;

const LIST_ID = "christian";
const BATCH_SIZE = 80; // parole per ogni chiamata all'AI

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function isAdmin(request) {
  const auth = await getUserFromRequest(request);
  if (!auth?.user?.email) return false;
  const admins = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(auth.user.email.toLowerCase());
}

// Categorizza con l'AI un gruppo di parole senza categoria.
// Va chiamata più volte finché "remaining" arriva a 0.
export async function POST(request) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: "Solo l'amministratore può farlo." }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("word_lists")
      .select("words")
      .eq("id", LIST_ID)
      .maybeSingle();
    if (error) throw error;

    const words = data?.words || [];
    const todo = [];
    words.forEach((w, i) => { if (!w.cat || !w.sub) todo.push(i); });

    if (!todo.length) {
      return NextResponse.json({ done: 0, remaining: 0, words });
    }

    // Categorie già usate: l'AI le riusa per restare coerente
    const existing = {};
    words.forEach((w) => {
      if (!w.cat) return;
      existing[w.cat] = existing[w.cat] || new Set();
      if (w.sub) existing[w.cat].add(w.sub);
    });
    const existingText = Object.keys(existing).length
      ? Object.entries(existing).map(([c, subs]) => `- ${c}: ${[...subs].join(", ")}`).join("\n")
      : "(nessuna ancora)";

    const batch = todo.slice(0, BATCH_SIZE);
    const list = batch.map((i) => `${i}|${words[i].it}|${words[i].en}`).join("\n");

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
            content: `Classifica questi vocaboli (italiano|inglese) per un ragazzo che studia inglese.
Per ognuno scegli una CATEGORIA e una SOTTOCATEGORIA in italiano, in MAIUSCOLO, brevi (1-3 parole).

Esempi di categorie e sottocategorie:
- CIBI: VERDURE, FRUTTA, FORMAGGI, CARNE, PESCE, DOLCI, BEVANDE
- STATI: NAZIONI, NAZIONALITÀ
- FAMIGLIA: PARENTI
- CASA: STANZE, MOBILI, OGGETTI
- VERBI: AZIONI QUOTIDIANE, MOVIMENTO
- AGGETTIVI: CARATTERE, ASPETTO FISICO

Categorie già usate (riusale quando vanno bene, crea nuove solo se servono):
${existingText}

Rispondi SOLO con una riga per vocabolo, nel formato:
numero|CATEGORIA|SOTTOCATEGORIA

Vocaboli (numero|italiano|inglese):
${list}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("Anthropic error:", await response.text());
      return NextResponse.json({ error: "Errore dell'AI. Riprova." }, { status: 500 });
    }

    const ai = await response.json();
    const text = ai.content?.[0]?.text || "";
    const allowed = new Set(batch);
    let done = 0;

    text.split("\n").forEach((line) => {
      const parts = line.split("|").map((p) => p.trim());
      if (parts.length < 3) return;
      const i = Number(parts[0]);
      if (!allowed.has(i)) return;
      const cat = parts[1].toUpperCase().slice(0, 60);
      const sub = parts[2].toUpperCase().slice(0, 60);
      if (!cat || !sub) return;
      words[i] = { ...words[i], cat, sub };
      allowed.delete(i);
      done++;
    });

    if (!done) {
      return NextResponse.json({ error: "L'AI non ha restituito categorie valide. Riprova." }, { status: 500 });
    }

    const { error: saveError } = await supabaseAdmin
      .from("word_lists")
      .update({ words, updated_at: new Date().toISOString() })
      .eq("id", LIST_ID);
    if (saveError) throw saveError;

    const remaining = words.filter((w) => !w.cat || !w.sub).length;
    return NextResponse.json({ done, remaining, words });
  } catch (err) {
    console.error("Categorize error:", err);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}
