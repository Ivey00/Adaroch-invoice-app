// Get DOM Elements
const wizardForm = document.getElementById("wizard-form");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const formAlert = document.getElementById("form-alert");

// Inputs
const inputInvoiceNumber = document.getElementById("invoice-number");
const inputInvoiceDate = document.getElementById("invoice-date");
const inputPaymentMethod = document.getElementById("payment-method");
const inputClientType = document.getElementById("client-type");
const inputClientName = document.getElementById("client-name");
const clientNameGroup = document.getElementById("client-name-group");
const inputTotalTtc = document.getElementById("total-ttc");
const inputPieceEntryType = document.getElementById("piece-entry-type");

// Manual Parts Section
const manualPiecesSection = document.getElementById("manual-pieces-section");
const manualPartSearch = document.getElementById("manual-part-search");
const searchResultsDropdown = document.getElementById("search-results-dropdown");
const manualSelectedList = document.getElementById("manual-selected-list");
const manualSummaryStatus = document.getElementById("manual-summary-status");

// Preview Elements
const previewEmpty = document.getElementById("preview-empty");
const previewContent = document.getElementById("preview-content");
const pvInvoice = document.getElementById("pv-invoice");
const pvClient = document.getElementById("pv-client");
const pvPayment = document.getElementById("pv-payment");
const pvDate = document.getElementById("pv-date");
const pvLines = document.getElementById("pv-lines");
const pvHt = document.getElementById("pv-ht");
const pvTva = document.getElementById("pv-tva");
const pvTtc = document.getElementById("pv-ttc");
const pvWords = document.getElementById("pv-words");
const downloadDocx = document.getElementById("download-docx");
const downloadPdf = document.getElementById("download-pdf");

// Mobile Tab Buttons
const tabBtnSaisie = document.getElementById("tab-btn-saisie");
const tabBtnApercu = document.getElementById("tab-btn-apercu");
const previewBadge = document.getElementById("preview-badge");
const wizardPanelContainer = document.getElementById("wizard-panel-container");
const previewPanelContainer = document.getElementById("preview-panel-container");

// App State
let currentStep = 1; // Steps: 1, 2, 3
let selectedManualParts = [];
let isGenerating = false;

// Initialize form
function init() {
  // Set default date to today
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  inputInvoiceDate.value = `${year}-${month}-${day}`;

  // Focus on the first input
  if (inputInvoiceNumber) {
    inputInvoiceNumber.focus();
  }

  setupEventListeners();
  updateStepUI();
}

// Set up event listeners for state management and user interactions
function setupEventListeners() {
  // Client Type Toggle
  inputClientType.addEventListener("change", () => {
    if (inputClientType.value === "Société") {
      clientNameGroup.style.display = "block";
      inputClientName.required = true;
      inputClientName.focus();
    } else {
      clientNameGroup.style.display = "none";
      inputClientName.required = false;
    }
  });

  // Piece Entry Type Toggle
  inputPieceEntryType.addEventListener("change", () => {
    if (inputPieceEntryType.value === "manual") {
      manualPiecesSection.style.display = "block";
      updateManualPartsUI();
      // Adjust validation/state immediately
      updateNextButtonLabel();
    } else {
      manualPiecesSection.style.display = "none";
      updateNextButtonLabel();
    }
  });

  // Previous Step Button
  prevBtn.addEventListener("click", () => {
    if (currentStep > 1) {
      currentStep--;
      updateStepUI();
    }
  });

  // Form Submission handles both Next Step and Final generation
  wizardForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert();

    if (currentStep < 3) {
      // Validate current step before proceeding
      if (validateStep(currentStep)) {
        currentStep++;
        updateStepUI();
      }
    } else {
      // Final submission (Step 3)
      await handleGenerateInvoice();
    }
  });

  // Mobile Tabs
  tabBtnSaisie.addEventListener("click", () => {
    setActiveMobileTab("saisie");
  });

  tabBtnApercu.addEventListener("click", () => {
    setActiveMobileTab("apercu");
  });

  // Search logic for pieces
  manualPartSearch.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (!query) {
      searchResultsDropdown.style.display = "none";
      return;
    }

    // Search both libelle and marque
    const matches = PIECES_DATASET.filter(p => 
      p.libelle.toLowerCase().includes(query) || 
      p.marque.toLowerCase().includes(query)
    ).slice(0, 15);

    searchResultsDropdown.innerHTML = "";
    if (matches.length === 0) {
      searchResultsDropdown.innerHTML = `<div class="search-result-item" style="cursor: default; color: var(--muted);">Aucun résultat trouvé</div>`;
    } else {
      matches.forEach(match => {
        const item = document.createElement("div");
        item.className = "search-result-item";
        item.innerHTML = `
          <span class="search-result-libelle">${escapeHtml(match.libelle)}</span>
          <span class="search-result-marque">${escapeHtml(match.marque)}</span>
        `;
        item.addEventListener("click", () => {
          addManualPart(match.libelle, match.marque);
          manualPartSearch.value = "";
          searchResultsDropdown.style.display = "none";
        });
        searchResultsDropdown.appendChild(item);
      });
    }
    searchResultsDropdown.style.display = "block";
  });

  // Close search dropdown on click outside
  document.addEventListener("click", (e) => {
    if (!manualPartSearch.contains(e.target) && !searchResultsDropdown.contains(e.target)) {
      searchResultsDropdown.style.display = "none";
    }
  });
}

