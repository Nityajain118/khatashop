/* ================================================================
   ACCOUNTS GROUP LIST WIDGET — PRODUCTION VERIFIED
   Collapsed: 3 items, no search
   Expanded: all items + per-city independent search (300ms debounce)
   ================================================================ */

const AccountsGroupList = (() => {

  let _accounts       = [];
  let _containerId    = '';

  // Per-city state: { cityName: { expanded: bool, query: string, debounceTimer: null } }
  let _cityState = {};

  /* ── helpers ─────────────────────────────────────────────────── */

  function _escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }

  function _getGroupedCities(accounts) {
    const map = {};
    accounts.forEach(acc => {
      const city = acc?.city || 'Unknown';
      if (!map[city]) map[city] = [];
      map[city].push(acc);
    });
    return map;
  }

  function _ensureCityState(city) {
    if (!_cityState[city]) {
      _cityState[city] = { expanded: false, query: '', debounceTimer: null };
    }
  }

  /* ── render ──────────────────────────────────────────────────── */

  function _render() {
    const container = document.getElementById(_containerId);
    if (!container) return;

    const grouped = _getGroupedCities(_accounts);

    if (_accounts.length === 0) {
      container.innerHTML = `<div class="accounts-empty"><p>📭 No accounts found</p></div>`;
      return;
    }

    let html = `<div class="accounts-group-list">`;

    Object.entries(grouped).forEach(([city, cityAccounts]) => {
      _ensureCityState(city);
      const state   = _cityState[city];
      const isExpanded = state.expanded;

      // Filter accounts by per-city query
      const query = state.query.trim().toLowerCase();
      const filtered = query
        ? cityAccounts.filter(acc => {
            const name  = (acc?.name  || '').toLowerCase();
            const phone = (acc?.phone || '').toString();
            return name.includes(query) || phone.includes(query);
          })
        : cityAccounts;

      // Slice only if collapsed
      const visible = isExpanded ? filtered : cityAccounts.slice(0, 3);

      html += `
        <div class="accounts-city-group" data-city="${_escapeHtml(city)}">
          <div class="accounts-city-header" data-toggle-city="${_escapeHtml(city)}">
            <div style="display:flex;align-items:center;gap:8px;flex:1;">
              <span class="accounts-city-icon">📍</span>
              <span class="accounts-city-name">${_escapeHtml(city)}</span>
              <span class="accounts-city-count">(${cityAccounts.length})</span>
            </div>
            <span class="accounts-toggle-icon">${isExpanded ? '▲' : '▼'}</span>
          </div>
      `;

      // Search bar — only when expanded
      if (isExpanded) {
        html += `
          <div class="accounts-search-box">
            <input
              type="text"
              class="accounts-search-input"
              id="accountsSearchInput_${_escapeHtml(city)}"
              data-search-city="${_escapeHtml(city)}"
              placeholder="🔍 Search in ${_escapeHtml(city)}…"
              value="${_escapeHtml(state.query)}"
              autocomplete="off"
            />
          </div>
        `;
      }

      html += `<div class="accounts-city-list">`;

      if (isExpanded && filtered.length === 0) {
        html += `<div class="accounts-empty" style="padding:12px 0;">📭 No accounts found</div>`;
      } else {
        visible.forEach((acc, idx) => {
          html += _renderAccountItem(acc, idx);
        });
      }

      html += `</div>`; // .accounts-city-list

      // "Show more" hint when collapsed and there are more than 3
      if (!isExpanded && cityAccounts.length > 3) {
        html += `
          <div class="accounts-show-more">
            📌 Showing 3 of ${cityAccounts.length} — tap to expand
          </div>
        `;
      }

      html += `</div>`; // .accounts-city-group
    });

    html += `</div>`; // .accounts-group-list

    container.innerHTML = html;
    _bindEvents(container);
  }

  function _renderAccountItem(acc, index) {
    const initials = (acc?.name || '?')
      .split(' ')
      .map(w => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return `
      <div class="accounts-item" style="animation-delay:${index * 0.06}s;">
        <div class="accounts-item-avatar">${initials}</div>
        <div class="accounts-item-info">
          <div class="accounts-item-name">${_escapeHtml(acc?.name || 'Unknown')}</div>
          <div class="accounts-item-phone">${_escapeHtml(acc?.phone || '—')}</div>
        </div>
      </div>
    `;
  }

  /* ── event binding ───────────────────────────────────────────── */

  function _bindEvents(container) {
    // City header toggle
    container.querySelectorAll('[data-toggle-city]').forEach(header => {
      header.style.cursor = 'pointer';
      header.addEventListener('click', e => {
        const city = e.currentTarget.getAttribute('data-toggle-city');
        _toggleCity(city);
      });
    });

    // Per-city search inputs
    container.querySelectorAll('[data-search-city]').forEach(input => {
      input.addEventListener('input', e => {
        const city  = e.currentTarget.getAttribute('data-search-city');
        const value = e.currentTarget.value;
        _debounceSearch(city, value);
      });
    });
  }

  /* ── actions ─────────────────────────────────────────────────── */

  function _toggleCity(city) {
    if (!city || typeof city !== 'string') return;
    _ensureCityState(city);
    _cityState[city].expanded = !_cityState[city].expanded;
    // Clear search when collapsing
    if (!_cityState[city].expanded) {
      _cityState[city].query = '';
      clearTimeout(_cityState[city].debounceTimer);
    }
    _render();
  }

  function _debounceSearch(city, value) {
    _ensureCityState(city);
    clearTimeout(_cityState[city].debounceTimer);
    _cityState[city].debounceTimer = setTimeout(() => {
      _cityState[city].query = value;
      _render();
      // Re-focus the search input after re-render
      const input = document.getElementById(`accountsSearchInput_${city}`);
      if (input) {
        input.focus();
        // Move cursor to end
        const len = input.value.length;
        input.setSelectionRange(len, len);
      }
    }, 300);
  }

  /* ── public API ──────────────────────────────────────────────── */

  function init(containerId, accounts = []) {
    _containerId = containerId;
    _accounts    = accounts || [];
    _cityState   = {};
    _render();
  }

  function update(accounts = []) {
    _accounts  = accounts || [];
    // Reset city state but preserve expanded flags for same cities
    const prevState = _cityState;
    _cityState = {};
    Object.keys(prevState).forEach(city => {
      _cityState[city] = {
        expanded:      prevState[city].expanded,
        query:         '',
        debounceTimer: null
      };
    });
    _render();
  }

  return { init, update };

})();
