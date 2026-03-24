/* ================================================================
   HOME SCREEN — Customer-Grouped View with Village Sections
   ================================================================ */

const HomeScreen = (() => {

  let _searchTimer;
  let _currentFilter = 'all';
  let _computedCustomers = null;

  function render(container) {
    _computedCustomers = null;
    const stats  = ReportService.getOverallStats();
    const daily  = ReportService.getDailyCollection();

    container.innerHTML = `
      <div class="screen screen-slide-in">

        <!-- HERO STATS -->
        <div class="summary-grid stagger">
          ${chip('Customers',          DB.getCustomers().length,               '👥')}
          ${chip('Total Balance',      InterestService.fmt(stats.totalBalance), '💰', 'accent')}
          ${chip('Overdue',            stats.overdueCount,                     '⚠️', 'danger')}
          ${chip("Today's Collection", InterestService.fmt(daily.total),       '📥', 'success')}
        </div>

        <!-- PANCHANG CARD -->
        <div class="panchang-card stagger" style="animation-delay:0.1s">
          <div class="panchang-header">
            <div>🪔 Panchang</div>
            <label class="toggle">
              <input type="checkbox" id="homeManualToggle" ${localStorage.getItem("manualPanchang") ? 'checked' : ''} onchange="HomeScreen.toggleManualHome()">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div id="homePanchangText">
            ${_getPanchangText()}
          </div>
          <button class="btn btn-secondary btn-full" style="padding:6px; font-size:0.85rem;" onclick="HomeScreen.openPanchangEditor()">✏️ Edit Manual Tithi</button>
        </div>

        <!-- SEARCH (Name, Phone, Village) -->
        <div class="search-bar">
          <span class="search-icon">🔍</span>
          <input type="text" id="searchInput" placeholder="Search by name, phone or village…"
                 oninput="HomeScreen.onSearch()" />
        </div>

        <!-- FILTER TABS -->
        <div style="display:flex;gap:8px;margin-bottom:16px;overflow-x:auto;padding-bottom:4px;">
          ${filterTab('all',     'All')}
          ${filterTab('active',  '🟡 Active')}
          ${filterTab('overdue', '🔴 Overdue')}
          ${filterTab('paid',    '🟢 Paid')}
        </div>

        <!-- ENTRIES BY VILLAGE -->
        <div id="entriesContainer" class="stagger"></div>
      </div>

      <!-- FAB -->
      <button class="fab-add" onclick="App.navigate('addEntry')" title="Add Loan">＋</button>
    `;

    _setActiveFilter(_currentFilter);
    _loadCustomerCards();

    // Subscribe to async panchang updates — refresh card when API responds
    document.removeEventListener('panchangUpdated', _onPanchangUpdated);
    document.addEventListener('panchangUpdated', _onPanchangUpdated);
  }

  function chip(label, val, icon, type = '') {
    const colors = { accent: 'var(--accent-glow)', danger: 'var(--danger)', success: 'var(--success)', '': 'var(--text-primary)' };
    return `<div class="summary-chip">
      <div class="amount" style="color:${colors[type] || colors['']}">${icon} ${val}</div>
      <div class="label">${label}</div>
    </div>`;
  }

  function filterTab(key, label) {
    return `<button id="tab-${key}" onclick="HomeScreen.setFilter('${key}')"
      style="flex-shrink:0;padding:6px 16px;border-radius:20px;border:none;
             background:rgba(0,0,0,0.2);color:var(--text-secondary);cursor:pointer;font-size:0.85rem;
             font-family:var(--font-main);transition:all 0.2s ease;font-weight:600;">
      ${label}
    </button>`;
  }

  function setFilter(key) {
    _currentFilter = key;
    _setActiveFilter(key);
    _loadCustomerCards();
  }

  function _setActiveFilter(key) {
    document.querySelectorAll('[id^="tab-"]').forEach(btn => {
      btn.style.background   = 'rgba(0,0,0,0.2)';
      btn.style.color        = 'var(--text-secondary)';
    });
    const active = document.getElementById(`tab-${key}`);
    if (active) {
      active.style.background  = 'var(--bg-card)';
      active.style.color       = 'var(--gold)';
    }
  }

  function _getComputedCustomers() {
    if (_computedCustomers) return _computedCustomers;
    const all = DB.getCustomers().map(c => ({ ...c }));
    all.forEach(c => {
      const loans = DB.getCustomerLoans(c.customerId);
      c._loans = loans;
      let vTotal = 0;
      if (loans.length === 0) {
        c.status = 'active';
        c._vTotal = 0;
      } else {
        const totals = FinanceEngine.calculateTotals(loans);
        let hasOverdue = false;
        loans.forEach(e => {
          if (InterestService.isOverdue(e)) hasOverdue = true;
        });
        if (totals.netPayable <= 0) c.status = 'paid';
        else if (hasOverdue) c.status = 'overdue';
        else c.status = 'active';
        c._vTotal = totals.netPayable;
      }
    });
    _computedCustomers = all;
    return all;
  }

  function _loadCustomerCards() {
    const container = document.getElementById('entriesContainer');
    if (!container) return;

    const allCustomers = _getComputedCustomers();
    let activeCnt = 0, overdueCnt = 0, paidCnt = 0;

    allCustomers.forEach(c => {
      if (c.status === 'active') activeCnt++;
      else if (c.status === 'overdue') overdueCnt++;
      else if (c.status === 'paid') paidCnt++;
    });

    const q = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
    let activeList = allCustomers;
    
    // Filter by search query
    if (q) {
      activeList = activeList.filter(c => 
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.address || '').toLowerCase().includes(q)
      );
    }

    // Update Filter Tabs dynamically with Counts
    const tabAll = document.getElementById('tab-all');
    const tabActive = document.getElementById('tab-active');
    const tabOverdue = document.getElementById('tab-overdue');
    const tabPaid = document.getElementById('tab-paid');
    
    if (tabAll) tabAll.innerHTML = `All (${allCustomers.length})`;
    if (tabActive) tabActive.innerHTML = `🟡 Active (${activeCnt})`;
    if (tabOverdue) tabOverdue.innerHTML = `🔴 Overdue (${overdueCnt})`;
    if (tabPaid) tabPaid.innerHTML = `🟢 Paid (${paidCnt})`;

    // Filter by status tab
    if (_currentFilter !== 'all') {
      activeList = activeList.filter(c => c.status === _currentFilter);
    }

    if (activeList.length === 0) {
      if (_currentFilter === 'paid') {
        container.innerHTML = `<div class="empty-state">
          <div class="empty-icon">🟢</div>
          <div class="empty-title">No Paid Customers Yet</div>
          <div class="empty-sub">Customers who have fully settled will appear here.</div>
        </div>`;
      } else {
        container.innerHTML = `<div class="empty-state">
          <div class="empty-icon">📒</div>
          <div class="empty-title">No customers found</div>
          <div class="empty-sub">Tap the + button to add a new loan.</div>
        </div>`;
      }
      return;
    }

    const isWide = window.innerWidth >= 600;

    // Group customers by Village / Address
    const grouped = {};
    activeList.forEach(c => {
      const village = (c.address || 'Unknown Region').trim();
      if (!grouped[village]) grouped[village] = [];
      grouped[village].push(c);
    });

    const sortedVillages = Object.keys(grouped).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );

    let html = '';
    sortedVillages.forEach(village => {
      const vCustomers = grouped[village];
      // Total balance for this village
      let vTotal = 0;
      vCustomers.forEach(c => { vTotal += c._vTotal; });

      html += `
        <div style="margin-bottom:24px;">
          <!-- Village Header -->
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;
                      border-bottom:1px solid var(--border);padding-bottom:8px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:1.2rem;">📍</span>
              <span style="font-size:1.1rem;font-weight:700;color:var(--text-primary);">${village}</span>
              <span class="badge badge-accent" style="font-size:0.7rem;">${vCustomers.length}</span>
            </div>
            <div style="font-size:0.85rem;color:var(--text-secondary);font-weight:600;">
              Bal: ${InterestService.fmt(vTotal)}
            </div>
          </div>
          <!-- Customer Cards -->
          <div class="${isWide ? 'entries-grid' : ''}">
            ${vCustomers.map((c, i) => {
              return EntryCard.renderCustomerCard(c, c._loans, i);
            }).join('')}
          </div>
        </div>
      `;
    });

    requestAnimationFrame(() => { container.innerHTML = html; });
  }

  function onSearch() {
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(() => setFilter(_currentFilter), 300);
  }

  /* ── Panchang Helpers ── */
  function _getPanchangText() {
    const todayStr = new Date().toISOString().split('T')[0];
    const manualData = localStorage.getItem('manualPanchang');
    if (manualData) {
      try {
        const d = JSON.parse(manualData);
        return `संवत ${d.samvat} | ${d.month} | ${d.paksha} ${d.tithi} <span style="font-size:0.75rem;color:var(--warn);font-weight:700;">(Manual)</span>`;
      } catch {}
    }
    const samvat    = TithiService.getSamvatDisplay(new Date());
    const tithiStr  = TithiService.get(new Date());
    const isLoading = tithiStr === 'लोड हो रहा है...';
    const badge = isLoading
      ? `<span style="font-size:0.75rem;color:var(--text-muted);">⏳</span>`
      : `<span style="font-size:0.75rem;color:var(--success);">(Auto)</span>`;
    return `${samvat} | ${tithiStr} ${badge}`;
  }

  function _onPanchangUpdated() {
    const el = document.getElementById('homePanchangText');
    if (el) el.innerHTML = _getPanchangText();
  }

  function toggleManualHome() {
    const checked = document.getElementById("homeManualToggle").checked;
    if (!checked) {
      localStorage.removeItem("manualPanchang");
      Toast.show('🤖 Auto Panchang Restored');
      App.navigate('home');
    } else {
      openPanchangEditor();
    }
  }

  function openPanchangEditor() {
    App.navigate('settings');
    setTimeout(() => {
      document.getElementById('manualToggle').checked = true;
      SettingsScreen.toggleManualMode();
      document.getElementById("manualControls")?.scrollIntoView({ behavior: "smooth" });
    }, 150);
  }

  return { render, setFilter, onSearch, toggleManualHome, openPanchangEditor };
})();
