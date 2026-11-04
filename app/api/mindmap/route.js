import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { extractText } from "unpdf";

export const runtime = "nodejs";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    // 1. Chi sta chiamando? (legge la sessione dai cookie)
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    // 2. È Pro?
    const { data: profile } = await admin
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single();
    if (profile?.plan !== "pro") {
      return NextResponse.json({ error: "Funzione riservata al piano Pro" }, { status: 403 });
    }

    // 3. Leggi il PDF
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) {
      return NextResponse.json({ error: "Nessun file ricevuto" }, { status: 400 });
    }

    const buffer = new Uint8Array(await file.arrayBuffer());
    const { text } = await extractText(buffer, { mergePages: true });
    const trimmedText = text?.slice(0, 8000) || "";
    if (trimmedText.trim().length < 50) {
      return NextResponse.json({ error: "Impossibile estrarre testo dal PDF" }, { status: 400 });
    }

    // 4. Chiedi la mappa all'AI
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: `Sei un esperto di studio e memorizzazione. Dal testo seguente crea una mappa mentale in italiano.

Regole:
- Rispondi SOLO con Markdown, senza backtick e senza spiegazioni.
- Una sola riga di titolo con "# " (il concetto centrale).
- Da 4 a 6 rami principali con "## ".
- Per ogni ramo da 2 a 4 sotto-concetti con "- ".
- Ogni etichetta deve essere BREVE: massimo 6 parole, niente frasi complete, niente punto finale.
- Usa solo i contenuti del testo, non inventare.

Esempio di formato:
# Fotosintesi
## Fase luminosa
- Avviene nei tilacoidi
- Produce ATP e NADPH
## Fase oscura
- Ciclo di Calvin
- Fissa la CO2

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
    let markdown = data.content[0].text
      .replace(/```[a-z]*\n?/gi, "")
      .replace(/```/g, "")
      .trim();

    // Controllo minimo di forma: deve iniziare con un titolo "# "
    const start = markdown.indexOf("# ");
    if (start === -1) throw new Error("Formato mappa non valido");
    markdown = markdown.slice(start);

    return NextResponse.json({ markdown });
  } catch (err) {
    console.error("Mindmap error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}