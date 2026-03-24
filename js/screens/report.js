/* ================================================================
   REPORT SCREEN — Daily collection + weekly bar chart + stats
   ================================================================ */

const ReportScreen = (() => {

  let _selectedDate;

  function render(container) {
    _selectedDate = new Date().toISOString().split('T')[0];
    const stats      = ReportService.getOverallStats();
    const weekly     = ReportService.getWeeklyData();
    const daily      = ReportService.getDailyCollection(new Date(_selectedDate));
    const maxDay     = Math.max(...weekly.map(d => d.total), 1);
    const monthTotal = ReportService.getMonthlyCollection();

    container.innerHTML = `
      <div class="screen screen-slide-in">

        <!-- MONTHLY HEADER -->
        <div class="card" style="margin-bottom:16px;background:linear-gradient(135deg,var(--bg-card),var(--bg-mid));">
          <div style="text-align:center;">
            <div style="font-size:0.78rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">This Month's Collection</div>
            <div style="font-size:2.2rem;font-weight:700;color:var(--accent-glow);">${InterestService.fmt(monthTotal)}</div>
          </div>
        </div>

        <!-- WEEKLY BAR CHART -->
        <div class="card" style="margin-bottom:16px;">
          <div class="section-header" style="margin-bottom:12px;">
            <span class="section-title">📈 7-Day Trend</span>
          </div>
          <div style="display:flex;align-items:flex-end;gap:6px;height:80px;padding:0 4px;">
            ${weekly.map(d => {
              const h      = d.total > 0 ? Math.max(8, Math.round((d.total / maxDay) * 72)) : 6;
              const isToday = d.date === new Date().toISOString().split('T')[0];
              return `
                <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
                  <div style="
                    width:100%;border-radius:4px 4px 0 0;height:${h}px;
                    background:${isToday ? 'linear-gradient(to top,var(--accent),var(--accent-glow))' : 'var(--bg-card2)'};
                    border:1px solid ${isToday ? 'var(--accent)' : 'var(--border)'};
                    transition:height 0.5s ease;
                  " title="${InterestService.fmt(d.total)}"></div>
                  <div style="font-size:0.6rem;color:${isToday ? 'var(--accent-glow)' : 'var(--text-muted)'};font-weight:${isToday ? 700 : 400};">${d.label}</div>
                </div>`;
            }).join('')}
          </div>
        </div>

        <!-- DAILY COLLECTION PICKER -->
        <div class="card" style="margin-bottom:16px;">
          <div class="section-header" style="margin-bottom:12px;">
            <span class="section-title">📅 Daily Collection</span>
          </div>
          <div style="display:flex;gap:10px;align-items:center;margin-bottom:14px;">
            <input class="form-control" type="date" id="reportDatePicker" value="${_selectedDate}"
                   onchange="ReportScreen.changeDate()" style="flex:1;" />
          </div>
          <div id="dailyStats"></div>
        </div>

        <!-- OVERALL STATS -->
        <div class="card" style="margin-bottom:16px;">
          <div class="section-title" style="margin-bottom:12px;">📊 Portfolio Overview</div>
          ${stat('Total Customers',  stats.totalCustomers)}
          ${stat('Total Loans',      stats.totalEntries)}
          ${stat('Total Principal',  InterestService.fmt(stats.totalPrincipal),  'var(--text-secondary)')}
          ${stat('Total Balance Due',InterestService.fmt(stats.totalBalance),    'var(--danger)')}
          ${stat('Interest Earned',  InterestService.fmt(stats.totalInterest),   'var(--warn)')}
          ${stat('Total Collected',  InterestService.fmt(stats.totalPaid),       'var(--success)')}
          <div class="divider"></div>
          ${stat('Active',   stats.activeCount,  'var(--warn)')}
          ${stat('Overdue',  stats.overdueCount, 'var(--danger)')}
          ${stat('Paid Off', stats.paidCount,    'var(--success)')}
        </div>

        <!-- DUE SOON -->
        <div class="section-header"><span class="section-title">⏰ Due This Week</span></div>
        <div id="dueSoonList"></div>

      </div>
    `;

    _renderDailyStats(_selectedDate);
    _renderDueSoon();
  }

  function stat(label, val, color = 'var(--accent-glow)') {
    return `<div class="report-stat">
      <span class="stat-name">${label}</span>
      <span class="stat-value" style="color:${color};">${val}</span>
    </div>`;
  }

  function changeDate() {
    _selectedDate = document.getElementById('reportDatePicker')?.value;
    _renderDailyStats(_selectedDate);
  }

  function _renderDailyStats(dateStr) {
    const el = document.getElementById('dailyStats');
    if (!el) return;
    const daily = ReportService.getDailyCollection(new Date(dateStr));
    if (daily.collections.length === 0) {
      el.innerHTML = `<div style="text-align:center;padding:16px;color:var(--text-muted);">No collections on this date.</div>`;
    } else {
      el.innerHTML = `
        <div style="margin-bottom:10px;font-size:1.2rem;font-weight:700;color:var(--success);">
          Total: ${InterestService.fmt(daily.total)}
        </div>
        ${daily.collections.map(c => `
          <div class="report-stat">
            <div><div class="stat-name">${c.name}</div>${c.note ? `<div style="font-size:0.72rem;color:var(--text-muted);">${c.note}</div>` : ''}</div>
            <div class="stat-value" style="color:var(--success);">${InterestService.fmt(c.amount)}</div>
          </div>
        `).join('')}
      `;
    }
  }

  function _renderDueSoon() {
    const el = document.getElementById('dueSoonList');
    if (!el) return;
    const dueSoon = InterestService.getDueSoon(DB.getEntries(), 7);
    if (dueSoon.length === 0) {
      el.innerHTML = `<div class="empty-state" style="padding:24px;"><div class="empty-icon">✅</div><div class="empty-title">No loans due this week</div></div>`;
    } else {
      el.innerHTML = dueSoon.map(e => `
        <div class="card" style="margin-bottom:10px;cursor:pointer;" onclick="App.navigate('${e.customerId ? 'customer' : 'detail'}','${e.customerId || e.id}')">
          <div class="card-row">
            <div class="card-name">${e.name}</div>
            <span class="badge badge-warn">⏰ ${e.dueDate}</span>
          </div>
          <div class="card-row" style="margin-top:6px;">
            <span class="card-sub">${e.phone || '—'}</span>
            <span class="card-amount">${InterestService.fmt(InterestService.getBalance(e))}</span>
          </div>
        </div>
      `).join('');
    }
  }

  return { render, changeDate };
})();
