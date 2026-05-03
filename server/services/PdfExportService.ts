import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

const FONTS_DIR = path.join(process.cwd(), "server", "fonts");
const WATERMARK_TEXT = "Created by IndoScribe";

function getFontPath(fontFile: string | null | undefined): string | null {
  if (!fontFile) return null;
  const fp = path.join(FONTS_DIR, fontFile);
  return fs.existsSync(fp) ? fp : null;
}

export async function generatePdf(
  text: string,
  fontFile: string | null | undefined,
  addWatermark: boolean
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 72, size: "A4", autoFirstPage: true });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const fontPath = getFontPath(fontFile);
    const customFontName = "ContentFont";
    if (fontPath) {
      doc.registerFont(customFontName, fontPath);
    }

    const leftMargin = doc.page.margins.left;
    const topMargin = doc.page.margins.top;

    const drawWatermark = () => {
      const w = doc.page.width;
      const h = doc.page.height;
      doc.save();
      doc.translate(w / 2, h / 2);
      doc.rotate(-45);
      doc.font("Helvetica").fontSize(20).fillColor("#999999").fillOpacity(0.45);
      // Use a large width to guarantee no wrapping; lineBreak:false prevents \n breaks
      doc.text(WATERMARK_TEXT, -600, -12, { width: 1200, align: "center", lineBreak: false });
      doc.restore();
      // reset cursor — doc.restore() does not reset the text cursor
      doc.x = leftMargin;
      doc.y = topMargin;
    };

    if (addWatermark) {
      drawWatermark();
      doc.on("pageAdded", drawWatermark);
    }

    doc.fillOpacity(1).fillColor("#000000");
    if (fontPath) {
      doc.font(customFontName).fontSize(12);
    } else {
      doc.font("Helvetica").fontSize(12);
    }

    // Reset to top of content area before writing content
    doc.x = leftMargin;
    doc.y = topMargin;

    const lines = text.split("\n");
    let firstLine = true;
    for (const line of lines) {
      if (line.trim() === "---PAGE BREAK---") {
        doc.addPage();
        firstLine = true;
        continue;
      }
      if (firstLine) {
        doc.text(line || " ", { paragraphGap: 3, lineGap: 2 });
        firstLine = false;
      } else {
        doc.text(line || " ", { paragraphGap: 3, lineGap: 2, continued: false });
      }
    }

    doc.end();
  });
}
