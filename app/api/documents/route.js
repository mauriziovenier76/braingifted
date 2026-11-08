import { NextResponse } from "next/server";
import { getUserFromRequest } from "../../../lib/auth-server";

const unauthorized = () =>
  NextResponse.json({ error: "Devi effettuare l'accesso." }, { status: 401 });

// Salva un nuovo documento e il suo risultato
export async function POST(request) {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return unauthorized();
    const supabase = auth.supabaseAdmin;
    const userId = auth.user.id;

    const { fileName, feature, content } = await request.json();

    const { data: doc, error: docError } = await supabase
      .from("documents")
      .insert({ user_id: userId, file_name: fileName })
      .select()
      .single();

    if (docError) throw docError;

    await supabase.from("results").insert({
      document_id: doc.id,
      user_id: userId,
      feature,
      content,
    });

    return NextResponse.json({ document: doc });
  } catch (err) {
    console.error("Documents POST error:", err);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}

// Recupera lo storico dell'utente
export async function GET(request) {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return unauthorized();
    const limit = auth.plan === "pro" ? 1000 : 3;

    const { data: documents } = await auth.supabaseAdmin
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
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    return NextResponse.json({ documents: documents || [] });
  } catch (err) {
    console.error("Documents GET error:", err);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}

// Aggiungi un risultato a un documento esistente
export async function PUT(request) {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return unauthorized();
    const supabase = auth.supabaseAdmin;
    const userId = auth.user.id;

    const { documentId, feature, content } = await request.json();

    // 🔒 Il documento deve appartenere a chi sta chiamando
    const { data: doc } = await supabase
      .from("documents")
      .select("id")
      .eq("id", documentId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!doc) {
      return NextResponse.json({ error: "Documento non trovato." }, { status: 404 });
    }

    const { data: existing } = await supabase
      .from("results")
      .select("id")
      .eq("document_id", documentId)
      .eq("feature", feature)
      .maybeSingle();

    if (existing) {
      await supabase.from("results").update({ content }).eq("id", existing.id);
    } else {
      await supabase.from("results").insert({
        document_id: documentId,
        user_id: userId,
        feature,
        content,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Documents PUT error:", err);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}