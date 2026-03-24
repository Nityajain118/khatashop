/* =========================================================
   BANK-GRADE INTEREST ENGINE  —  FINAL MASTER FIX v2
   =========================================================
   ✔ SINGLE SOURCE OF TRUTH (no hidden logic anywhere)
   ✔ SIMPLE & COMPOUND INTEREST CORRECT
   ✔ MONTHLY / QUARTERLY / HALF-YEARLY / YEARLY SUPPORTED
   ✔ calculationMode HONOURED  (fullMonths vs actualDays)
   ✔ ratePerMonth + interestRate BOTH ACCEPTED (compat)
   ✔ NO intermediate rounding — only final values rounded
   ✔ NO stale cache — every call is live
   ✔ SINGLE formula used by Preview AND final saved value
   ========================================================= */

const InterestEngine = (() => {

  /* =========================================================
     CONSTANTS  —  Change ONLY here, nowhere else in the app
     ========================================================= */
  const DAYS_IN_MONTH = 30;
  const DAYS_IN_YEAR  = 365;

  /* =========================================================
     UTILS
     ========================================================= */
  function num(v) {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  }

  /** Final-value rounding only — never for intermediates */
  function round(v) {
    return Math.round((v + Number.EPSILON) * 100) / 100;
  }

  /* =========================================================
     FIELD RESOLVER
     Maps both new canonical fields AND legacy field names.
     Priority: type/compoundFreq  >  interestType/compoundingMonths
     ========================================================= */
  function _resolveParams(entry) {
    // ── Interest type ──────────────────────────────────────
    let type;
    if (entry.type === 'simple' || entry.type === 'compound') {
      type = entry.type;
    } else {
      const raw = (entry.interestType || 'compound').toLowerCase();
      type = raw === 'simple' ? 'simple' : 'compound';
    }

    // ── Compounding frequency ──────────────────────────────
    let compoundFreq = entry.compoundFreq || 'monthly';          // new field
    if (!entry.compoundFreq) {
      const cm = num(entry.compoundingMonths) || 1;              // legacy field
      if      (cm >= 12) compoundFreq = 'yearly';
      else if (cm >= 6)  compoundFreq = 'half-yearly';
      else if (cm >= 3)  compoundFreq = 'quarterly';
      else               compoundFreq = 'monthly';
    }

    // ── Monthly rate ───────────────────────────────────────
    // addEntry saves as "interestRate"; engine previously expected "ratePerMonth"
    const monthlyRate = num(entry.ratePerMonth || entry.interestRate || 0);

    // ── Calculation mode ───────────────────────────────────
    // "fullMonths"  → t = (days / 30) / 12   (banking approximation)
    // "actualDays"  → t = days / 365          (high precision)
    const calculationMode = entry.calculationMode || 'fullMonths';

    return { type, compoundFreq, monthlyRate, calculationMode };
  }

  /* =========================================================
     CORE CALCULATION
     All intermediates kept full-precision; only `amount` is
     rounded at the very end.

     Parameters
     ----------
     principal    : number
     monthlyRate  : number   (raw percent, e.g. 2  = 2% / month)
     timeYears    : number   (already resolved from days + mode)
     type         : 'simple' | 'compound'
     compoundFreq : 'monthly' | 'quarterly' | 'half-yearly' | 'yearly'
     ========================================================= */
  function calculate({ principal, monthlyRate, timeYears, type, compoundFreq }) {
    const P = num(principal);
    const r = (num(monthlyRate) * 12) / 100;   // annual rate (decimal)
    const t = num(timeYears);

    if (P <= 0 || r <= 0 || t <= 0) {
      return { principal: P, finalAmount: P, interest: 0, type };
    }

    let amount;

    if (type === 'simple') {
      // SI = P × r × t   (r already annual)
      amount = P * (1 + r * t);

    } else {
      // Compounding frequency
      let n = 12; // default monthly
      if      (compoundFreq === 'quarterly')    n = 4;
      else if (compoundFreq === 'half-yearly')  n = 2;
      else if (compoundFreq === 'yearly')       n = 1;

      // CI = P × (1 + r/n)^(n×t)
      amount = P * Math.pow(1 + r / n, n * t);
    }

    const finalAmount = round(amount);

    return {
      principal: P,
      type,
      compoundFreq: type === 'compound' ? (compoundFreq || 'monthly') : null,
      finalAmount,
      interest: round(finalAmount - P),
    };
  }

  /* =========================================================
     ENTRY CALCULATION  —  the single public workhorse
     Accepts entries with either new or legacy field formats.
     Used identically by: Preview,  Live Detail,  Settlement.
     ========================================================= */
  function calculateEntry(entry, targetDate = new Date()) {
    const d1 = new Date(entry.loanDate);
    const d2 = new Date(targetDate);

    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);

    const days = Math.max(0, Math.floor((d2 - d1) / 86400000));

    const { type, compoundFreq, monthlyRate, calculationMode } = _resolveParams(entry);

    // ── Time in years (mode-aware, no rounding) ──────────
    let timeYears;
    if (calculationMode === 'actualDays') {
      timeYears = days / DAYS_IN_YEAR;
    } else {
      // fullMonths: months = days/30, years = months/12
      timeYears = (days / DAYS_IN_MONTH) / 12;
    }

    const timeInMonths = timeYears * 12;  // derived consistently

    const result = calculate({ principal: entry.principal, monthlyRate, timeYears, type, compoundFreq });

    return {
      ...entry,
      days,
      calculationMode,
      type,
      compoundFreq      : result.compoundFreq,
      calculationMode   : type === 'simple' ? 'SIMPLE' : 'COMPOUND',    // label
      total             : result.finalAmount,
      rawAmount         : result.finalAmount,
      interest          : result.interest,
      annualRate        : Number((monthlyRate * 12).toFixed(4)),
      timeYears         : Number(timeYears.toFixed(6)),
      timeInMonths      : Number(timeInMonths.toFixed(4)),
    };
  }

  /* =========================================================
     TOTALS  —  used on Home, Detail, Report screens
     ========================================================= */
  function calculateTotals(entries) {
    let udhaar = 0;
    let jama   = 0;
    const today = new Date();

    for (const e of entries) {
      let value = 0;

      if (e.status === 'closed') {
        value = Number(e.finalTotal || e.total || e.rawAmount || e.principal || 0);
      } else {
        value = calculateEntry(e, today).total;
      }

      // Entry type: 'UDHAAR' / undefined = money given out
      //             'jama' / 'JAMA'      = money received
      const isUdhaar = (!e.type || String(e.type).toUpperCase() === 'UDHAAR');

      if (isUdhaar) udhaar += value;
      else          jama   += value;
    }

    return {
      udhaarTotal : round(udhaar),
      jamaTotal   : round(jama),
      netPayable  : round(udhaar - jama),
    };
  }

  /* =========================================================
     CACHE RESET STUBS  —  kept so existing callers don't break
     (cache is intentionally removed; these are no-ops)
     ========================================================= */
  function resetCacheAndRecalculate() { return Date.now(); }
  function getCacheVersion()          { return Date.now(); }

  return {
    calculate,
    calculateEntry,
    calculateTotals,
    resetCacheAndRecalculate,
    getCacheVersion,
    // Expose constants for any screen that needs them
    DAYS_IN_MONTH,
    DAYS_IN_YEAR,
  };

})();

/* =========================================================
   BACKWARDS-COMPAT ALIAS
   Every existing caller using "FinanceEngine.*" keeps
   working with zero changes.
   ========================================================= */
const FinanceEngine = InterestEngine;
