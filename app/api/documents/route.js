import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Salva un nuovo documento e il suo risultato
export async function POST(request) {
  try {
    const { userId, fileName, feature, content } = await request.json();

    // Crea il documento
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .insert({ user_id: userId, file_name: fileName })
      .select()
      .single();

    if (docError) throw docError;

    // Salva il risultato
    await supabase.from("results").insert({
      document_id: doc.id,
      user_id: userId,
      feature,
      content,
    });

    return NextResponse.json({ document: doc });
  } catch (err) {
    console.error("Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Recupera lo storico dell'utente
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const plan = searchParams.get("plan") || "free";
    const limit = plan === "pro" ? 1000 : 3;

    const { data: documents } = await supabase
      .from("documents")
      .select(`
        id,
        file_name,
        created_at,
        results (
          id,
          feature,
          content,
          created_at
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    return NextResponse.json({ documents: documents || [] });
  } catch (err) {
    console.error("Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Aggiungi un risultato a un documento esistente
export async function PUT(request) {
  try {
    const { documentId, userId, feature, content } = await request.json();

    // Controlla se esiste già un risultato per questa feature
    const { data: existing } = await supabase
      .from("results")
      .select("id")
      .eq("document_id", documentId)
      .eq("feature", feature)
      .single();

    if (existing) {
      // Aggiorna
      await supabase
        .from("results")
        .update({ content })
        .eq("id", existing.id);
    } else {
      // Inserisci
      await supabase.from("results").insert({
        document_id: documentId,
        user_id: userId,
        feature,
        content,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}