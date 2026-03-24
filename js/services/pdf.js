/* ================================================================
   PDF SERVICE — A5 receipt (English UI, Hindi tithi only)
   ================================================================ */

const PDFService = (() => {

  function _buildDoc(entry, calcDateStr) {
    const { jsPDF } = window.jspdf;
    const doc     = new jsPDF({ format: 'a5', unit: 'mm', orientation: 'portrait' });
    const shop    = DB.getShop();
    const isHindu = DB.getSetting('isHinduMode', true);
    
    // Use the persisted calculated interest values
    const calcDate = calcDateStr || new Date().toISOString().split('T')[0];
    const calc     = InterestService.calculate(entry);
    const W       = 148;   // A5 width mm
    const MARGIN  = 12;
    let y         = MARGIN;

    /* ── helpers ── */
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

    /* ── SHOP HEADER ── */
    doc.setFillColor(62, 39, 35);
    doc.rect(0, 0, W, 28, 'F');
    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(240, 152, 64);
    doc.text(shop.name, W / 2, 12, { align: 'center' });
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(185, 166, 138);
    doc.text(shop.address, W / 2, 18, { align: 'center' });
    doc.text('Ph: ' + shop.phone, W / 2, 23, { align: 'center' });
    y = 32;

    line('LOAN RECEIPT', 11, 'bold', 'center', [212, 130, 26]);
    // Samvat year + Hindu month
    const samvatYear = TithiService.getSamvat(new Date(entry.loanDate));
    const hinduMonth = TithiService.getMaasFromGregorian(new Date(entry.loanDate));
    line(`Samvat ${samvatYear} | ${hinduMonth}`, 8, 'normal', 'center', [185, 166, 138]);
    hrule();

    /* ── CUSTOMER INFO ── (English labels, Hindi tithi date) ── */
    const ldt     = new Date(entry.loanDate);
    // Only date value is Hindi (tithi) in Hindu mode — label stays English
    const dateVal = isHindu
      ? `${TithiService.getShort(ldt)}\nमास: ${TithiService.getMonthText(TithiService.getShort(ldt))}`
      : TithiService.formatDate(ldt);

    const interestDisp = entry.interestType === 'compound'
      ? `${entry.interestRate}%/mo (Compound ${entry.compoundAfterMonths}m)`
      : `${entry.interestRate}%/mo (Simple)`;
      
    const calcDisp = entry.calculationMode === 'tithi'
      ? 'Actual Days (Tithi)'
      : 'Full Months';
      
    const dur = InterestService.getDuration(entry.loanDate, calcDate);
    const durationDisp = `${dur.text} (${dur.totalDays} Total)`;

    const rows = [
      ['Customer',      entry.name],
      ['Phone',         entry.phone    || '—'],
      ['Loan Date',     dateVal],          // ← Hindi tithi OR plain date
      ['Interest Rate', interestDisp],
      ['Calc Mode',     calcDisp],
      ['Duration',      durationDisp],
      ['Loan Amount',   InterestService.fmt(entry.principal)],
    ];

    rows.forEach(([label, val]) => {
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(180, 140, 100);
      doc.text(label + ':', MARGIN, y);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(240, 220, 200);
      doc.text(String(val), MARGIN + 36, y);
      y += 6;
    });

    space(2); hrule();

    /* ── PAYMENT HISTORY ── (English label, Hindi tithi dates) ── */
    line('Payments', 10, 'bold', 'left', [212, 130, 26]);

    if (entry.payments.length === 0) {
      line('  No partial payments in strict khata format.', 8, 'normal', 'left', [130, 100, 80]);
    } else {
      entry.payments.slice(-8).forEach(p => {
        // ... (remaining payments logic if any exist historically)
      });
    }

    space(2); hrule();

    /* ── TOTALS ── (English labels) ── */
    const totals = [
      ['Total Paid',     InterestService.fmt(calc.totalPaid),                   [102, 187, 106]],
      ['Total Interest', InterestService.fmt(calc.totalInterest),                [255, 167, 38]],
      ['Balance Due',    InterestService.fmt(Math.max(0, calc.balance)),         [239, 83,  80]],
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
    space(10);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(140, 110, 90);
    doc.line(MARGIN, y, MARGIN + 45, y);
    doc.line(W - MARGIN - 45, y, W - MARGIN, y);
    y += 4;
    doc.text('Customer Signature', MARGIN, y);
    doc.text('Authorised Signature', W - MARGIN, y, { align: 'right' });

    space(4);
    doc.setFontSize(7); doc.setTextColor(100, 80, 60);
    doc.text(shop.tagline || 'Thank you for your trust.', W / 2, y, { align: 'center' });

    return doc;
  }

  function generate(entry, calcDateStr) {
    const doc = _buildDoc(entry, calcDateStr);
    doc.save(`Receipt_${entry.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
  }

  async function generateBlob(entry, calcDateStr) {
    const doc = _buildDoc(entry, calcDateStr);
    return doc.output('blob');
  }

  return { generate, generateBlob };
})();
