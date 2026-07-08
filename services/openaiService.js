const SYSTEM_PROMPT = `Tu es une secrétaire virtuelle pour "AUTO PIECE ADAROCH S.A.R.L", un magasin de pièces détachées automobile au Maroc.

Ton rôle est d'aider un employé à créer une facture en discutant naturellement, comme une vraie secrétaire.

Tu dois collecter, UNE INFORMATION A LA FOIS, dans cet ordre :
1. Le numéro de facture (ex: FC001)
2. Le client : soit "Client Divers", soit un nom de société (ex: STE BJD, AUTO PLUS SARL)
3. Le mode de règlement : ESP ou CHQ
4. La date de la facture (ex: 01/07/2026)
5. Le montant total TTC (ex: 1700)

Règles strictes :
- Ne pose JAMAIS deux questions dans le même message.
- Pose UNE SEULE question à la fois, de façon naturelle et polie.
- Attends la réponse de l'employé avant de passer à la question suivante.
- Si une réponse semble invalide ou ambiguë, redemande poliment une précision avant de continuer.
- Ne montre jamais de JSON tant que les 5 informations n'ont pas toutes été collectées.
- Dès que les 5 informations ont été collectées, réponds UNIQUEMENT avec un objet JSON strict, sans aucun texte avant ou après, au format exact suivant :

{
  "invoice_number": "FC001",
  "client": "Client Divers",
  "payment_method": "ESP",
  "invoice_date": "01/07/2026",
  "total_ttc": 1700
}

- "total_ttc" doit être un nombre (pas une chaîne de caractères).
- Ne rajoute aucun commentaire, aucune explication, aucun texte autour du JSON final.`;

/**
 * Calls OpenAI's chat completion API with the running conversation and
 * returns the assistant's next message (either a natural-language question
 * or the final raw JSON string once all fields are collected).
 *
 * @param {Array<{role: 'user'|'assistant', content: string}>} history
 * @returns {Promise<string>}
 */
async function getAssistantReply(history) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY manquant. Ajoutez votre clé dans le fichier .env (voir .env.example)."
    );
  }

  const messages = [{ role: "system", content: SYSTEM_PROMPT }, ...history];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-nano",
      messages,
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erreur OpenAI (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Réponse OpenAI vide ou invalide.");
  }
  return content.trim();
}

/**
 * Tries to parse a string as the final invoice-data JSON.
 * Returns the parsed object, or null if the string is not valid JSON with
 * the expected shape (meaning the assistant is still asking questions).
 */
function tryParseInvoiceJson(text) {
  let cleaned = text.trim();
  // Some models wrap JSON in markdown code fences despite instructions; strip them defensively.
  cleaned = cleaned.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();

  if (!cleaned.startsWith("{")) return null;

  try {
    const parsed = JSON.parse(cleaned);
    const required = ["invoice_number", "client", "payment_method", "invoice_date", "total_ttc"];
    const hasAll = required.every((key) => Object.prototype.hasOwnProperty.call(parsed, key));
    if (!hasAll) return null;
    return {
      invoice_number: String(parsed.invoice_number),
      client: String(parsed.client),
      payment_method: String(parsed.payment_method),
      invoice_date: String(parsed.invoice_date),
      total_ttc: Number(parsed.total_ttc),
    };
  } catch (e) {
    return null;
  }
}

module.exports = { getAssistantReply, tryParseInvoiceJson };
