"use client";
import { useState, useEffect } from "react";

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --lime: #c8f135;
          --lime-dark: #a8cc1a;
          --bg: #0a0a0a;
          --surface: #111111;
          --surface2: #1a1a1a;
          --border: #222222;
          --text: #f0f0f0;
          --muted: #666666;
          --font-display: 'Syne', sans-serif;
          --font-body: 'DM Sans', sans-serif;
        }

        html { scroll-behavior: smooth; }

        body {
          background: var(--bg);
          color: var(--text);
          font-family: var(--font-body);
          font-weight: 300;
          line-height: 1.6;
          overflow-x: hidden;
        }

        /* NAV */
        nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          padding: 20px 48px;
          display: flex; align-items: center; justify-content: space-between;
          transition: all 0.3s ease;
        }
        nav.scrolled {
          background: rgba(10,10,10,0.85);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border);
          padding: 14px 48px;
        }
        .nav-logo {
          font-family: var(--font-display);
          font-size: 1.4rem;
          font-weight: 800;
          color: var(--text);
          text-decoration: none;
          letter-spacing: -0.5px;
        }
        .nav-logo span { color: var(--lime); }
        .nav-links { display: flex; align-items: center; gap: 32px; }
        .nav-links a {
          color: var(--muted);
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 400;
          transition: color 0.2s;
        }
        .nav-links a:hover { color: var(--text); }
        .btn-nav {
          background: var(--lime);
          color: #000;
          border: none;
          padding: 10px 22px;
          border-radius: 100px;
          font-family: var(--font-body);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-nav:hover { background: var(--lime-dark); transform: translateY(-1px); }

        /* HERO */
        .hero {
          min-height: 100vh;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          text-align: center;
          padding: 120px 24px 80px;
          position: relative;
          overflow: hidden;
        }
        .hero::before {
          content: '';
          position: absolute; top: -200px; left: 50%; transform: translateX(-50%);
          width: 800px; height: 800px;
          background: radial-gradient(ellipse at center, rgba(200,241,53,0.08) 0%, transparent 70%);
          pointer-events: none;
        }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(200,241,53,0.08);
          border: 1px solid rgba(200,241,53,0.2);
          border-radius: 100px;
          padding: 6px 16px;
          font-size: 0.8rem;
          color: var(--lime);
          margin-bottom: 32px;
          animation: fadeUp 0.6s ease both;
        }
        .badge-dot {
          width: 6px; height: 6px;
          background: var(--lime);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        .hero h1 {
          font-family: var(--font-display);
          font-size: clamp(3rem, 8vw, 7rem);
          font-weight: 800;
          line-height: 1;
          letter-spacing: -3px;
          max-width: 900px;
          animation: fadeUp 0.6s 0.1s ease both;
        }
        .hero h1 em {
          font-style: normal;
          color: var(--lime);
          position: relative;
        }
        .hero p {
          max-width: 520px;
          font-size: 1.125rem;
          color: var(--muted);
          margin-top: 24px;
          font-weight: 300;
          animation: fadeUp 0.6s 0.2s ease both;
        }
        .hero-cta {
          display: flex; gap: 16px; align-items: center;
          margin-top: 40px;
          animation: fadeUp 0.6s 0.3s ease both;
        }
        .btn-primary {
          background: var(--lime);
          color: #000;
          border: none;
          padding: 16px 36px;
          border-radius: 100px;
          font-family: var(--font-body);
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-primary:hover { background: var(--lime-dark); transform: translateY(-2px); box-shadow: 0 8px 32px rgba(200,241,53,0.25); }
        .btn-ghost {
          background: transparent;
          color: var(--muted);
          border: 1px solid var(--border);
          padding: 16px 36px;
          border-radius: 100px;
          font-family: var(--font-body);
          font-size: 1rem;
          font-weight: 400;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-ghost:hover { color: var(--text); border-color: #444; }

        .hero-stats {
          display: flex; gap: 48px;
          margin-top: 72px;
          animation: fadeUp 0.6s 0.4s ease both;
        }
        .stat { text-align: center; }
        .stat-num {
          font-family: var(--font-display);
          font-size: 2rem;
          font-weight: 800;
          color: var(--lime);
        }
        .stat-label { font-size: 0.8rem; color: var(--muted); margin-top: 4px; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* FEATURES */
        section { padding: 100px 24px; max-width: 1100px; margin: 0 auto; }

        .section-label {
          font-size: 0.75rem;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: var(--lime);
          margin-bottom: 16px;
          font-weight: 500;
        }
        .section-title {
          font-family: var(--font-display);
          font-size: clamp(2rem, 4vw, 3.5rem);
          font-weight: 800;
          letter-spacing: -2px;
          line-height: 1.05;
          max-width: 600px;
        }

        /* FEATURE TABS */
        .features-section { padding: 100px 24px; }
        .features-inner { max-width: 1100px; margin: 0 auto; }
        .features-tabs {
          display: flex; gap: 8px;
          margin-top: 48px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 0;
        }
        .tab-btn {
          background: none; border: none;
          padding: 12px 24px;
          font-family: var(--font-body);
          font-size: 0.9rem;
          color: var(--muted);
          cursor: pointer;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          transition: all 0.2s;
        }
        .tab-btn.active { color: var(--lime); border-bottom-color: var(--lime); }
        .tab-btn:hover:not(.active) { color: var(--text); }

        .tab-content {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 64px; align-items: center;
          margin-top: 56px;
        }
        .tab-text h3 {
          font-family: var(--font-display);
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: -1px;
          margin-bottom: 16px;
        }
        .tab-text p { color: var(--muted); font-size: 1rem; line-height: 1.7; }
        .tab-perks { margin-top: 24px; display: flex; flex-direction: column; gap: 12px; }
        .perk {
          display: flex; align-items: center; gap: 12px;
          font-size: 0.9rem; color: var(--muted);
        }
        .perk-icon {
          width: 28px; height: 28px;
          background: rgba(200,241,53,0.1);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.75rem;
          flex-shrink: 0;
        }

        .tab-visual {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 32px;
          min-height: 280px;
          position: relative;
          overflow: hidden;
        }
        .tab-visual::before {
          content: '';
          position: absolute; top: 0; right: 0;
          width: 200px; height: 200px;
          background: radial-gradient(ellipse at top right, rgba(200,241,53,0.06) 0%, transparent 70%);
        }
        .visual-doc {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
        }
        .visual-doc-title {
          font-size: 0.75rem; color: var(--muted);
          margin-bottom: 12px;
          display: flex; align-items: center; gap: 8px;
        }
        .visual-lines { display: flex; flex-direction: column; gap: 8px; }
        .visual-line {
          height: 8px; border-radius: 4px;
          background: var(--border);
          animation: shimmer 2s infinite;
        }
        .visual-line.lime { background: rgba(200,241,53,0.3); width: 60%; }
        .visual-line.w80 { width: 80%; }
        .visual-line.w60 { width: 60%; }
        .visual-line.w90 { width: 90%; }
        .visual-line.w40 { width: 40%; }

        .flashcard {
          background: var(--surface2);
          border: 1px solid rgba(200,241,53,0.2);
          border-radius: 12px;
          padding: 24px;
          text-align: center;
        }
        .flashcard-q { font-size: 0.75rem; color: var(--lime); margin-bottom: 12px; }
        .flashcard-text { font-size: 1rem; font-weight: 500; margin-bottom: 16px; }
        .flashcard-btns { display: flex; gap: 8px; justify-content: center; }
        .fc-btn {
          padding: 8px 20px; border-radius: 100px;
          font-size: 0.8rem; cursor: pointer; border: none;
          font-family: var(--font-body);
        }
        .fc-btn.wrong { background: rgba(255,80,80,0.15); color: #ff5050; }
        .fc-btn.right { background: rgba(200,241,53,0.15); color: var(--lime); }

        .quiz-item {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
        }
        .quiz-q { font-size: 0.9rem; font-weight: 500; margin-bottom: 16px; }
        .quiz-options { display: flex; flex-direction: column; gap: 8px; }
        .quiz-opt {
          padding: 10px 16px;
          border-radius: 8px;
          border: 1px solid var(--border);
          font-size: 0.85rem; color: var(--muted);
          cursor: pointer;
          transition: all 0.2s;
        }
        .quiz-opt.correct { border-color: var(--lime); color: var(--lime); background: rgba(200,241,53,0.06); }
        .quiz-opt:hover:not(.correct) { border-color: #444; color: var(--text); }

        /* PRICING */
        .pricing-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 24px; margin-top: 56px;
        }
        .pricing-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 40px;
          position: relative;
          transition: transform 0.2s;
        }
        .pricing-card:hover { transform: translateY(-4px); }
        .pricing-card.featured {
          border-color: var(--lime);
          background: linear-gradient(135deg, rgba(200,241,53,0.04) 0%, var(--surface) 100%);
        }
        .pricing-badge-top {
          position: absolute; top: -12px; left: 32px;
          background: var(--lime); color: #000;
          font-size: 0.75rem; font-weight: 500;
          padding: 4px 14px; border-radius: 100px;
        }
        .pricing-plan {
          font-size: 0.8rem; letter-spacing: 2px;
          text-transform: uppercase; color: var(--muted);
          margin-bottom: 16px;
        }
        .pricing-price {
          font-family: var(--font-display);
          font-size: 3.5rem; font-weight: 800;
          letter-spacing: -2px;
          line-height: 1;
        }
        .pricing-price sup { font-size: 1.5rem; vertical-align: top; margin-top: 8px; }
        .pricing-price span { font-size: 1rem; color: var(--muted); font-family: var(--font-body); font-weight: 300; }
        .pricing-desc { color: var(--muted); font-size: 0.9rem; margin-top: 12px; margin-bottom: 32px; }
        .pricing-features { display: flex; flex-direction: column; gap: 12px; margin-bottom: 32px; }
        .pricing-feature {
          display: flex; align-items: center; gap: 10px;
          font-size: 0.9rem;
        }
        .pricing-feature .check { color: var(--lime); font-size: 0.75rem; }
        .pricing-feature .cross { color: var(--muted); font-size: 0.75rem; }
        .pricing-feature.disabled { color: var(--muted); }
        .btn-pricing {
          width: 100%; padding: 14px;
          border-radius: 100px;
          font-family: var(--font-body);
          font-size: 0.95rem; font-weight: 500;
          cursor: pointer; border: none;
          transition: all 0.2s;
        }
        .btn-pricing.outline {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text);
        }
        .btn-pricing.outline:hover { border-color: #555; }
        .btn-pricing.solid {
          background: var(--lime); color: #000;
        }
        .btn-pricing.solid:hover { background: var(--lime-dark); }

        /* CTA FINALE */
        .cta-section {
          padding: 100px 24px;
          text-align: center;
        }
        .cta-inner {
          max-width: 700px; margin: 0 auto;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 32px;
          padding: 72px 48px;
          position: relative; overflow: hidden;
        }
        .cta-inner::before {
          content: '';
          position: absolute; bottom: -100px; left: 50%; transform: translateX(-50%);
          width: 400px; height: 400px;
          background: radial-gradient(ellipse, rgba(200,241,53,0.08) 0%, transparent 70%);
        }
        .cta-inner h2 {
          font-family: var(--font-display);
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 800; letter-spacing: -2px;
          margin-bottom: 16px;
        }
        .cta-inner p { color: var(--muted); margin-bottom: 32px; }

        /* FOOTER */
        footer {
          border-top: 1px solid var(--border);
          padding: 32px 48px;
          display: flex; align-items: center; justify-content: space-between;
          max-width: 1200px; margin: 0 auto;
        }
        footer p { font-size: 0.8rem; color: var(--muted); }
        .footer-links { display: flex; gap: 24px; }
        .footer-links a { font-size: 0.8rem; color: var(--muted); text-decoration: none; }
        .footer-links a:hover { color: var(--text); }

        @media (max-width: 768px) {
          nav { padding: 16px 24px; }
          nav.scrolled { padding: 12px 24px; }
          .nav-links { display: none; }
          .hero-stats { gap: 24px; }
          .tab-content { grid-template-columns: 1fr; }
          .pricing-grid { grid-template-columns: 1fr; }
          .cta-inner { padding: 48px 24px; }
          footer { flex-direction: column; gap: 16px; text-align: center; }
        }
      `}</style>

      {/* NAV */}
      <nav className={scrolled ? "scrolled" : ""}>
        <a href="#" className="nav-logo">Brain<span>Gifted</span></a>
        <div className="nav-links">
          <a href="#features">Funzioni</a>
          <a href="#pricing">Prezzi</a>
          <button className="btn-nav">Inizia gratis</button>
        </div>
      </nav>

      {/* HERO */}
      <div className="hero">
        <div className="hero-badge">
          <span className="badge-dot"></span>
          Powered by AI · Studia 3x più veloce
        </div>
        <h1>Studia <em>meno</em>,<br />impara di più.</h1>
        <p>Carica i tuoi appunti, PDF o presentazioni. BrainGifted li trasforma in riassunti, flashcard e quiz in secondi.</p>
        <div className="hero-cta">
          <button className="btn-primary">Inizia gratis →</button>
          <button className="btn-ghost">Scopri come funziona</button>
        </div>
        <div className="hero-stats">
          <div className="stat">
            <div className="stat-num">3x</div>
            <div className="stat-label">più veloce</div>
          </div>
          <div className="stat">
            <div className="stat-num">5</div>
            <div className="stat-label">doc gratuiti/mese</div>
          </div>
          <div className="stat">
            <div className="stat-num">100%</div>
            <div className="stat-label">automatico</div>
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <div className="features-section" id="features">
        <div className="features-inner">
          <p className="section-label">Funzionalità</p>
          <h2 className="section-title">Tutto quello che ti serve per studiare bene.</h2>

          <div className="features-tabs">
            {[
              { id: "summary", label: "📄 Riassunti" },
              { id: "flashcard", label: "🃏 Flashcard" },
              { id: "quiz", label: "🧠 Quiz" },
              { id: "explain", label: "💡 Spiegazioni" },
            ].map((t) => (
              <button
                key={t.id}
                className={`tab-btn ${activeTab === t.id ? "active" : ""}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="tab-content">
            {activeTab === "summary" && (
              <>
                <div className="tab-text">
                  <h3>Riassunti automatici istantanei</h3>
                  <p>Carica qualsiasi documento — PDF, Word, PowerPoint — e ottieni un riassunto breve, dettagliato o per punti chiave in pochi secondi.</p>
                  <div className="tab-perks">
                    <div className="perk"><div className="perk-icon">✦</div>Riassunto breve in 3 punti</div>
                    <div className="perk"><div className="perk-icon">✦</div>Analisi dettagliata completa</div>
                    <div className="perk"><div className="perk-icon">✦</div>Punti chiave evidenziati</div>
                  </div>
                </div>
                <div className="tab-visual">
                  <div className="visual-doc">
                    <div className="visual-doc-title">📄 Diritto Privato — Cap. 3.pdf</div>
                    <div className="visual-lines">
                      <div className="visual-line lime"></div>
                      <div className="visual-line w80"></div>
                      <div className="visual-line w90"></div>
                      <div className="visual-line w60"></div>
                      <div className="visual-line w80"></div>
                      <div className="visual-line w40"></div>
                    </div>
                  </div>
                  <div style={{marginTop: 16, fontSize: "0.75rem", color: "var(--lime)", display: "flex", alignItems: "center", gap: 8}}>
                    <span>⚡</span> Riassunto generato in 3 secondi
                  </div>
                </div>
              </>
            )}
            {activeTab === "flashcard" && (
              <>
                <div className="tab-text">
                  <h3>Flashcard generate dal tuo materiale</h3>
                  <p>BrainGifted estrae automaticamente i concetti chiave e crea flashcard domanda/risposta pronte per la revisione rapida.</p>
                  <div className="tab-perks">
                    <div className="perk"><div className="perk-icon">✦</div>Domande e risposte automatiche</div>
                    <div className="perk"><div className="perk-icon">✦</div>Sistema so/non so per la ripetizione</div>
                    <div className="perk"><div className="perk-icon">✦</div>Export compatibile con Anki (Pro)</div>
                  </div>
                </div>
                <div className="tab-visual">
                  <div className="flashcard">
                    <div className="flashcard-q">FLASHCARD 1 di 24</div>
                    <div className="flashcard-text">Cos'è la responsabilità contrattuale?</div>
                    <div style={{fontSize: "0.8rem", color: "var(--muted)", marginBottom: 16}}>Obbligo di risarcire il danno derivante dall'inadempimento di un'obbligazione contrattuale.</div>
                    <div className="flashcard-btns">
                      <button className="fc-btn wrong">✗ Non so</button>
                      <button className="fc-btn right">✓ So</button>
                    </div>
                  </div>
                </div>
              </>
            )}
            {activeTab === "quiz" && (
              <>
                <div className="tab-text">
                  <h3>Quiz per testare la preparazione</h3>
                  <p>Metti alla prova le tue conoscenze con quiz a scelta multipla, vero/falso e domande aperte generati dal tuo stesso materiale di studio.</p>
                  <div className="tab-perks">
                    <div className="perk"><div className="perk-icon">✦</div>Scelta multipla, V/F, aperte</div>
                    <div className="perk"><div className="perk-icon">✦</div>Feedback immediato sulle risposte</div>
                    <div className="perk"><div className="perk-icon">✦</div>Punteggio e statistiche (Pro)</div>
                  </div>
                </div>
                <div className="tab-visual">
                  <div className="quiz-item">
                    <div className="quiz-q">Quale articolo del Codice Civile disciplina la responsabilità contrattuale?</div>
                    <div className="quiz-options">
                      <div className="quiz-opt">Art. 1218 c.c.</div>
                      <div className="quiz-opt correct">✓ Art. 1218 c.c.</div>
                      <div className="quiz-opt">Art. 2043 c.c.</div>
                      <div className="quiz-opt">Art. 1321 c.c.</div>
                    </div>
                  </div>
                </div>
              </>
            )}
            {activeTab === "explain" && (
              <>
                <div className="tab-text">
                  <h3>Spiegami come se avessi 10 anni</h3>
                  <p>Seleziona qualsiasi paragrafo difficile e chiedi a BrainGifted di spiegartelo in modo semplice, con esempi pratici e analogie.</p>
                  <div className="tab-perks">
                    <div className="perk"><div className="perk-icon">✦</div>Spiegazione semplificata on-demand</div>
                    <div className="perk"><div className="perk-icon">✦</div>Esempi pratici e analogie</div>
                    <div className="perk"><div className="perk-icon">✦</div>Funzione esclusiva Pro</div>
                  </div>
                </div>
                <div className="tab-visual">
                  <div style={{background: "var(--surface2)", borderRadius: 12, padding: 20}}>
                    <div style={{fontSize: "0.75rem", color: "var(--muted)", marginBottom: 12}}>Testo selezionato:</div>
                    <div style={{fontSize: "0.85rem", color: "#555", marginBottom: 16, fontStyle: "italic"}}>"L'obbligazione solidale passiva è quella in cui più debitori sono tenuti all'adempimento della stessa prestazione..."</div>
                    <div style={{borderTop: "1px solid var(--border)", paddingTop: 16}}>
                      <div style={{fontSize: "0.75rem", color: "var(--lime)", marginBottom: 8}}>⚡ BrainGifted spiega:</div>
                      <div style={{fontSize: "0.85rem", color: "var(--text)"}}>Immagina che tu e due amici abbiate preso in prestito 100€ insieme. Il creditore può chiedere tutti i 100€ anche solo a te — poi tu ti arrangi con gli altri! 💡</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* PRICING */}
      <section id="pricing">
        <p className="section-label">Prezzi</p>
        <h2 className="section-title">Inizia gratis.<br />Sblocca tutto quando sei pronto.</h2>
        <div className="pricing-grid">
          {/* FREE */}
          <div className="pricing-card">
            <div className="pricing-plan">Free</div>
            <div className="pricing-price">€0<span>/mese</span></div>
            <div className="pricing-desc">Perfetto per provare BrainGifted e capire se fa per te.</div>
            <div className="pricing-features">
              <div className="pricing-feature"><span className="check">✓</span> 3 documenti al mese</div>
              <div className="pricing-feature"><span className="check">✓</span> Riassunto breve</div>
              <div className="pricing-feature"><span className="check">✓</span> 10 flashcard per documento</div>
              <div className="pricing-feature"><span className="check">✓</span> Quiz a scelta multipla (5 domande)</div>
              <div className="pricing-feature disabled"><span className="cross">✗</span> Riassunto dettagliato</div>
              <div className="pricing-feature disabled"><span className="cross">✗</span> Flashcard illimitate</div>
              <div className="pricing-feature disabled"><span className="cross">✗</span> Spiegazione semplificata</div>
              <div className="pricing-feature disabled"><span className="cross">✗</span> Cronologia documenti</div>
            </div>
            <button className="btn-pricing outline">Inizia gratis</button>
          </div>
          {/* PRO */}
          <div className="pricing-card featured">
            <div className="pricing-badge-top">Più popolare</div>
            <div className="pricing-plan">Pro</div>
            <div className="pricing-price"><sup>€</sup>7<span>/mese</span></div>
            <div className="pricing-desc">Per chi studia seriamente e vuole il massimo dalle proprie sessioni.</div>
            <div className="pricing-features">
              <div className="pricing-feature"><span className="check">✓</span> Documenti illimitati</div>
              <div className="pricing-feature"><span className="check">✓</span> Riassunto breve + dettagliato + punti chiave</div>
              <div className="pricing-feature"><span className="check">✓</span> Flashcard illimitate + export Anki</div>
              <div className="pricing-feature"><span className="check">✓</span> Quiz avanzati (tutti i tipi)</div>
              <div className="pricing-feature"><span className="check">✓</span> Spiegazione semplificata</div>
              <div className="pricing-feature"><span className="check">✓</span> Cronologia completa</div>
              <div className="pricing-feature"><span className="check">✓</span> Priorità nel supporto</div>
              <div className="pricing-feature"><span className="check">✓</span> 7 giorni di prova gratuita</div>
            </div>
            <button className="btn-pricing solid">Prova 7 giorni gratis →</button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="cta-section">
        <div className="cta-inner">
          <h2>Pronto a studiare in modo più intelligente?</h2>
          <p>Unisciti a migliaia di studenti che usano BrainGifted per prepararsi meglio, in meno tempo.</p>
          <button className="btn-primary">Inizia gratis — nessuna carta richiesta</button>
        </div>
      </div>

      {/* FOOTER */}
      <footer>
        <p>© 2026 BrainGifted. Tutti i diritti riservati.</p>
        <div className="footer-links">
          <a href="#">Privacy</a>
          <a href="#">Termini</a>
          <a href="#">Contatti</a>
        </div>
      </footer>
    </>
  );
}
