import { createClient } from "@supabase/supabase-js";

// Client "admin" di Supabase: si usa SOLO lato server
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Legge il token dall'header della richiesta e restituisce utente + piano.
// Se il token manca o non è valido, restituisce null.
export async function getUserFromRequest(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return null;

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  return { user, plan: profile?.plan || "free", supabaseAdmin };
}