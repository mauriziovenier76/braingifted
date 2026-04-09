import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { LIMITS } from "../../../lib/limits";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { userId, feature } = await request.json();

    // Leggi il piano dell'utente
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", userId)
      .single();

    const plan = profile?.plan || "free";

    // Se Pro, registra e lascia passare
    if (plan === "pro") {
      await supabase.from("usage").insert({ user_id: userId, feature });
      return NextResponse.json({ allowed: true, plan });
    }

    // Conta utilizzi questo mese
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from("usage")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("feature", feature)
      .gte("created_at", startOfMonth.toISOString());

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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from("usage")
      .select("feature")
      .eq("user_id", userId)
      .gte("created_at", startOfMonth.toISOString());

    const counts = {};
    (data || []).forEach(row => {
      counts[row.feature] = (counts[row.feature] || 0) + 1;
    });

    return NextResponse.json({ counts });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}