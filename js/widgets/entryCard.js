/* ================================================================
   ENTRY CARD WIDGET — Individual loan card + Customer summary card
   ================================================================ */

const EntryCard = (() => {

  /* ── Single loan card (used inside customer detail) ── */
  function render(entry, index = 0) {
    const calc    = InterestService.calculate(entry);
    const isPaid  = InterestService.isPaid(entry);
    const isOver  = InterestService.isOverdue(entry);

    const ldt     = new Date(entry.loanDate);
    const dateStr = ModeSwitch.getDisplayDate(ldt);

    let statusBadge = '';
    let cardClass   = '';
    if (isPaid)      { statusBadge = '<span class="badge badge-success">✓ Paid</span>';     cardClass = 'paid'; }
    else if (isOver) { statusBadge = '<span class="badge badge-danger">⚠ Overdue</span>';  cardClass = 'overdue'; }
    else             { statusBadge = '<span class="badge badge-warn">Active</span>'; }

    const paidPct = entry.principal > 0
      ? Math.min(100, Math.round((calc.totalPaid / entry.principal) * 100))
      : 0;

    const initials = entry.name
      .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    return `
      <div class="card ${cardClass} entry-card-enter" style="animation-delay:${index * 0.06}s; cursor:pointer;"
           onclick="App.navigate('detail', '${entry.id}')">
        <div class="card-row" style="margin-bottom:10px;">
          <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;">
            <div style="
              width:42px;height:42px;border-radius:50%;
              background:linear-gradient(135deg,var(--accent),var(--accent-glow));
              display:flex;align-items:center;justify-content:center;
              font-weight:700;font-size:0.85rem;color:#1A0F0A;flex-shrink:0;
            ">${initials}</div>
            <div style="min-width:0;">
              <div class="card-name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${entry.name}</div>
              <div class="card-sub">${entry.phone || '—'}</div>
            </div>
          </div>
          ${statusBadge}
        </div>
        <div class="card-row" style="margin-bottom:8px;">
          <div>
            <div class="card-label">Principal</div>
            <div style="color:var(--text-secondary);font-weight:600;">${InterestService.fmt(entry.principal)}</div>
          </div>
          <div style="text-align:right;">
            <div class="card-label">Balance Due</div>
            <div class="card-amount">${InterestService.fmt(Math.max(0, calc.balance))}</div>
          </div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${paidPct}%;"></div>
        </div>
        <div class="card-row" style="margin-top:10px;">
          <div class="tithi-chip">🪔 ${dateStr}</div>
          <div class="card-sub">${entry.interestRate}% / month</div>
        </div>
      </div>`;
  }

  /* ── Customer summary card (used on home screen) ── */
  function renderCustomerCard(customer, loans, index = 0) {
    // Calculate totals across all loans directly via uniform engine
    const totals = FinanceEngine.calculateTotals(loans);
    const totalBalance = totals.netPayable;
    
    let totalPrincipal = 0;
    let overdueCount = 0;
    
    loans.forEach(e => {
      if (e.type && e.type.toUpperCase() === 'UDHAAR') {
         totalPrincipal += e.principal || 0;
      } else {
         totalPrincipal -= e.principal || 0;
      }
      if (InterestService.isOverdue(e)) overdueCount++;
    });

    // Use status assigned in home.js or calculate fallback
    let status = customer.status;
    if (!status) {
      if (loans.length === 0) {
        status = 'active';
      } else {
        if (totalBalance <= 0) status = 'paid';
        else if (overdueCount > 0) status = 'overdue';
        else status = 'active';
      }
    }

    const allPaid = status === 'paid';
    const hasOverdue = status === 'overdue';
    let cardClass = '';
    if (allPaid) cardClass = 'paid';
    else if (hasOverdue) cardClass = 'overdue';

    const initials = customer.name
      .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    const samvatYear = typeof TithiService !== 'undefined' ? TithiService.getSamvat(new Date()) : '';

    // Photo avatar or initials
    const avatarHtml = customer.photo
      ? `<div class="customer-photo" style="background-image:url('${customer.photo}');" onclick="event.stopPropagation(); showPhoto('${customer.photo}')"></div>`
      : `<div class="customer-photo-initials">${initials}</div>`;

    // Status badges
    let statusHtml = '';
    if (allPaid) statusHtml = '<span class="badge badge-success">✓ Paid</span>';
    else if (hasOverdue) statusHtml = `<span class="badge badge-danger">⚠ Overdue</span>`;
    else statusHtml = `<span class="badge badge-warn">Active</span>`;

    return `
      <div class="card ${cardClass} entry-card-enter" style="animation-delay:${index * 0.06}s; cursor:pointer; position:relative;"
           onclick="App.navigate('customer', '${customer.customerId}')">
        <!-- TOP ROW: Avatar + Info -->
        <div style="display:flex;align-items:center;margin-bottom:14px;">
          ${avatarHtml}
          <div style="min-width:0;margin-left:12px;flex:1;">
            <div style="color:var(--text-primary);font-weight:700;font-size:1.05rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${customer.name}
            </div>
            <div style="color:var(--text-secondary);font-size:0.85rem;">
              ${customer.phone || '\u2014'}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${statusHtml}
            <button
              onclick="event.stopPropagation(); EntryCard.openHisab('${customer.customerId}', '${(customer.name||'').replace(/'/g,'\\&apos;')}', '${(customer.phone||'')}', '${(customer.address||'').replace(/'/g,'\\&apos;')}')"
              title="Full Hisab"
              style="background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.3);
                     border-radius:8px;width:32px;height:32px;display:flex;align-items:center;
                     justify-content:center;font-size:14px;cursor:pointer;flex-shrink:0;
                     transition:all 0.2s;"
              onmouseover="this.style.background='rgba(124,58,237,0.3)'"
              onmouseout="this.style.background='rgba(124,58,237,0.15)'">
              \uD83D\uDC41\uFE0F
            </button>
          </div>
        </div>

        <!-- LOAN INFO -->
        <div style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:4px;">
          Total Loans: ${loans.length}
        </div>
        <div style="color:var(--gold);font-size:1.25rem;font-weight:700;">
          ${allPaid ? '\u2705 \u20b90' : InterestService.fmt(totalBalance)}
        </div>

        <!-- Progress (if any) -->
        ${!allPaid && totalPrincipal > 0 ? `
        <div class="progress-bar" style="margin-top:10px;">
          <div class="progress-fill" style="width:${Math.min(100, Math.round(((totalPrincipal - totalBalance) / totalPrincipal) * 100))}%;"></div>
        </div>
        ` : ''}
      </div>`;
  }

  function openHisab(tithiCustomerId, name, phone, address) {
    if (typeof JewelleryDataService === 'undefined' || typeof HisabModal === 'undefined') {
      App.navigate('customer', tithiCustomerId);
      return;
    }
    JewelleryDataService.syncFromTithi();
    const master = JewelleryDataService.findInMaster(name, phone);
    if (master) {
      HisabModal.open(master.id);
    } else {
      const mc = JewelleryDataService.upsertMaster({
        name, mobile: phone, village: address,
        moduleId: 'tithi', sourceId: tithiCustomerId,
      });
      HisabModal.open(mc.id);
    }
  }

  return { render, renderCustomerCard, openHisab };
})();
