import { NextResponse } from "next/server";
import PptxGenJS from "pptxgenjs";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { slides, title } = await request.json();

    const pres = new PptxGenJS();
    pres.layout = "LAYOUT_16x9";
    pres.title = title || "Presentazione BrainGifted";

    const BG_DARK = "0a0a0a";
    const BG_SLIDE = "111111";
    const LIME = "c8f135";
    const TEXT = "f0f0f0";
    const MUTED = "666666";
    const BORDER = "222222";

    slides.forEach((slide, index) => {
      const s = pres.addSlide();
      s.background = { color: slide.tipo === "apertura" || slide.tipo === "chiusura" ? BG_DARK : BG_SLIDE };

      // Accent bar sinistra
      s.addShape(pres.shapes.RECTANGLE, {
        x: 0, y: 0, w: 0.08, h: 5.625,
        fill: { color: LIME }, line: { color: LIME }
      });

      if (slide.tipo === "apertura") {
        // Numero slide
        s.addText("01", {
          x: 0.4, y: 0.3, w: 2, h: 0.4,
          fontSize: 10, color: MUTED, fontFace: "Calibri", bold: false
        });
        // Titolo grande
        s.addText(slide.titolo, {
          x: 0.4, y: 1.2, w: 9.2, h: 1.6,
          fontSize: 44, bold: true, color: TEXT, fontFace: "Calibri",
          align: "left", valign: "middle"
        });
        // Lime accent sotto titolo
        s.addShape(pres.shapes.RECTANGLE, {
          x: 0.4, y: 2.85, w: 1.2, h: 0.06,
          fill: { color: LIME }, line: { color: LIME }
        });
        // Sottotitolo
        s.addText(slide.sottotitolo, {
          x: 0.4, y: 3.05, w: 9.2, h: 0.6,
          fontSize: 18, color: MUTED, fontFace: "Calibri", align: "left"
        });
        // Hook
        s.addShape(pres.shapes.RECTANGLE, {
          x: 0.4, y: 4.0, w: 9.2, h: 0.9,
          fill: { color: "1a1a1a" }, line: { color: BORDER }
        });
        s.addText(`"${slide.hook}"`, {
          x: 0.6, y: 4.05, w: 8.8, h: 0.8,
          fontSize: 13, color: LIME, fontFace: "Calibri",
          italic: true, align: "left", valign: "middle"
        });

      } else if (slide.tipo === "contenuto") {
        // Numero slide
        s.addText(String(index + 1).padStart(2, "0"), {
          x: 0.4, y: 0.25, w: 2, h: 0.35,
          fontSize: 10, color: MUTED, fontFace: "Calibri"
        });
        // Titolo
        s.addText(slide.titolo, {
          x: 0.4, y: 0.65, w: 9.2, h: 0.9,
          fontSize: 28, bold: true, color: TEXT, fontFace: "Calibri", align: "left"
        });
        // Separatore
        s.addShape(pres.shapes.RECTANGLE, {
          x: 0.4, y: 1.55, w: 9.2, h: 0.03,
          fill: { color: BORDER }, line: { color: BORDER }
        });
        // Punti chiave
        const punti = slide.punti || [];
        punti.forEach((punto, i) => {
          const yPos = 1.75 + i * 0.72;
          // Bullet circle lime
          s.addShape(pres.shapes.OVAL, {
            x: 0.4, y: yPos + 0.08, w: 0.22, h: 0.22,
            fill: { color: LIME }, line: { color: LIME }
          });
          s.addText(punto, {
            x: 0.75, y: yPos, w: 8.8, h: 0.6,
            fontSize: 15, color: TEXT, fontFace: "Calibri",
            align: "left", valign: "middle"
          });
        });

      } else if (slide.tipo === "chiusura") {
        // Label
        s.addText("CONCLUSIONE", {
          x: 0.4, y: 0.5, w: 9.2, h: 0.4,
          fontSize: 10, color: LIME, fontFace: "Calibri",
          bold: true, charSpacing: 4
        });
        // Titolo
        s.addText(slide.titolo, {
          x: 0.4, y: 1.0, w: 9.2, h: 1.4,
          fontSize: 38, bold: true, color: TEXT, fontFace: "Calibri", align: "left"
        });
        // Messaggio
        s.addText(slide.messaggio, {
          x: 0.4, y: 2.6, w: 9.2, h: 0.8,
          fontSize: 15, color: MUTED, fontFace: "Calibri", align: "left"
        });
        // CTA box
        s.addShape(pres.shapes.RECTANGLE, {
          x: 0.4, y: 3.6, w: 9.2, h: 0.85,
          fill: { color: LIME }, line: { color: LIME }
        });
        s.addText(slide.cta, {
          x: 0.5, y: 3.65, w: 9.0, h: 0.75,
          fontSize: 16, bold: true, color: BG_DARK, fontFace: "Calibri",
          align: "center", valign: "middle"
        });
      }

      // Footer BrainGifted
      s.addText("BrainGifted.com", {
        x: 8.5, y: 5.3, w: 1.4, h: 0.25,
        fontSize: 8, color: MUTED, fontFace: "Calibri", align: "right"
      });
    });

    const pptxBuffer = await pres.write({ outputType: "nodebuffer" });
    return new NextResponse(pptxBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="braingifted-presentazione.pptx"`,
      },
    });

  } catch (err) {
    console.error("PPTX error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}