import { NextResponse } from "next/server";
import { LIMITS } from "../../../lib/limits";
import { getUserFromRequest } from "../../../lib/auth-server";

function startOfMonthISO() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function POST(request) {
  try {
    // 🔒 L'utente e il piano li legge il server dal token
    const auth = await getUserFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "Devi effettuare l'accesso." }, { status: 401 });
    }
    const { user, plan, supabaseAdmin: supabase } = auth;
    const userId = user.id;

    const { feature } = await request.json();

    // Se Pro, registra e lascia passare
    if (plan === "pro") {
      await supabase.from("usage").insert({ user_id: userId, feature });
      return NextResponse.json({ allowed: true, plan });
    }

    // Conta utilizzi questo mese
    const { count } = await supabase
      .from("usage")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("feature", feature)
      .gte("created_at", startOfMonthISO());

    const limit = LIMITS.free[feature] ?? 0;

    if (limit === 0) {
      return NextResponse.json({ allowed: false, plan, reason: "pro_only" });
    }

    if (count >= limit) {
      return NextResponse.json({ allowed: false, plan, reason: "limit_reached", count, limit });
    }

    // Registra utilizzo
    await supabase.from("usage").insert({ user_id: userId, feature });
    return NextResponse.json({ allowed: true, plan, count: count + 1, limit });

  } catch (err) {
    console.error("Usage error:", err);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "Devi effettuare l'accesso." }, { status: 401 });
    }

    const { data } = await auth.supabaseAdmin
      .from("usage")
      .select("feature")
      .eq("user_id", auth.user.id)
      .gte("created_at", startOfMonthISO());

    const counts = {};
    (data || []).forEach(row => {
      counts[row.feature] = (counts[row.feature] || 0) + 1;
    });

    return NextResponse.json({ counts });
  } catch (err) {
    console.error("Usage GET error:", err);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}