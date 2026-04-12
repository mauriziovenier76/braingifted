import "./globals.css";

export const metadata = {
  title: "BrainGifted — Studia meglio con l'AI",
  description: "Carica i tuoi PDF e ottieni riassunti automatici, flashcard, quiz e struttura del discorso in secondi. Studia più velocemente con l'intelligenza artificiale.",
  keywords: "studia con AI, riassunti automatici, flashcard AI, quiz automatici, studio intelligente, PDF riassunto, app studio, intelligenza artificiale studio",
  authors: [{ name: "BrainGifted" }],
  creator: "BrainGifted",
  metadataBase: new URL("https://braingifted.com"),
  openGraph: {
    title: "BrainGifted — Studia meglio con l'AI",
    description: "Carica i tuoi PDF e ottieni riassunti automatici, flashcard, quiz e struttura del discorso in secondi.",
    url: "https://braingifted.com",
    siteName: "BrainGifted",
    locale: "it_IT",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BrainGifted — Studia meglio con l'AI",
    description: "Carica i tuoi PDF e ottieni riassunti automatici, flashcard, quiz e struttura del discorso in secondi.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}