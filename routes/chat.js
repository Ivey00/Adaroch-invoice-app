const express = require("express");
const router = express.Router();
const { getAssistantReply, tryParseInvoiceJson } = require("../services/openaiService");

/**
 * POST /api/chat
 * Body: { history: [{ role: 'user'|'assistant', content: string }, ...] }
 *
 * The client keeps the full conversation and sends it on every turn (the
 * server is stateless). We ask OpenAI for the next assistant message; if
 * that message turns out to be the final structured JSON, we tell the
 * client the conversation is "done" along with the parsed invoice data.
 */
router.post("/", async (req, res) => {
  try {
    const { history } = req.body;

    if (!Array.isArray(history) || history.length === 0) {
      return res.status(400).json({ error: "Historique de conversation manquant ou invalide." });
    }

    const reply = await getAssistantReply(history);
    const invoiceData = tryParseInvoiceJson(reply);

    if (invoiceData) {
      return res.json({ done: true, data: invoiceData });
    }

    return res.json({ done: false, message: reply });
  } catch (err) {
    console.error("Erreur /api/chat:", err.message);
    return res.status(500).json({ error: err.message || "Erreur serveur lors de la discussion avec l'assistant." });
  }
});

module.exports = router;
