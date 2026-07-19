const fs = require("fs");
const path = require("path");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const PDFDocument = require("pdfkit");
const libre = require("libreoffice-convert");
const { promisify } = require("util");

const libreConvertAsync = promisify(libre.convert);

const { computeHtTva, formatMoney } = require("../utils/calculations");
const { amountToFrenchWords } = require("../utils/numberToWords");
const { generateInvoiceLines } = require("./partsGenerator");

const TEMPLATE_PATH = path.join(__dirname, "..", "templates", "modele-facture-adaroch.docx");
const OUTPUT_DIR = path.join(__dirname, "..", "generated");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function createInvoicePdfBuffer(invoiceData) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(22).text("FACTURE", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(12);
    doc.text(`Numéro : ${invoiceData.invoice_number}`);
    doc.text(`Client : ${invoiceData.client}`);
    doc.text(`Mode de règlement : ${invoiceData.payment_method}`);
    doc.text(`Date : ${invoiceData.invoice_date}`);

    doc.moveDown();
    doc.font("Helvetica-Bold").text("Détail des lignes");
    doc.font("Helvetica");
    invoiceData.lines.forEach((line) => {
      doc.text(`${line.description} | Qté: ${line.quantity} | PU: ${line.unit_price} | Total: ${line.line_total}`);
    });

    doc.moveDown();
    doc.text(`HT : ${invoiceData.ht}`);
    doc.text(`TVA : ${invoiceData.tva}`);
    doc.text(`TTC : ${invoiceData.ttc}`);
    doc.text(`Montant en lettres : ${invoiceData.amount_words}`);

    doc.end();
  });
}

async function convertDocxToPdf(docxBuffer, invoiceData) {
  try {
    return await libreConvertAsync(docxBuffer, ".pdf", undefined);
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    if (/soffice|libreoffice|binary/i.test(message)) {
      console.warn("LibreOffice/soffice introuvable ; génération directe d'un PDF de secours.");
      return createInvoicePdfBuffer(invoiceData);
    }

    return createInvoicePdfBuffer(invoiceData);
  }
}

/**
 * Builds a complete invoice (DOCX + PDF) from the data collected by the
 * chat assistant, and writes both files to the `generated/` folder.
 *
 * @param {{invoice_number: string, client: string, payment_method: string, invoice_date: string, total_ttc: number}} data
 * @returns {{docxPath: string, pdfPath: string, docxFileName: string, pdfFileName: string, summary: object}}
 */
async function createInvoice(data) {
  const { invoice_number, client, payment_method, invoice_date, total_ttc, lines: customLines } = data;

  const { ht, tva, ttc } = computeHtTva(total_ttc);
  
  // Format custom lines if present, otherwise generate them randomly
  const lines = customLines 
    ? customLines.map(l => ({
        description: l.description,
        quantity: l.quantity,
        unit_price: formatMoney(l.unit_price),
        line_total: formatMoney(l.line_total)
      }))
    : generateInvoiceLines(ttc);

  const amountWords = amountToFrenchWords(ttc);

  const templateContent = fs.readFileSync(TEMPLATE_PATH, "binary");
  const zip = new PizZip(templateContent);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  doc.render({
    invoice_number,
    client,
    payment_method,
    invoice_date,
    ht: formatMoney(ht),
    tva: formatMoney(tva),
    ttc: formatMoney(ttc),
    amount_words: amountWords,
    lines,
  });

  const docxBuffer = doc.getZip().generate({ type: "nodebuffer" });

  const safeName = String(invoice_number).replace(/[^a-zA-Z0-9_-]/g, "_") || "facture";
  const invoiceSummary = {
    invoice_number,
    client,
    payment_method,
    invoice_date,
    ht: formatMoney(ht),
    tva: formatMoney(tva),
    ttc: formatMoney(ttc),
    amount_words: amountWords,
    lines,
  };
  const timestamp = Date.now();
  const docxFileName = `${safeName}_${timestamp}.docx`;
  const pdfFileName = `${safeName}_${timestamp}.pdf`;

  const docxPath = path.join(OUTPUT_DIR, docxFileName);
  const pdfPath = path.join(OUTPUT_DIR, pdfFileName);

  fs.writeFileSync(docxPath, docxBuffer);

  const pdfBuffer = await convertDocxToPdf(docxBuffer, invoiceSummary);
  fs.writeFileSync(pdfPath, pdfBuffer);

  return {
    docxPath,
    pdfPath,
    docxFileName,
    pdfFileName,
    summary: invoiceSummary,
  };
}

module.exports = { createInvoice };
