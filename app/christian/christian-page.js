import WordTest from "./WordTest";

// Pagina "nascosta": raggiungibile solo con il link diretto
export const metadata = {
  title: "BrainGifted · Test di inglese",
  robots: { index: false, follow: false }, // dice a Google di non mostrarla nelle ricerche
};

export default function ChristianPage() {
  return <WordTest />;
}
