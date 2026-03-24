/* ================================================================
   MODELS — Customer, Entry (Loan), Payment, Shop schemas
   ================================================================ */

/**
 * Customer
 * @typedef {Object} Customer
 * @property {string} customerId
 * @property {string} name
 * @property {string} phone
 * @property {string} address
 * @property {string|null} photo  - base64 data URL or null
 * @property {string} createdAt
 */

/**
 * Entry (Loan Record)
 * @typedef {Object} Entry
 * @property {string} id
 * @property {string} customerId  - links to Customer
 * @property {string} name        - Customer name (denormalized for display)
 * @property {string} phone
 * @property {string} address
 * @property {number} principal
 * @property {number} interestRate
 * @property {string} loanDate
 * @property {string} dueDate
 * @property {string} notes
 * @property {Payment[]} payments
 * @property {string} createdAt
 */

/**
 * Payment
 * @typedef {Object} Payment
 * @property {string} id
 * @property {number} amount
 * @property {string} date
 * @property {string} note
 */

/**
 * Shop
 * @typedef {Object} Shop
 * @property {string} name
 * @property {string} address
 * @property {string} phone
 * @property {string} tagline
 */

function createCustomer({ name, phone, address, photo } = {}) {
  return {
    customerId: 'C' + Date.now() + Math.floor(Math.random() * 1000),
    name: name || '',
    phone: phone || '',
    address: address || '',
    photo: photo || null,
    createdAt: new Date().toISOString(),
  };
}

function createEntry({ customerId, name, phone, address, principal, interestRate, loanDate, dueDate, notes, type, interestType, compoundingMonths, compoundFreq, calculationMode }) {

  // Derive canonical compoundFreq from compoundingMonths if not explicitly given
  const cm = parseInt(compoundingMonths) || 1;
  let _compoundFreq = compoundFreq;
  if (!_compoundFreq) {
    if (cm >= 12)     _compoundFreq = 'yearly';
    else if (cm >= 6) _compoundFreq = 'half-yearly';
    else if (cm >= 3) _compoundFreq = 'quarterly';
    else              _compoundFreq = 'monthly';
  }

  const _interestType = (interestType || 'compound').toLowerCase();

  return {
    id: 'L' + Date.now() + Math.floor(Math.random() * 1000),
    customerId: customerId || null,
    name: name || '',
    phone: phone || '',
    address: address || '',
    principal: parseFloat(principal) || 0,
    ratePerMonth: parseFloat(interestRate) || 0,

    // Legacy fields (kept for display / backwards compat)
    interestType: _interestType,
    compoundingMonths: cm,
    calculationMode: calculationMode || 'fullMonths',

    // NEW canonical fields — consumed directly by InterestEngine
    type: type || 'UDHAAR',       // loan direction: "UDHAAR" | "jama"
    compoundFreq: _compoundFreq,  // "monthly" | "quarterly" | "half-yearly" | "yearly"

    loanDate: loanDate || new Date().toISOString().split('T')[0],
    dueDate: dueDate || null,
    notes: notes || '',
    payments: [],

    // Strict 3-Layer state flags
    status: 'active',
    isClosed: false,

    // Values populated ONLY when loan is closed/settled
    settlementDate: null,
    finalDays: null,
    finalInterest: null,
    finalTotal: null,

    createdAt: new Date().toISOString(),
  };
}

function createPayment({ amount, date, note }) {
  return {
    id: 'P_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    amount: parseFloat(amount) || 0,
    date: date || new Date().toISOString().split('T')[0],
    note: note || '',
  };
}

function createShop({ name, address, phone, tagline } = {}) {
  return {
    name: name || 'Jain Finance',
    address: address || 'Tikrapara',
    phone: phone || '9876543210',
    tagline: tagline || 'Trusted Loan Management',
  };
}
