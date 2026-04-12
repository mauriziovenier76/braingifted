export default function Termini() {
  return (
    <>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=clash-display@600,700&f[]=satoshi@300,400,500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --lime: #c8f135; --bg: #0a0a0a; --surface: #111111;
          --border: #222222; --text: #f0f0f0; --muted: #666666;
          --font-display: 'Clash Display', sans-serif;
          --font-body: 'Satoshi', sans-serif;
        }
        body { background: var(--bg); color: var(--text); font-family: var(--font-body); }
        .page { max-width: 720px; margin: 0 auto; padding: 80px 24px; }
        .back { display: inline-flex; align-items: center; gap: 8px; color: var(--muted); text-decoration: none; font-size: 0.9rem; margin-bottom: 48px; transition: color 0.2s; }
        .back:hover { color: var(--text); }
        .logo { font-family: var(--font-display); font-size: 1.2rem; font-weight: 700; color: var(--text); text-decoration: none; margin-bottom: 48px; display: block; }
        .logo span { color: var(--lime); }
        h1 { font-family: var(--font-display); font-size: 2.5rem; font-weight: 700; letter-spacing: -1px; margin-bottom: 8px; }
        .date { color: var(--muted); font-size: 0.85rem; margin-bottom: 48px; }
        h2 { font-family: var(--font-display); font-size: 1.3rem; font-weight: 700; margin: 40px 0 16px; color: var(--lime); }
        p { color: var(--muted); line-height: 1.8; margin-bottom: 16px; font-size: 0.95rem; }
        a { color: var(--lime); }
      `}</style>
      <div className="page">
        <a href="/" className="logo">Brain<span>Gifted</span></a>
        <a href="/" className="back">← Torna alla home</a>
        <h1>Termini di Servizio</h1>
        <p className="date">Ultimo aggiornamento: Aprile 2026</p>

        <h2>1. Accettazione dei termini</h2>
        <p>Utilizzando BrainGifted accetti i presenti Termini di Servizio. Se non accetti questi termini, ti preghiamo di non utilizzare il servizio.</p>

        <h2>2. Descrizione del servizio</h2>
        <p>BrainGifted è una piattaforma web che utilizza l'intelligenza artificiale per aiutare gli studenti a studiare più efficacemente attraverso riassunti automatici, flashcard, quiz e strutture per presentazioni.</p>

        <h2>3. Account utente</h2>
        <p>Per utilizzare BrainGifted è necessario creare un account. Sei responsabile della sicurezza delle tue credenziali di accesso e di tutte le attività che avvengono sotto il tuo account.</p>

        <h2>4. Piano Free e Piano Pro</h2>
        <p>BrainGifted offre un piano gratuito con funzionalità limitate e un piano Pro a pagamento con funzionalità avanzate. I limiti del piano Free possono essere modificati in qualsiasi momento con ragionevole preavviso.</p>

        <h2>5. Pagamenti</h2>
        <p>Il piano Pro è disponibile a €7/mese. I pagamenti vengono elaborati tramite Stripe. Puoi cancellare il tuo abbonamento in qualsiasi momento. Non sono previsti rimborsi per periodi parziali.</p>

        <h2>6. Contenuti caricati</h2>
        <p>Sei responsabile dei contenuti che carichi su BrainGifted. Non caricare materiale protetto da copyright senza autorizzazione. BrainGifted non rivendica la proprietà dei tuoi documenti.</p>

        <h2>7. Privacy</h2>
        <p>Il trattamento dei dati personali è descritto nella nostra Privacy Policy. Utilizzando il servizio accetti il trattamento dei tuoi dati come descritto.</p>

        <h2>8. Limitazione di responsabilità</h2>
        <p>BrainGifted non garantisce l'accuratezza dei contenuti generati dall'AI. Il servizio viene fornito "così com'è" senza garanzie di alcun tipo.</p>

        <h2>9. Modifiche ai termini</h2>
        <p>Ci riserviamo il diritto di modificare questi termini in qualsiasi momento. Le modifiche saranno comunicate via email o tramite avviso sulla piattaforma.</p>

        <h2>10. Contatti</h2>
        <p>Per qualsiasi domanda sui presenti termini, contattaci su <a href="/contatti">braingifted.com/contatti</a>.</p>
      </div>
    </>
  );
}