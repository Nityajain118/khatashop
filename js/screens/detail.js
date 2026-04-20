/* ================================================================
   DETAIL SCREEN — Customer View with Simple / Khata Modes
   Simple = Live Summary Dashboard (today's snapshot)
   Khata  = Side-by-Side Detailed Ledger (full history)
   ALL modes use FinanceEngine (single source of truth)
   ================================================================ */

const DetailScreen = (() => {

  let _customerId;
  let _selectedIds = new Set();
  let _transactions = [];
  let _globalRate = 2;
  let _mode = 'normal'; // Interest calc mode: normal | tithi
  let _viewMode = 'simple'; // View mode: simple | khata

  /* ══════════════════════════════════════════════════════════════
     ENTRY POINT
     ══════════════════════════════════════════════════════════════ */
  function renderCustomer(container, customerId) {
    _customerId = customerId;
    _selectedIds.clear();

    const customer = DB.getCustomer(customerId);
    if (!customer) {
      container.innerHTML = '<div class="screen"><div class="empty-state"><div class="empty-icon">❌</div><div class="empty-title">Customer not found</div></div></div>';
      return;
    }

    // Build unified transaction list
    const loans = DB.getCustomerLoans(customerId);
    _transactions = [];

    const latestUdhaar = [...loans].reverse().find(l => l.type !== 'jama');
    if (latestUdhaar && latestUdhaar.interestRate) {
      _globalRate = latestUdhaar.interestRate;
    }

    loans.forEach(loan => {
      _transactions.push({
        id: loan.id,
        type: loan.type === 'jama' ? 'jama' : 'udhaar',
        amount: loan.principal,
        date: loan.loanDate,
        dateTime: loan.loanDate,
        label: loan.type === 'jama' ? 'Jama (Cash Received)' : 'Udhaar (Cash Given)',
        original: loan,
        rate: loan.interestRate !== undefined ? loan.interestRate : _globalRate,
        isSettled: loan.isSettled || false,
        notes: loan.notes || '',
      });
      if (loan.payments) {
        loan.payments.forEach(p => {
          _transactions.push({
            id: p.id,
            type: 'jama',
            amount: p.amount,
            date: p.date,
            dateTime: p.date,
            label: p.note || 'Payment (Jama)',
            isPayment: true,
            parentId: loan.id,
            rate: p.interestRate !== undefined ? p.interestRate : _globalRate,
            original: p,
            isSettled: p.isSettled || false,
          });
        });
      }
    });

    _transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Load saved view mode preference for this customer
    _viewMode = DB.getSetting('viewMode_' + customerId, 'simple');

    // Render shell
    const initials = customer.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const avatarHtml = customer.photo
      ? `<div class="customer-photo-lg" style="background-image:url('${customer.photo}');" onclick="showPhoto('${customer.photo}')"></div>`
      : `<div class="customer-photo-initials-lg" onclick="DetailScreen.changePhoto()">${initials}</div>`;

    container.innerHTML = `
      <div class="screen screen-slide-in">
        <!-- ── CUSTOMER HEADER ── -->
        <div class="detail-header" style="position:relative; padding-bottom: 16px;">
          ${avatarHtml}
          <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:-6px;margin-bottom:6px;cursor:pointer;" onclick="DetailScreen.changePhoto()">✎ Edit Photo</div>
          <div class="detail-name">${customer.name}</div>
          <div class="detail-phone">📱 ${customer.phone || '—'} &nbsp;|&nbsp; 📍 ${customer.address || '—'}</div>
          <input type="file" id="customerPhotoPicker" accept="image/*" capture="environment" style="display:none" onchange="DetailScreen.onPhotoChanged(event)" />
        </div>

        <!-- ── MODE TOGGLE (Simple | Khata) ── -->
        <div style="padding: 12px 16px; display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid var(--border);">
           <div style="display:flex; align-items:center; gap:8px;">
             <div class="view-mode-switch" style="background:var(--bg-card); border:1px solid var(--border); border-radius:10px; display:flex; font-size:0.82rem; overflow:hidden; font-weight:700;">
               <div style="padding:6px 16px; cursor:pointer; border-radius:8px; background:${_viewMode === 'simple' ? 'linear-gradient(135deg, var(--accent), var(--accent-glow))' : 'transparent'}; color:${_viewMode === 'simple' ? 'var(--bg-deep)' : 'var(--text-secondary)'}; transition:all 0.25s;" onclick="DetailScreen.setViewMode('simple')">📊 Simple</div>
               <div style="padding:6px 16px; cursor:pointer; border-radius:8px; background:${_viewMode === 'khata' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent'}; color:${_viewMode === 'khata' ? 'white' : 'var(--text-secondary)'}; transition:all 0.25s;" onclick="DetailScreen.setViewMode('khata')">📜 Khata</div>
             </div>
             <!-- ── S BOOK BUTTON ── -->
             <div style="cursor:pointer; padding:6px 12px; border-radius:8px; background:linear-gradient(135deg, #7c3aed, #6d28d9); color:white; font-size:0.78rem; font-weight:700; white-space:nowrap; box-shadow:0 2px 8px rgba(124,58,237,0.35); transition:all 0.2s;" onclick="App.navigate('sbook','${_customerId}')" title="Statement Book">📒 S Book</div>
           </div>
           <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
             <!-- CALC MODE -->
             <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:8px; display:flex; font-size:0.75rem; overflow:hidden; font-weight:600;">
               <div style="padding:4px 10px; cursor:pointer; background:${_mode === 'normal' ? 'var(--accent)' : 'transparent'}; color:${_mode === 'normal' ? 'white' : 'var(--text-secondary)'};" onclick="DetailScreen.setMode('normal')">📅 Normal</div>
               <div style="padding:4px 10px; cursor:pointer; background:${_mode === 'tithi' ? '#1e3a8a' : 'transparent'}; color:${_mode === 'tithi' ? 'white' : 'var(--text-secondary)'}; display:flex; gap:4px; align-items:center;" onclick="DetailScreen.setMode('tithi')">🌙 Tithi</div>
             </div>
           </div>
        </div>

        <!-- ── CONTENT AREA ── -->
        <div id="viewContent" style="padding: 12px 16px; margin-bottom: 200px;"></div>

        <!-- ── BOTTOM PANEL ── -->
        <div id="bottomPanel" class="card" style="position:fixed; bottom:var(--bottomnav-h); left:0; right:0; margin:0; border-radius: 20px 20px 0 0; padding:16px; box-shadow: 0 -4px 20px rgba(0,0,0,0.5); z-index:110; border: 1px solid var(--border); border-bottom:none;">
          <div id="summaryContent"></div>
        </div>

        <!-- ── QUICK PAYMENT MODAL ── -->
        <div id="quickPayModal" class="modal-overlay hidden" style="z-index:9999;">
          <div class="modal-box card" style="max-width:340px; width:90%;">
            <div class="modal-title" style="text-align:center;">💰 Quick Payment</div>
            <div style="text-align:center; font-size:0.8rem; color:var(--text-secondary); margin-bottom:16px;">Enter the amount received today</div>
            <div class="form-group" style="margin-bottom:16px;">
              <label class="form-label">Payment Amount (₹) *</label>
              <input type="number" id="quickPayAmount" class="form-control" placeholder="e.g. 5000" style="font-size:1.2rem; text-align:center; font-weight:700;">
            </div>
            <div class="form-group" style="margin-bottom:16px;">
              <label class="form-label">Note (Optional)</label>
              <input type="text" id="quickPayNote" class="form-control" placeholder="Cash payment" value="Payment Received">
            </div>
            <div style="display:flex; gap:12px;">
              <button class="btn btn-full" style="flex:1; background:var(--bg-card2); color:var(--text-primary); border:1px solid var(--border);" onclick="DetailScreen.closeQuickPay()">Cancel</button>
              <button class="btn btn-full" style="flex:1; background:linear-gradient(135deg, #10b981, #059669); color:white; font-weight:700;" onclick="DetailScreen.saveQuickPay()">✅ Record Payment</button>
            </div>
          </div>
        </div>

        <!-- ── JAMA MODAL (Khata Mode) ── -->
        <div id="jamaModal" class="modal-overlay hidden" style="z-index:9999;">
          <div class="modal-box card" style="max-width:340px; width:90%;">
            <div class="modal-title">🟢 New Jama Entry</div>
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label">Jama Amount (₹) *</label>
              <input type="number" id="jamaAmount" class="form-control" placeholder="e.g. 5000">
            </div>
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label">Date *</label>
              <input type="date" id="jamaDate" class="form-control" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label">Interest Rate (%)</label>
              <input type="number" id="jamaRate" class="form-control" placeholder="0" step="0.1" value="${_globalRate}">
            </div>
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label">Interest Type</label>
              <div style="display:flex;gap:16px;margin-top:4px;">
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                  <input type="radio" name="jamaInterestType" value="compound" checked />
                  Compound
                </label>
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                  <input type="radio" name="jamaInterestType" value="simple" />
                  Simple
                </label>
              </div>
            </div>
            <div class="form-group" style="margin-bottom:16px;">
              <label class="form-label">Note</label>
              <input type="text" id="jamaNote" class="form-control" placeholder="Optional note" value="Jama Received">
            </div>
            <div style="display:flex; gap:12px;">
              <button class="btn btn-full" style="flex:1; background:var(--bg-card2); color:var(--text-primary); border:1px solid var(--border);" onclick="DetailScreen.closeJamaModal()">Cancel</button>
              <button class="btn btn-full" style="flex:1; background:linear-gradient(135deg, #10b981, #059669); color:white;" onclick="DetailScreen.saveJama()">Save Jama</button>
            </div>
          </div>
        </div>

      </div>
    `;

    document.removeEventListener('panchangUpdated', _renderView);
    document.addEventListener('panchangUpdated', _renderView);

    _renderView();
  }

  /* ══════════════════════════════════════════════════════════════
     VIEW ROUTER
     ══════════════════════════════════════════════════════════════ */
  function _renderView() {
    const contentEl = document.getElementById('viewContent');
    if (!contentEl) return;

    if (_viewMode === 'simple') {
      _renderSimpleMode(contentEl);
    } else {
      _renderKhataMode(contentEl);
    }

    _updateBottomPanel();
  }

  /* ══════════════════════════════════════════════════════════════
     ★★★ SIMPLE MODE — Live Summary Dashboard ★★★
     "आज का क्या हिसाब है" — At a glance!
     ══════════════════════════════════════════════════════════════ */
  function _renderSimpleMode(el) {
    const activeTxns = _transactions.filter(t => !t.isSettled);
    const result = _getEngineResult(activeTxns);

    // Duration from first udhaar to today
    const firstUdhaar = activeTxns.find(t => t.type === 'udhaar');
    const startDate = firstUdhaar ? firstUdhaar.date : new Date().toISOString().split('T')[0];
    const dur = InterestService.getDuration(startDate, new Date().toISOString().split('T')[0]);

    // Current Tithi
    const todayTithi = typeof TithiService !== 'undefined' ? TithiService.getShort(new Date()) : '';
    const todaySamvat = typeof TithiService !== 'undefined' ? TithiService.getSamvatDisplay(new Date()) : '';
    const todayMaas = typeof TithiService !== 'undefined' ? TithiService.getMaasFromGregorian(new Date()) : '';

    // Totals
    let totalGiven = 0, totalReceived = 0;
    activeTxns.forEach(t => {
      if (t.type === 'udhaar') totalGiven += t.amount;
      else totalReceived += t.amount;
    });

    const loanCount = activeTxns.filter(t => t.type === 'udhaar').length;

    el.innerHTML = `
      <!-- ═══ TODAY'S TITHI BANNER ═══ -->
      <div style="background:linear-gradient(135deg, rgba(255,215,0,0.08), rgba(255,215,0,0.03)); border:1px solid var(--gold-border); border-radius:14px; padding:14px 16px; margin-bottom:16px; text-align:center;">
        <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:6px;">आज की तिथि</div>
        <div style="font-size:1.1rem; font-weight:700; color:var(--gold); font-family:var(--font-deva); margin-bottom:4px;">🌙 ${todayTithi}</div>
        <div style="font-size:0.75rem; color:var(--text-secondary);">${todaySamvat} • ${todayMaas}</div>
      </div>

      <!-- ═══ DURATION & LOAN INFO ═══ -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
        <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:12px; padding:14px; text-align:center;">
          <div style="font-size:2rem; margin-bottom:4px;">📅</div>
          <div style="font-size:1.5rem; font-weight:800; color:var(--text-primary);">${dur.text}</div>
          <div style="font-size:0.7rem; color:var(--text-muted); margin-top:4px;">(${dur.totalDays} Days Total)</div>
        </div>
        <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:12px; padding:14px; text-align:center;">
          <div style="font-size:2rem; margin-bottom:4px;">📋</div>
          <div style="font-size:1.5rem; font-weight:800; color:var(--text-primary);">${loanCount} Loan${loanCount !== 1 ? 's' : ''}</div>
          <div style="font-size:0.7rem; color:var(--text-muted); margin-top:4px;">@ ${_globalRate}% / month</div>
        </div>
      </div>

      <!-- ═══ LIVE FINANCIAL SNAPSHOT ═══ -->
      <div class="card" style="margin-bottom:16px; padding:20px; background:linear-gradient(135deg, var(--bg-card), var(--bg-mid)); border:1px solid var(--gold-border);">
        <div style="font-size:0.7rem; text-transform:uppercase; color:var(--text-muted); letter-spacing:1px; margin-bottom:16px; font-weight:700;">
          💰 आज का हिसाब (Live Summary)
        </div>

        <div style="display:flex; justify-content:space-between; margin-bottom:10px; padding-bottom:10px; border-bottom:1px solid var(--border);">
          <span style="color:var(--text-secondary);">🔴 Total Given (Udhaar)</span>
          <span style="font-weight:700; color:var(--danger);">${InterestService.fmt(totalGiven)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:10px; padding-bottom:10px; border-bottom:1px solid var(--border);">
          <span style="color:var(--text-secondary);">🟢 Total Received (Jama)</span>
          <span style="font-weight:700; color:var(--success);">${InterestService.fmt(totalReceived)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:10px; padding-bottom:10px; border-bottom:1px solid var(--border);">
          <span style="color:var(--text-secondary);">📌 Net Principal</span>
          <span style="font-weight:700;">${InterestService.fmt(result.principal)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:14px; padding-bottom:14px; border-bottom:1px dashed var(--border);">
          <span style="color:var(--warn); font-weight:600;">⚡ Interest (till today)</span>
          <span style="font-weight:800; color:var(--warn); font-size:1.1rem;">+ ${InterestService.fmt(result.interest)}</span>
        </div>

        <!-- ★ TOTAL PAYABLE — Hero Number ★ -->
        <div style="text-align:center; padding:16px 0;">
          <div style="font-size:0.75rem; text-transform:uppercase; color:var(--text-muted); margin-bottom:8px; letter-spacing:1px;">आज की कुल देय राशि</div>
          <div style="font-size:2.5rem; font-weight:900; color:var(--gold); text-shadow:0 0 30px rgba(255,215,0,0.3); line-height:1;">
            ${InterestService.fmt(result.totalPayable)}
          </div>
          <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:8px;">
            As of ${new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' })}
          </div>
        </div>
      </div>

      <!-- ═══ ACTION BUTTONS ═══ -->
      <div style="display:flex; gap:12px; margin-bottom:16px;">
        <button class="btn btn-full" style="flex:1; background:linear-gradient(135deg, #10b981, #059669); color:white; font-weight:700; padding:14px; font-size:0.95rem; border-radius:12px;" onclick="DetailScreen.openQuickPay()">
          💰 Payment करें
        </button>
        <button class="btn btn-full" style="flex:0 0 auto; background:var(--bg-card); border:1px solid var(--border); color:var(--success); font-weight:700; padding:14px 18px; font-size:0.95rem; border-radius:12px;" onclick="DetailScreen.shareWhatsApp()">
          💬
        </button>
      </div>

      <!-- ═══ RECENT TRANSACTIONS (Compact) ═══ -->
      <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:10px;">
        Recent Transactions (${activeTxns.length})
      </div>
      ${activeTxns.length === 0
        ? '<div style="text-align:center;padding:30px;color:var(--text-muted);">No transactions yet</div>'
        : activeTxns.slice(-5).reverse().map(t => {
            const dateStr = new Date(t.date).toLocaleDateString('en-IN', { day:'2-digit', month:'short' });
            const isJama = t.type === 'jama';
            return `
              <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--border);">
                <div style="display:flex; align-items:center; gap:10px;">
                  <div style="width:8px; height:8px; border-radius:50%; background:${isJama ? 'var(--success)' : 'var(--danger)'}; flex-shrink:0;"></div>
                  <div>
                    <div style="font-weight:600; font-size:0.85rem; color:var(--text-primary);">${isJama ? 'Jama' : 'Udhaar'}</div>
                    <div style="font-size:0.7rem; color:var(--text-muted);">${dateStr}</div>
                  </div>
                </div>
                <div style="font-weight:700; font-size:0.95rem; color:${isJama ? 'var(--success)' : 'var(--danger)'};">
                  ${isJama ? '- ' : '+ '}${InterestService.fmt(t.amount)}
                </div>
              </div>
            `;
          }).join('') +
          (activeTxns.length > 5 ? `<div style="text-align:center;padding:10px;font-size:0.8rem;color:var(--accent);cursor:pointer;font-weight:600;" onclick="DetailScreen.setViewMode('khata')">View all ${activeTxns.length} entries in Khata →</div>` : '')
      }
    `;
  }

  /* ══════════════════════════════════════════════════════════════
     ★★★ KHATA MODE — Side-by-Side Detailed Ledger ★★★
     Udhaar (Left) | Jama (Right) with full control
     ══════════════════════════════════════════════════════════════ */
  function _renderKhataMode(el) {
    const activeList = _transactions.filter(t => !t.isSettled);

    if (activeList.length === 0) {
      el.innerHTML = `
        <div class="empty-state" style="padding:40px 20px;">
          <div class="empty-icon">📭</div>
          <div class="empty-title">Khata is Empty</div>
          <div class="empty-sub">No active entries. Tap Udhaar Dein to start.</div>
        </div>`;
      return;
    }

    // Separate Udhaar and Jama
    const udhaars = activeList.filter(t => t.type === 'udhaar');
    const jamas = activeList.filter(t => t.type === 'jama');

    // Running balance
    let runningBal = 0;
    activeList.forEach(t => {
      if (t.type === 'udhaar') runningBal += t.amount;
      else runningBal -= t.amount;
    });

    // Tithi info for entries
    const getTithiInfo = (txn) => {
      if (_mode !== 'tithi' || typeof TithiService === 'undefined') return '';
      const tithi = TithiService.getShort(new Date(txn.date));
      let days = 0;
      if (txn.original && txn.original.status === 'closed') {
         days = txn.original.finalDays || txn.original.days || 0;
      } else {
         days = InterestService.getDuration(txn.date, new Date().toISOString().split('T')[0]).totalDays;
      }
      return `<div style="font-size:0.7rem;color:#ca8a04;margin-top:4px;display:flex;align-items:center;gap:4px;">
                🌙 ${tithi} (${days}d)
              </div>`;
    };

    // Card renderer
    const renderCard = (t, side) => {
      const isSelected = _selectedIds.has(t.id);
      const isJama = t.type === 'jama';
      const dateStr = new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
      const borderColor = isSelected ? 'var(--accent)' : (isJama ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)');
      const bgColor = isSelected ? 'rgba(59,130,246,0.08)' : 'var(--bg-card)';

      return `
        <div style="background:${bgColor}; border:1px solid ${borderColor}; border-radius:10px; padding:10px 12px; margin-bottom:8px; cursor:pointer; transition:all 0.2s;" onclick="DetailScreen.toggleSelect('${t.id}')">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div style="flex:1;">
              <div style="font-weight:700; font-size:1.1rem; color:${isJama ? 'var(--success)' : 'var(--danger)'};">
                ${InterestService.fmt(t.amount)}
              </div>
              <div style="font-size:0.72rem; color:var(--text-secondary); margin-top:3px;">📅 ${dateStr}</div>
              <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">${t.rate}%/mo</div>
              ${getTithiInfo(t)}
            </div>
            <input type="checkbox" style="transform:scale(1.1); pointer-events:none; margin-top:2px;" ${isSelected ? 'checked' : ''} />
          </div>
          <div style="font-size:0.72rem; color:var(--text-muted); margin-top:6px; font-style:italic;">${t.label}</div>
          <div style="display:flex; gap:12px; margin-top:6px; font-size:0.7rem;">
            <span style="color:var(--accent); cursor:pointer; font-weight:600;" onclick="event.stopPropagation(); DetailScreen.viewDetails('${t.id}')">👁️ Details</span>
            <span style="color:var(--text-secondary); cursor:pointer;" onclick="event.stopPropagation(); DetailScreen.handlePrint('${t.id}')">🖨️</span>
            <span style="color:var(--success); cursor:pointer;" onclick="event.stopPropagation(); DetailScreen.handleWhatsApp('${t.id}')">💬</span>
          </div>
        </div>
      `;
    };

    el.innerHTML = `
      <!-- ═══ SIDE-BY-SIDE HEADER ═══ -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
        <div style="text-align:center; font-size:0.75rem; font-weight:700; color:var(--danger); text-transform:uppercase; letter-spacing:0.5px; padding:8px; background:rgba(239,68,68,0.08); border-radius:8px;">
          🔴 UDHAAR (${udhaars.length})
          <div style="font-size:1rem; margin-top:4px;">${InterestService.fmt(udhaars.reduce((s,t) => s + t.amount, 0))}</div>
        </div>
        <div style="text-align:center; font-size:0.75rem; font-weight:700; color:var(--success); text-transform:uppercase; letter-spacing:0.5px; padding:8px; background:rgba(16,185,129,0.08); border-radius:8px;">
          🟢 JAMA (${jamas.length})
          <div style="font-size:1rem; margin-top:4px;">${InterestService.fmt(jamas.reduce((s,t) => s + t.amount, 0))}</div>
        </div>
      </div>

      <!-- ═══ RUNNING BALANCE BAR ═══ -->
      <div style="text-align:center; padding:8px; margin-bottom:14px; background:var(--bg-card); border:1px solid var(--border); border-radius:8px; font-size:0.8rem;">
        <span style="color:var(--text-secondary);">Running Balance:</span>
        <span style="font-weight:800; color:var(--gold); margin-left:8px;">${InterestService.fmt(runningBal)}</span>
      </div>

      <!-- ═══ SIDE-BY-SIDE CARDS ═══ -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; position:relative;">
        <!-- LEFT: UDHAAR -->
        <div>
          ${udhaars.length === 0
            ? '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:0.8rem;">No Udhaar</div>'
            : udhaars.map(t => renderCard(t, 'left')).join('')
          }
        </div>

        <!-- CENTER DIVIDER -->
        <div style="position:absolute; left:50%; top:0; bottom:0; width:2px; background:linear-gradient(to bottom, var(--border), var(--gold-border), var(--border)); transform:translateX(-50%); z-index:1;"></div>

        <!-- RIGHT: JAMA -->
        <div>
          ${jamas.length === 0
            ? '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:0.8rem;">No Jama</div>'
            : jamas.map(t => renderCard(t, 'right')).join('')
          }
        </div>
      </div>

      <!-- ═══ CHRONOLOGICAL TIMELINE (collapsible) ═══ -->
      <details style="margin-top:20px;">
        <summary style="font-size:0.8rem; font-weight:700; color:var(--accent); cursor:pointer; padding:8px 0;">📋 View Chronological Timeline (${activeList.length} entries)</summary>
        <div style="margin-top:8px;">
          ${activeList.map(t => {
            const dateStr = new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
            const isJama = t.type === 'jama';
            return `
              <div style="display:flex; align-items:center; padding:8px 0; border-bottom:1px solid var(--border); gap:10px;">
                <div style="width:8px; height:8px; border-radius:50%; background:${isJama ? 'var(--success)' : 'var(--danger)'}; flex-shrink:0;"></div>
                <div style="flex:1;">
                  <div style="font-size:0.8rem; font-weight:600;">${t.label}</div>
                  <div style="font-size:0.7rem; color:var(--text-muted);">${dateStr} • ${t.rate}%/mo</div>
                </div>
                <div style="font-weight:700; font-size:0.9rem; color:${isJama ? 'var(--success)' : 'var(--danger)'};">
                  ${isJama ? '-' : '+'}${InterestService.fmt(t.amount)}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </details>
    `;
  }

  /* ══════════════════════════════════════════════════════════════
     ENGINE HELPER
     ══════════════════════════════════════════════════════════════ */
  function _getEngineResult(txnList) {
    const entries = txnList.map(t => t.original);
    
    let netPrincipal = 0;
    let netInterest = 0;
    
    entries.forEach(e => {
       const isUdhaar = (!e.type || e.type.toUpperCase() === 'UDHAAR');
       let eInt = 0;

       if (e.status === 'closed') {
         eInt = e.finalInterest || e.interest || 0;
       } else {
         // Always recalculate live — no cache (cache caused preview vs live mismatch)
         eInt = FinanceEngine.calculateEntry(e, new Date()).interest || 0;
       }

       if (isUdhaar) {
          netPrincipal += (e.principal || 0);
          netInterest += eInt;
       } else {
          netPrincipal -= (e.principal || 0);
          netInterest -= eInt;
       }
    });

    const totalPayable = netPrincipal + netInterest;
    
    return {
      principal: netPrincipal,
      interest: netInterest,
      totalPayable: totalPayable
    };
  }

  /* ══════════════════════════════════════════════════════════════
     BOTTOM PANEL
     ══════════════════════════════════════════════════════════════ */
  function _updateBottomPanel() {
    const summaryEl = document.getElementById('summaryContent');
    if (!summaryEl) return;

    const hasSelection = _selectedIds.size > 0;
    const filteredTxns = _transactions.filter(t => !t.isSettled);

    if (_viewMode === 'simple') {
      // Simple Mode: action buttons
      summaryEl.innerHTML = `
        <div style="display:flex; gap:12px; margin-bottom:10px;">
          <button class="btn btn-full" style="flex:1; background:linear-gradient(135deg, #10b981, #059669); color:white; font-weight:700; font-size:0.95rem;" onclick="DetailScreen.openQuickPay()">💰 Payment करें</button>
          <button class="btn btn-full" style="flex:1; background:linear-gradient(135deg, #ef4444, #dc2626); color:white; font-weight:700; font-size:0.95rem;" onclick="App.navigate('addEntry','${_customerId}')">🔴 Udhaar Dein</button>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-full" style="flex:1; background:var(--bg-card2); border:1px solid var(--border); color:var(--accent); font-weight:600; font-size:0.82rem; padding:10px 6px;" onclick="PDFService.generateInvoice('${_customerId}')">🧾 Invoice PDF</button>
          <button class="btn btn-full" style="flex:1; background:var(--bg-card2); border:1px solid var(--border); color:#25D366; font-weight:600; font-size:0.82rem; padding:10px 6px;" onclick="PDFService.shareInvoiceWhatsApp('${_customerId}')">📤 WhatsApp</button>
          <button class="btn btn-full" style="flex:1; background:var(--bg-card2); border:1px solid var(--border); color:var(--text-secondary); font-weight:600; font-size:0.82rem; padding:10px 6px;" onclick="PDFService.exportCleanJSON('${_customerId}')">📋 Export</button>
        </div>
      `;

    } else if (!hasSelection) {
      // Khata — Full summary
      const result = _getEngineResult(filteredTxns);
      summaryEl.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; letter-spacing:1px;">Active Khata Summary</div>
          <div style="font-size:0.75rem; color:var(--accent-glow); cursor:pointer;" onclick="DetailScreen.selectAll()">Select All</div>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom:4px;">
          <span>Net Principal</span><span style="font-weight:600;">${InterestService.fmt(result.principal)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom:6px;">
          <span>Interest</span><span style="font-weight:600; color:var(--warn);">+ ${InterestService.fmt(result.interest)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding-top:8px; border-top:1px dashed var(--border); margin-bottom:12px;">
          <span style="font-weight:700;">Final Payable</span>
          <span style="font-weight:800; font-size:1.2rem; color:var(--gold);">${InterestService.fmt(result.totalPayable)}</span>
        </div>
        <div style="display:flex; gap:12px;">
          <button class="btn btn-full" style="flex:1; background:linear-gradient(135deg, #10b981, #059669); color:white; font-weight:700;" onclick="DetailScreen.openJamaModal()">🟢 Jama Lein</button>
          <button class="btn btn-full" style="flex:1; background:linear-gradient(135deg, #ef4444, #dc2626); color:white; font-weight:700;" onclick="App.navigate('addEntry','${_customerId}')">🔴 Udhaar Dein</button>
        </div>
      `;
    } else {
      // Khata — Selection
      const selectedArray = Array.from(_selectedIds);
      const selectedEntries = _transactions.filter(t => selectedArray.includes(t.id)).map(t => t.original);
      const calcTotals = FinanceEngine.calculateTotals(selectedEntries);
      
      let uPrin = 0, uInt = 0, jPrin = 0, jInt = 0;
      selectedEntries.forEach(e => {
         let eInt = 0;
         if (e.status === 'closed') {
           eInt = e.finalInterest || e.interest || 0;
         } else {
           eInt = FinanceEngine.calculateEntry(e, new Date()).interest || 0;
         }

         if (e.type && e.type.toUpperCase() === 'UDHAAR') {
             uPrin += (e.principal || 0); uInt += eInt;
         } else {
             jPrin += (e.principal || 0); jInt += eInt;
         }
      });
      
      const totals = {
        count: selectedArray.length,
        udhaarPrincipal: uPrin,
        udhaarInterest: uInt,
        jamaPrincipal: jPrin,
        jamaInterest: jInt,
        finalPayable: calcTotals.netPayable,
        isUserInCredit: calcTotals.netPayable < 0
      };

      summaryEl.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span style="font-size:0.75rem; font-weight:700; color:var(--warn);">SELECTED: ${totals.count} ENTRIES</span>
          <button style="background:none; border:none; color:var(--text-secondary); cursor:pointer; font-size:0.75rem; font-weight:600;" onclick="DetailScreen.clearSelection()">Clear</button>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px; font-size:0.8rem;">
          <div style="background:var(--bg-card); border:1px solid rgba(239,68,68,0.3); padding:8px; border-radius:8px;">
            <div style="color:var(--text-muted); font-size:0.7rem; margin-bottom:4px; font-weight:700;">Udhaar</div>
            <div style="color:var(--danger); font-weight:700;">${InterestService.fmt(totals.udhaarPrincipal)} + ${InterestService.fmt(totals.udhaarInterest)}</div>
          </div>
          <div style="background:var(--bg-card); border:1px solid rgba(16,185,129,0.3); padding:8px; border-radius:8px;">
            <div style="color:var(--text-muted); font-size:0.7rem; margin-bottom:4px; font-weight:700;">Jama</div>
            <div style="color:var(--success); font-weight:700;">${InterestService.fmt(totals.jamaPrincipal)} + ${InterestService.fmt(totals.jamaInterest)}</div>
          </div>
        </div>
        <div style="display:flex; justify-content:space-between; padding-top:8px; border-top:1px dashed var(--border); margin-bottom:10px;">
          <span style="font-weight:700;">Final Payable</span>
          <span style="font-weight:800; font-size:1.1rem; color:${totals.isUserInCredit ? 'var(--success)' : 'var(--accent)'};">
            ${totals.isUserInCredit ? 'Advance: ' : ''}${InterestService.fmt(Math.abs(totals.finalPayable))}
          </span>
        </div>
        <button onclick="DetailScreen.handleSettleSelected()" style="width:100%; background:var(--accent); color:white; padding:10px; border-radius:8px; font-weight:700; border:none; cursor:pointer;">
          ✅ Settle Selected Entries
        </button>
      `;
    }
  }

  /* ══════════════════════════════════════════════════════════════
     ACTIONS
     ══════════════════════════════════════════════════════════════ */

  function toggleSelect(id) {
    if (_selectedIds.has(id)) _selectedIds.delete(id);
    else _selectedIds.add(id);
    _renderView();
  }

  function selectAll() {
    _transactions.filter(t => !t.isSettled).forEach(t => _selectedIds.add(t.id));
    _renderView();
  }

  function clearSelection() {
    _selectedIds.clear();
    _renderView();
  }

  function setMode(mode) {
    if (_mode === mode) return;
    _mode = mode;
    _renderView();
  }

  function setViewMode(mode) {
    if (_viewMode === mode) return;
    _viewMode = mode;
    _selectedIds.clear();
    DB.saveSetting('viewMode_' + _customerId, mode);
    renderCustomer(document.getElementById('screenContainer'), _customerId);
  }

  /* ── QUICK PAYMENT (Simple Mode) ── */
  function openQuickPay() {
    document.getElementById('quickPayModal')?.classList.remove('hidden');
    document.getElementById('quickPayAmount')?.focus();
  }

  function closeQuickPay() {
    document.getElementById('quickPayModal')?.classList.add('hidden');
  }

  function saveQuickPay() {
    const amtStr = document.getElementById('quickPayAmount').value;
    const noteStr = document.getElementById('quickPayNote').value;
    const amount = parseFloat(amtStr);

    if (!amount || amount <= 0) {
      Toast.show("⚠️ Please enter a valid amount");
      return;
    }

    const activeTxns = _transactions.filter(t => !t.isSettled);
    const result = _getEngineResult(activeTxns);
    if (amount > result.totalPayable) {
      alert("⚠️ Payment exceeds remaining balance!");
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    
    // Find latest udhaar to copy interest settings correctly
    const loans = DB.getCustomerLoans(_customerId);
    const latestUdhaar = [...loans].reverse().find(l => l.type !== 'jama');

    const entry = createEntry({
      customerId: _customerId,
      name: DB.getCustomer(_customerId)?.name || '',
      principal: amount,
      interestRate: latestUdhaar ? latestUdhaar.interestRate : _globalRate,
      loanDate: todayStr,
      notes: noteStr || 'Payment Received',
      calculationMode: latestUdhaar ? latestUdhaar.calculationMode : 'monthly',
      interestType: latestUdhaar ? latestUdhaar.interestType : 'simple',
      compoundingMonths: latestUdhaar ? latestUdhaar.compoundingMonths : 1,
    });
    entry.type = 'jama';

    DB.addEntry(entry);
    Toast.show(`✅ Payment Recorded: ₹${amount}`);

    closeQuickPay();
    renderCustomer(document.getElementById('screenContainer'), _customerId);
  }

  /* ── WHATSAPP SHARE (Simple Mode Summary) ── */
  function shareWhatsApp() {
    const customer = DB.getCustomer(_customerId);
    const activeTxns = _transactions.filter(t => !t.isSettled);
    const result = _getEngineResult(activeTxns);
    const firstUdhaar = activeTxns.find(t => t.type === 'udhaar');
    const startDate = firstUdhaar ? firstUdhaar.date : new Date().toISOString().split('T')[0];
    const dur = InterestService.getDuration(startDate, new Date().toISOString().split('T')[0]);
    const todayTithi = typeof TithiService !== 'undefined' ? TithiService.getShort(new Date()) : '';

    const text = `🧾 *आज का हिसाब*
━━━━━━━━━━━━━━
👤 *${customer?.name || 'Customer'}*
📅 Date: ${new Date().toLocaleDateString('en-IN')}
🌙 Tithi: ${todayTithi}
⏱ Duration: ${dur.text}

💰 Net Principal: ${InterestService.fmt(result.principal)}
⚡ Interest: ${InterestService.fmt(result.interest)}
━━━━━━━━━━━━━━
🔥 *Total Payable: ${InterestService.fmt(result.totalPayable)}*

— ${DB.getShop()?.name || 'Jain Finance'}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  /* ── JAMA MODAL (Khata Mode) ── */
  function openJamaModal() {
    document.getElementById('jamaModal')?.classList.remove('hidden');
    document.getElementById('jamaAmount')?.focus();
  }

  function closeJamaModal() {
    document.getElementById('jamaModal')?.classList.add('hidden');
  }

  function saveJama() {
    const amtStr = document.getElementById('jamaAmount').value;
    const dateStr = document.getElementById('jamaDate').value;
    const rateStr = document.getElementById('jamaRate').value;
    const noteStr = document.getElementById('jamaNote').value;

    const amount = parseFloat(amtStr);
    if (!amount || amount <= 0) {
      Toast.show("⚠️ Invalid amount");
      return;
    }

    const activeTxns = _transactions.filter(t => !t.isSettled);
    const result = _getEngineResult(activeTxns);
    if (amount > result.totalPayable) {
      alert("⚠️ Payment exceeds remaining balance!");
      return;
    }

    const interestType = document.querySelector('input[name="jamaInterestType"]:checked')?.value || 'compound';

    const entry = createEntry({
      customerId: _customerId,
      name: DB.getCustomer(_customerId)?.name || '',
      principal: amount,
      interestRate: parseFloat(rateStr) || 0,
      loanDate: dateStr,
      notes: noteStr || 'Jama Received',
      calculationMode: 'monthly',
      interestType: interestType,
    });
    entry.type = 'jama';

    DB.addEntry(entry);
    Toast.show(`✅ Jama Recorded: ₹${amount}`);

    closeJamaModal();
    renderCustomer(document.getElementById('screenContainer'), _customerId);
  }

  /* ── PHOTO ── */
  function changePhoto() {
    document.getElementById('customerPhotoPicker')?.click();
  }

  function onPhotoChanged(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      Toast.show("⚠️ Image too large (max 5MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        const MAX_WIDTH = 600;
        if (w > MAX_WIDTH) { const scale = MAX_WIDTH / w; w = MAX_WIDTH; h = h * scale; }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const photoData = canvas.toDataURL('image/jpeg', 0.6);

        const customer = DB.getCustomer(_customerId);
        if (customer) {
          customer.photo = photoData;
          DB.updateCustomer(customer);
          Toast.show('📷 Photo updated!');
          renderCustomer(document.getElementById('screenContainer'), _customerId);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  /* ── SETTLE ── */
  function handleSettleSelected() {
    if (_selectedIds.size === 0) return;

    if (!document.getElementById('confirmSettleModal')) {
      const overlay = document.createElement('div');
      overlay.id = 'confirmSettleModal';
      overlay.className = 'modal-overlay hidden';
      overlay.style.zIndex = '9999';
      overlay.innerHTML = `
        <div class="modal-box card" style="max-width:320px; width:90%; text-align:center;">
           <div style="font-size:3rem; margin-bottom:8px;">🔒</div>
           <div class="modal-title" style="color:var(--accent)">Settle & Lock Entries?</div>
           <p style="font-size:0.9rem; color:var(--text-secondary); margin-bottom:12px;">This will calculate the final interest up to the selected settlement date. Once closed, this record becomes immutable.</p>
           
           <div class="form-group" style="margin-bottom:20px; text-align:left;">
             <label class="form-label">Settlement Date *</label>
             <input type="date" id="settlementDateInput" class="form-control" value="${new Date().toISOString().split('T')[0]}">
           </div>

           <div style="display:flex; gap:12px;">
             <button class="btn btn-secondary btn-full" style="flex:1;" onclick="document.getElementById('confirmSettleModal').classList.add('hidden')">Cancel</button>
             <button class="btn btn-full" style="flex:1; background:var(--accent); color:white;" onclick="DetailScreen.executeSettle()">Yes, Lock Final</button>
           </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }
    // Update date inside input in case today changed
    document.getElementById('settlementDateInput').value = new Date().toISOString().split('T')[0];
    document.getElementById('confirmSettleModal').classList.remove('hidden');
  }

  function executeSettle() {
    const sDate = document.getElementById('settlementDateInput')?.value || new Date().toISOString().split('T')[0];
    const settlementDate = new Date(sDate);
    
    document.getElementById('confirmSettleModal')?.classList.add('hidden');
    _selectedIds.forEach(id => {
      const txn = _transactions.find(t => t.id === id);
      if (txn) {
        if (!txn.isPayment) {
          const entry = DB.getEntry(id);
          if (entry && entry.status !== 'closed') { 
            // FINAL LAYER 3: Calculate -> Lock -> Prevent Recalc
            const finalCalc = FinanceEngine.calculateEntry(entry, settlementDate);

            entry.status = 'closed';
            entry.isSettled = true; 
            entry.settledDate = settlementDate.toISOString(); 

            entry.finalTotal = finalCalc.total;
            entry.finalInterest = finalCalc.interest;
            entry.finalDays = finalCalc.days;
            entry.annualRate = finalCalc.annualRate;
            entry.timeYears = finalCalc.timeYears;
            entry.timeInMonths = finalCalc.timeInMonths;
            
            DB.updateEntry(entry); 
          }
        } else {
          const parent = DB.getEntry(txn.parentId);
          if (parent) {
            const payment = parent.payments.find(p => p.id === id);
            if (payment) { payment.isSettled = true; payment.settledDate = settlementDate.toISOString(); }
            DB.updateEntry(parent);
          }
        }
      }
    });
    Toast.show(`✅ ${_selectedIds.size} Entries Settled`);
    _selectedIds.clear();
    renderCustomer(document.getElementById('screenContainer'), _customerId);
  }

  /* ── DETAIL VIEW / PRINT / WHATSAPP (per entry) ── */
  function handleWhatsApp(id) {
    const txn = _transactions.find(t => t.id === id);
    if (!txn) return;
    const text = `🧾 KHATA ENTRY\n━━━━━━━━━━━━━━\nType: ${txn.type.toUpperCase()}\nAmount: ₹${txn.amount}\nDate: ${txn.date}\nRate: ${txn.rate}%/month\n\n— ${DB.getShop()?.name || 'Jain Finance'}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  function handlePrint(id) {
    const txn = _transactions.find(t => t.id === id);
    if (!txn) return;

    const entry = txn.original;
    const rate = txn.rate;
    const isJama = txn.type === 'jama';
    const resData = (entry.status === 'closed') 
      ? { total: entry.finalTotal || entry.total || 0, interest: entry.finalInterest || entry.interest || 0, days: entry.finalDays || entry.days || 0 }
      : FinanceEngine.calculateEntry(entry, new Date());

    const customer = DB.getCustomer(_customerId) || {};
    const shop = DB.getShop() || {};
    
    let container = document.getElementById('printInvoiceContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'printInvoiceContainer';
      document.body.appendChild(container);
    }
    
    container.innerHTML = `
      <div class="print-invoice">
        <div class="print-header">
           <div class="page-number">Page 1</div>
           <div class="shop-title">${shop.name || 'Jain Finance'}</div>
           <div class="shop-sub">${shop.address || ''} | Ph: ${shop.phone || '—'}</div>
           <div class="invoice-title">${isJama ? 'PAYMENT RECEIPT' : 'LOAN INVOICE'}</div>
        </div>
        
        <div class="print-customer">
           <div class="cust-row"><strong>Customer:</strong> ${customer.name || '—'}</div>
           <div class="cust-row"><strong>Phone:</strong> ${customer.phone || '—'}</div>
           <div class="cust-row"><strong>City/Village:</strong> ${customer.address || '—'}</div>
        </div>

        <table class="print-table">
           <thead>
             <tr>
               <th>Date</th>
               <th>Rate & Type</th>
               <th>Duration</th>
               <th style="text-align:right">Principal</th>
               <th style="text-align:right">Interest</th>
               <th style="text-align:right">Total Due</th>
             </tr>
           </thead>
           <tbody>
             <tr>
               <td>${new Date(txn.date).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'})}</td>
               <td>${(entry.interestType || 'compound') === 'simple' ? 'Simple' : 'Compound'} @ ${rate}%/mo</td>
               <td>${resData.days} days</td>
               <td style="text-align:right">${InterestService.fmt(txn.amount)}</td>
               <td style="text-align:right">${InterestService.fmt(resData.interest)}</td>
               <td style="text-align:right">${InterestService.fmt(resData.total)}</td>
             </tr>
           </tbody>
        </table>

        <div class="print-summary">
           <table class="summary-table">
             <tr><td>Net Principal:</td><td class="amt">${InterestService.fmt(txn.amount)}</td></tr>
             <tr><td>Total Interest:</td><td class="amt">${InterestService.fmt(resData.interest)}</td></tr>
             <tr class="total-row"><td>Total Payable:</td><td class="amt">${InterestService.fmt(resData.total)}</td></tr>
           </table>
        </div>

        <div class="print-footer">
           <div class="sig-box">Customer Signature<br><br><br>____________________</div>
           <div class="sig-box right">Authorised Signature<br><br><br>____________________</div>
           <div class="thank-you">Thank you for your trust.</div>
        </div>
      </div>
    `;

    Toast.show(`🖨️ Opening print dialog...`);
    setTimeout(() => window.print(), 500);
  }

  function viewDetails(id) {
    const txn = _transactions.find(t => t.id === id);
    if (!txn) { Toast.show('Entry not found'); return; }
    
    const entry = txn.original;
    const rate = txn.rate;
    const intType = entry.interestType || 'compound';
    
    let resData;
    if (entry.status === 'closed') {
      resData = {
        total: entry.finalTotal || entry.total || 0,
        interest: entry.finalInterest || entry.interest || 0,
        days: entry.finalDays || entry.days || 0,
        annualRate: entry.annualRate || (rate * 12),
        compoundingLabel: entry.compoundingLabel || 'Monthly',
        timeYears: entry.timeYears || 0,
        mode: entry.mode || 'MANUAL'
      };
    } else {
      resData = FinanceEngine.calculateEntry(entry, new Date());
    }

    const interest = resData.interest;
    const total = resData.total;
    const days = resData.days;

    const todayTithi = typeof TithiService !== 'undefined' ? TithiService.getShort(new Date()) : '';
    const startTithi = typeof TithiService !== 'undefined' ? TithiService.getShort(new Date(txn.date)) : '';
    
    const customer = DB.getCustomer(_customerId) || {};

    if (!document.getElementById('viewDetailsModal')) {
      const overlay = document.createElement('div');
      overlay.id = 'viewDetailsModal';
      overlay.className = 'modal-overlay hidden';
      overlay.style.zIndex = '9999';
      document.body.appendChild(overlay);
    }
    
    const overlay = document.getElementById('viewDetailsModal');
    overlay.innerHTML = `
      <div class="modal-box card" style="max-width:360px; width:90%; padding:24px; padding-top:16px;">
         <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
           <div class="modal-title" style="margin:0; font-size:1.2rem; color:var(--accent);">Entry Details</div>
           <button style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:var(--text-muted);" onclick="document.getElementById('viewDetailsModal').classList.add('hidden')">&times;</button>
         </div>
         
         <!-- 👤 Customer Info -->
         <div style="background:var(--bg-card2); border:1px solid var(--border); padding:12px; border-radius:12px; margin-bottom:12px;">
           <div style="font-size:0.7rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:6px;">👤 Customer Info</div>
           <div style="font-weight:700; color:var(--text-primary); font-size:0.95rem;">${customer.name || '—'}</div>
           <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:2px;">📱 ${customer.phone || '—'}   |   📍 ${customer.address || '—'}</div>
         </div>

         <!-- 💰 Loan Info -->
         <div style="background:var(--bg-card2); border:1px solid var(--border); padding:12px; border-radius:12px; margin-bottom:12px;">
           <div style="font-size:0.7rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:6px;">💰 Loan Info</div>
           <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:4px;"><span style="color:var(--text-secondary)">Amount:</span><span style="font-weight:700; color:var(--text-primary)">${InterestService.fmt(txn.amount)}</span></div>
           <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:4px;"><span style="color:var(--text-secondary)">Date:</span><span style="font-weight:700; color:var(--text-primary)">${new Date(txn.date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</span></div>
           <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:4px;"><span style="color:var(--text-secondary)">Rate:</span><span style="font-weight:700; color:var(--text-primary)">${rate}% / mo</span></div>
           <div style="display:flex; justify-content:space-between; font-size:0.85rem;"><span style="color:var(--text-secondary)">Type:</span><span style="font-weight:700; color:var(--text-primary)">${intType === 'simple' ? 'Simple' : `Compound <span style="font-size:0.7rem;color:var(--text-muted);">(${resData.compoundingLabel})</span>`}</span></div>
         </div>

         <!-- 📅 Time Info -->
         <div style="background:var(--bg-card2); border:1px solid var(--border); padding:12px; border-radius:12px; margin-bottom:12px;">
           <div style="font-size:0.7rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:6px;">📅 Time Info</div>
           <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:4px;"><span style="color:var(--text-secondary)">Duration:</span><span style="font-weight:700; color:var(--text-primary)">${days} days (${Number(resData.timeYears ? resData.timeYears * 12 : 0).toFixed(1)} mo)</span></div>
           ${(_mode === 'tithi' && startTithi) ? `<div style="display:flex; justify-content:space-between; font-size:0.85rem;"><span style="color:var(--text-secondary)">Tithi:</span><span style="font-weight:700; color:var(--gold)">${startTithi} → ${todayTithi}</span></div>` : ''}
         </div>

         <!-- 📊 Summary -->
         <div style="background:linear-gradient(135deg, var(--bg-card), var(--bg-card2)); border:1px solid var(--accent); padding:14px; border-radius:12px; margin-bottom:8px; box-shadow:0 4px 12px rgba(30,58,138,0.06);">
           <div style="font-size:0.7rem; font-weight:700; color:var(--accent); text-transform:uppercase; margin-bottom:8px;">📊 Summary</div>
           <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:6px;"><span style="color:var(--text-secondary)">Interest till today:</span><span style="font-weight:700; color:var(--warn)">+ ${InterestService.fmt(interest)}</span></div>
           <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:10px;"><span style="color:var(--text-secondary)">Status:</span><span style="font-weight:700;">${entry.status === 'closed' ? '<span style="color:var(--success)">🔒 Closed</span>' : '<span style="color:var(--warn)">⚡ Active</span>'}</span></div>
           <div style="display:flex; justify-content:space-between; padding-top:10px; border-top:1px dashed var(--border);">
             <span style="font-weight:700; color:var(--text-primary)">Total Payable:</span><span style="color:var(--accent); font-weight:800; font-size:1.2rem;">${InterestService.fmt(total)}</span>
           </div>
         </div>
      </div>
    `;
    
    overlay.classList.remove('hidden');
  }

  // Legacy route handler
  function render(container, entryId) {
    const entry = DB.getEntry(entryId);
    if (entry && entry.customerId) {
      renderCustomer(container, entry.customerId);
    }
  }

  return {
    render, renderCustomer, toggleSelect, selectAll, clearSelection,
    changePhoto, onPhotoChanged, setMode, setViewMode,
    openQuickPay, closeQuickPay, saveQuickPay, shareWhatsApp,
    openJamaModal, closeJamaModal, saveJama,
    handleWhatsApp, handlePrint, viewDetails, handleSettleSelected, executeSettle,
  };
})();
