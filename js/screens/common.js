/* ================================================================
   COMMON CUSTOMERS SCREEN — Khata Shop Module
   Read-only view: combines gv_customers, TLP_customers, salesCustomers
   NEVER writes to localStorage.
   ================================================================ */

const CommonScreen = (() => {
  'use strict';

  let _filterMode = 'common';  // 'common' | 'all'
  let _sortOrder  = 'asc';
  let _searchQ    = '';

  /* ── Safe read ────────────────────────────────────────────── */
  function _safeRead(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function _normMobile(val) {
    if (!val) return '';
    return String(val).replace(/\D/g, '').slice(-10);
  }

  /* ── Load all raw data ────────────────────────────────────── */
  function _getAllData() {
    const gold = (_safeRead('gv_customers') || []).map(c => ({
      name:    (c.name  || '').trim(),
      village: (c.address || c.village || '').trim(),
      mobile:  _normMobile(c.mobile || c.phone),
      status:  (c.status || 'active').toLowerCase(),
      source:  'Gold Loan'
    })).filter(c => c.name && c.mobile);

    const allKhata = _safeRead('TLP_customers') || [];
    const khata = FirmManager.filterCustomers(allKhata).map(c => ({
      name:    (c.name  || '').trim(),
      village: (c.address || c.village || '').trim(),
      mobile:  _normMobile(c.phone || c.mobile),
      status:  (c.status || 'active').toLowerCase(),
      source:  'Khata'
    })).filter(c => c.name && c.mobile);

    const salesRaw = _safeRead('salesCustomers') || _safeRead('goldCustomers') ||
                     _safeRead('nsp_customers')  || _safeRead('khataCustomers') || [];
    const sales = salesRaw.map(c => ({
      name:    (c.name || c.customerName || '').trim(),
      village: (c.address || c.village || c.city || '').trim(),
      mobile:  _normMobile(c.mobile || c.phone),
      status:  (c.status || 'active').toLowerCase(),
      source:  'Sales'
    })).filter(c => c.name && c.mobile);

    return { gold, khata, sales };
  }

  /* ── Build combined map ───────────────────────────────────── */
  function _buildMap() {
    const { gold, khata, sales } = _getAllData();
    const map = {};

    function add(list, label) {
      list.forEach(c => {
        if (!c.name || !c.mobile) return;    // skip entries without mobile
        const key = c.mobile;                // ← MOBILE NUMBER as unique key
        if (!map[key]) {
          map[key] = { name: c.name, village: c.village || '', mobile: c.mobile, sources: [], statuses: [] };
        }
        if (!map[key].village && c.village) map[key].village = c.village;
        map[key].sources.push(label);
        map[key].statuses.push(c.status || 'active');
      });
    }

    add(gold,  'Gold Loan');
    add(khata, 'Khata');
    add(sales, 'Sales');
    return Object.values(map);
  }

  /* ── Status resolver ──────────────────────────────────────── */
  function _getFinalStatus(statuses) {
    const arr = statuses.map(s => s.toLowerCase());
    if (arr.includes('pending')) return 'Pending';
    if (arr.includes('closed'))  return 'Closed';
    return 'Active';
  }

  /* ── Source badge ─────────────────────────────────────────── */
  function _srcBadge(src) {
    const cfg = {
      'Gold Loan': 'src-badge-gold',
      'Khata':     'src-badge-khata',
      'Sales':     'src-badge-sales'
    };
    const ico = { 'Gold Loan': '🪙', 'Khata': '📒', 'Sales': '🧾' };
    return `<span class="cc-src-badge ${cfg[src] || ''}">${ico[src] || '📌'} ${src}</span>`;
  }

  /* ── Customer card ────────────────────────────────────────── */
  function _card(c) {
    const uniqueSrc = [...new Set(c.sources)];
    const status    = _getFinalStatus(c.statuses);
    const initial   = (c.name[0] || '?').toUpperCase();
    const statusCls = status === 'Active' ? 'cc-status-active'
                    : status === 'Pending' ? 'cc-status-pending'
                    : 'cc-status-closed';

    return `
    <div class="cc-cust-card">
      <div class="cc-cust-top">
        <div class="cc-cust-avatar">${initial}</div>
        <div class="cc-cust-info">
          <div class="cc-cust-name">${c.name}</div>
          ${c.mobile ? `<div class="cc-cust-phone">📱 ${c.mobile}</div>` : ''}
        </div>
        <div class="cc-cust-right">
          <span class="cc-status-badge ${statusCls}">${status}</span>
          <span class="cc-module-count">${uniqueSrc.length} module${uniqueSrc.length > 1 ? 's' : ''}</span>
        </div>
      </div>
      <div class="cc-src-badges">
        ${uniqueSrc.map(_srcBadge).join('')}
      </div>
    </div>`;
  }

  /* ── Main render ──────────────────────────────────────────── */
  function render(container) {
    const all    = _buildMap();
    const { gold, khata, sales } = _getAllData();
    const common = all.filter(c => [...new Set(c.sources)].length >= 2);

    const statuses = all.map(c => _getFinalStatus(c.statuses));
    const active   = statuses.filter(s => s === 'Active').length;
    const pending  = statuses.filter(s => s === 'Pending').length;

    let filtered = _filterMode === 'common' ? common : all;
    if (_searchQ) {
      const q = _searchQ;
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.village.toLowerCase().includes(q) ||
        c.mobile.includes(q)
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) =>
      _sortOrder === 'asc'
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    );

    // Group by village
    const grouped = {};
    filtered.forEach(c => {
      const v = c.village || 'Unknown';
      if (!grouped[v]) grouped[v] = [];
      grouped[v].push(c);
    });
    const villages = Object.keys(grouped).sort();

    container.innerHTML = `
    <div class="screen screen-slide-in">

      <!-- Header -->
      <div style="margin-bottom:16px;">
        <div style="font-size:1.2rem;font-weight:800;margin-bottom:4px;">🔗 Common Customers</div>
        <div style="font-size:0.78rem;color:var(--text-secondary);">Read-only cross-module view</div>
      </div>

      <!-- Source indicators -->
      <div class="cc-src-row">
        ${_srcCard('🪙','Gold Loan', gold.length,'#f59e0b')}
        ${_srcCard('📒','Khata',     khata.length,'var(--accent)')}
        ${_srcCard('🧾','Sales',     sales.length,'#34d399')}
      </div>

      <!-- KPIs -->
      <div class="cc-kpi-row">
        ${_kpi('Total',         all.length,    'var(--accent)')}
        ${_kpi('Common (2+ mod)', common.length, '#f59e0b')}
        ${_kpi('Active',        active,         '#34d399')}
        ${_kpi('Pending',       pending,        '#fbbf24')}
      </div>

      <!-- Controls -->
      <div class="cc-controls">
        <input type="text" class="cc-search" id="ccSearch"
          placeholder="🔍 Search name, village, mobile…"
          value="${_searchQ}"
          oninput="CommonScreen.onSearch(this.value)">

        <div class="cc-tab-group">
          <button class="cc-tab ${_filterMode === 'common' ? 'cc-tab-on' : ''}"
            onclick="CommonScreen.setFilter('common')">
            🔗 Common <span class="cc-badge">${common.length}</span>
          </button>
          <button class="cc-tab ${_filterMode === 'all' ? 'cc-tab-on' : ''}"
            onclick="CommonScreen.setFilter('all')">
            👥 All <span class="cc-badge">${all.length}</span>
          </button>
        </div>

        <button class="cc-sort-btn" onclick="CommonScreen.toggleSort()">
          ${_sortOrder === 'asc' ? '⬆ A→Z' : '⬇ Z→A'}
        </button>
      </div>

      <!-- Results -->
      ${filtered.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">${_searchQ ? '🔍' : '🔗'}</div>
          <div class="empty-title">${_searchQ ? 'No results found' : 'No common customers yet'}</div>
          <div class="empty-sub">${_searchQ ? 'Try a different search.' : 'Customers across 2+ modules will appear here.'}</div>
        </div>
      ` : villages.map(v => `
        <div class="cc-village-group">
          <div class="cc-village-hdr">
            <span>📍</span>
            <span class="cc-village-nm">${v}</span>
            <span class="cc-village-cnt">${grouped[v].length}</span>
          </div>
          <div class="cc-cards-grid">
            ${grouped[v].map(_card).join('')}
          </div>
        </div>
      `).join('')}

      <!-- Footer -->
      <div class="cc-footer">
        <span>🔐 Read-only — no data is written or modified</span>
        <span style="color:var(--text-muted);font-size:0.72rem;">${new Date().toLocaleTimeString('en-IN')}</span>
      </div>

    </div>`;

    _ensureStyles();
  }

  function _srcCard(icon, name, count, color) {
    return `
    <div class="cc-src-card">
      <span style="font-size:1.3rem;">${icon}</span>
      <div>
        <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;color:var(--text-secondary);">${name}</div>
        <div style="font-size:1rem;font-weight:800;color:${count>0?color:'var(--text-muted)'};">${count>0?count+' customers':'No data'}</div>
      </div>
      <div style="width:7px;height:7px;border-radius:50%;background:${count>0?'#22c55e':'#ef4444'};margin-left:auto;"></div>
    </div>`;
  }

  function _kpi(label, val, color) {
    return `
    <div class="cc-kpi-box">
      <div style="font-size:1.8rem;font-weight:900;color:${color};">${val}</div>
      <div style="font-size:0.68rem;text-transform:uppercase;font-weight:700;color:var(--text-muted);margin-top:3px;">${label}</div>
    </div>`;
  }

  /* ── Controls ─────────────────────────────────────────────── */
  function setFilter(mode) {
    _filterMode = mode;
    render(document.getElementById('screenContainer'));
  }

  function toggleSort() {
    _sortOrder = _sortOrder === 'asc' ? 'desc' : 'asc';
    render(document.getElementById('screenContainer'));
  }

  function onSearch(val) {
    _searchQ = val.toLowerCase().trim();
    render(document.getElementById('screenContainer'));
  }

  /* ── Inject styles once ───────────────────────────────────── */
  let _stylesInjected = false;
  function _ensureStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;

    const s = document.createElement('style');
    s.textContent = `
      .cc-src-row {
        display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin-bottom: 12px;
      }
      .cc-src-card {
        background: var(--bg-card); border: 1px solid var(--border);
        border-radius: 10px; padding: 10px 12px;
        display: flex; align-items: center; gap: 8px;
      }
      .cc-kpi-row {
        display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; margin-bottom: 12px;
      }
      .cc-kpi-box {
        background: var(--bg-card); border: 1px solid var(--border);
        border-radius: 10px; padding: 12px 10px; text-align: center;
      }
      .cc-controls {
        display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; align-items: center;
      }
      .cc-search {
        flex: 1; min-width: 180px;
        background: var(--bg-card2, var(--bg-card)); border: 1px solid var(--border);
        border-radius: 10px; padding: 9px 12px;
        font-family: var(--font-main, inherit); font-size: 0.85rem;
        color: var(--text-primary); outline: none;
      }
      .cc-search:focus { border-color: var(--accent); }

      .cc-tab-group {
        display: flex; gap: 3px; background: var(--bg-card2, var(--bg-card));
        border: 1px solid var(--border); border-radius: 8px; padding: 3px;
      }
      .cc-tab {
        padding: 6px 12px; border: none; border-radius: 6px;
        font-family: var(--font-main, inherit); font-size: 0.78rem; font-weight: 600;
        color: var(--text-secondary); background: none; cursor: pointer;
        display: flex; align-items: center; gap: 5px;
        transition: all 0.2s;
      }
      .cc-tab.cc-tab-on {
        background: var(--bg-card); color: var(--gold, #f59e0b);
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      }
      .cc-badge {
        background: var(--accent, #6366f1); color: #fff;
        border-radius: 20px; padding: 1px 6px; font-size: 0.65rem;
      }
      .cc-sort-btn {
        background: var(--bg-card); border: 1px solid var(--border);
        border-radius: 8px; padding: 7px 12px;
        font-family: var(--font-main, inherit); font-size: 0.78rem; font-weight: 600;
        color: var(--text-secondary); cursor: pointer;
      }

      .cc-village-group { margin-bottom: 20px; }
      .cc-village-hdr {
        display: flex; align-items: center; gap: 8px;
        padding: 8px 12px; background: var(--bg-card);
        border: 1px solid var(--border); border-radius: 8px; margin-bottom: 8px;
      }
      .cc-village-nm { font-weight: 700; font-size: 0.9rem; flex: 1; }
      .cc-village-cnt {
        font-size: 0.7rem; color: var(--text-muted);
        background: var(--bg-card2, var(--bg-card)); border: 1px solid var(--border);
        border-radius: 20px; padding: 1px 8px;
      }

      .cc-cards-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      @media (max-width: 480px) {
        .cc-cards-grid { grid-template-columns: 1fr; }
        .cc-kpi-row { grid-template-columns: repeat(2,1fr); }
        .cc-src-row { grid-template-columns: 1fr; }
      }

      .cc-cust-card {
        background: var(--bg-card); border: 1px solid var(--border);
        border-radius: 10px; padding: 12px;
        transition: border-color 0.2s;
      }
      .cc-cust-card:hover { border-color: var(--accent, #6366f1); }
      .cc-cust-top { display: flex; gap: 10px; margin-bottom: 8px; }
      .cc-cust-avatar {
        width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
        background: linear-gradient(135deg, var(--accent, #6366f1), #818cf8);
        display: flex; align-items: center; justify-content: center;
        font-weight: 900; font-size: 0.95rem; color: #fff;
      }
      .cc-cust-info { flex: 1; min-width: 0; }
      .cc-cust-name { font-weight: 700; font-size: 0.88rem; }
      .cc-cust-phone { font-size: 0.72rem; color: var(--text-muted); }
      .cc-cust-right { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
      .cc-status-badge {
        font-size: 0.65rem; font-weight: 700;
        border-radius: 20px; padding: 2px 8px; white-space: nowrap;
      }
      .cc-status-active  { background: rgba(52,211,153,0.12); color: #34d399; }
      .cc-status-pending { background: rgba(251,191,36,0.12);  color: #fbbf24; }
      .cc-status-closed  { background: rgba(107,114,128,0.12); color: #6b7280; }
      .cc-module-count { font-size: 0.65rem; color: var(--text-muted); }

      .cc-src-badges { display: flex; flex-wrap: wrap; gap: 5px; }
      .cc-src-badge {
        font-size: 0.67rem; font-weight: 600; border-radius: 20px;
        padding: 2px 8px; border: 1px solid;
      }
      .src-badge-gold  { background:rgba(245,158,11,0.1); color:#f59e0b; border-color:rgba(245,158,11,0.3); }
      .src-badge-khata { background:rgba(99,102,241,0.1); color:#818cf8; border-color:rgba(99,102,241,0.3); }
      .src-badge-sales { background:rgba(52,211,153,0.1); color:#34d399; border-color:rgba(52,211,153,0.3); }

      .cc-footer {
        margin-top: 20px; padding: 10px 14px;
        background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px;
        display: flex; justify-content: space-between; align-items: center;
        font-size: 0.73rem; color: var(--text-muted); gap: 8px; flex-wrap: wrap;
      }
    `;
    document.head.appendChild(s);
  }

  return { render, setFilter, toggleSort, onSearch };
})();
