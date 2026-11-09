import { extractText } from "unpdf";
import { TEXT_LIMITS } from "./limits";

/*
  Prende il testo da studiare:
  - dal PDF, se arriva il campo "file"
  - dalle foto già trascritte da /api/ocr, se arriva il campo "text"
  Poi applica il limite di lunghezza del piano (TEXT_LIMITS in lib/limits.js).

  Restituisce:
  - { text, truncated, maxPages }  se tutto va bene
  - { error }                      se qualcosa non va
*/
export async function getStudyText(formData, plan) {
  const limit = TEXT_LIMITS[plan] || TEXT_LIMITS.free;
  const sentText = formData.get("text");
  const file = formData.get("file");
  let fullText = "";

  if (typeof sentText === "string" && sentText.trim()) {
    // Testo già trascritto dalle foto
    fullText = sentText;
  } else if (file && typeof file === "object") {
    // PDF
    if (file.type && file.type !== "application/pdf") {
      return { error: "Il file deve essere un PDF." };
    }
    const buffer = new Uint8Array(await file.arrayBuffer());
    const { text } = await extractText(buffer, { mergePages: true });
    fullText = text || "";

    if (fullText.trim().length < 50) {
      return {
        error:
          "Questo PDF sembra fatto di immagini (una scansione o delle foto) e non contiene testo leggibile. Prova a caricare le pagine come foto.",
      };
    }
  } else {
    return { error: "Nessun documento ricevuto." };
  }

  fullText = fullText.trim();
  if (fullText.length < 50) {
    return { error: "Il testo è troppo breve per essere elaborato." };
  }

  return {
    text: fullText.slice(0, limit.chars),
    truncated: fullText.length > limit.chars, // true = il documento è più lungo del limite del piano
    maxPages: limit.pages,
  };
}
