/* ================================================================
   DB — localStorage CRUD layer (Customers + Entries + Payments)
   ULTRA PRO ARCHITECTURE: Memory-First, Batch-Write, Zero-Lag
   ================================================================ */

const DB = (() => {
  const KEYS = {
    entries: 'TLP_entries',
    customers: 'TLP_customers',
    settings: 'TLP_settings',
    shop: 'TLP_shop',
    migrated: 'TLP_migrated_v2',
  };

  /* ── MEMORY-FIRST STORE ── */
  const Store = {
    customers: null,
    entries: null,
    settings: null,
    shop: null,
    migrated: null
  };

  let _flushTimer = null;

  /* ── BOOT ONCE ── */
  function _initStore() {
    function safeParse(key, fallback) {
      try {
        const item = localStorage.getItem(key);
        if (!item) return fallback;
        const parsed = JSON.parse(item);
        return parsed !== null ? parsed : fallback;
      } catch (e) {
        console.error(`[DB] Corrupt JSON in ${key}, resetting to fallback.`);
        return fallback;
      }
    }

    Store.customers = safeParse(KEYS.customers, []);
    Store.entries   = safeParse(KEYS.entries, []);
    Store.settings  = safeParse(KEYS.settings, { isHinduMode: true, notificationsEnabled: false });
    Store.shop      = safeParse(KEYS.shop, { name: '', phone: '', address: '' });
    Store.migrated  = safeParse(KEYS.migrated, false);
  }

  // Pre-load everything into memory synchronously ONLY on boot
  _initStore();

  /* ── BATCH WRITE (AUTO FLUSH) ── */
  function _scheduleFlush() {
    if (_flushTimer) return; // already scheduled
    _flushTimer = setTimeout(() => {
      _flushNow();
    }, 2000); // 2 second write throttle
  }

  function _flushNow() {
    clearTimeout(_flushTimer);
    _flushTimer = null;
    try {
      localStorage.setItem(KEYS.customers, JSON.stringify(Store.customers));
      localStorage.setItem(KEYS.entries,   JSON.stringify(Store.entries));
      localStorage.setItem(KEYS.settings,  JSON.stringify(Store.settings));
      localStorage.setItem(KEYS.shop,      JSON.stringify(Store.shop));
      localStorage.setItem(KEYS.migrated,  JSON.stringify(Store.migrated));
    } catch (e) {
      console.error("[DB] Flush failed:", e);
    }
  }

  /* ══════════════════════════════════════════════════════════════
     CUSTOMERS
     ══════════════════════════════════════════════════════════════ */
  function getCustomers() { return Store.customers; }
  
  function saveCustomers(customers) { 
    Store.customers = customers; 
    _scheduleFlush(); 
  }

  function addCustomer(customer) {
    const list = getCustomers();
    list.unshift(customer);
    saveCustomers(list);
    return customer;
  }

  function updateCustomer(updated) {
    const list = getCustomers().map(c => c.customerId === updated.customerId ? updated : c);
    saveCustomers(list);
    return updated;
  }

  function deleteCustomer(customerId) {
    saveCustomers(getCustomers().filter(c => c.customerId !== customerId));
    // Also delete all loans for this customer
    saveEntries(getEntries().filter(e => e.customerId !== customerId));
  }

  function getCustomer(customerId) {
    return getCustomers().find(c => c.customerId === customerId) || null;
  }

  function getOrCreateCustomer({ name, phone, address, photo }) {
    const nameLower = (name || '').trim().toLowerCase();
    const phoneTrim = (phone || '').trim();

    let existing = null;
    if (phoneTrim) {
      existing = getCustomers().find(c => c.phone === phoneTrim);
    }
    if (!existing && nameLower) {
      existing = getCustomers().find(c => c.name.toLowerCase() === nameLower);
    }

    if (existing) {
      let needsUpdate = false;
      if (address && !existing.address) { existing.address = address; needsUpdate = true; }
      if (photo && !existing.photo) { existing.photo = photo; needsUpdate = true; }
      if (needsUpdate) updateCustomer(existing);
      return existing;
    }

    const newCust = createCustomer({ name, phone, address, photo });
    addCustomer(newCust);
    return newCust;
  }

  function getCustomerLoans(customerId) {
    return getEntries().filter(e => e.customerId === customerId);
  }

  /* ══════════════════════════════════════════════════════════════
     ENTRIES (LOANS)
     ══════════════════════════════════════════════════════════════ */
  function getEntries() { return Store.entries; }
  
  function saveEntries(entries) { 
    Store.entries = entries; 
    _scheduleFlush(); 
  }

  function addEntry(entry) {
    const entries = getEntries();
    entries.unshift(entry);
    saveEntries(entries);
    return entry;
  }

  function updateEntry(updated) {
    const entries = getEntries().map(e => e.id === updated.id ? updated : e);
    saveEntries(entries);
    return updated;
  }

  function deleteEntry(id) {
    saveEntries(getEntries().filter(e => e.id !== id));
  }

  function getEntry(id) {
    return getEntries().find(e => e.id === id) || null;
  }

  /* ── PAYMENTS ── */
  function addPayment(entryId, payment) {
    const entry = getEntry(entryId);
    if (!entry) return null;
    entry.payments.push(payment);
    return updateEntry(entry);
  }

  function deletePayment(entryId, paymentId) {
    const entry = getEntry(entryId);
    if (!entry) return;
    entry.payments = entry.payments.filter(p => p.id !== paymentId);
    updateEntry(entry);
  }

  /* ── SETTINGS ── */
  function getSettings() {
    return Store.settings;
  }
  
  function saveSetting(key, value) {
    const s = getSettings();
    s[key] = value;
    Store.settings = s;
    _scheduleFlush();
  }
  
  function getSetting(key, fallback) {
    return getSettings()[key] ?? fallback;
  }

  /* ── SHOP ── */
  function getShop() {
    return Store.shop;
  }
  
  function saveShop(shop) {
    Store.shop = shop;
    _scheduleFlush();
  }

  /* ── SEARCH ── */
  function searchEntries(query) {
    if (!query) return getEntries();
    const q = query.toLowerCase();
    return getEntries().filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.phone.includes(q) ||
      e.address.toLowerCase().includes(q)
    );
  }

  function searchCustomers(query) {
    if (!query) return getCustomers();
    const q = query.toLowerCase();
    return getCustomers().filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.address || '').toLowerCase().includes(q)
    );
  }

  /* ══════════════════════════════════════════════════════════════
     DATA MIGRATION (v1 flat entries → v2 customers + entries)
     ══════════════════════════════════════════════════════════════ */
  function migrateIfNeeded() {
    if (Store.migrated) return; // already migrated

    const entries = getEntries();
    if (entries.length === 0) {
      Store.migrated = true;
      _scheduleFlush();
      return;
    }

    if (entries[0].customerId) {
      Store.migrated = true;
      _scheduleFlush();
      return;
    }

    console.log('[DB] Migrating data to v2 (customers + entries)…');

    const customerMap = {};
    entries.forEach(e => {
      const key = (e.name || '').trim().toLowerCase() + '|' + (e.phone || '').trim();
      if (!customerMap[key]) {
        customerMap[key] = createCustomer({
          name: e.name,
          phone: e.phone,
          address: e.address,
          photo: null,
        });
      }
    });

    const customers = Object.values(customerMap);
    saveCustomers(customers);

    const updatedEntries = entries.map(e => {
      const key = (e.name || '').trim().toLowerCase() + '|' + (e.phone || '').trim();
      const cust = customerMap[key];
      return { ...e, customerId: cust ? cust.customerId : null };
    });

    saveEntries(updatedEntries);
    Store.migrated = true;
    _scheduleFlush();
    console.log(`[DB] Migration complete: ${customers.length} customers, ${updatedEntries.length} loans linked.`);
  }

  function patchV3() {
    const V4_KEY = 'TLP_patched_v4';
    try {
      if (JSON.parse(localStorage.getItem(V4_KEY) || 'false')) return;
    } catch { }

    const entries = getEntries();
    let changed = 0;

    const patched = entries.map(e => {
      let u = { ...e };

      if (!Array.isArray(u.payments)) { u.payments = []; changed++; }

      if ((!u.ratePerMonth || u.ratePerMonth === 0) && u.interestRate) {
        u.ratePerMonth = parseFloat(u.interestRate) || 0;
        changed++;
      }

      if (!u.interestType)      { u.interestType      = 'compound';    changed++; }
      if (!u.compoundingMonths) { u.compoundingMonths = 1;             changed++; }
      if (!u.calculationMode)   { u.calculationMode   = 'fullMonths';  changed++; }

      const rate = u.ratePerMonth || 0;
      if ((!u.total || u.total === 0) && u.principal > 0 && rate > 0 && u.days > 0) {
        try {
          const c = typeof FinanceEngine !== 'undefined' ? FinanceEngine.calculateEntry(u) : null;
          if (c) {
             Object.assign(u, {
               total: c.total, interest: c.interest, rawAmount: c.rawAmount,
               annualRate: c.annualRate, timeYears: c.timeYears, timeInMonths: c.timeInMonths,
               compoundingLabel: c.compoundingLabel, compoundingPerYear: c.compoundingPerYear, mode: c.mode,
             });
             changed++;
          }
        } catch(err) {
          console.warn('[DB v4] Recalc failed for', u.id, err);
        }
      }

      return u;
    });

    saveEntries(patched);
    try { localStorage.setItem(V4_KEY, 'true'); } catch {}
    console.log(`[DB] v4 patch done: ${entries.length} entries, ${changed} fields fixed.`);
  }

  // Bind a beforeunload to ensure any pending flushes are written immediately
  window.addEventListener('beforeunload', () => {
    if (_flushTimer) _flushNow();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && _flushTimer) {
      _flushNow();
    }
  });

  return {
    getCustomers, saveCustomers, addCustomer, updateCustomer, deleteCustomer, getCustomer,
    getOrCreateCustomer, getCustomerLoans,
    getEntries, saveEntries, addEntry, updateEntry, deleteEntry, getEntry,
    addPayment, deletePayment,
    getSettings, saveSetting, getSetting,
    getShop, saveShop,
    searchEntries, searchCustomers,
    migrateIfNeeded, patchV3,
    _flushNow // Expose for testing/debugging
  };
})();
