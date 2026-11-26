import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserFromRequest } from "../../../lib/auth-server";

export const runtime = "nodejs";

const LIST_ID = "christian";
const MAX_WORDS = 5000;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const normalize = (s) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

// È l'amministratore? (le email sono nella variabile ADMIN_EMAILS, separate da virgola)
async function isAdmin(request) {
  const auth = await getUserFromRequest(request);
  if (!auth?.user?.email) return false;
  const admins = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(auth.user.email.toLowerCase());
}

// Legge la lista (aperta a tutti: serve a Christian per fare il test)
export async function GET(request) {
  try {
    const { data } = await supabaseAdmin
      .from("word_lists")
      .select("words, updated_at")
      .eq("id", LIST_ID)
      .maybeSingle();

    const hasToken = (request.headers.get("authorization") || "").startsWith("Bearer ");
    const canEdit = hasToken ? await isAdmin(request) : false;

    return NextResponse.json({
      words: data?.words || [],
      updatedAt: data?.updated_at || null,
      canEdit,
    });
  } catch (err) {
    console.error("Word list GET error:", err);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}

// Salva una nuova lista (solo l'amministratore)
export async function POST(request) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: "Solo l'amministratore può caricare la lista." }, { status: 403 });
    }

    const body = await request.json();
    if (!Array.isArray(body?.words)) {
      return NextResponse.json({ error: "Lista non valida." }, { status: 400 });
    }

    // Pulizia lato server: testi brevi, niente vuoti, niente doppioni
    const seen = new Set();
    const words = [];
    for (const w of body.words) {
      const it = String(w?.it ?? "").trim().slice(0, 200);
      const en = String(w?.en ?? "").trim().slice(0, 200);
      if (!it || !en) continue;
      const key = normalize(it);
      if (seen.has(key)) continue;
      seen.add(key);
      words.push({ it, en });
      if (words.length >= MAX_WORDS) break;
    }

    if (!words.length) {
      return NextResponse.json({ error: "Nessuna parola valida nella lista." }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("word_lists")
      .upsert({ id: LIST_ID, words, updated_at: new Date().toISOString() });
    if (error) throw error;

    return NextResponse.json({ words });
  } catch (err) {
    console.error("Word list POST error:", err);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}
