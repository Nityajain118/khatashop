/* ================================================================
   S BOOK (STATEMENT BOOK) — Read-only tabular statement view
   Fetches data from existing Khata module. Zero data mutation.
   Columns: Date | Udhar | Jama | Interest | Balance
   ================================================================ */

const SBookScreen = (() => {

  let _customerId = null;

  /* ══════════════════════════════════════════════════════════════
     ENTRY POINT
     ══════════════════════════════════════════════════════════════ */
  function render(container, customerId) {
    try {
      _customerId = customerId;

      const customer = DB.getCustomer(customerId);
      if (!customer) {
        container.innerHTML = `
          <div class="screen">
            <div class="empty-state">
              <div class="empty-icon">❌</div>
              <div class="empty-title">Customer not found</div>
              <div class="empty-sub">Unable to load statement.</div>
              <button class="btn btn-primary" style="margin-top:16px;" onclick="App.goBack()">← Go Back</button>
            </div>
          </div>`;
        return;
      }

      // ── Build flat transaction list from existing Khata data ──
      const rows = _buildRows(customerId);

      container.innerHTML = `
        <style>
          /* S-Book Specific Scoped Styles */
          .sbook-wrapper {
            display: flex;
            flex-direction: column;
            /* Fills between topbar and bottomnav, ignoring padded container */
            height: calc(100vh - var(--topbar-h) - var(--bottomnav-h));
            width: 100%;
            background: var(--bg-deep);
            overflow: hidden;
          }
          
          .sbook-header {
            flex-shrink: 0;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            border-bottom: 1px solid var(--border);
            padding: 16px 20px;
            z-index: 50;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }
          
          .sbook-header-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 16px;
            margin-bottom: 14px;
          }
          
          .sbook-customer-info {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          
          .sbook-avatar {
            width: 48px; height: 48px; border-radius: 50%;
            background: linear-gradient(135deg, var(--gold), var(--gold-soft));
            display: flex; align-items: center; justify-content: center;
            font-weight: 700; font-size: 1.1rem; color: var(--bg-deep);
            box-shadow: 0 2px 10px rgba(251,191,36,0.35);
            flex-shrink: 0;
          }
          
          .sbook-summary-pills {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
          }
          
          /* Table Scroll Area Container */
          .sbook-scroll-area {
            flex: 1;
            overflow: auto;
            -webkit-overflow-scrolling: touch; /* Smooth iOS scroll */
            position: relative;
            background: var(--bg-card);
          }
          
          .sbook-table {
            width: 100%;
            border-collapse: collapse;
          }
          
          /* Sticky Header */
          .sbook-table th {
            position: sticky;
            top: 0;
            z-index: 10;
            background: linear-gradient(180deg, #1e3a8a 0%, #1e40af 100%);
            padding: 12px 6px;
            font-size: 0.7rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #fff;
            text-align: center;
            white-space: nowrap;
            box-shadow: 0 2px 6px rgba(0,0,0,0.2);
            border-right: 1px solid rgba(255,255,255,0.08);
          }
          .sbook-table th:last-child { border-right: none; }
          
          /* Table Cells */
          .sbook-table td {
            padding: 12px 6px;
            font-size: 0.8rem;
            vertical-align: middle;
            text-align: center;
            border-bottom: 1px solid var(--border);
            border-right: 1px solid var(--border-light);
            transition: background-color 0.2s ease;
          }
          .sbook-table td:last-child { border-right: none; background: rgba(0,0,0,0.06); }
          
          .sbook-table tr:nth-child(even) td:not(:last-child) { background: rgba(255,255,255,0.015); }
          .sbook-table tr:hover td { background: rgba(255,255,255,0.04); }
          
          /* Alignment Utilities */
          .col-date { text-align: left !important; width: 28%; }
          .col-amt { width: 18%; }
          
          /* Sticky Footer */
          .sbook-footer-row td {
            position: sticky;
            bottom: 0;
            z-index: 10;
            background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
            border-top: 2px solid var(--gold);
            padding: 16px 8px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--text-primary);
            box-shadow: 0 -2px 6px rgba(0,0,0,0.2);
          }
          
          /* Bottom Legend */
          .sbook-legend {
            flex-shrink: 0;
            display: flex; gap: 12px; flex-wrap: wrap; align-items: center; justify-content: center;
            padding: 10px; font-size: 0.65rem; color: var(--text-muted);
            border-top: 1px solid var(--border);
            background: var(--bg-deep);
            z-index: 20;
          }
          
          /* Responsive Layout Adjustments */
          @media (max-width: 450px) {
            .sbook-header { padding: 12px; }
            .sbook-header-top { flex-direction: column; align-items: flex-start; gap: 12px; }
            .sbook-summary-pills { width: 100%; justify-content: flex-start; gap: 6px; }
            .sbook-table th { padding: 10px 2px; font-size: 0.55rem; letter-spacing: 0; white-space: normal; }
            .sbook-table td { padding: 10px 2px; font-size: 0.72rem; }
            .sbook-footer-row td { padding: 12px 4px; font-size: 0.65rem; }
          }
        </style>

        <div class="screen-slide-in sbook-wrapper">

          <!-- ── HEADER ── -->
          <div class="sbook-header">
            <div class="sbook-header-top">
               <div class="sbook-customer-info">
                 <div class="sbook-avatar">${_initials(customer.name)}</div>
                 <div>
                   <div style="font-weight:700; font-size:1.1rem; color:var(--text-primary); font-family:var(--font-deva); margin-bottom:2px;">${_esc(customer.name)}</div>
                   <div style="font-size:0.75rem; color:var(--text-muted);">📱 ${_esc(customer.phone || '—')} &nbsp;|&nbsp; 📍 ${_esc(customer.address || '—')}</div>
                 </div>
               </div>
               <div class="sbook-summary-pills">
                 ${_summaryPills(rows)}
               </div>
            </div>
            
            <div style="display:flex; align-items:flex-end; justify-content:space-between;">
              <div>
                <div style="font-size:1.05rem; font-weight:800; color:var(--gold); letter-spacing:0.5px; display:flex; align-items:center; gap:6px;">
                  📒 Statement Book
                </div>
                <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">
                  ${rows.length} transaction${rows.length !== 1 ? 's' : ''} &nbsp;•&nbsp; Read-only data
                </div>
              </div>
            </div>
          </div>

          <!-- ── TABLE AREA ── -->
          <div class="sbook-scroll-area">
            ${rows.length === 0 ? _emptyState() : _buildTable(rows)}
          </div>
          
          <!-- ── LEGEND ── -->
          <div class="sbook-legend">
            <span>🔴 <span style="color:#f87171;">Udhar</span> = Amount given</span>
            <span>🟢 <span style="color:#34d399;">Jama</span> = Amount received</span>
            <span>⚡ <span style="color:#fbbf24;">Interest</span> = Stored value</span>
            <span>✓ = Settled</span>
          </div>

        </div>
      `;

    } catch (err) {
      console.error('[SBook] Render error:', err);
      container.innerHTML = `
        <div class="screen">
          <div class="empty-state">
            <div class="empty-icon">⚠️</div>
            <div class="empty-title">Could not load statement</div>
            <div class="empty-sub">${_esc(err.message || '')}</div>
            <button class="btn btn-primary" style="margin-top:16px;" onclick="App.goBack()">← Go Back</button>
          </div>
        </div>`;
    }
  }

  /* ══════════════════════════════════════════════════════════════
     BUILD FLAT ROW LIST FROM EXISTING KHATA DATA
     Reads loans + payments — no recalculation, no mutation
     ══════════════════════════════════════════════════════════════ */
  function _buildRows(customerId) {
    const loans = FirmManager.filterEntries(DB.getCustomerLoans(customerId)) || [];
    const flat = [];

    loans.forEach(loan => {
      try {
        const isJama = (loan.type === 'jama');

        // ── Read stored interest value (no recalculation) ──
        const storedInterest = _safeNum(
          loan.finalInterest ?? loan.interest ?? 0
        );

        flat.push({
          date:     loan.loanDate || loan.date || '',
          type:     isJama ? 'jama' : 'udhaar',
          amount:   _safeNum(loan.principal),
          interest: storedInterest,
          label:    isJama ? 'Jama (Cash Received)' : 'Udhaar (Cash Given)',
          note:     loan.notes || '',
          settled:  !!(loan.isSettled || loan.status === 'closed'),
        });

        // ── Inline payments on this loan (if any) ──
        if (Array.isArray(loan.payments)) {
          loan.payments.forEach(p => {
            try {
              const pInterest = _safeNum(p.finalInterest ?? p.interest ?? 0);
              flat.push({
                date:     p.date || loan.loanDate || '',
                type:     'jama',   // payments are always Jama direction
                amount:   _safeNum(p.amount),
                interest: pInterest,
                label:    p.note || 'Payment (Jama)',
                note:     p.note || '',
                settled:  !!(p.isSettled),
              });
            } catch (_) { /* skip corrupt payment */ }
          });
        }
      } catch (_) { /* skip corrupt loan */ }
    });

    // Sort chronologically (oldest first)
    flat.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return da - db;
    });

    // ── Compute running balance (Udhar adds, Jama subtracts) ──
    let balance = 0;
    flat.forEach(row => {
      if (row.type === 'udhaar') balance += row.amount;
      else                       balance -= row.amount;
      row.balance = balance;
    });

    return flat;
  }

  /* ══════════════════════════════════════════════════════════════
     TABLE RENDERER
     ══════════════════════════════════════════════════════════════ */
  function _buildTable(rows) {
    const rowsHtml = rows.map((row, idx) => {
      const isUdhaar    = row.type === 'udhaar';
      const isJama      = row.type === 'jama';
      const dateStr     = _fmtDate(row.date);
      
      const udharCell   = isUdhaar ? `<span style="color:#f87171; font-weight:700;">${_fmtAmt(row.amount)}</span>` : `<span style="color:var(--text-muted); opacity: 0.5;">—</span>`;
      const jamaCell    = isJama   ? `<span style="color:#34d399; font-weight:700;">${_fmtAmt(row.amount)}</span>` : `<span style="color:var(--text-muted); opacity: 0.5;">—</span>`;
      const intCell     = row.interest > 0
        ? `<span style="color:#fbbf24; font-size:0.8rem; font-weight:600;">${_fmtAmt(row.interest)}</span>`
        : `<span style="color:var(--text-muted); opacity: 0.5; font-size:0.8rem;">—</span>`;
      
      const balColor    = row.balance > 0 ? '#f87171' : (row.balance < 0 ? '#34d399' : 'var(--text-muted)');
      const balCell     = `<span style="color:${balColor}; font-weight:800; font-size:0.9rem;">${_fmtAmt(Math.abs(row.balance))}</span>`;
      const settledBadge = row.settled
        ? `<span style="font-size:0.6rem; background:rgba(16,185,129,0.15); color:#10b981; padding:2px 5px; border-radius:4px; margin-left:6px; vertical-align:middle; display:inline-block;">✓</span>`
        : '';

      return `
        <tr>
          <td class="col-date">
            <div style="font-size:0.82rem; font-weight:600; color:var(--text-primary); white-space:nowrap;">${dateStr}</div>
            <div style="font-size:0.68rem; color:var(--text-muted); margin-top:3px; max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${_esc(row.label)}">${_esc(row.label)}${settledBadge}</div>
          </td>
          <td class="col-amt">${udharCell}</td>
          <td class="col-amt">${jamaCell}</td>
          <td class="col-amt">${intCell}</td>
          <td class="col-amt">${balCell}</td>
        </tr>
      `;
    }).join('');

    // ── Final balance logic ──
    const lastRow    = rows[rows.length - 1];
    const finalBal   = lastRow ? lastRow.balance : 0;
    const finalColor = finalBal > 0 ? '#f87171' : (finalBal < 0 ? '#34d399' : '#94a3b8');
    const finalLabel = finalBal > 0 ? 'Net Payable (Udhar)' : (finalBal < 0 ? 'Net Credit (Jama)' : 'Settled (Zero Balance)');

    return `
      <table class="sbook-table">
        <thead>
          <tr>
            <th class="col-date">📅 Date</th>
            <th class="col-amt">🔴 Udhar</th>
            <th class="col-amt">🟢 Jama</th>
            <th class="col-amt">⚡ Interest</th>
            <th class="col-amt" style="background: linear-gradient(180deg, #1e40af 0%, #1e3a8a 100%);">💰 Balance</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
        <tfoot>
          <tr class="sbook-footer-row">
            <td colspan="4" style="text-align: right; border-right: 1px solid rgba(255,255,255,0.05); font-size:0.75rem; color:var(--text-secondary);">
              ${finalLabel}
            </td>
            <td class="col-amt" style="background: rgba(0,0,0,0.15);">
              <span style="color:${finalColor}; font-weight:900; font-size:1.1rem; text-shadow: 0 0 10px rgba(0,0,0,0.5);">${_fmtAmt(Math.abs(finalBal))}</span>
            </td>
          </tr>
        </tfoot>
      </table>
    `;
  }

  /* ══════════════════════════════════════════════════════════════
     SUMMARY PILLS (totals)
     ══════════════════════════════════════════════════════════════ */
  function _summaryPills(rows) {
    let totalUdhar = 0, totalJama = 0;
    rows.forEach(r => {
      if (r.type === 'udhaar') totalUdhar += r.amount;
      else                     totalJama  += r.amount;
    });

    const pill = (color, bg, label, val) => `
      <div style="
        background: ${bg}; border:1px solid ${color};
        border-radius: 8px; padding: 6px 12px; text-align:center;
        min-width: 80px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      ">
        <div style="font-size:0.65rem; color:${color}; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">${label}</div>
        <div style="font-size:0.85rem; font-weight:800; color:${color}; opacity:0.9;">${val}</div>
      </div>
    `;

    return pill('#f87171', 'rgba(248,113,113,0.1)', 'Udhar', _fmtAmt(totalUdhar))
         + pill('#34d399', 'rgba(52,211,153,0.1)', 'Jama',  _fmtAmt(totalJama));
  }

  /* ══════════════════════════════════════════════════════════════
     EMPTY STATE
     ══════════════════════════════════════════════════════════════ */
  function _emptyState() {
    return `
      <div class="empty-state" style="padding: 60px 24px; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%;">
        <div class="empty-icon" style="font-size: 3rem; margin-bottom: 16px; opacity: 0.5;">📭</div>
        <div class="empty-title" style="font-size:1.1rem; font-weight:700; color:var(--text-secondary);">No Transactions Yet</div>
        <div class="empty-sub" style="font-size:0.85rem; color:var(--text-muted); text-align:center; max-width:80%;">No Khata entries found for this customer. Add an Udhar or Jama to get started.</div>
      </div>
    `;
  }

  /* ══════════════════════════════════════════════════════════════
     UTILITIES
     ══════════════════════════════════════════════════════════════ */
  function _initials(name) {
    try {
      return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    } catch (_) { return '?'; }
  }

  function _esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _safeNum(val) {
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  }

  function _fmtDate(dateStr) {
    try {
      if (!dateStr) return '—';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
    } catch (_) { return dateStr || '—'; }
  }

  function _fmtAmt(val) {
    try {
      const n = _safeNum(val);
      if (n === 0) return '₹0';
      if (typeof InterestService !== 'undefined' && InterestService.fmt) {
        return InterestService.fmt(n);
      }
      return '₹' + n.toLocaleString('en-IN');
    } catch (_) { return '₹' + (val || 0); }
  }

  /* ── PUBLIC API ── */
  return { render };

})();
