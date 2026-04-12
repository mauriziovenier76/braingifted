import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { nome, email, messaggio } = await request.json();

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "BrainGifted <info@braingifted.com>",
        to: "info@braingifted.com",
        reply_to: email,
        subject: `Nuovo messaggio da ${nome}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#f9f9f9;border-radius:12px;">
            <h2 style="color:#0a0a0a;">Nuovo messaggio da BrainGifted</h2>
            <div style="background:#ffffff;border-radius:8px;padding:24px;margin-top:16px;">
              <p><strong>Nome:</strong> ${nome}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Messaggio:</strong></p>
              <p style="color:#444;">${messaggio}</p>
            </div>
            <p style="color:#999;font-size:0.8rem;margin-top:16px;">Inviato da braingifted.com/contatti</p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || "Errore invio email");
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Contact error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}