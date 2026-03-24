/* ================================================================
   SETTINGS SCREEN
   ================================================================ */

const SettingsScreen = (() => {

  function render(container) {
    const shop    = DB.getShop();
    const isHindu = DB.getSetting('isHinduMode', true);
    const notif   = DB.getSetting('notificationsEnabled', false);
    const isFinancial = DB.getSetting('financialMode', false);

    // Read stored coords BEFORE template (arrow fns inside HTML attrs break template literals)
    const creds  = TithiService.getApiCredentials();
    const coords = TithiService.getStoredCoords();
    const apiOk  = TithiService.isApiConfigured();
    const hasManual = !!localStorage.getItem('manualPanchang');

    container.innerHTML = `
      <div class="screen screen-slide-in">

        <!-- SHOP BRANDING BANNER -->
        <div class="card" style="margin-bottom:20px;text-align:center;padding:24px;">
          <div style="font-size:3rem;margin-bottom:8px;">🏪</div>
          <div style="font-size:1.3rem;font-weight:700;color:var(--accent-glow);">${shop.name}</div>
          <div style="color:var(--text-secondary);font-size:0.85rem;margin-top:4px;">${shop.address}</div>
          <div style="color:var(--text-muted);font-size:0.8rem;">📱 ${shop.phone}</div>
        </div>

        <!-- SHOP SETTINGS -->
        <div class="settings-section">
          <div class="settings-title">🏪 Shop Information</div>
          <div class="card">
            <div class="form-group">
              <label class="form-label">Shop Name</label>
              <input class="form-control" id="sShopName" value="${shop.name}" placeholder="Jain Finance" />
            </div>
            <div class="form-group">
              <label class="form-label">Address</label>
              <input class="form-control" id="sShopAddr" value="${shop.address}" placeholder="Tikrapara" />
            </div>
            <div class="form-group">
              <label class="form-label">Phone</label>
              <input class="form-control" id="sShopPhone" value="${shop.phone}" type="tel" maxlength="10" pattern="[0-9]*" inputmode="numeric" placeholder="9876543210" />
            </div>
            <div class="form-group">
              <label class="form-label">Tagline</label>
              <input class="form-control" id="sShopTag" value="${shop.tagline || ''}" placeholder="Trusted Loan Management" />
            </div>
            <button class="btn btn-primary btn-full" onclick="SettingsScreen.saveShop()">💾 Save Shop Info</button>
          </div>
        </div>

        <!-- APP SETTINGS -->
        <div class="settings-section">
          <div class="settings-title">⚙️ App Settings</div>

          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-name">🏦 Calculation Engine</div>
              <div class="setting-desc">Enable Pro Financial Mode (Compound Interest) instead of Simple</div>
            </div>
            <label class="toggle">
              <input type="checkbox" id="toggleCalcMode" ${isFinancial ? 'checked' : ''} onchange="SettingsScreen.toggleCalcMode()" />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-name">🪔 Hindu Tithi Mode</div>
              <div class="setting-desc">Show dates as Hindi tithi (चैत्र शुक्ल…)</div>
            </div>
            <label class="toggle">
              <input type="checkbox" id="toggleHindu" ${isHindu ? 'checked' : ''} onchange="SettingsScreen.toggleMode()" />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-name">${ThemeToggle.isDark() ? '🌙' : '☀️'} Dark / Light Theme</div>
              <div class="setting-desc">Switch between dark and light appearance</div>
            </div>
            <label class="toggle">
              <input type="checkbox" id="toggleTheme" ${ThemeToggle.isDark() ? 'checked' : ''} onchange="SettingsScreen.toggleTheme()" />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-name">🔔 Due Reminders</div>
              <div class="setting-desc">Browser notifications for overdue loans</div>
            </div>
            <label class="toggle">
              <input type="checkbox" id="toggleNotif" ${notif ? 'checked' : ''} onchange="SettingsScreen.toggleNotifications()" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>


        <!-- PANCHANG OVERRIDE -->
        <div class="settings-section">
          <div class="settings-title">📅 Panchang Override</div>
          
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-name">✍️ Manual Mode</div>
              <div class="setting-desc">Override auto Panchang manually</div>
            </div>
            <label class="toggle">
              <input type="checkbox" id="manualToggle" ${hasManual ? 'checked' : ''} onchange="SettingsScreen.toggleManualMode()" />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div id="manualControls" class="card" style="display:${hasManual ? 'block' : 'none'}; margin-top:10px;">
            <div class="form-group">
              <label class="form-label">Samvat (Year)</label>
              <input type="number" id="samvatSelect" class="form-control" placeholder="e.g. 2083" oninput="SettingsScreen.applyManual(false)" />
            </div>
            <div class="form-group">
              <label class="form-label">Maas (Month)</label>
              <select id="monthSelect" class="form-control" onchange="SettingsScreen.applyManual(false)">
                <option value="">Select Month (मास)</option>
                <option value="चैत्र">चैत्र</option>
                <option value="वैशाख">वैशाख</option>
                <option value="ज्येष्ठ">ज्येष्ठ</option>
                <option value="आषाढ़">आषाढ़</option>
                <option value="श्रावण">श्रावण</option>
                <option value="भाद्रपद">भाद्रपद</option>
                <option value="आश्विन">आश्विन</option>
                <option value="कार्तिक">कार्तिक</option>
                <option value="मार्गशीर्ष">मार्गशीर्ष</option>
                <option value="पौष">पौष</option>
                <option value="माघ">माघ</option>
                <option value="फाल्गुन">फाल्गुन</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Paksha</label>
              <select id="pakshaSelect" class="form-control" onchange="SettingsScreen.applyManual(false)">
                <option value="">Select Paksha (पक्ष)</option>
                <option value="शुक्ल">शुक्ल</option>
                <option value="कृष्ण">कृष्ण</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Tithi</label>
              <select id="tithiSelect" class="form-control" onchange="SettingsScreen.applyManual(false)">
                <option value="">Select Tithi (तिथि)</option>
                <option value="प्रतिपदा">प्रतिपदा</option>
                <option value="द्वितीया">द्वितीया</option>
                <option value="तृतीया">तृतीया</option>
                <option value="चतुर्थी">चतुर्थी</option>
                <option value="पंचमी">पंचमी</option>
                <option value="षष्ठी">षष्ठी</option>
                <option value="सप्तमी">सप्तमी</option>
                <option value="अष्टमी">अष्टमी</option>
                <option value="नवमी">नवमी</option>
                <option value="दशमी">दशमी</option>
                <option value="एकादशी">एकादशी</option>
                <option value="द्वादशी">द्वादशी</option>
                <option value="त्रयोदशी">त्रयोदशी</option>
                <option value="चतुर्दशी">चतुर्दशी</option>
                <option value="पूर्णिमा">पूर्णिमा</option>
                <option value="अमावस्या">अमावस्या</option>
              </select>
            </div>
            <div id="panchangBox" style="margin-top:15px; font-weight:bold; color:var(--gold); text-align:center; padding:10px; border-radius:8px; border:1px dashed var(--gold);">
              📅 Please fill all Panchang fields
            </div>
            <button class="btn btn-primary btn-full" style="margin-top:10px;" onclick="SettingsScreen.applyManual(true)">💾 Save Tithi</button>
          </div>
        </div>

        <!-- PDF INVOICE SETTINGS -->
        <div class="settings-section">
          <div class="settings-title">🧾 PDF Invoice Settings</div>
          <div class="card">

            <!-- Page Size -->
            <div class="form-group" style="margin-bottom:14px;">
              <label class="form-label">📄 Page Size</label>
              <div style="display:flex;gap:10px;">
                <label id="sizeA4Btn" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:0.85rem;font-weight:600;transition:all 0.2s;background:${PDFService.getPageSize()==='a4'?'var(--accent)':'transparent'};color:${PDFService.getPageSize()==='a4'?'var(--bg-deep)':'var(--text-primary)'};"
                  onclick="SettingsScreen.setPageSize('a4')">
                  📄 A4 (210×297mm)
                </label>
                <label id="sizeA5Btn" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:0.85rem;font-weight:600;transition:all 0.2s;background:${PDFService.getPageSize()==='a5'?'var(--accent)':'transparent'};color:${PDFService.getPageSize()==='a5'?'var(--bg-deep)':'var(--text-primary)'};"
                  onclick="SettingsScreen.setPageSize('a5')">
                  📋 A5 (148×210mm)
                </label>
              </div>
            </div>

            <!-- Logo -->
            <div class="form-group" style="margin-bottom:14px;">
              <label class="form-label">🖼 Shop Logo (for PDF header)</label>
              <div style="display:flex;gap:10px;align-items:center;">
                ${PDFService.getLogo() ? `<img src="${PDFService.getLogo()}" style="width:48px;height:48px;object-fit:contain;border-radius:8px;border:1px solid var(--border);" id="logoPreview" />` : `<div style="width:48px;height:48px;background:var(--bg-card2);border:1px dashed var(--border);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;" id="logoPreview">🖼</div>`}
                <div style="flex:1;">
                  <input type="file" id="logoPicker" accept="image/*" style="display:none" onchange="SettingsScreen.onLogoSelected(event)" />
                  <button class="btn btn-secondary btn-full" style="margin-bottom:6px;" onclick="document.getElementById('logoPicker').click()">📂 Upload Logo</button>
                  ${PDFService.getLogo() ? `<button class="btn btn-full" style="color:var(--danger);border:1px solid var(--danger);background:transparent;" onclick="SettingsScreen.clearLogo()">🗑 Remove Logo</button>` : ''}
                </div>
              </div>
            </div>

            <!-- Signature -->
            <div class="form-group" style="margin-bottom:14px;">
              <label class="form-label">✍️ Authorised Signature (for PDF footer)</label>
              <div style="display:flex;gap:10px;align-items:center;">
                ${PDFService.getSignature() ? `<img src="${PDFService.getSignature()}" style="width:80px;height:40px;object-fit:contain;border-radius:6px;border:1px solid var(--border);" id="sigPreview" />` : `<div style="width:80px;height:40px;background:var(--bg-card2);border:1px dashed var(--border);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;" id="sigPreview">✍️</div>`}
                <div style="flex:1;">
                  <input type="file" id="sigPicker" accept="image/*" style="display:none" onchange="SettingsScreen.onSignatureSelected(event)" />
                  <button class="btn btn-secondary btn-full" style="margin-bottom:6px;" onclick="document.getElementById('sigPicker').click()">📂 Upload Signature</button>
                  ${PDFService.getSignature() ? `<button class="btn btn-full" style="color:var(--danger);border:1px solid var(--danger);background:transparent;" onclick="SettingsScreen.clearSignature()">🗑 Remove Signature</button>` : ''}
                </div>
              </div>
            </div>

            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;">
              💡 Logo &amp; Signature appear on all generated PDFs. Go to a customer detail screen to generate their full invoice.
            </div>
          </div>
        </div>

        <!-- DATA MANAGEMENT -->
        <div class="settings-section">
          <div class="settings-title">💾 Data Management</div>
          <div class="btn-row">
            <button class="btn btn-secondary btn-full" onclick="SettingsScreen.exportData()">📤 Export JSON</button>
            <button class="btn btn-secondary btn-full" onclick="SettingsScreen.importData()">📥 Import JSON</button>
          </div>
          <input type="file" id="importFile" accept=".json" style="display:none" onchange="SettingsScreen.doImport(event)" />
          <button class="btn btn-danger btn-full" style="margin-top:10px;" onclick="SettingsScreen.clearAll()">🗑 Clear All Data</button>
        </div>

        <!-- CONFIRM DELETE MODAL -->
        <div id="confirmModal" class="modal-overlay hidden" style="z-index:9999;">
          <div class="modal-box card" style="max-width:320px;width:90%;text-align:center;">
            <div style="font-size:3rem;margin-bottom:8px;">⚠️</div>
            <div class="modal-title" style="color:var(--danger)">Delete All Data?</div>
            <p style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:20px;">
              This will permanently erase all customers, loans, and settings. This action cannot be undone.
            </p>
            <div style="display:flex;gap:12px;">
              <button class="btn btn-secondary btn-full" style="flex:1;" onclick="SettingsScreen.closeConfirm()">Cancel</button>
              <button class="btn btn-danger btn-full" style="flex:1;" onclick="SettingsScreen.executeClearAll()">Yes, Delete</button>
            </div>
          </div>
        </div>

        <!-- APP INFO -->
        <div class="card" style="text-align:center;padding:20px;margin-bottom:8px;">
          <div style="font-size:2rem;margin-bottom:8px;">🪔</div>
          <div style="font-weight:700;color:var(--accent-glow);">Tithi Ledger Pro</div>
          <div style="color:var(--text-muted);font-size:0.8rem;margin-top:4px;">Version 1.0 • Made with ❤️ in India</div>
        </div>

      </div>
    `;

    // Restore manual panchang selects
    const manualData = localStorage.getItem('manualPanchang');
    if (manualData) {
      setTimeout(() => {
        try {
          const d = JSON.parse(manualData);
          const sv = document.getElementById('samvatSelect');
          const mo = document.getElementById('monthSelect');
          const pa = document.getElementById('pakshaSelect');
          const ti = document.getElementById('tithiSelect');
          if (sv) sv.value = d.samvat;
          if (mo) mo.value = d.month;
          if (pa) pa.value = d.paksha;
          if (ti) ti.value = d.tithi;
          const box = document.getElementById('panchangBox');
          if (box) box.innerHTML = `📅 संवत ${d.samvat} | ${d.month} | ${d.paksha} ${d.tithi}`;
        } catch {}
      }, 50);
    }

    // Input validation
    document.getElementById('sShopPhone')?.addEventListener('input', function() {
      this.value = this.value.replace(/\D/g, '').slice(0, 10);
    });
  }

  /* ── Shop ── */
  function saveShop() {
    const name  = document.getElementById('sShopName')?.value.trim()  || 'Jain Finance';
    const phone = document.getElementById('sShopPhone')?.value.trim() || '';
    if (phone && phone.length !== 10) { Toast.show('⚠️ Phone must be 10 digits'); return; }
    const shop  = {
      name,
      address: document.getElementById('sShopAddr')?.value.trim() || '',
      phone,
      tagline: document.getElementById('sShopTag')?.value.trim()  || ''
    };
    DB.saveShop(shop);
    Toast.show('✅ Shop info saved!');
  }

  /* ── Modes ── */
  function toggleMode() {
    const checked = document.getElementById('toggleHindu')?.checked;
    DB.saveSetting('isHinduMode', checked);
    ModeSwitch.updateBtn();
    Toast.show(checked ? '🪔 Hindu Tithi Mode ON' : '💰 Normal Date Mode ON');
  }

  function toggleCalcMode() {
    const isFinancial = document.getElementById('toggleCalcMode')?.checked || false;
    DB.saveSetting('financialMode', isFinancial);
    
    Toast.show(isFinancial ? '🏦 Financial Mode (Compound) ON' : '📊 Simple Mode ON');
    
    // Dispatch event to recalculate live views if needed
    try { document.dispatchEvent(new CustomEvent('panchangUpdated')); } catch {}
  }

  function toggleTheme() { ThemeToggle.toggle(); }

  /* ── API Config ── */
  function saveApiConfig() {
    const userId = document.getElementById('apiUserId')?.value.trim() || '';
    const apiKey = document.getElementById('apiKey')?.value.trim()    || '';
    const lat    = parseFloat(document.getElementById('apiLat')?.value) || 0;
    const lon    = parseFloat(document.getElementById('apiLon')?.value) || 0;

    if (!userId || !apiKey) { Toast.show('⚠️ User ID and API Key required'); return; }

    TithiService.saveApiCredentials(userId, apiKey);
    if (lat && lon) TithiService.saveApiCoords(lat, lon);

    const badge = document.getElementById('apiStatusBadge');
    if (badge) badge.innerHTML = '<span style="background:rgba(34,197,94,0.15);color:var(--success);border:1px solid var(--success);border-radius:20px;padding:4px 14px;font-size:0.82rem;font-weight:700;">✅ API Configured</span>';
    Toast.show("✅ Saved! Fetching today's Panchang…");
    setTimeout(() => location.reload(), 1500);
  }

  async function testApiConfig() {
    const resultEl = document.getElementById('apiTestResult');
    if (resultEl) resultEl.innerHTML = '⏳ Connecting...';

    const userId = document.getElementById('apiUserId')?.value.trim() || '';
    const apiKey = document.getElementById('apiKey')?.value.trim()    || '';
    if (!userId || !apiKey) {
      if (resultEl) resultEl.innerHTML = '<span style="color:var(--danger)">❌ Enter credentials first</span>';
      return;
    }

    TithiService.saveApiCredentials(userId, apiKey);

    // Wait for async fetch
    await new Promise(r => setTimeout(r, 4000));
    const val = TithiService.get(new Date());
    if (val && val !== 'लोड हो रहा है...' && val !== '---') {
      if (resultEl) resultEl.innerHTML = `<span style="color:var(--success)">✅ Connected! Today: ${val}</span>`;
    } else {
      if (resultEl) resultEl.innerHTML = '<span style="color:#ff9800">⚠️ No data yet — verify credentials or check console</span>';
    }
  }

  /* ── Panchang Override ── */
  function toggleManualMode() {
    const isManual = document.getElementById('manualToggle')?.checked;
    const ctrl     = document.getElementById('manualControls');
    if (ctrl) ctrl.style.display = isManual ? 'block' : 'none';
    if (!isManual) {
      localStorage.removeItem('manualPanchang');
      const box = document.getElementById('panchangBox');
      if (box) box.innerHTML = '📅 Please fill all Panchang fields';
      Toast.show('🤖 Auto Tithi Restored');
      
      // Dispatch event to update home instantly
      const today = new Date().toISOString().split('T')[0];
      try { document.dispatchEvent(new CustomEvent('panchangUpdated', { detail: { key: today, data: null } })); } catch {}
    } else {
      applyManual(false);
    }
  }

  function applyManual(showToast = false) {
    const data = {
      samvat: document.getElementById('samvatSelect')?.value || '',
      month : document.getElementById('monthSelect')?.value  || '',
      paksha: document.getElementById('pakshaSelect')?.value || '',
      tithi : document.getElementById('tithiSelect')?.value  || ''
    };
    
    const box = document.getElementById('panchangBox');
    
    if (data.samvat && data.month && data.paksha && data.tithi) {
      localStorage.setItem('manualPanchang', JSON.stringify(data));
      if (box) box.innerHTML = `📅 संवत ${data.samvat} | ${data.month} | ${data.paksha} ${data.tithi}`;
      if (showToast) Toast.show('✍️ Manual Tithi Applied');
      
      // Dispatch live update
      const today = new Date().toISOString().split('T')[0];
      try { document.dispatchEvent(new CustomEvent('panchangUpdated', { detail: { key: today, data } })); } catch {}
    } else {
      // Remove partial manual override so it falls back to auto if incomplete
      localStorage.removeItem('manualPanchang');
      if (box) box.innerHTML = '📅 Please fill all Panchang fields';
    }
  }

  /* ── Notifications ── */
  async function toggleNotifications() {
    const checked = document.getElementById('toggleNotif')?.checked;
    if (checked) {
      const perm = await NotificationService.requestPermission();
      if (perm !== 'granted') {
        document.getElementById('toggleNotif').checked = false;
        Toast.show('⚠️ Notification permission denied.');
      } else {
        NotificationService.scheduleDaily();
        Toast.show('🔔 Reminders enabled!');
      }
    } else {
      DB.saveSetting('notificationsEnabled', false);
      Toast.show('🔕 Reminders disabled.');
    }
  }

  /* ── Data Management ── */
  function exportData() {
    const data = { customers: DB.getCustomers(), entries: DB.getEntries(), shop: DB.getShop(), settings: DB.getSettings(), version: 2 };
    const clean = { ...data, customers: data.customers.map(c => ({ ...c, photo: c.photo ? 'stored' : null })) };
    const blob  = new Blob([JSON.stringify(clean, null, 2)], { type: 'application/json' });
    const a     = document.createElement('a');
    a.href      = URL.createObjectURL(blob);
    a.download  = `TithiLedger_backup_${Date.now()}.json`;
    a.click();
    Toast.show('📤 Data exported!');
  }

  function importData() { document.getElementById('importFile')?.click(); }

  function doImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.entries)   localStorage.setItem('TLP_entries',   JSON.stringify(data.entries));
        if (data.customers) localStorage.setItem('TLP_customers', JSON.stringify(data.customers));
        if (data.shop)      localStorage.setItem('TLP_shop',      JSON.stringify(data.shop));
        if (data.settings)  localStorage.setItem('TLP_settings',  JSON.stringify(data.settings));
        if (!data.customers) localStorage.removeItem('TLP_migrated_v2');
        Toast.show('✅ Data imported! Refreshing…');
        setTimeout(() => location.reload(), 1000);
      } catch { Toast.show('❌ Invalid JSON file.'); }
    };
    reader.readAsText(file);
  }

  function clearAll()     { document.getElementById('confirmModal')?.classList.remove('hidden'); }
  function closeConfirm() { document.getElementById('confirmModal')?.classList.add('hidden'); }

  function executeClearAll() {
    closeConfirm();
    ['TLP_entries','TLP_customers','TLP_shop','TLP_settings','TLP_migrated_v2'].forEach(k => localStorage.removeItem(k));
    Toast.show('🗑 All data cleared.');
    App.navigate('home');
  }

  /* ── PDF Invoice Branding ── */
  function _compressImage(file, maxW, cb) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width  = img.width  * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        cb(canvas.toDataURL('image/png', 0.85));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function onLogoSelected(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { Toast.show('⚠️ Logo max 2MB'); return; }
    _compressImage(file, 300, (b64) => {
      PDFService.saveLogo(b64);
      Toast.show('✅ Logo saved! Re-open Settings to see preview.');
      App.navigate('settings');
    });
  }

  function onSignatureSelected(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 1 * 1024 * 1024) { Toast.show('⚠️ Signature max 1MB'); return; }
    _compressImage(file, 400, (b64) => {
      PDFService.saveSignature(b64);
      Toast.show('✅ Signature saved! Re-open Settings to see preview.');
      App.navigate('settings');
    });
  }

  function clearLogo()      { PDFService.clearLogo();      Toast.show('🗑 Logo removed.');     App.navigate('settings'); }
  function clearSignature() { PDFService.clearSignature(); Toast.show('🗑 Signature removed.'); App.navigate('settings'); }

  function setPageSize(size) {
    PDFService.savePageSize(size);
    /* refresh the two buttons visually */
    ['a4','a5'].forEach(s => {
      const btn = document.getElementById(`size${s.toUpperCase()}Btn`);
      if (!btn) return;
      const active = (s === size);
      btn.style.background   = active ? 'var(--accent)' : 'transparent';
      btn.style.color        = active ? 'var(--bg-deep)' : 'var(--text-primary)';
      btn.style.borderColor  = active ? 'var(--accent)' : 'var(--border)';
    });
    Toast.show(`📄 Page size set to ${size.toUpperCase()}`);
  }

  return {
    render, saveShop, toggleMode, toggleCalcMode, toggleTheme, toggleNotifications,
    exportData, importData, doImport, clearAll, closeConfirm, executeClearAll,
    toggleManualMode, applyManual, saveApiConfig, testApiConfig,
    onLogoSelected, onSignatureSelected, clearLogo, clearSignature, setPageSize,
  };

})();
