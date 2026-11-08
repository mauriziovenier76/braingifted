import { LIMITS } from "./limits";

const FEATURE_NAMES = {
  summary: "riassunti",
  flashcards: "flashcard",
  quiz: "quiz",
  slides: "presentazioni",
};

function startOfMonthISO() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// Controlla se l'utente può usare la funzione (NON registra l'uso)
export async function canUse(auth, feature) {
  if (auth.plan === "pro") return { allowed: true };

  const limit = LIMITS.free[feature] ?? 0;
  if (limit === 0) {
    return { allowed: false, reason: "pro_only", error: "Questa funzione è disponibile solo per il piano Pro." };
  }

  const { count } = await auth.supabaseAdmin
    .from("usage")
    .select("*", { count: "exact", head: true })
    .eq("user_id", auth.user.id)
    .eq("feature", feature)
    .gte("created_at", startOfMonthISO());

  if (count >= limit) {
    const name = FEATURE_NAMES[feature] || "utilizzi";
    return {
      allowed: false,
      reason: "limit_reached",
      limit,
      error: `Hai raggiunto il limite di ${limit} ${name}/mese del piano Free. Passa a Pro per continuare!`,
    };
  }

  return { allowed: true };
}

// Registra un utilizzo (da chiamare DOPO che l'AI ha risposto bene)
export async function recordUsage(auth, feature) {
  await auth.supabaseAdmin.from("usage").insert({ user_id: auth.user.id, feature });
}