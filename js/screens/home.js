/* ================================================================
   HOME SCREEN — Customer-Grouped View with Village Sections
   Collapsed: 3 cards per village, no village search
   Expanded:  all cards + per-village search bar
   Global search + filter tabs remain fully intact
   ================================================================ */

const HomeScreen = (() => {

  let _searchTimer;
  let _currentFilter     = 'all';
  let _computedCustomers = null;

  // Per-village state: { villageName: { expanded: bool, query: string, timer: null } }
  let _villageState = {};

  /* ── public: render full screen ─────────────────────────────── */
  function render(container) {
    _computedCustomers = null;
    _villageState      = {};

    const stats = ReportService.getOverallStats();
    const daily = ReportService.getDailyCollection();

    container.innerHTML = `
      <div class="screen screen-slide-in">

        <!-- HERO STATS -->
        <div class="summary-grid stagger">
          ${chip('Customers',          FirmManager.filterCustomers(DB.getCustomers()).length, '👥')}
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
        <div class="search-bar" style="position:relative;">
          <span class="search-icon">🔍</span>
          <input type="text" id="searchInput" placeholder="Search by name, phone or village…"
                 oninput="HomeScreen.onSearch()" autocomplete="off" />
          <div id="searchDropdown" class="search-inline-dropdown" style="display:none;"></div>
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

    // Subscribe to async panchang updates
    document.removeEventListener('panchangUpdated', _onPanchangUpdated);
    document.addEventListener('panchangUpdated', _onPanchangUpdated);

    // ── KEYBOARD HANDLERS (use assignment = not addEventListener to prevent stacking) ──
    const searchEl = document.getElementById('searchInput');
    if (searchEl) {
      // Arrow Down from search → enter dropdown
      searchEl.onkeydown = function(e) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const first = document.querySelector('.sid-item');
          if (first) { first.focus(); return; }
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          this.value = '';
          _hideDropdown();
          _computedCustomers = null;
          setFilter(_currentFilter);
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          // If dropdown is visible, open the first item
          const activeItem = document.querySelector('.sid-item.sid-active');
          const firstItem  = document.querySelector('.sid-item');
          const target     = activeItem || firstItem;
          if (target && target.dataset.customerId) {
            _hideDropdown();
            App.navigate('customer', target.dataset.customerId);
          }
        }
      };

      // Close dropdown when clicking outside
      document.addEventListener('click', function _outsideClick(e) {
        if (!e.target.closest('.search-bar')) {
          _hideDropdown();
          document.removeEventListener('click', _outsideClick);
        }
      });
    }

    // Desktop single-key shortcut: N = New Loan (when nothing is focused)
    document.onkeydown = function(e) {
      const tag = document.activeElement?.tagName?.toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';
      if (!isInput && e.key === 'n' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        App.navigate('addEntry');
      }
    };
  }

  /* ── chip / tab helpers ─────────────────────────────────────── */
  function chip(label, val, icon, type = '') {
    const colors = { accent: 'var(--accent-glow)', danger: 'var(--danger)', success: 'var(--success)', '': 'var(--text-primary)' };
    return `<div class="summary-chip">
      <div class="amount" style="color:${colors[type] || colors['']};">${icon} ${val}</div>
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
      btn.style.background = 'rgba(0,0,0,0.2)';
      btn.style.color      = 'var(--text-secondary)';
    });
    const active = document.getElementById(`tab-${key}`);
    if (active) {
      active.style.background = 'var(--bg-card)';
      active.style.color      = 'var(--gold)';
    }
  }

  /* ── customer data helpers ───────────────────────────────────── */
  function _getComputedCustomers() {
    if (_computedCustomers) return _computedCustomers;
    const all = FirmManager.filterCustomers(DB.getCustomers()).map(c => ({ ...c }));
    all.forEach(c => {
      const loans = FirmManager.filterEntries(DB.getCustomerLoans(c.customerId));
      c._loans = loans;
      if (loans.length === 0) {
        c.status  = 'active';
        c._vTotal = 0;
      } else {
        const totals   = FinanceEngine.calculateTotals(loans);
        let hasOverdue = false;
        loans.forEach(e => { if (InterestService.isOverdue(e)) hasOverdue = true; });
        if (totals.netPayable <= 0) c.status = 'paid';
        else if (hasOverdue)        c.status = 'overdue';
        else                        c.status = 'active';
        c._vTotal = totals.netPayable;
      }
    });
    _computedCustomers = all;
    return all;
  }

  /* ── village state helpers ───────────────────────────────────── */
  function _ensureVillage(village) {
    if (!_villageState[village]) {
      _villageState[village] = { expanded: false, query: '', timer: null };
    }
  }

  function _safeId(village) {
    // Create a DOM-safe id from village name
    return village.replace(/[^a-zA-Z0-9]/g, '_');
  }

  /* ── public: toggle a village group ─────────────────────────── */
  function toggleVillage(village) {
    _ensureVillage(village);
    const state = _villageState[village];
    state.expanded = !state.expanded;
    if (!state.expanded) {
      state.query = '';
      clearTimeout(state.timer);
    }
    _renderEntriesContainer();
    // Focus search if expanded
    if (state.expanded) {
      setTimeout(() => {
        const input = document.getElementById(`vSearch_${_safeId(village)}`);
        if (input) input.focus();
      }, 50);
    }
  }

  /* ── public: village search input handler ────────────────────── */
  function onVillageSearch(village, value) {
    _ensureVillage(village);
    const state = _villageState[village];
    clearTimeout(state.timer);
    state.timer = setTimeout(() => {
      state.query = value;
      _renderEntriesContainer();
      // Restore focus after re-render
      setTimeout(() => {
        const input = document.getElementById(`vSearch_${_safeId(village)}`);
        if (input) {
          input.focus();
          const len = input.value.length;
          input.setSelectionRange(len, len);
        }
      }, 20);
    }, 300);
  }

  /* ── main list loading ───────────────────────────────────────── */
  function _loadCustomerCards() {
    const container = document.getElementById('entriesContainer');
    if (!container) return;

    const allCustomers = _getComputedCustomers();
    let activeCnt = 0, overdueCnt = 0, paidCnt = 0;
    allCustomers.forEach(c => {
      if (c.status === 'active')       activeCnt++;
      else if (c.status === 'overdue') overdueCnt++;
      else if (c.status === 'paid')    paidCnt++;
    });

    const q = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
    let activeList = allCustomers;

    // Global search filter
    if (q) {
      activeList = activeList.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.address || '').toLowerCase().includes(q)
      );
    }

    // Update filter tab counts
    const tabAll     = document.getElementById('tab-all');
    const tabActive  = document.getElementById('tab-active');
    const tabOverdue = document.getElementById('tab-overdue');
    const tabPaid    = document.getElementById('tab-paid');
    if (tabAll)     tabAll.innerHTML     = `All (${allCustomers.length})`;
    if (tabActive)  tabActive.innerHTML  = `🟡 Active (${activeCnt})`;
    if (tabOverdue) tabOverdue.innerHTML = `🔴 Overdue (${overdueCnt})`;
    if (tabPaid)    tabPaid.innerHTML    = `🟢 Paid (${paidCnt})`;

    // Status tab filter
    if (_currentFilter !== 'all') {
      activeList = activeList.filter(c => c.status === _currentFilter);
    }

    // Store filtered list for grouped rendering
    _filteredList = activeList;
    _renderEntriesContainer();
  }

  // Holds the current filtered+status-filtered customer list
  let _filteredList = [];

  function _renderEntriesContainer() {
    const container = document.getElementById('entriesContainer');
    if (!container) return;

    if (_filteredList.length === 0) {
      const emptyIcon  = _currentFilter === 'paid' ? '🟢' : '📒';
      const emptyTitle = _currentFilter === 'paid' ? 'No Paid Customers Yet' : 'No customers found';
      const emptySub   = _currentFilter === 'paid'
        ? 'Customers who have fully settled will appear here.'
        : 'Tap the + button to add a new loan.';
      container.innerHTML = `<div class="empty-state">
        <div class="empty-icon">${emptyIcon}</div>
        <div class="empty-title">${emptyTitle}</div>
        <div class="empty-sub">${emptySub}</div>
      </div>`;
      return;
    }

    const isWide = window.innerWidth >= 600;

    // Group by village
    const grouped = {};
    _filteredList.forEach(c => {
      const village = (c.address || 'Unknown Region').trim();
      if (!grouped[village]) grouped[village] = [];
      grouped[village].push(c);
    });

    const sortedVillages = Object.keys(grouped).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );

    let html = '';

    sortedVillages.forEach(village => {
      _ensureVillage(village);
      const state      = _villageState[village];
      const isExpanded = state.expanded;
      const vCustomers = grouped[village];
      const safeId     = _safeId(village);

      // Sort alphabetically (A-Z) by customer name
      vCustomers.sort((a, b) => 
        (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase())
      );

      // Village-level search filter (only when expanded)
      let visible = vCustomers;
      if (isExpanded && state.query) {
        const vq = state.query.toLowerCase();
        visible = vCustomers.filter(c =>
          c.name.toLowerCase().includes(vq) ||
          (c.phone || '').includes(vq)
        );
      }

      // Slice to 3 when collapsed
      const displayed = isExpanded ? visible : vCustomers.slice(0, 3);

      let vTotal = 0;
      vCustomers.forEach(c => { vTotal += c._vTotal; });

      html += `
        <div class="village-group" style="margin-bottom:24px;" data-village="${village}">

          <!-- Village Header (clickable) -->
          <div onclick="HomeScreen.toggleVillage('${village.replace(/'/g, "\\'")}')"
               style="display:flex;align-items:center;justify-content:space-between;
                      margin-bottom:12px;border-bottom:1px solid var(--border);
                      padding-bottom:8px;cursor:pointer;user-select:none;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:1.2rem;">📍</span>
              <span style="font-size:1.1rem;font-weight:700;color:var(--text-primary);">${village}</span>
              <span class="badge badge-accent" style="font-size:0.7rem;">${vCustomers.length}</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="font-size:0.85rem;color:var(--text-secondary);font-weight:600;">
                Bal: ${InterestService.fmt(vTotal)}
              </div>
              <span style="font-size:1rem;color:var(--gold);transition:transform 0.2s;"
                    id="vIcon_${safeId}">${isExpanded ? '▲' : '▼'}</span>
            </div>
          </div>

          ${isExpanded ? `
          <!-- Per-village search (only when expanded) -->
          <div style="margin-bottom:12px;">
            <input
              id="vSearch_${safeId}"
              type="text"
              placeholder="🔍 Search in ${village}…"
              value="${state.query.replace(/"/g, '&quot;')}"
              oninput="HomeScreen.onVillageSearch('${village.replace(/'/g, "\\'")}', this.value)"
              style="width:100%;box-sizing:border-box;padding:10px 14px;border-radius:10px;
                     border:1px solid var(--border);background:var(--bg-card2);
                     color:var(--text-primary);font-size:0.9rem;font-family:var(--font-main);
                     outline:none;"
            />
          </div>
          ` : ''}

          <!-- Customer cards -->
          <div class="${isWide ? 'entries-grid' : ''}">
            ${displayed.length === 0 && isExpanded
              ? `<div class="empty-state" style="padding:16px 0;">
                   <div class="empty-icon">📭</div>
                   <div class="empty-title" style="font-size:1rem;">No customers found</div>
                 </div>`
              : displayed.map((c, i) => EntryCard.renderCustomerCard(c, c._loans, i)).join('')
            }
          </div>

          ${!isExpanded && vCustomers.length > 3 ? `
          <!-- "Show more" hint -->
          <div onclick="HomeScreen.toggleVillage('${village.replace(/'/g, "\\'")}')"
               style="text-align:center;padding:8px;font-size:0.82rem;
                      color:var(--text-secondary);cursor:pointer;
                      border-top:1px solid var(--border);margin-top:8px;">
            📌 Showing 3 of ${vCustomers.length} — <span style="color:var(--gold);font-weight:600;">Tap to see all</span>
          </div>
          ` : ''}
        </div>
      `;
    });

    requestAnimationFrame(() => { container.innerHTML = html; });
  }

  /* ── Inline search dropdown helpers ── */
  let _dropdownActive = -1;

  function _showDropdown(results, query) {
    const dd = document.getElementById('searchDropdown');
    if (!dd) return;
    if (!results.length) { dd.style.display = 'none'; return; }
    _dropdownActive = -1;
    dd.style.display = 'block';
    dd.innerHTML = results.map((c, i) => {
      const initial = (c.name || '?')[0].toUpperCase();
      const phone   = c.phone || '';
      const addr    = c.address || '';
      let name = c.name || '';
      if (query) {
        try {
          const esc = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          name = name.replace(new RegExp(`(${esc})`, 'gi'), '<b style="color:var(--gold);">$1</b>');
        } catch(_){}
      }
      return `<div class="sid-item" tabindex="0" data-customer-id="${c.customerId}"
        onclick="HomeScreen._selectDropdown('${c.customerId}')"
        onkeydown="HomeScreen._dropdownKeydown(event,'${c.customerId}')"
        onmouseenter="HomeScreen._hoverDropdown(${i})">
        <div class="sid-avatar">${initial}</div>
        <div class="sid-info">
          <div class="sid-name">${name}</div>
          <div class="sid-meta">${phone ? '📱 '+phone : ''}${addr ? ' · 📍'+addr : ''}</div>
        </div>
      </div>`;
    }).join('');
  }

  function _hideDropdown() {
    const dd = document.getElementById('searchDropdown');
    if (dd) dd.style.display = 'none';
    _dropdownActive = -1;
  }

  function _selectDropdown(customerId) { _hideDropdown(); App.navigate('customer', customerId); }

  function _dropdownKeydown(e, customerId) {
    const items = document.querySelectorAll('.sid-item');
    if (e.key === 'Enter')     { e.preventDefault(); _selectDropdown(customerId); return; }
    if (e.key === 'Escape')    { e.preventDefault(); _hideDropdown(); document.getElementById('searchInput')?.focus(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); _dropdownActive = Math.min(_dropdownActive + 1, items.length - 1); items[_dropdownActive]?.focus(); }
    if (e.key === 'ArrowUp')   {
      e.preventDefault();
      _dropdownActive = Math.max(_dropdownActive - 1, -1);
      if (_dropdownActive < 0) document.getElementById('searchInput')?.focus();
      else items[_dropdownActive]?.focus();
    }
  }

  function _hoverDropdown(i) { _dropdownActive = i; }

  /* ── global search ── */
  function onSearch() {
    clearTimeout(_searchTimer);
    const q = (document.getElementById('searchInput')?.value || '').trim();
    if (q.length > 0) {
      _searchTimer = setTimeout(() => {
        const all = typeof FirmManager !== 'undefined'
          ? FirmManager.filterCustomers(DB.getCustomers()) : DB.getCustomers();
        const results = typeof FuzzySearch !== 'undefined'
          ? FuzzySearch.searchCustomers(all, q, 7)
          : all.filter(c => c.name.toLowerCase().includes(q.toLowerCase()) ||
              (c.phone||'').includes(q) ||
              (c.address||'').toLowerCase().includes(q.toLowerCase())).slice(0, 7);
        _showDropdown(results, q);
        _computedCustomers = null;
        setFilter(_currentFilter);
      }, 120);
    } else {
      _hideDropdown();
      _searchTimer = setTimeout(() => { _computedCustomers = null; setFilter(_currentFilter); }, 200);
    }
  }

  /* ── Panchang helpers ────────────────────────────────────────── */
  function _getPanchangText() {
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
    const badge     = isLoading
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

  return {
    render,
    setFilter,
    onSearch,
    toggleManualHome,
    openPanchangEditor,
    toggleVillage,
    onVillageSearch,
    _selectDropdown,
    _dropdownKeydown,
    _hoverDropdown
  };
})();