// Toggle mobile navigation tabs
function setActiveMobileTab(tab) {
  if (tab === "saisie") {
    tabBtnSaisie.classList.add("active");
    tabBtnApercu.classList.remove("active");
    wizardPanelContainer.style.display = "flex";
    previewPanelContainer.style.display = "none";
  } else {
    tabBtnSaisie.classList.remove("active");
    tabBtnApercu.classList.add("active");
    wizardPanelContainer.style.display = "none";
    previewPanelContainer.style.display = "block";
    // Hide the badge when the user views the preview
    previewBadge.style.display = "none";
  }
}

// Display error alert inside the form container
function showAlert(text) {
  formAlert.textContent = text;
  formAlert.style.display = "block";
  formAlert.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function hideAlert() {
  formAlert.style.display = "none";
}

// Validate single step before going to the next
function validateStep(step) {
  if (step === 1) {
    const num = inputInvoiceNumber.value.trim();
    if (num.length < 1) {
      showAlert("Veuillez saisir un numéro de facture valide.");
      return false;
    }
    if (!inputInvoiceDate.value) {
      showAlert("Veuillez sélectionner une date d'émission.");
      return false;
    }
  } else if (step === 2) {
    if (inputClientType.value === "Société" && inputClientName.value.trim().length < 2) {
      showAlert("Veuillez saisir le nom de la société.");
      return false;
    }
  }
  return true;
}

// Update the visible form steps & progress header indicators
function updateStepUI() {
  // Hide all step contents
  document.getElementById("step-content-1").style.display = "none";
  document.getElementById("step-content-2").style.display = "none";
  document.getElementById("step-content-3").style.display = "none";

  // Show active step
  document.getElementById(`step-content-${currentStep}`).style.display = "block";

  // Update indicators
  for (let i = 1; i <= 3; i++) {
    const indicator = document.getElementById(`step-indicator-${i}`);
    if (i < currentStep) {
      indicator.className = "wizard-step completed";
    } else if (i === currentStep) {
      indicator.className = "wizard-step active";
    } else {
      indicator.className = "wizard-step";
    }
  }

  // Back button visibility
  if (currentStep === 1) {
    prevBtn.style.visibility = "hidden";
  } else {
    prevBtn.style.visibility = "visible";
  }

  updateNextButtonLabel();
}

function updateNextButtonLabel() {
  if (currentStep === 3) {
    if (inputPieceEntryType.value === "manual") {
      const targetTTC = Number(inputTotalTtc.value) || 0;
      const currentSum = selectedManualParts.reduce((sum, p) => sum + (p.quantity * p.unit_price), 0);
      if (Math.abs(targetTTC - currentSum) >= 0.01) {
        nextBtn.textContent = "Ajuster les montants";
        nextBtn.disabled = true;
      } else {
        nextBtn.textContent = "Générer la facture";
        nextBtn.disabled = false;
      }
    } else {
      nextBtn.textContent = "Générer la facture";
      nextBtn.disabled = false;
    }
  } else {
    nextBtn.textContent = "Suivant";
    nextBtn.disabled = false;
  }
}

// Convert date format from YYYY-MM-DD to DD/MM/YYYY
function formatDateForInvoice(value) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

// Handle final Invoice Generation API request
async function handleGenerateInvoice() {
  const invoiceNumRaw = inputInvoiceNumber.value.toUpperCase().trim();
  const invoiceNumber = invoiceNumRaw.startsWith("FC") ? invoiceNumRaw : `FC${invoiceNumRaw}`;
  
  const invoiceDate = formatDateForInvoice(inputInvoiceDate.value);
  const paymentMethod = inputPaymentMethod.value;
  const clientType = inputClientType.value;
  const targetTTC = Number(inputTotalTtc.value);
  
  if (isNaN(targetTTC) || targetTTC <= 0) {
    showAlert("Le montant T.T.C doit être supérieur à 0.");
    return;
  }

  // Format client name / address
  let client = "Client Divers";
  if (clientType === "Société") {
    let normalized = inputClientName.value.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
    if (/sarl/i.test(normalized)) {
      normalized = normalized.replace(/\s*sarl\b/i, " SARL");
      const parts = normalized.split(/\s+SARL/i);
      if (parts.length === 2) {
        normalized = `${parts[0].trim()} SARL\n${parts[1].trim()}`.trim();
      }
    }
    client = normalized;
  }

  // Build payload
  const payload = {
    invoice_number: invoiceNumber,
    client: client,
    payment_method: paymentMethod,
    invoice_date: invoiceDate,
    total_ttc: targetTTC
  };

  if (inputPieceEntryType.value === "manual") {
    const currentSum = selectedManualParts.reduce((sum, p) => sum + (p.quantity * p.unit_price), 0);
    if (Math.abs(targetTTC - currentSum) >= 0.01) {
      showAlert("Erreur : La somme des pièces doit égaler le total TTC final avant de générer.");
      return;
    }
    payload.lines = selectedManualParts.map(p => ({
      description: p.description,
      quantity: p.quantity,
      unit_price: p.unit_price,
      line_total: p.quantity * p.unit_price
    }));
  }

  try {
    setGeneratingState(true);
    const res = await fetch("/api/generate-invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (!res.ok) {
      showAlert(`Erreur lors de la génération : ${result.error || "Une erreur est survenue."}`);
      return;
    }

    // Render preview with final data
    renderPreview(result.summary, result.downloads);

    // If on mobile, toggle to the preview tab automatically and flash the badge
    if (window.innerWidth <= 860) {
      setActiveMobileTab("apercu");
    } else {
      // Just briefly flash the preview panel scroll view
      previewPanelContainer.scrollIntoView({ behavior: "smooth" });
    }

  } catch (err) {
    showAlert("Erreur de communication avec le serveur de facturation.");
    console.error(err);
  } finally {
    setGeneratingState(false);
  }
}

// Manage buttons and text states when communicating with server
function setGeneratingState(generating) {
  isGenerating = generating;
  if (generating) {
    nextBtn.disabled = true;
    prevBtn.disabled = true;
    nextBtn.innerHTML = `<span class="loading-spinner"></span> Génération...`;
  } else {
    prevBtn.disabled = false;
    updateNextButtonLabel();
  }
}

// Render dynamic elements inside the preview container
function renderPreview(summary, downloads) {
  previewEmpty.style.display = "none";
  previewContent.style.display = "block";

  // Flash a success dot badge if on mobile and currently on Saisie tab
  if (window.innerWidth <= 860 && tabBtnSaisie.classList.contains("active")) {
    previewBadge.style.display = "inline-block";
  }

  pvInvoice.textContent = summary.invoice_number;
  pvClient.innerHTML = escapeHtml(summary.client).replace(/\n/g, "<br>");
  pvPayment.textContent = summary.payment_method;
  pvDate.textContent = summary.invoice_date;

  pvLines.innerHTML = "";
  summary.lines.forEach((line) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(line.description)}</td>
      <td class="col-qty">${line.quantity}</td>
      <td class="col-price">${line.unit_price}</td>
      <td class="col-total font-mono">${line.line_total}</td>
    `;
    pvLines.appendChild(tr);
  });

  pvHt.textContent = `${summary.ht} DH`;
  pvTva.textContent = `${summary.tva} DH`;
  pvTtc.textContent = `${summary.ttc} DH`;
  pvWords.textContent = `Arrêtée la présente facture à la somme de : ${summary.amount_words}`;

  downloadDocx.href = downloads.docx;
  downloadPdf.href = downloads.pdf;
}

// Manual pieces interaction functions
function addManualPart(libelle, marque) {
  selectedManualParts.push({
    description: `${libelle} ${marque}`,
    quantity: 1,
    unit_price: 100,
  });
  updateManualPartsUI();
}

function updateManualPartsUI() {
  manualSelectedList.innerHTML = "";
  
  if (selectedManualParts.length === 0) {
    manualSelectedList.innerHTML = `<div class="manual-empty-parts-tip">Aucune pièce sélectionnée. Saisissez une pièce ci-dessus pour commencer.</div>`;
  } else {
    selectedManualParts.forEach((part, index) => {
      const row = document.createElement("div");
      row.className = "manual-part-row";

      // 1. Description
      const descCol = document.createElement("div");
      descCol.className = "manual-part-inputs";
      descCol.innerHTML = `<label>Libellé de la pièce</label>`;
      const descInput = document.createElement("input");
      descInput.type = "text";
      descInput.value = part.description;
      descInput.addEventListener("input", (e) => {
        part.description = e.target.value;
      });
      descCol.appendChild(descInput);

      // 2. Quantity
      const qtyCol = document.createElement("div");
      qtyCol.className = "manual-part-inputs";
      qtyCol.innerHTML = `<label>Qté</label>`;
      const qtyInput = document.createElement("input");
      qtyInput.type = "number";
      qtyInput.value = part.quantity;
      qtyInput.min = "1";
      qtyInput.addEventListener("input", (e) => {
        const q = parseInt(e.target.value) || 1;
        part.quantity = q < 1 ? 1 : q;
        row.querySelector(".part-total-val").textContent = formatNumberMoney(part.quantity * part.unit_price);
        updateManualStatus();
      });
      qtyCol.appendChild(qtyInput);

      // 3. Price
      const priceCol = document.createElement("div");
      priceCol.className = "manual-part-inputs";
      priceCol.innerHTML = `<label>P.U. TTC (DH)</label>`;
      const priceInput = document.createElement("input");
      priceInput.type = "number";
      priceInput.value = part.unit_price;
      priceInput.min = "0";
      priceInput.addEventListener("input", (e) => {
        const p = parseFloat(e.target.value) || 0;
        part.unit_price = p < 0 ? 0 : p;
        row.querySelector(".part-total-val").textContent = formatNumberMoney(part.quantity * part.unit_price);
        updateManualStatus();
      });
      priceCol.appendChild(priceInput);

      // 4. Line total display
      const totalCol = document.createElement("div");
      totalCol.className = "manual-part-inputs align-right-desktop";
      totalCol.innerHTML = `<label>Total TTC</label>`;
      const totalDisplay = document.createElement("div");
      totalDisplay.className = "part-total-display";
      totalDisplay.innerHTML = `<span class="part-total-val">${formatNumberMoney(part.quantity * part.unit_price)}</span> DH`;
      totalCol.appendChild(totalDisplay);

      // 5. Remove button
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "btn-remove-part";
      removeBtn.innerHTML = `✕`;
      removeBtn.addEventListener("click", () => {
        selectedManualParts.splice(index, 1);
        updateManualPartsUI();
      });

      row.appendChild(descCol);
      row.appendChild(qtyCol);
      row.appendChild(priceCol);
      row.appendChild(totalCol);
      row.appendChild(removeBtn);

      manualSelectedList.appendChild(row);
    });
  }

  updateManualStatus();
}

function formatNumberMoney(num) {
  return Number(num).toFixed(2);
}

// Live summation & target feedback
function updateManualStatus() {
  const targetTTC = Number(inputTotalTtc.value) || 0;
  const currentSum = selectedManualParts.reduce((sum, p) => sum + (p.quantity * p.unit_price), 0);
  const diff = targetTTC - currentSum;

  manualSummaryStatus.className = "manual-summary-status";
  
  if (Math.abs(diff) < 0.01) {
    manualSummaryStatus.classList.add("success");
    manualSummaryStatus.innerHTML = `
      <div class="status-grid">
        <div class="status-grid-item"><span>Total Saisi</span><strong>${formatNumberMoney(currentSum)} DH</strong></div>
        <div class="status-grid-item"><span>Total Cible</span><strong>${formatNumberMoney(targetTTC)} DH</strong></div>
        <div class="status-grid-item"><span>Statut</span><strong style="color: var(--good);">✓ Égalité parfaite !</strong></div>
      </div>
      <p style="margin: 0; color: var(--good); font-weight: 500; font-size: 0.85rem;">Le total des pièces correspond parfaitement au montant de la facture. Vous pouvez maintenant la générer.</p>
    `;
  } else {
    manualSummaryStatus.classList.add("error");
    const diffText = diff > 0 ? `Manque ${formatNumberMoney(diff)} DH` : `Excès de ${formatNumberMoney(Math.abs(diff))} DH`;
    manualSummaryStatus.innerHTML = `
      <div class="status-grid">
        <div class="status-grid-item"><span>Total Saisi</span><strong>${formatNumberMoney(currentSum)} DH</strong></div>
        <div class="status-grid-item"><span>Total Cible</span><strong>${formatNumberMoney(targetTTC)} DH</strong></div>
        <div class="status-grid-item"><span>Différence</span><strong style="color: #ef4444;">${diffText}</strong></div>
      </div>
      <p style="margin: 0; color: #ef4444; font-weight: 500; font-size: 0.85rem;">Veuillez adapter les prix et quantités de vos pièces jusqu'à obtenir exactement ${formatNumberMoney(targetTTC)} DH.</p>
    `;
  }

  updateNextButtonLabel();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Initialize on page load
init();
