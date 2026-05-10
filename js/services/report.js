/* ================================================================
   REPORT SERVICE — Daily collection & overall stats
   ================================================================ */

const ReportService = (() => {

  function getDailyCollection(date = new Date()) {
    const entries = FirmManager.filterEntries(DB.getEntries());
    const target  = date.toISOString().split('T')[0];
    let total = 0;
    const collections = [];

    entries.forEach(e => {
      (e.payments || []).forEach(p => {
        if (p.date === target) {
          total += p.amount;
          collections.push({ name: e.name, phone: e.phone, amount: p.amount, note: p.note });
        }
      });
    });

    return { date: target, total, collections };
  }

  function getMonthlyCollection(year = new Date().getFullYear(), month = new Date().getMonth()) {
    const entries = FirmManager.filterEntries(DB.getEntries());
    let total = 0;
    entries.forEach(e => {
      (e.payments || []).forEach(p => {
        const d = new Date(p.date);
        if (d.getFullYear() === year && d.getMonth() === month) total += p.amount;
      });
    });
    return total;
  }

  function getOverallStats() {
    const entries = FirmManager.filterEntries(DB.getEntries());
    
    let totalPrincipal = 0, totalInterest = 0, totalPaid = 0;
    let overdueCount = 0, paidCount = 0, activeCount = 0;

    const totals = FinanceEngine.calculateTotals(entries);
    const totalBalance = totals.netPayable; // Exact Udhaar - Jama value

    entries.forEach(e => {
       const isUdhaar = (!e.type || e.type.toUpperCase() === 'UDHAAR');
       
       let eTotalInterest = 0;
       if (e.status === 'closed') {
         eTotalInterest = e.finalInterest || e.interest || 0;
       } else {
         eTotalInterest = FinanceEngine.calculateEntry(e, new Date()).interest || 0;
       }

       if (isUdhaar) {
          totalPrincipal += (e.principal || 0);
          totalInterest += eTotalInterest;
       } else {
          totalPrincipal -= (e.principal || 0);
          totalInterest -= eTotalInterest;
       }
       if (InterestService.isPaid(e))      paidCount++;
       else if (InterestService.isOverdue(e)) overdueCount++;
       else activeCount++;
    });

    return {
      totalEntries: entries.length,
      totalCustomers: FirmManager.filterCustomers(DB.getCustomers()).length,
      totalPrincipal, totalBalance, totalInterest, totalPaid,
      overdueCount, paidCount, activeCount,
    };
  }

  function getWeeklyData() {
    const entries = FirmManager.filterEntries(DB.getEntries());
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      let total = 0;
      entries.forEach(e => {
        (e.payments || []).forEach(p => { if (p.date === key) total += p.amount; });
      });
      days.push({ date: key, total, label: d.toLocaleDateString('en-IN', { weekday: 'short' }) });
    }
    return days;
  }

  return { getDailyCollection, getMonthlyCollection, getOverallStats, getWeeklyData };
})();
