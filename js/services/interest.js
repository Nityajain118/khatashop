/* ================================================================
   INTEREST SERVICE — Proxy to Persisted Storage
   ================================================================ */

const InterestService = (() => {

  /** Format INR */
  function fmt(n) {
    return "₹" + Number(n).toLocaleString("en-IN");
  }

  /**
   * Return live balance/interest for active loans, or stored for closed
   */
  function calculate(entry) {
    let totalPaid = 0;
    if (entry.payments && Array.isArray(entry.payments)) {
      totalPaid = entry.payments.reduce((sum, p) => sum + p.amount, 0);
    }
    if (entry.status === 'closed') {
      return {
        balance: Math.max(0, (entry.finalTotal || entry.total || 0) - totalPaid),
        totalInterest: entry.finalInterest || entry.interest || 0,
        totalPaid: totalPaid,
      };
    }
    // Live calculation for ACTIVE loans
    const live = FinanceEngine.calculateEntry(entry, new Date());
    return {
      balance: Math.max(0, (live.total || 0) - totalPaid),
      totalInterest: live.interest || 0,
      totalPaid: totalPaid,
    };
  }

  /** Quick balance */
  function getBalance(entry) {
    let totalPaid = 0;
    if (entry.payments && Array.isArray(entry.payments)) {
      totalPaid = entry.payments.reduce((sum, p) => sum + p.amount, 0);
    }
    if (entry.status === 'closed') return Math.max(0, (entry.finalTotal || entry.total || 0) - totalPaid);
    return Math.max(0, (FinanceEngine.calculateEntry(entry, new Date()).total || 0) - totalPaid);
  }

  /** Is entry fully paid? */
  function isPaid(entry) {
    return getBalance(entry) <= 0;
  }

  /** Is entry overdue? */
  function isOverdue(entry) {
    if (!entry.dueDate) return false;
    return new Date(entry.dueDate) < new Date();
  }

  /** Entries due within N days */
  function getDueSoon(entries, days = 7) {
    const now = new Date();
    const limit = new Date(now.getTime() + days * 24 * 3600 * 1000);
    return entries.filter(e => {
      if (!e.dueDate) return false;
      const d = new Date(e.dueDate);
      return d >= now && d <= limit;
    });
  }

  /** Duration details */
  function getDuration(fromDate, toDate) {
    const f = typeof fromDate === 'string' ? new Date(fromDate) : fromDate;
    const t = typeof toDate === 'string' ? new Date(toDate) : toDate;

    // Fixed math matching calculateLoan
    const totalDays = Math.max(0, Math.floor((t - f) / (1000 * 60 * 60 * 24)));
    const totalMonths = totalDays / 30;
    const fullMonths = Math.floor(totalMonths);
    const extraDays = totalDays % 30;
    
    const text = (fullMonths === 0 && extraDays === 0) ? "Same Day" : `${fullMonths} Months ${extraDays} Days`;

    return { totalDays, months: fullMonths, extraDays, text };
  }

  /** Count full months */
  function monthsBetween(from, to) {
    const f = typeof from === 'string' ? new Date(from) : from;
    const t = typeof to === 'string' ? new Date(to) : to;
    return Math.max(0, (t.getFullYear() - f.getFullYear()) * 12 + (t.getMonth() - f.getMonth()));
  }

  return {
    getBalance, isPaid, isOverdue, getDueSoon,
    monthsBetween, getDuration,
    calculate,
    fmt,
  };
})();
