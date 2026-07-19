const express = require("express");
const path = require("path");
const fs = require("fs");
const router = express.Router();
const { createInvoice } = require("../services/invoiceService");

const OUTPUT_DIR = path.join(__dirname, "..", "generated");

/**
 * POST /api/generate-invoice
 * Body: { invoice_number, client, payment_method, invoice_date, total_ttc }
 *
 * Generates the DOCX + PDF invoice and returns download links plus a
 * summary the frontend can use to render a preview.
 */
router.post("/generate-invoice", async (req, res) => {
  try {
    const { invoice_number, client, payment_method, invoice_date, total_ttc } = req.body;

    if (!invoice_number || !client || !payment_method || !invoice_date || total_ttc === undefined) {
      return res.status(400).json({ error: "Données de facture incomplètes." });
    }

    const totalNumber = Number(total_ttc);
    if (Number.isNaN(totalNumber) || totalNumber <= 0) {
      return res.status(400).json({ error: "Le montant total TTC doit être un nombre positif." });
    }

    const result = await createInvoice({
      invoice_number,
      client,
      payment_method,
      invoice_date,
      total_ttc: totalNumber,
      lines: req.body.lines, // Pass manual lines if present
    });

    return res.json({
      summary: result.summary,
      downloads: {
        docx: `/api/download/${encodeURIComponent(result.docxFileName)}`,
        pdf: `/api/download/${encodeURIComponent(result.pdfFileName)}`,
      },
    });
  } catch (err) {
    console.error("Erreur /api/generate-invoice:", err);
    return res.status(500).json({ error: err.message || "Erreur lors de la génération de la facture." });
  }
});

/**
 * GET /api/download/:filename
 * Serves a previously generated DOCX or PDF file from the generated/ folder.
 */
router.get("/download/:filename", (req, res) => {
  const filename = req.params.filename;

  // Guard against path traversal: only allow the exact characters we generate.
  if (!/^[a-zA-Z0-9_-]+\.(docx|pdf)$/.test(filename)) {
    return res.status(400).send("Nom de fichier invalide.");
  }

  const filePath = path.join(OUTPUT_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Fichier introuvable.");
  }

  return res.download(filePath);
});

module.exports = router;
