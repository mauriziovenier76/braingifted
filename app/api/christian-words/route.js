import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const LIST_ID = "christian";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Storico dei test (gli ultimi 50)
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("word_tests")
      .select("id, created_at, total, correct")
      .eq("list_id", LIST_ID)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return NextResponse.json({ tests: data || [] });
  } catch (err) {
    console.error("Word tests GET error:", err);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}

// Salva un test appena finito
export async function POST(request) {
  try {
    const { total, correct } = await request.json();
    const t = Number(total);
    const c = Number(correct);

    // Controllo che i numeri abbiano senso
    if (!Number.isInteger(t) || !Number.isInteger(c) || t < 1 || t > 5000 || c < 0 || c > t) {
      return NextResponse.json({ error: "Dati del test non validi." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("word_tests")
      .insert({ list_id: LIST_ID, total: t, correct: c })
      .select("id, created_at, total, correct")
      .single();
    if (error) throw error;

    return NextResponse.json({ test: data });
  } catch (err) {
    console.error("Word tests POST error:", err);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}
