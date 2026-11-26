// Pagina "nascosta": raggiungibile solo con il link diretto
export const metadata = {
  title: "BrainGifted",
  robots: { index: false, follow: false }, // dice a Google di non mostrarla nelle ricerche
};

export default function ChristianPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#0a0a0a", color: "#f0f0f0", padding: "64px 24px", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ fontSize: "2.5rem", marginBottom: 16 }}>
          Ciao <span style={{ color: "#c8f135" }}>Christian</span> 👋
        </h1>
        <p style={{ color: "#999", lineHeight: 1.7 }}>
          Questa è una pagina riservata a te.
        </p>
      </div>
    </main>
  );
}
