const chatArea = document.getElementById("chat-area");
const chatForm = document.getElementById("chat-form");
const sendBtn = document.getElementById("send-btn");
const backBtn = document.getElementById("back-btn");
const stepLabel = document.getElementById("step-label");
const stepInputWrapper = document.getElementById("step-input-wrapper");

const previewEmpty = document.getElementById("preview-empty");
const previewContent = document.getElementById("preview-content");

let invoiceGenerated = false;
let answers = {};
let currentStep = 0;
let currentInput = null;

const steps = [
  {
    key: "invoice_number",
    label: "Numéro de facture",
    type: "text",
    placeholder: "Ex. FC001",
    validate: (value) => value.trim().length >= 2,
  },
  {
    key: "invoice_date",
    label: "Date de la facture",
    type: "date",
    validate: (value) => /^\d{4}-\d{2}-\d{2}$/.test(value),
  },
  {
    key: "payment_method",
    label: "Mode de règlement",
    type: "select",
    options: [
      { value: "ESP", label: "ESP" },
      { value: "CHQ", label: "CHQ" },
    ],
    validate: (value) => ["ESP", "CHQ"].includes(value),
  },
  {
    key: "client_type",
    label: "Client",
    type: "select",
    options: [
      { value: "Client Divers", label: "Client Divers" },
      { value: "Société", label: "Société" },
    ],
    validate: (value) => ["Client Divers", "Société"].includes(value),
  },
  {
    key: "client_name",
    label: "Nom de la société",
    type: "text",
    placeholder: "Saisissez le nom de la société",
    validate: (value) => value.trim().length >= 2,
  },
  {
    key: "total_ttc",
    label: "Montant T.T.C",
    type: "number",
    placeholder: "Ex. 1700",
    validate: (value) => /^\d+$/.test(value) && Number(value) > 0,
  },
];

function addMessage(role, text) {
  const el = document.createElement("div");
  el.className = `msg ${role}`;
  el.textContent = text;
  chatArea.appendChild(el);
  chatArea.scrollTop = chatArea.scrollHeight;
  return el;
}

function addSystemNote(text) {
  const el = document.createElement("div");
  el.className = "msg system-note";
  el.textContent = text;
  chatArea.appendChild(el);
  chatArea.scrollTop = chatArea.scrollHeight;
}

function setInputDisabled(disabled) {
  if (currentInput) {
    currentInput.disabled = disabled;
  }
  sendBtn.disabled = disabled;
}

function formatDateForInvoice(value) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function renderStep() {
  const step = steps[currentStep];
  stepLabel.textContent = step.label;
  stepInputWrapper.innerHTML = "";

  let input;
  if (step.type === "select") {
    input = document.createElement("select");
    input.className = "step-field";
    step.options.forEach((option) => {
      const optionEl = document.createElement("option");
      optionEl.value = option.value;
      optionEl.textContent = option.label;
      input.appendChild(optionEl);
    });
  } else {
    input = document.createElement("input");
    input.className = "step-field";
    input.type = step.type;
    input.placeholder = step.placeholder || "";
    if (step.type === "number") {
      input.min = "0";
      input.step = "1";
    }
  }

  input.id = "chat-input";
  stepInputWrapper.appendChild(input);
  currentInput = input;

  if (answers[step.key]) {
    input.value = answers[step.key];
  }

  if (step.type !== "select") {
    input.focus();
  }

  sendBtn.textContent = currentStep === steps.length - 1 ? "Générer la facture" : "Suivant";
  backBtn.disabled = currentStep === 0;
}

function getCurrentValue() {
  if (!currentInput) return "";
  return currentInput.value.trim();
}

function init() {
  addMessage("assistant", "Remplissez la facture étape par étape.");
  renderStep();
}

async function generateInvoice(data) {
  try {
    setInputDisabled(true);
    const res = await fetch("/api/generate-invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await res.json();

    if (!res.ok) {
      addSystemNote(`Erreur lors de la génération : ${result.error || "erreur inconnue"}`);
      return;
    }

    renderPreview(result.summary, result.downloads);
    addSystemNote("Facture générée avec succès. Consultez l'aperçu à droite.");
    invoiceGenerated = true;
  } catch (err) {
    addSystemNote("Erreur de connexion lors de la génération de la facture.");
    console.error(err);
  } finally {
    setInputDisabled(false);
  }
}

function renderPreview(summary, downloads) {
  previewEmpty.style.display = "none";
  previewContent.style.display = "block";

  document.getElementById("pv-invoice").textContent = summary.invoice_number;
  document.getElementById("pv-client").textContent = summary.client;
  document.getElementById("pv-payment").textContent = summary.payment_method;
  document.getElementById("pv-date").textContent = summary.invoice_date;

  const linesBody = document.getElementById("pv-lines");
  linesBody.innerHTML = "";
  summary.lines.forEach((line) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(line.description)}</td>
      <td>${line.quantity}</td>
      <td>${line.unit_price}</td>
      <td>${line.line_total}</td>
    `;
    linesBody.appendChild(tr);
  });

  document.getElementById("pv-ht").textContent = `${summary.ht} DH`;
  document.getElementById("pv-tva").textContent = `${summary.tva} DH`;
  document.getElementById("pv-ttc").textContent = `${summary.ttc} DH`;
  document.getElementById("pv-words").textContent = `Arretée la présente facture à la somme de : ${summary.amount_words}`;

  document.getElementById("download-docx").href = downloads.docx;
  document.getElementById("download-pdf").href = downloads.pdf;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

backBtn.addEventListener("click", (e) => {
  e.preventDefault();
  if (currentStep > 0) {
    currentStep -= 1;
    renderStep();
  }
});

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (invoiceGenerated) {
    addSystemNote("Cette facture est déjà générée. Rafraîchissez la page pour en créer une nouvelle.");
    return;
  }

  const step = steps[currentStep];
  const value = getCurrentValue();

  if (!step.validate(value)) {
    addSystemNote(`Veuillez saisir une valeur valide pour ${step.label.toLowerCase()}.`);
    return;
  }

  if (step.key === "invoice_date") {
    answers[step.key] = value;
  } else if (step.key === "total_ttc") {
    answers[step.key] = String(Number(value));
  } else {
    answers[step.key] = value;
  }

  if (step.key === "client_type") {
    if (value === "Client Divers") {
      answers.client = "Client Divers";
      currentStep = 5;
      renderStep();
      return;
    }
    answers.client = "";
  }

  if (step.key === "client_name") {
    let normalized = value.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");

    if (/sarl/i.test(normalized)) {
      normalized = normalized.replace(/\s*sarl\b/i, " SARL");
      const parts = normalized.split(/\s+SARL/i);
      if (parts.length === 2) {
        normalized = `${parts[0].trim()} SARL\n${parts[1].trim()}`.trim();
      }
    }

    answers.client = normalized;
  }

  if (currentStep === steps.length - 1) {
    addSystemNote("Toutes les informations ont été saisies. Génération de la facture en cours...");
    await generateInvoice({
      invoice_number: answers.invoice_number,
      client: answers.client || answers.client_name || "Client Divers",
      payment_method: answers.payment_method,
      invoice_date: formatDateForInvoice(answers.invoice_date),
      total_ttc: Number(answers.total_ttc),
    });
    return;
  }

  if (step.key === "client_type" && value === "Société") {
    currentStep = 4;
  } else {
    currentStep += 1;
  }

  renderStep();
});

init();
