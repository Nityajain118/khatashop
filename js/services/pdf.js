/* ================================================================
   PDF SERVICE — Premium Invoice Engine v2
   ✔ A4 + A5 support
   ✔ Shop logo (base64) top-left
   ✔ Customer photo right-aligned
   ✔ Signature image bottom-right
   ✔ Full interest calculation (FinanceEngine)
   ✔ All loan entries for a customer in one invoice
   ✔ WhatsApp share helper
   ✔ Clean JSON export helper
   ✔ Backward-compat: existing generate() + generateBlob() unchanged
   ================================================================ */

const PDFService = (() => {

  /* ── Logo / Signature stored in localStorage ─────────────────── */
  const LS_LOGO = 'TLP_pdf_logo';
  const LS_SIG  = 'TLP_pdf_signature';
  const LS_SIZE = 'TLP_pdf_size';   // 'a4' or 'a5'

  function getLogo()       { try { return localStorage.getItem(LS_LOGO) || null; } catch { return null; } }
  function getSignature()  { try { return localStorage.getItem(LS_SIG)  || null; } catch { return null; } }
  function getPageSize()   { try { return localStorage.getItem(LS_SIZE) || 'a5'; } catch { return 'a5'; } }
  function saveLogo(b64)   { try { localStorage.setItem(LS_LOGO, b64); } catch {} }
  function saveSignature(b64){ try { localStorage.setItem(LS_SIG, b64); } catch {} }
  function savePageSize(s) { try { localStorage.setItem(LS_SIZE, s); } catch {} }
  function clearLogo()     { try { localStorage.removeItem(LS_LOGO); } catch {} }
  function clearSignature(){ try { localStorage.removeItem(LS_SIG); } catch {} }

  /* ── Page dimensions ─────────────────────────────────────────── */
  const DIMS = {
    a4: { W: 210, H: 297 },
    a5: { W: 148, H: 210 }
  };

  /* ═══════════════════════════════════════════════════════════════
     SINGLE-ENTRY RECEIPT (legacy — existing callers unchanged)
     ═══════════════════════════════════════════════════════════════ */
  function _buildDoc(entry, calcDateStr) {
    const { jsPDF }  = window.jspdf;
    const size       = getPageSize();
    const doc        = new jsPDF({ format: size, unit: 'mm', orientation: 'portrait' });
    const shop       = DB.getShop();
    const isHindu    = DB.getSetting('isHinduMode', true);
    const logo       = getLogo();
    const sigImg     = getSignature();
    const { W }      = DIMS[size] || DIMS.a5;
    const MARGIN     = 12;

    const calcDate = calcDateStr || new Date().toISOString().split('T')[0];
    const calc     = FinanceEngine.calculateEntry(entry, new Date(calcDate));

    let y = 0;

    /* helpers */
    function line(text, fontSize = 10, style = 'normal', align = 'left', color = [30, 15, 10]) {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', style);
      doc.setTextColor(...color);
      const x = align === 'center' ? W / 2 : align === 'right' ? W - MARGIN : MARGIN;
      doc.text(text, x, y, { align });
      y += fontSize * 0.5 + 1.5;
    }

    function hrule(r = 80, g = 60, b = 40) {
      doc.setDrawColor(r, g, b);
      doc.setLineWidth(0.3);
      doc.line(MARGIN, y, W - MARGIN, y);
      y += 4;
    }

    function space(mm = 4) { y += mm; }

    /* ── HEADER BAND ── */
    doc.setFillColor(62, 39, 35);
    doc.rect(0, 0, W, 28, 'F');

    /* Logo top-left inside band */
    if (logo) {
      try { doc.addImage(logo, 'PNG', 3, 3, 20, 20); } catch {}
    }

    const nameX = logo ? 28 : W / 2;
    const nameAlign = logo ? 'left' : 'center';

    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(240, 152, 64);
    doc.text(shop.name || 'My Shop', nameX, 12, { align: nameAlign });
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(185, 166, 138);
    doc.text(shop.address || '', nameX, 18, { align: nameAlign });
    doc.text('Ph: ' + (shop.phone || '—'), nameX, 23, { align: nameAlign });
    y = 32;

    line('LOAN RECEIPT', 11, 'bold', 'center', [212, 130, 26]);
    const samvatYear = TithiService.getSamvat(new Date(entry.loanDate));
    const hinduMonth = TithiService.getMaasFromGregorian(new Date(entry.loanDate));
    line(`Samvat ${samvatYear} | ${hinduMonth}`, 8, 'normal', 'center', [185, 166, 138]);
    hrule();

    /* ── CUSTOMER INFO ── */
    const ldt      = new Date(entry.loanDate);
    const dateVal  = isHindu ? TithiService.getShort(ldt) : TithiService.formatDate(ldt);
    const intDisp  = entry.interestType === 'compound'
      ? `${entry.interestRate}%/mo (Compound)`
      : `${entry.interestRate}%/mo (Simple)`;
    const modeDisp = entry.calculationMode === 'actualDays' ? 'Actual Days' : 'Full Months';

    /* Customer photo right-side */
    const photoY = y;
    if (entry.photo) {
      try { doc.addImage(entry.photo, 'JPEG', W - MARGIN - 28, photoY, 27, 27); } catch {}
    }

    const rows = [
      ['Customer',    entry.name],
      ['Phone',       entry.phone    || '—'],
      ['Loan Date',   dateVal],
      ['Rate',        intDisp],
      ['Mode',        modeDisp],
      ['Principal',   InterestService.fmt(entry.principal)],
    ];
    rows.forEach(([label, val]) => {
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(180, 140, 100);
      doc.text(label + ':', MARGIN, y);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(240, 220, 200);
      doc.text(String(val), MARGIN + 34, y);
      y += 6;
    });

    space(2); hrule();

    /* ── FINANCIALS ── */
    const totals = [
      ['Duration',     `${calc.days} days (${calc.timeInMonths.toFixed(1)} mo)`, [200, 180, 160]],
      ['Interest',     InterestService.fmt(calc.interest),                       [255, 167, 38]],
      ['Total Due',    InterestService.fmt(calc.total),                          [239, 83, 80]],
    ];
    totals.forEach(([l, v, c]) => {
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(200, 180, 160);
      doc.text(l + ':', MARGIN, y);
      doc.setTextColor(...c);
      doc.text(v, W - MARGIN, y, { align: 'right' });
      y += 7;
    });

    space(2); hrule();

    /* ── SIGNATURE ── */
    space(8);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(140, 110, 90);
    doc.line(MARGIN, y, MARGIN + 40, y);
    if (sigImg) {
      try { doc.addImage(sigImg, 'PNG', W - MARGIN - 40, y - 12, 40, 14); } catch {}
    }
    doc.line(W - MARGIN - 40, y, W - MARGIN, y);
    y += 4;
    doc.text('Customer Signature', MARGIN, y);
    doc.text('Authorised Signature', W - MARGIN, y, { align: 'right' });

    space(4);
    doc.setFontSize(7); doc.setTextColor(100, 80, 60);
    doc.text(shop.tagline || 'Thank you for your trust.', W / 2, y, { align: 'center' });

    return doc;
  }

  /* ═══════════════════════════════════════════════════════════════
     FULL CUSTOMER INVOICE (all loans for one customer)
     ═══════════════════════════════════════════════════════════════ */
  function _buildInvoice(customer, entries, options = {}) {
    const { jsPDF } = window.jspdf;
    const size      = options.pageSize || getPageSize();
    const logo      = options.logo      !== undefined ? options.logo      : getLogo();
    const sigImg    = options.signature !== undefined ? options.signature : getSignature();
    const { W, H }  = DIMS[size] || DIMS.a4;
    const MARGIN    = 12;
    const RMARGIN   = W - MARGIN;
    const today     = new Date();
    const shop      = DB.getShop();

    const doc = new jsPDF({ format: size, unit: 'mm', orientation: 'portrait' });

    /* ── colour palette ── */
    const COL = {
      headerBg : [30, 22, 18],
      gold     : [212, 160, 30],
      goldLight: [240, 200, 100],
      amber    : [255, 167, 38],
      slate    : [180, 160, 140],
      muted    : [120, 100, 85],
      white    : [240, 230, 220],
      danger   : [220, 80, 70],
      success  : [80, 180, 100],
      border   : [80, 65, 50],
    };

    let y    = 0;
    let page = 1;

    /* ── helpers ── */
    const setColor  = (c) => doc.setTextColor(...c);
    const setFill   = (c) => doc.setFillColor(...c);
    const setDraw   = (c) => doc.setDrawColor(...c);

    function txt(text, x, yy, opts = {}) {
      doc.text(String(text), x, yy, opts);
    }

    function newPage() {
      doc.addPage();
      page++;
      y = MARGIN;
      _pageHeader();
    }

    function checkPage(needed = 30) {
      if (y + needed > H - 20) newPage();
    }

    function hline(col = COL.border, lw = 0.25) {
      setDraw(col);
      doc.setLineWidth(lw);
      doc.line(MARGIN, y, RMARGIN, y);
    }

    function _pageHeader() {
      /* gold top stripe */
      setFill(COL.headerBg);
      doc.rect(0, 0, W, 26, 'F');
      setFill(COL.gold);
      doc.rect(0, 24.5, W, 1.5, 'F');

      /* logo */
      if (logo) {
        try { doc.addImage(logo, 'PNG', 3, 3, 18, 18); } catch {}
      }
      const hx = logo ? 26 : W / 2;
      const ha = logo ? 'left' : 'center';

      doc.setFontSize(15); doc.setFont('helvetica', 'bold');
      setColor(COL.gold);
      txt(shop.name || 'My Shop', hx, 11, { align: ha });

      doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
      setColor(COL.slate);
      txt((shop.address || '') + '  |  Ph: ' + (shop.phone || '—'), hx, 17, { align: ha });

      /* page number right */
      doc.setFontSize(7);
      setColor(COL.muted);
      txt(`Page ${page}`, RMARGIN, 17, { align: 'right' });

      y = 30;
    }

    /* ── PAGE 1 HEADER ── */
    _pageHeader();

    /* ── INVOICE TITLE BLOCK ── */
    doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    setColor(COL.goldLight);
    txt('CUSTOMER LEDGER INVOICE', W / 2, y + 6, { align: 'center' });
    y += 10;

    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    setColor(COL.muted);
    const dateStr = today.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const tithiStr = TithiService.getShort(today);
    txt(`Date: ${dateStr}  |  ${tithiStr}`, W / 2, y + 4, { align: 'center' });
    y += 10;

    hline(COL.gold, 0.5); y += 5;

    /* ── CUSTOMER BLOCK ── */
    setFill([40, 30, 22]);
    doc.rect(MARGIN, y, W - 2*MARGIN, 22, 'F');

    /* customer photo */
    if (customer.photo) {
      try { doc.addImage(customer.photo, 'JPEG', RMARGIN - 22, y + 2, 18, 18); } catch {}
    }

    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    setColor(COL.goldLight);
    txt(customer.name || '—', MARGIN + 4, y + 8);

    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
    setColor(COL.slate);
    txt('📱 ' + (customer.phone || '—') + '   📍 ' + (customer.address || '—'), MARGIN + 4, y + 16);
    y += 26;

    /* ── ENTRY TABLE ── */
    let grandPrincipal = 0, grandInterest = 0, grandTotal = 0;

    /* table header */
    const COL_X = [MARGIN, MARGIN+38, MARGIN+68, MARGIN+90, MARGIN+115, MARGIN+133];
    const HDRS  = ['Loan Date', 'Rate & Type', 'Duration', 'Principal', 'Interest', 'Total Due'];

    setFill([55, 40, 28]);
    doc.rect(MARGIN, y, W - 2*MARGIN, 8, 'F');
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
    setColor(COL.amber);
    HDRS.forEach((h, i) => txt(h, COL_X[i] + 1, y + 5.5));
    y += 10;

    hline(COL.border, 0.2);

    entries.forEach((entry, idx) => {
      checkPage(22);

      const calc   = FinanceEngine.calculateEntry(entry, today);
      const lDate  = new Date(entry.loanDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'2-digit' });
      const rateStr = `${entry.interestRate}%/${entry.interestType === 'simple' ? 'SI' : 'CI'}`;
      const durStr = `${calc.days}d`;

      grandPrincipal += Number(entry.principal) || 0;
      grandInterest  += calc.interest || 0;
      grandTotal     += calc.total    || 0;

      /* zebra rows */
      if (idx % 2 === 0) {
        setFill([38, 28, 20]);
        doc.rect(MARGIN, y - 1, W - 2*MARGIN, 9, 'F');
      }

      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      setColor(COL.white);
      txt(lDate,               COL_X[0] + 1, y + 5.5);
      setColor(COL.slate);
      txt(rateStr,             COL_X[1] + 1, y + 5.5);
      txt(durStr,              COL_X[2] + 1, y + 5.5);
      setColor(COL.white);
      txt(InterestService.fmt(entry.principal), COL_X[3] + 1, y + 5.5);
      setColor(COL.amber);
      txt(InterestService.fmt(calc.interest),   COL_X[4] + 1, y + 5.5);
      setColor(COL.danger);
      txt(InterestService.fmt(calc.total),      COL_X[5] + 1, y + 5.5);

      y += 9;
      hline(COL.border, 0.15);
    });

    /* ── GRAND TOTAL BAR ── */
    y += 3;
    checkPage(24);

    setFill([62, 39, 35]);
    doc.rect(MARGIN, y, W - 2*MARGIN, 14, 'F');
    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    setColor(COL.amber);
    txt('GRAND TOTAL', MARGIN + 4, y + 9);
    setColor(COL.white);
    txt(InterestService.fmt(grandPrincipal), COL_X[3] + 1, y + 9);
    setColor(COL.amber);
    txt(InterestService.fmt(grandInterest),  COL_X[4] + 1, y + 9);

    doc.setFontSize(11);
    setColor(COL.gold);
    txt(InterestService.fmt(grandTotal), COL_X[5] + 1, y + 9);
    y += 18;

    /* ── SUMMARY BOX ── */
    checkPage(30);
    setDraw(COL.gold); doc.setLineWidth(0.4);
    doc.rect(MARGIN, y, W - 2*MARGIN, 24);
    doc.setFontSize(8.5); setColor(COL.muted);
    doc.setFont('helvetica', 'normal');
    txt('Net Principal Outstanding:', MARGIN + 4, y + 8);
    txt('Total Interest Accrued:',   MARGIN + 4, y + 15);
    txt('Total Amount Payable:',      MARGIN + 4, y + 22);
    doc.setFont('helvetica', 'bold');
    setColor(COL.white);   txt(InterestService.fmt(grandPrincipal), RMARGIN - 4, y + 8,  { align:'right' });
    setColor(COL.amber);   txt(InterestService.fmt(grandInterest),  RMARGIN - 4, y + 15, { align:'right' });
    doc.setFontSize(11);
    setColor(COL.gold);    txt(InterestService.fmt(grandTotal),     RMARGIN - 4, y + 22, { align:'right' });
    y += 30;

    /* ── SIGNATURE BLOCK ── */
    checkPage(36);
    y += 6;
    doc.setLineWidth(0.3); setDraw(COL.muted);
    doc.line(MARGIN, y + 16, MARGIN + 42, y + 16);
    doc.line(RMARGIN - 42, y + 16, RMARGIN, y + 16);

    if (sigImg) {
      try { doc.addImage(sigImg, 'PNG', RMARGIN - 42, y, 42, 14); } catch {}
    }

    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); setColor(COL.muted);
    txt('Customer Signature', MARGIN, y + 20);
    txt('Authorised Signature', RMARGIN, y + 20, { align: 'right' });

    y += 26;
    doc.setFontSize(7); setColor([85, 68, 55]);
    txt(shop.tagline || 'Thank you for your trust.', W / 2, y, { align: 'center' });

    return { doc, grandPrincipal, grandInterest, grandTotal };
  }

  /* ═══════════════════════════════════════════════════════════════
     PUBLIC — SINGLE RECEIPT (backward-compat)
     ═══════════════════════════════════════════════════════════════ */
  function generate(entry, calcDateStr) {
    const doc = _buildDoc(entry, calcDateStr);
    doc.save(`Receipt_${(entry.name || 'entry').replace(/\s+/g, '_')}_${Date.now()}.pdf`);
  }

  async function generateBlob(entry, calcDateStr) {
    return _buildDoc(entry, calcDateStr).output('blob');
  }

  /* ═══════════════════════════════════════════════════════════════
     PUBLIC — FULL CUSTOMER INVOICE
     ═══════════════════════════════════════════════════════════════ */
  function generateInvoice(customerId, options = {}) {
    const customer = DB.getCustomer(customerId);
    if (!customer) { Toast.show('❌ Customer not found'); return; }
    const entries = DB.getCustomerLoans(customerId).filter(e => e.type !== 'jama');
    if (!entries.length) { Toast.show('⚠️ No loan entries found'); return; }

    const { doc } = _buildInvoice(customer, entries, options);
    doc.save(`Invoice_${(customer.name || 'customer').replace(/\s+/g, '_')}_${Date.now()}.pdf`);
    Toast.show('✅ Invoice downloaded!');
  }

  async function generateInvoiceBlob(customerId, options = {}) {
    const customer = DB.getCustomer(customerId);
    const entries  = DB.getCustomerLoans(customerId).filter(e => e.type !== 'jama');
    const { doc }  = _buildInvoice(customer, entries, options);
    return doc.output('blob');
  }

  /* ═══════════════════════════════════════════════════════════════
     PUBLIC — WHATSAPP SHARE
     ═══════════════════════════════════════════════════════════════ */
  function shareInvoiceWhatsApp(customerId) {
    const customer = DB.getCustomer(customerId);
    const entries  = DB.getCustomerLoans(customerId).filter(e => e.type !== 'jama');
    const today    = new Date();
    const shop     = DB.getShop();
    const tithiStr = TithiService.getShort(today);
    const dateStr  = today.toLocaleDateString('en-IN');

    let grandTotal = 0, grandPrin = 0, grandInt = 0;
    entries.forEach(e => {
      const c = FinanceEngine.calculateEntry(e, today);
      grandPrin  += Number(e.principal) || 0;
      grandInt   += c.interest || 0;
      grandTotal += c.total    || 0;
    });

    /* Also trigger PDF download so user can share manually */
    generateInvoice(customerId);

    const msg = [
      `🧾 *INVOICE — ${customer?.name || 'Customer'}*`,
      `📅 ${dateStr}  |  🌙 ${tithiStr}`,
      `🏪 ${shop.name || 'Finance'}`,
      `━━━━━━━━━━━━━━━━━━`,
      `📌 Net Principal : ${InterestService.fmt(grandPrin)}`,
      `⚡ Interest       : ${InterestService.fmt(grandInt)}`,
      `━━━━━━━━━━━━━━━━━━`,
      `💰 *Total Payable: ${InterestService.fmt(grandTotal)}*`,
      ``,
      `(PDF invoice has been downloaded — please share it manually)`
    ].join('\n');

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  }

  /* ═══════════════════════════════════════════════════════════════
     PUBLIC — CLEAN JSON EXPORT (human-readable)
     ═══════════════════════════════════════════════════════════════ */
  function exportCleanJSON(customerId) {
    const customer = DB.getCustomer(customerId);
    const entries  = DB.getCustomerLoans(customerId).filter(e => e.type !== 'jama');
    const today    = new Date();

    const rows = entries.map(e => {
      const c = FinanceEngine.calculateEntry(e, today);
      return {
        'Customer'    : e.name,
        'Phone'       : e.phone || '—',
        'Loan Date'   : new Date(e.loanDate).toLocaleDateString('en-IN'),
        'Principal'   : `₹${e.principal}`,
        'Rate'        : `${e.interestRate}% / month`,
        'Type'        : e.interestType === 'simple' ? 'Simple' : 'Compound',
        'Days'        : c.days,
        'Interest'    : InterestService.fmt(c.interest),
        'Total Due'   : InterestService.fmt(c.total),
      };
    });

    const json = JSON.stringify({ customer: customer?.name, generatedOn: new Date().toISOString(), entries: rows }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `Statement_${(customer?.name || 'customer').replace(/\s+/g, '_')}_${Date.now()}.json`;
    a.click();
    Toast.show('📤 Statement exported!');
  }

  /* ─── Settings helpers (called from SettingsScreen) ─────────── */
  return {
    generate,
    generateBlob,
    generateInvoice,
    generateInvoiceBlob,
    shareInvoiceWhatsApp,
    exportCleanJSON,
    getLogo, getSignature, getPageSize,
    saveLogo, saveSignature, savePageSize,
    clearLogo, clearSignature,
  };
})();
