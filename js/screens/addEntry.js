/* ================================================================
   ADD ENTRY SCREEN — New/Existing Customer + Photo Picker
   ================================================================ */

const AddEntryScreen = (() => {

  let _prefilledCustomerId = null;  // Set when adding loan for existing customer
  let _photoData = null;            // base64 photo data

  function render(container, customerId = null) {
    _prefilledCustomerId = customerId || null;
    _photoData = null;

    const today = new Date().toISOString().split('T')[0];
    const isHindu = DB.getSetting('isHinduMode', true);

    const due = new Date();
    due.setMonth(due.getMonth() + 3);
    const dueDefault = due.toISOString().split('T')[0];

    // Pre-fill customer info if adding loan for existing customer
    let prefillName = '', prefillPhone = '', prefillAddress = '', prefillPhoto = null;
    if (_prefilledCustomerId) {
      const cust = DB.getCustomer(_prefilledCustomerId);
      if (cust) {
        prefillName = cust.name;
        prefillPhone = cust.phone;
        prefillAddress = cust.address;
        prefillPhoto = cust.photo;
        _photoData = cust.photo;
      }
    }

    const isExistingCustomer = !!_prefilledCustomerId;
    const headerTitle = isExistingCustomer ? `Add Loan for ${prefillName}` : 'Add New Loan';

    container.innerHTML = `
      <div class="screen screen-slide-in">
        <div class="card" style="margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
            <span style="font-size:2rem;">📋</span>
            <div>
              <div style="font-weight:700;font-size:1rem;">${headerTitle}</div>
              <div style="color:var(--text-muted);font-size:0.8rem;">${isExistingCustomer ? 'Add another loan for this customer' : 'Fill in the customer details below'}</div>
            </div>
          </div>

          <!-- PHOTO PICKER -->
          <div style="text-align:center;margin-bottom:20px;">
            <div id="photoPreview" class="photo-picker" onclick="document.getElementById('photoPicker').click()">
              ${prefillPhoto
                ? `<img src="${prefillPhoto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
                : '<span style="font-size:1.5rem;">📷</span>'}
            </div>
            <input type="file" id="photoPicker" accept="image/*" capture="environment" style="display:none"
                   onchange="AddEntryScreen.onPhotoSelected(event)" />
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:6px;">Tap to add photo</div>
          </div>

          <!-- CUSTOMER INFO (disabled if existing customer) -->
          <div class="form-group">
            <label class="form-label">👤 Customer Name *</label>
            <input class="form-control" id="aeName" type="text" placeholder="e.g. Ramesh Kumar"
                   value="${prefillName}" ${isExistingCustomer ? 'disabled style="opacity:0.6;"' : ''} required />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">📱 Phone Number</label>
              <input class="form-control" id="aePhone" type="tel" placeholder="9876543210" maxlength="10" pattern="[0-9]*" inputmode="numeric"
                     value="${prefillPhone}" ${isExistingCustomer ? 'disabled style="opacity:0.6;"' : ''} />
            </div>
            <div class="form-group">
              <label class="form-label">📍 Address</label>
              <input class="form-control" id="aeAddress" type="text" placeholder="Village / Area"
                     value="${prefillAddress}" ${isExistingCustomer ? 'disabled style="opacity:0.6;"' : ''} />
            </div>
          </div>

          <div class="divider"></div>

          <!-- LOAN DETAILS -->
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">💰 Loan Amount (₹) *</label>
              <input class="form-control" id="aePrincipal" type="number" placeholder="10000" min="1" required />
            </div>
            <div class="form-group">
              <label class="form-label">% Interest Rate (monthly) *</label>
              <input class="form-control" id="aeRate" type="number" placeholder="2" step="0.1" min="0" max="100" required />
            </div>
          </div>

          <!-- ROW 3: Date & Due Date -->
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">📅 Loan Date</label>
              <input class="form-control" id="aeLoanDate" type="date" value="${today}" />
            </div>
            <div class="form-group">
              <label class="form-label">⏰ Due Date</label>
              <input class="form-control" id="aeDueDate" type="date" value="${dueDefault}" />
            </div>
          </div>

          <!-- SAMVAT & TITHI PREVIEW -->
          <div class="form-group">
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
              <span class="samvat-badge" id="previewSamvat">📆 ${TithiService.getSamvatDisplay(new Date(today))}</span>
              <span class="samvat-badge" id="previewMonth" style="background:rgba(255,255,255,0.05);border-color:var(--border);color:var(--text-secondary);">
                🌙 ${TithiService.getMaasFromGregorian(new Date(today))}
              </span>
            </div>
            ${isHindu ? `
            <div id="tithiChip">
              <div style="font-size:0.85rem; margin-bottom:6px; color:var(--text-primary); display:flex; align-items:center;" id="previewTithi">
                🪔 तिथि: ${TithiService.getShort(new Date(today))}
              </div>
            </div>` : ''}
          </div>

          <!-- INTEREST TYPE -->
          <div class="card" style="margin-bottom:16px;padding:16px;background:rgba(0,0,0,0.15);">
            <div style="font-weight:700;margin-bottom:12px;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
              <span>⚙️</span> Interest Settings
            </div>

            <!-- Interest Type radios -->
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label" style="margin-bottom:6px;">Interest Type</label>
              <div style="display:flex;gap:16px;">
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:600;">
                  <input type="radio" name="interestType" value="compound" checked />
                  📈 Compound
                </label>
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:600;">
                  <input type="radio" name="interestType" value="simple" />
                  📉 Simple
                </label>
              </div>
            </div>

            <!-- Compounding Frequency (only shown when compound selected) -->
            <div id="compoundFreqSection" style="margin-top:8px;">
              <label class="form-label" style="margin-bottom:6px;">Compounding Frequency</label>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;" id="freqGrid">
                <label class="freq-btn" data-val="1"  style="display:flex;align-items:center;gap:6px;padding:8px 12px;border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:0.85rem;transition:all 0.2s;">
                  <input type="radio" name="compFreq" value="1" checked style="display:none;"> Monthly (12×/yr)
                </label>
                <label class="freq-btn" data-val="3"  style="display:flex;align-items:center;gap:6px;padding:8px 12px;border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:0.85rem;transition:all 0.2s;">
                  <input type="radio" name="compFreq" value="3" style="display:none;"> Quarterly (4×/yr)
                </label>
                <label class="freq-btn" data-val="6"  style="display:flex;align-items:center;gap:6px;padding:8px 12px;border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:0.85rem;transition:all 0.2s;">
                  <input type="radio" name="compFreq" value="6" style="display:none;"> Half-Yearly (2×/yr)
                </label>
                <label class="freq-btn" data-val="12" style="display:flex;align-items:center;gap:6px;padding:8px 12px;border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:0.85rem;transition:all 0.2s;">
                  <input type="radio" name="compFreq" value="12" style="display:none;"> Yearly (1×/yr)
                </label>
              </div>
              <!-- Smart Suggestion Chip -->
              <div id="freqSuggestion" style="margin-top:8px;font-size:0.78rem;color:var(--text-secondary);"></div>
            </div>
          </div>

          <!-- CALCULATION MODE -->
          <div class="card" style="margin-bottom:16px;padding:16px;background:rgba(0,0,0,0.1);">
            <div style="font-weight:700;margin-bottom:10px;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
              <span>🕐</span> Time Calculation Mode
            </div>
            <div style="display:flex;gap:8px;">
              <label id="calcModeFullBtn" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:0.85rem;font-weight:600;transition:all 0.2s;background:var(--accent);color:var(--bg-deep);border-color:var(--accent);">
                <input type="radio" name="calcMode" value="fullMonths" checked style="display:none;"> 📅 Full Months
              </label>
              <label id="calcModeActualBtn" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:0.85rem;font-weight:600;transition:all 0.2s;background:transparent;color:var(--text-primary);">
                <input type="radio" name="calcMode" value="actualDays" style="display:none;"> 📆 Actual Days
              </label>
            </div>
            <div style="margin-top:8px;font-size:0.75rem;color:var(--text-secondary);" id="calcModeDesc">
              📅 <strong>Full Months</strong>: t = days÷30 (banking approximation, standard)
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">📝 Notes</label>
            <textarea class="form-control" id="aeNotes" rows="2" placeholder="Any special notes…" style="resize:vertical;"></textarea>
          </div>

          <!-- PREVIEW -->
          <div id="calcPreview" style="display:none;background:var(--gold-glow);border-color:var(--accent-soft);" class="card">
          </div>

          <div style="display:flex;gap:10px;margin-top:4px;">
            <button class="btn btn-primary btn-full" onclick="AddEntryScreen.save()" id="aeSubmitBtn">✅ Save Loan</button>
          </div>
        </div>
      </div>
    `;

    // Frequency button active styling
    function refreshFreqStyles() {
      const selected = document.querySelector('input[name="compFreq"]:checked')?.value;
      document.querySelectorAll('.freq-btn').forEach(lbl => {
        const active = lbl.dataset.val === selected;
        lbl.style.background = active ? 'var(--accent)' : 'transparent';
        lbl.style.color = active ? 'var(--bg-deep)' : 'var(--text-primary)';
        lbl.style.borderColor = active ? 'var(--accent)' : 'var(--border)';
        lbl.style.fontWeight = active ? '700' : '400';
      });
    }

    // Show/hide compounding section based on interest type
    function toggleCompSection() {
      const isCompound = document.querySelector('input[name="interestType"]:checked')?.value !== 'simple';
      const section = document.getElementById('compoundFreqSection');
      if (section) section.style.display = isCompound ? 'block' : 'none';
    }

    // Helper: bind listener once by cloning element (prevents stacking)
    function bindOnce(id, event, fn) {
      const el = document.getElementById(id);
      if (!el) return;
      const clone = el.cloneNode(true);
      el.parentNode.replaceChild(clone, el);
      clone.addEventListener(event, fn);
      return clone;
    }

    // Trigger auto updates — bind ONCE each
    ['aeLoanDate', 'aeDueDate', 'aePrincipal'].forEach(id => {
      const el = bindOnce(id, 'input', updatePreview);
      if (el) el.addEventListener('change', updatePreview);
    });

    // aeRate — bind once for both updatePreview and showRatePopup
    const aeRateEl = bindOnce('aeRate', 'input', () => { updatePreview(); showRatePopup(); });
    if (aeRateEl) {
      aeRateEl.addEventListener('input', function() {
        if (this.value < 0) this.value = 0;
        if (this.value > 100) this.value = 100;
      });
    }

    // aeName — bind once with validation
    bindOnce('aeName', 'input', function() {
      this.value = this.value.replace(/[^a-zA-Z\s]/g, "");
    });

    // aePhone — bind once with validation
    bindOnce('aePhone', 'input', function() {
      this.value = this.value.replace(/\D/g, "").slice(0, 10);
    });

    // aePrincipal — bind once with validation
    bindOnce('aePrincipal', 'input', function() {
      if (this.value < 0) this.value = 0;
    });

    document.querySelectorAll('input[name="interestType"]').forEach(radio => {
      radio.addEventListener('change', () => { toggleCompSection(); showRatePopup(); updatePreview(); });
    });
    document.querySelectorAll('input[name="compFreq"]').forEach(radio => {
      radio.addEventListener('change', () => { refreshFreqStyles(); showRatePopup(); updatePreview(); });
    });
    document.querySelectorAll('.freq-btn').forEach(lbl => {
      lbl.addEventListener('click', () => {
        const radio = lbl.querySelector('input[type="radio"]');
        if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change', { bubbles: true })); }
      });
    });

    // Calc mode toggle style refresh
    function refreshCalcModeStyles() {
      const mode = document.querySelector('input[name="calcMode"]:checked')?.value || 'fullMonths';
      const fullBtn   = document.getElementById('calcModeFullBtn');
      const actualBtn = document.getElementById('calcModeActualBtn');
      const descEl    = document.getElementById('calcModeDesc');
      if (fullBtn) {
        fullBtn.style.background    = mode === 'fullMonths' ? 'var(--accent)' : 'transparent';
        fullBtn.style.color         = mode === 'fullMonths' ? 'var(--bg-deep)' : 'var(--text-primary)';
        fullBtn.style.borderColor   = mode === 'fullMonths' ? 'var(--accent)' : 'var(--border)';
      }
      if (actualBtn) {
        actualBtn.style.background  = mode === 'actualDays' ? 'var(--accent)' : 'transparent';
        actualBtn.style.color       = mode === 'actualDays' ? 'var(--bg-deep)' : 'var(--text-primary)';
        actualBtn.style.borderColor = mode === 'actualDays' ? 'var(--accent)' : 'var(--border)';
      }
      if (descEl) {
        descEl.innerHTML = mode === 'fullMonths'
          ? '📅 <strong>Full Months</strong>: t = days÷30 months (banking approximation, standard)'
          : '📆 <strong>Actual Days</strong>: t = days÷365 years (high precision, Tithi-grade)';
      }
    }

    toggleCompSection();
    refreshFreqStyles();
    refreshCalcModeStyles();
    if (isHindu) updatePreview();

    document.querySelectorAll('input[name="calcMode"]').forEach(r => {
      r.addEventListener('change', () => { refreshCalcModeStyles(); updatePreview(); });
    });
    document.querySelectorAll('#calcModeFullBtn, #calcModeActualBtn').forEach(lbl => {
      lbl.addEventListener('click', () => {
        const r = lbl.querySelector('input[type="radio"]');
        if (r) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
      });
    });

    document.removeEventListener('panchangUpdated', updatePreview);
    document.addEventListener('panchangUpdated', updatePreview);
  }

  function showRatePopup() {
    const interestType = document.querySelector('input[name="interestType"]:checked')?.value || 'compound';
    if (interestType === 'simple') return; // Only show for compound

    const rate = parseFloat(document.getElementById('aeRate')?.value);
    if (!rate) return;

    const annualRate = rate * 12;
    const compFreqVal = parseInt(document.querySelector('input[name="compFreq"]:checked')?.value || '1');
    const freqLabels = { 1: 'Monthly (12×/yr)', 3: 'Quarterly (4×/yr)', 6: 'Half-Yearly (2×/yr)', 12: 'Yearly (1×/yr)' };
    const freqLabel = freqLabels[compFreqVal] || 'Monthly';

    // Remove previous popup
    document.getElementById('rateInfoPopup')?.remove();

    const popup = document.createElement('div');
    popup.id = 'rateInfoPopup';
    popup.style.cssText = `
      position:fixed; bottom: calc(var(--bottomnav-h) + 12px); left:12px; right:12px;
      background: linear-gradient(135deg, #1e3a5f, #0d2137);
      border: 1px solid #3b82f6;
      border-radius: 16px; padding: 16px;
      z-index: 9998;
      box-shadow: 0 -4px 24px rgba(59,130,246,0.3);
      animation: slideUp 0.25s ease-out;
    `;
    popup.innerHTML = `
      <style>@keyframes slideUp { from { transform: translateY(30px); opacity:0; } to { transform: translateY(0); opacity:1; } }</style>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <div style="font-weight:700; color:#60a5fa; font-size:0.95rem;">ℹ️ Rate Breakdown</div>
        <button onclick="document.getElementById('rateInfoPopup').remove()" style="background:none;border:none;color:#94a3b8;font-size:1.2rem;cursor:pointer;">✕</button>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:0.85rem;">
        <div style="color:#94a3b8;">Monthly Rate:</div>
        <div style="color:#f1f5f9; font-weight:700;">${rate}% / month</div>
        <div style="color:#94a3b8;">Annual Rate:</div>
        <div style="color:#fbbf24; font-weight:700;">${annualRate.toFixed(2)}% / year</div>
        <div style="color:#94a3b8;">Compounding:</div>
        <div style="color:#34d399; font-weight:700;">${freqLabel}</div>
      </div>
      <div style="margin-top:10px; font-size:0.75rem; color:#64748b; border-top: 1px dashed #334155; padding-top:8px;">
        Formula: P × (1 + ${annualRate/100}/${12/compFreqVal})^(${12/compFreqVal}×t) &nbsp;|&nbsp; t = days/365
      </div>
    `;
    document.body.appendChild(popup);

    // Auto-dismiss after 5 seconds
    setTimeout(() => popup.remove(), 5000);
  }

  function updatePreview() {
    const loanDateStr = document.getElementById('aeLoanDate')?.value;
    const dueDateStr  = document.getElementById('aeDueDate')?.value;
    const principal   = parseFloat(document.getElementById('aePrincipal')?.value);
    const rate        = parseFloat(document.getElementById('aeRate')?.value);
    const div         = document.getElementById('calcPreview');
    
    if (!loanDateStr || !div) return;

    // Update Tithi and Samvat dynamically
    const ldObj = new Date(loanDateStr);
    const pSamvat = document.getElementById('previewSamvat');
    const pMonth  = document.getElementById('previewMonth');
    const pTithi  = document.getElementById('previewTithi');
    if (pSamvat) pSamvat.innerHTML = `📆 ${TithiService.getSamvatDisplay(ldObj)}`;
    if (pMonth)  pMonth.innerHTML  = `🌙 ${TithiService.getMaasFromGregorian(ldObj)}`;
    if (pTithi)  pTithi.innerHTML  = `🪔 तिथि: ${TithiService.getShort(ldObj)}`;

    if (!principal || !rate) { div.style.display = 'none'; return; }

    const interestType      = document.querySelector('input[name="interestType"]:checked')?.value || 'compound';
    const compoundingMonths = parseInt(document.querySelector('input[name="compFreq"]:checked')?.value || '1');
    const calculationMode    = document.querySelector('input[name="calcMode"]:checked')?.value || 'fullMonths';

    // Remove suggestion chip visually since engine is now standardized
    const suggestionEl = document.getElementById('freqSuggestion');
    if (suggestionEl) suggestionEl.innerHTML = '';

    const baseEntry = {
      principal, ratePerMonth: rate, loanDate: loanDateStr,
      interestType, compoundingMonths, calculationMode, status: 'active'
    };

    // Helper to render one block
    function renderPreviewBlock(title, targetDate, isDueDate = false) {
      const res = FinanceEngine.calculateEntry(baseEntry, targetDate);
      const tYears       = res.timeYears.toFixed(4);
      const tMonths      = res.timeInMonths.toFixed(2);
      
      let secHtml = `
        <div style="font-weight:700; margin-top:16px; margin-bottom:8px; color:var(--text-primary); border-bottom:1px solid var(--border); padding-bottom:4px;">
          ${title}
        </div>
        <div class="report-stat"><span class="stat-name">Duration</span><span class="stat-value">${res.days} days = ${tMonths} mo = ${tYears} yrs</span></div>
        <div class="report-stat"><span class="stat-name">Interest Earned</span><span class="stat-value" style="color:var(--warn);">${InterestService.fmt(res.interest)}</span></div>
        <div class="report-stat" style="margin-top:4px;">
          <span class="stat-name" style="font-weight:700;">Total Payable</span>
          <span class="stat-value" style="color:var(--danger); font-size:1.1rem; font-weight:800;">${InterestService.fmt(res.total)}</span>
        </div>
      `;
      return secHtml;
    }

    // 1. TODAY PREVIEW
    let html = `
      <div style="font-weight:700; margin-bottom:8px; color:var(--text-primary); text-align:center;">📊 Estimation Preview</div>
      <div style="font-size:0.8rem; color:var(--text-secondary); text-align:center; margin-bottom:12px;">(Actual amounts will be calculated live in account)</div>
      
      <div class="report-stat"><span class="stat-name">Time Mode</span><span class="stat-value">${calculationMode === 'fullMonths' ? '📅 Full Months (days÷30)' : '📆 Actual Days (days÷365)'}</span></div>
      <div class="report-stat"><span class="stat-name">Monthly Rate</span><span class="stat-value">${rate}% → <span style="color:#fbbf24;">${(rate*12).toFixed(2)}% Annual</span></span></div>
      <div class="report-stat"><span class="stat-name">Interest Type</span><span class="stat-value">${interestType === 'compound' ? '📈 Compound' : '📉 Simple'}</span></div>
    `;

    html += renderPreviewBlock('🕒 TODAY PREVIEW (If closed today)', new Date());

    // 2. DUE DATE PREVIEW
    if (dueDateStr) {
      html += renderPreviewBlock('📅 DUE DATE PREVIEW (Estimation)', new Date(dueDateStr), true);
    }

    div.style.display = 'block';
    div.innerHTML = html;
  }

  function onPhotoSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      Toast.show("⚠️ Image too large (max 5MB)");
      return;
    }

    // Compress and convert to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        const MAX_WIDTH = 600;
        
        if (w > MAX_WIDTH) {
          const scale = MAX_WIDTH / w;
          w = MAX_WIDTH;
          h = h * scale;
        }

        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        _photoData = canvas.toDataURL('image/jpeg', 0.6);  // compressed JPEG

        // Update photo view element
        const preview = document.getElementById('photoPreview');
        if (preview) {
          preview.innerHTML = `<img src="${_photoData}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function save() {
    const name    = document.getElementById('aeName').value.trim();
    const phone   = document.getElementById('aePhone').value.trim();
    const address = document.getElementById('aeAddress').value.trim();
    const prin    = document.getElementById('aePrincipal').value.trim();
    const rate    = document.getElementById('aeRate').value.trim();
    const date    = document.getElementById('aeLoanDate').value;
    const due     = document.getElementById('aeDueDate').value;
    const notes   = document.getElementById('aeNotes').value.trim();

    const interestType      = document.querySelector('input[name="interestType"]:checked').value;
    const compoundingMonths = parseInt(document.querySelector('input[name="compFreq"]:checked')?.value || '1');
    const calculationMode   = document.querySelector('input[name="calcMode"]:checked')?.value || 'fullMonths';

    if (!name) {
      Toast.show('⚠️ Please enter Customer Name');
      return;
    }
    if (phone && phone.length !== 10) {
      Toast.show('⚠️ Phone number must be 10 digits');
      return;
    }
    if (!prin || parseFloat(prin) <= 0) {
      Toast.show('⚠️ Please enter a valid Loan Amount');
      return;
    }
    if (!rate || parseFloat(rate) <= 0 || parseFloat(rate) > 100) {
      Toast.show('⚠️ Please enter a valid Interest Rate between 0-100');
      return;
    }

    const btn = document.getElementById('aeSubmitBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

    // Get or create customer
    let customer;
    if (_prefilledCustomerId) {
      customer = DB.getCustomer(_prefilledCustomerId);
      // Update photo if newly added
      if (_photoData && !customer.photo) {
        customer.photo = _photoData;
        DB.updateCustomer(customer);
      }
    } else {
      customer = DB.getOrCreateCustomer({ name, phone, address, photo: _photoData });
    }

    const days = InterestService.getDuration(date, due).totalDays;

    const entry = createEntry({
      customerId: customer.customerId,
      name, phone, address, principal: prin, interestRate: rate,
      loanDate: date, dueDate: due, notes,
      days, interestType, compoundingMonths, calculationMode
    });

    DB.addEntry(entry);

    Toast.show('✅ Loan added successfully!');
    setTimeout(() => {
      if (_prefilledCustomerId) {
        App.navigate('customer', _prefilledCustomerId);
      } else {
        App.navigate('home');
      }
    }, 400);
  }

  return { render, onPhotoSelected, updatePreview, save, showRatePopup };
})();
