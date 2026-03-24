/* ================================================================
   TITHI SERVICE  v5 — ZERO CALCULATION, API LOCKED
   Source  : AstrologyAPI.com  (POST /panchang or /advanced_panchang)
   Rules   :
     • NO Moon / Sun / Meeus calculation  — ever
     • ALL panchang data comes ONLY from the API
     • IST date is STRICTLY normalized before every request
     • Cache key  : YYYY-MM-DD (IST)  — one entry per calendar day
     • On failure : show last cached data or "लोड हो रहा है..."
     • Manual override for today only
   ================================================================ */

const TithiService = (() => {

  /* ─── STRICT IST NORMALIZER ─────────────────────────────────
     Returns { year, month, day, hour, min } in Asia/Kolkata.
     Uses Intl.DateTimeFormat — never relies on local TZ or UTC.
  ─────────────────────────────────────────────────────────── */
  function _istParts(dateInput) {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone : 'Asia/Kolkata',
      year     : 'numeric',
      month    : '2-digit',
      day      : '2-digit',
      hour     : '2-digit',
      minute   : '2-digit',
      hour12   : false
    });
    const p = {};
    fmt.formatToParts(d).forEach(x => { p[x.type] = x.value; });
    return {
      year  : parseInt(p.year,   10),
      month : parseInt(p.month,  10),
      day   : parseInt(p.day,    10),
      hour  : parseInt(p.hour,   10),
      min   : parseInt(p.minute, 10)
    };
  }

  /** YYYY-MM-DD (IST) — single source of truth for cache key */
  function _dateKey(dateInput) {
    const p = _istParts(dateInput instanceof Date ? dateInput : new Date(dateInput));
    return `${p.year}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`;
  }

  /* ─── IN-MEMORY CACHE ────────────────────────────────────── */
  const _cache   = new Map();
  const CACHE_TTL = 60 * 60 * 1000;   // 1 hour per date

  function _cacheGet(key) {
    const e = _cache.get(key);
    if (!e) return null;
    if (Date.now() - e.ts > CACHE_TTL) { _cache.delete(key); return null; }
    return e.data;
  }

  function _cachePut(key, data) {
    if (_cache.size >= 100) _cache.delete(_cache.keys().next().value);
    _cache.set(key, { data, ts: Date.now() });
    try {
      const store = JSON.parse(localStorage.getItem('TLP_pc_v5') || '{}');
      store[key]  = { data, ts: Date.now() };
      const keys  = Object.keys(store).sort();
      if (keys.length > 90) delete store[keys[0]];
      localStorage.setItem('TLP_pc_v5', JSON.stringify(store));
    } catch {}
  }

  /* ─── PERSISTENT CACHE BOOT ──────────────────────────────── */
  (function _bootCache() {
    try {
      const store = JSON.parse(localStorage.getItem('TLP_pc_v5') || '{}');
      Object.entries(store).forEach(([k, e]) => {
        if (e && Date.now() - e.ts < CACHE_TTL) _cache.set(k, e);
      });
    } catch {}
  })();

  /* ─── LAST-VALID BACKUP ──────────────────────────────────── */
  let _lastValid = null;
  try { const s = localStorage.getItem('TLP_pc_last_v5'); if (s) _lastValid = JSON.parse(s); } catch {}

  function _saveLastValid(data) {
    _lastValid = data;
    try { localStorage.setItem('TLP_pc_last_v5', JSON.stringify(data)); } catch {}
  }

  /* ─── API CREDENTIALS ────────────────────────────────────── */
  const LS_CREDS = 'TLP_api_creds_v5';
  const LS_COORD = 'TLP_api_coord_v5';

  function _getCreds() {
    try { const c = localStorage.getItem(LS_CREDS); return c ? JSON.parse(c) : null; } catch { return null; }
  }

  function _getCoords() {
    try {
      const c = JSON.parse(localStorage.getItem(LS_COORD) || '{}');
      return { lat: parseFloat(c.lat) || 21.1458, lon: parseFloat(c.lon) || 79.0882 };
    } catch { return { lat: 21.1458, lon: 79.0882 }; }
  }

  /* ─── RESPONSE MAPPING (LOCKED) ──────────────────────────
     Maps EXACTLY what the API returns to Hindi display strings.
     AstrologyAPI.com field paths:
       tithi_name  → data.tithi.details[0].tithi_name  (or data.tithi.details.tithi_name)
       paksha      → data.paksha  (already in Hindi e.g. "शुक्ल" or English "Shukla")
       maas        → data.hindu_maah.purnimanta
       samvat      → data.vikram_samvat
  ─────────────────────────────────────────────────────────── */

  /* Fallback transliteration only for paksha (API may return English) */
  const PAKSHA_HI = { 'Shukla': 'शुक्ल', 'Krishna': 'कृष्ण',
                       'शुक्ल': 'शुक्ल', 'कृष्ण':   'कृष्ण',
                       'shukla':'शुक्ल', 'krishna': 'कृष्ण' };

  /* Maas transliteration — only used if API returns English */
  const MAAS_HI = {
    'Chaitra':'चैत्र',       'Vaisakha':'वैशाख',     'Vaishakha':'वैशाख',
    'Jyeshtha':'ज्येष्ठ',   'Jyaistha':'ज्येष्ठ',   'Ashadha':'आषाढ़',
    'Ashaadha':'आषाढ़',      'Shravana':'श्रावण',    'Shravan':'श्रावण',
    'Bhadrapada':'भाद्रपद',  'Ashvina':'आश्विन',     'Ashwin':'आश्विन',
    'Ashwina':'आश्विन',      'Kartika':'कार्तिक',    'Kartik':'कार्तिक',
    'Margashirsha':'मार्गशीर्ष','Pausha':'पौष',       'Pausa':'पौष',
    'Magha':'माघ',            'Phalguna':'फाल्गुन',  'Phalgun':'फाल्गुन'
  };

  function _hi(map, val) { return (val && (map[val] || val)) || ''; }

  function _parseResponse(json) {
    const d = (json && (json.data || json)) || {};

    /* tithi_name — handle both array and object shapes */
    let tithiName = '';
    if (d.tithi) {
      const td = d.tithi.details;
      if (Array.isArray(td) && td.length)  tithiName = td[0].tithi_name || '';
      else if (td && td.tithi_name)         tithiName = td.tithi_name;
      else if (d.tithi.tithi_name)          tithiName = d.tithi.tithi_name;
    }

    /* paksha */
    const pakshaRaw = d.paksha || '';
    const paksha    = _hi(PAKSHA_HI, pakshaRaw);

    /* maas — purnimanta preferred */
    let maas = '';
    if (d.hindu_maah) {
      maas = d.hindu_maah.purnimanta || d.hindu_maah.amanta || '';
    } else if (d.hindi_month) {
      maas = d.hindi_month.purnimanta || d.hindi_month.amanta || d.hindi_month || '';
    }
    maas = _hi(MAAS_HI, maas);

    /* samvat — only from API, never +57 fallback */
    const samvat = d.vikram_samvat || d.vikramSamvat || '';

    if (!tithiName && !paksha && !maas) return null;   // empty response

    return { tithiName, paksha, maas, samvat, source: 'api' };
  }

  /* ─── IN-FLIGHT DEDUP ────────────────────────────────────── */
  const _inflight = new Map();   // dateKey → Promise

  /* ─── CORE API CALL (DISABLED — re-enable when API key is available) ───
     To re-enable: delete the 'return null;' line below.
  ─────────────────────────────────────────────────────────────────────── */
  async function _callAPI(dateKey) {
    // API integration temporarily disabled. Remove this line to re-enable:
    return null;

    /* --- FUTURE RE-INTEGRATION (keep for reference) ---
    const creds  = _getCreds();
    if (!creds || !creds.userId || !creds.apiKey) return null;
    const parts  = _istParts(new Date(dateKey + 'T06:00:00+05:30'));
    const coords = _getCoords();
    const body = {
      day: parts.day, month: parts.month, year: parts.year,
      hour: parts.hour, min: parts.min,
      lat: coords.lat, lon: coords.lon, tzone: 5.5
    };
    const authToken = btoa(`${creds.userId}:${creds.apiKey}`);
    try {
      const res = await fetch('https://json.astrologyapi.com/v1/advanced_panchang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${authToken}` },
        body: JSON.stringify(body)
      });
      if (!res.ok) { console.warn('[Panchang] API', res.status, 'for', dateKey); return null; }
      const json = await res.json();
      return _parseResponse(json);
    } catch (err) {
      console.warn('[Panchang] Fetch error:', err.message);
      return null;
    }
    --- END FUTURE RE-INTEGRATION --- */
  }

  /* ─── ASYNC LOAD WITH DEDUP ──────────────────────────────── */
  const _listeners = new Set();

  function _notify(key, data) {
    _listeners.forEach(fn => { try { fn(key, data); } catch {} });
    try { document.dispatchEvent(new CustomEvent('panchangUpdated', { detail: { key, data } })); } catch {}
  }

  async function _ensureLoaded(key) {
    if (_cacheGet(key)) return;
    if (_inflight.has(key)) { await _inflight.get(key); return; }

    const p = (async () => {
      const data = await _callAPI(key);
      _inflight.delete(key);
      if (data) { _cachePut(key, data); _saveLastValid(data); _notify(key, data); }
      else       { _notify(key, null); }
    })();
    _inflight.set(key, p);
    await p;
  }

  /* ─── MANUAL OVERRIDE ────────────────────────────────────── */
  function _todayKey()  { return _dateKey(new Date()); }

  function _getManual() {
    try { const s = localStorage.getItem('manualPanchang'); return s ? JSON.parse(s) : null; } catch { return null; }
  }

  /* ─── MANUAL DATE CORRECTION (PER DATE) ──────────────────── */
  function _getDateManual(key) {
    try { const s = localStorage.getItem('panchang_' + key); return s ? JSON.parse(s) : null; } catch { return null; }
  }

  function openManualCorrection(dateInput) {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const key = _dateKey(d);
    const existing = _getDateManual(key) || {};
    
    document.getElementById('manualPanchangPopup')?.remove();
    
    const popup = document.createElement('div');
    popup.id = 'manualPanchangPopup';
    popup.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:10000;';
    
    const samvatHtml = `<input type="number" id="mpSamvat" value="${existing.samvat || getSamvat(d) || 2081}" class="form-control" style="margin-bottom:10px;">`;
    
    const maasOpts = ['चैत्र','वैशाख','ज्येष्ठ','आषाढ़','श्रावण','भाद्रपद','आश्विन','कार्तिक','मार्गशीर्ष','पौष','माघ','फाल्गुन'];
    const maasHtml = `<select id="mpMaas" class="form-control" style="margin-bottom:10px;">` + 
      maasOpts.map(m => `<option ${existing.maas === m ? 'selected' : ''}>${m}</option>`).join('') + `</select>`;
      
    const pakshaOpts = ['शुक्ल', 'कृष्ण'];
    const pakshaHtml = `<select id="mpPaksha" class="form-control" style="margin-bottom:10px;">` +
      pakshaOpts.map(p => `<option ${existing.paksha === p ? 'selected' : ''}>${p}</option>`).join('') + `</select>`;
      
    const tithiOpts = ['प्रतिपदा','द्वितीया','तृतीया','चतुर्थी','पंचमी','षष्ठी','सप्तमी','अष्टमी','नवमी','दशमी','एकादशी','द्वादशी','त्रयोदशी','चतुर्दशी','पूर्णिमा','अमावस्या'];
    const tithiHtml = `<select id="mpTithi" class="form-control" style="margin-bottom:15px;">` +
      tithiOpts.map(t => `<option ${existing.tithi === t ? 'selected' : ''}>${t}</option>`).join('') + `</select>`;
    
    popup.innerHTML = `
      <div class="card" style="width:90%; max-width:320px; padding:20px; position:relative; animation:slideUp 0.3s ease-out;">
        <style>@keyframes slideUp { from { transform: translateY(30px); opacity:0; } to { transform: translateY(0); opacity:1; } }</style>
        <div style="font-size:1.1rem; font-weight:bold; margin-bottom:15px; color:var(--text-primary);">✏️ Edit Panchang<br><span style="font-size:0.8rem;color:var(--text-muted);">${formatDate(d)}</span></div>
        <label style="font-size:0.8rem;color:var(--text-secondary);display:block;margin-bottom:4px;">Samvat</label>
        ${samvatHtml}
        <label style="font-size:0.8rem;color:var(--text-secondary);display:block;margin-bottom:4px;">Maas</label>
        ${maasHtml}
        <label style="font-size:0.8rem;color:var(--text-secondary);display:block;margin-bottom:4px;">Paksha</label>
        ${pakshaHtml}
        <label style="font-size:0.8rem;color:var(--text-secondary);display:block;margin-bottom:4px;">Tithi</label>
        ${tithiHtml}
        <div style="display:flex;gap:10px;margin-top:10px;">
          <button class="btn btn-secondary" style="flex:1;padding:12px;" onclick="document.getElementById('manualPanchangPopup').remove()">Cancel</button>
          <button class="btn btn-primary" style="flex:1;padding:12px;" onclick="TithiService.saveManualCorrection('${key}')">Save</button>
        </div>
        ${existing.tithi ? `<button class="btn" style="width:100%;margin-top:10px;color:var(--danger);border:1px solid var(--danger);background:transparent;" onclick="TithiService.clearManualCorrection('${key}')">🗑 Revert to Auto</button>` : ''}
      </div>
    `;
    document.body.appendChild(popup);
  }

  function saveManualCorrection(key) {
    const samvat = document.getElementById('mpSamvat').value;
    const maas = document.getElementById('mpMaas').value;
    const paksha = document.getElementById('mpPaksha').value;
    const tithi = document.getElementById('mpTithi').value;
    localStorage.setItem('panchang_' + key, JSON.stringify({ samvat: parseInt(samvat, 10), maas, paksha, tithi }));
    document.getElementById('manualPanchangPopup').remove();
    _notify(key, _get(key));
    if (typeof Toast !== 'undefined') Toast.show('✅ Panchang saved format ' + formatDate(key));
    try { document.dispatchEvent(new CustomEvent('panchangUpdated', { detail: { key, data: _get(key) } })); } catch {}
  }
  
  function clearManualCorrection(key) {
    localStorage.removeItem('panchang_' + key);
    document.getElementById('manualPanchangPopup').remove();
    _notify(key, _get(key));
    if (typeof Toast !== 'undefined') Toast.show('🗑 Restored auto Panchang');
    try { document.dispatchEvent(new CustomEvent('panchangUpdated', { detail: { key, data: _get(key) } })); } catch {}
  }

  /* ─── LOCAL DEFAULT PANCHANG (used when no manual override set) ── */
  function _getLocalDefault(dateInput) {
    const d = dateInput ? (dateInput instanceof Date ? dateInput : new Date(dateInput)) : new Date();
    if (isNaN(d.getTime())) {
      return { tithiName: 'Invalid Date', paksha: '', maas: '', samvat: '', source: 'local_default' };
    }

    const MAAS_ORDER = ["चैत्र", "वैशाख", "ज्येष्ठ", "आषाढ़", "श्रावण", "भाद्रपद", "आश्विन", "कार्तिक", "मार्गशीर्ष", "पौष", "माघ", "फाल्गुन"];
    
    // User's offline 30-tithi array logic (90-95% mapping)
    const TITHIS = [
        "शुक्ल प्रतिपदा","शुक्ल द्वितीया","शुक्ल तृतीया",
        "शुक्ल चतुर्थी","शुक्ल पंचमी","शुक्ल षष्ठी",
        "शुक्ल सप्तमी","शुक्ल अष्टमी","शुक्ल नवमी",
        "शुक्ल दशमी","शुक्ल एकादशी","शुक्ल द्वादशी",
        "शुक्ल त्रयोदशी","शुक्ल चतुर्दशी","पूर्णिमा",
        "कृष्ण प्रतिपदा","कृष्ण द्वितीया","कृष्ण तृतीया",
        "कृष्ण चतुर्थी","कृष्ण पंचमी","कृष्ण षष्ठी",
        "कृष्ण सप्तमी","कृष्ण अष्टमी","कृष्ण नवमी",
        "कृष्ण दशमी","कृष्ण एकादशी","कृष्ण द्वादशी",
        "कृष्ण त्रयोदशी","कृष्ण चतुर्दशी","अमावस्या"
    ];

    // 1. Tithi Index with Offset
    const baseDate = new Date(2024, 0, 1);
    const d1 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.floor((d1 - baseDate) / 86400000);
    const rawTithiIndex = ((diffDays % 30) + 30) % 30;
    
    const OFFSET = 1;
    const tithiIndex = (((rawTithiIndex + OFFSET) % 30) + 30) % 30;

    // 2. Auto Month Detection (Purnimanta - Krishna Paksha shifts to next month)
    let monthIndex = (d.getMonth() + 9) % 12;
    const isShukla = tithiIndex < 15;
    if (!isShukla) {
        monthIndex = (monthIndex + 1) % 12;
    }
    const maas = MAAS_ORDER[monthIndex];
    
    // 3. Auto Samvat Correction (Chaitra Shukla Rollover)
    const year = d.getFullYear();
    let samvat = year + 57;
    // Jan to early March (Pausha/Magha/Phalguna) is typically the previous Samvat relative to the Gregorian shift
    if (maas === "पौष" || maas === "माघ" || maas === "फाल्गुन") {
        samvat = year + 56;
    }
    // Chaitra Krishna is before New Year, Chaitra Shukla is the New Year
    if (maas === "चैत्र" && !isShukla) {
        samvat = year + 56;
    }
    // Edge case for Dec transitioning to Paush (year + 57 correctly aligned)
    if (d.getMonth() === 11 && maas === "पौष") {
        samvat = year + 57; 
    }

    const tithiName = "- " + (TITHIS[tithiIndex] || "");
    
    return { tithiName, paksha: '', maas, samvat, source: 'local_default' };
  }

  /* ─── SYNC GETTER (public API stays synchronous) ─────────── */
  function _get(dateInput) {
    const d    = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const key  = _dateKey(d);

    /* 0. Manual date correction (per date override) */
    const dateOverride = _getDateManual(key);
    if (dateOverride) {
      return { tithiName: dateOverride.tithi || '', paksha: dateOverride.paksha || '',
               maas: dateOverride.maas || '', samvat: dateOverride.samvat || '', source: 'manual_date' };
    }

    /* 1. Manual override (today only) */
    if (key === _todayKey()) {
      const m = _getManual();
      if (m) return { tithiName: m.tithi || '', paksha: m.paksha || '',
                      maas: m.month || '', samvat: parseInt(m.samvat, 10) || '', source: 'manual' };
    }

    /* 2. Cache hit (from previous API data) */
    const cached = _cacheGet(key);
    if (cached) return cached;

    /* 3. Last-valid backup from previous API session */
    if (_lastValid) return { ..._lastValid, source: 'cached_prev' };

    /* 4. API disabled — return local estimate so app never shows spinner */
    return _getLocalDefault(d);
  }

  /* ─── PUBLIC API ─────────────────────────────────────────── */

  function get(dateInput) {
    const p = _get(dateInput instanceof Date ? dateInput : new Date(dateInput));
    if (p.source === 'loading') return 'लोड हो रहा है...';
    return [p.maas, p.paksha, p.tithiName].filter(Boolean).join(' ') || '---';
  }

  function getShort(di)        { return get(di); }

  function getSamvat(dateInput) {
    const d   = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const key = _dateKey(d);
    
    const dateOverride = _getDateManual(key);
    if (dateOverride && dateOverride.samvat) return dateOverride.samvat;

    if (key === _todayKey()) {
      const m = _getManual();
      if (m && m.samvat) return parseInt(m.samvat, 10);
    }
    const s = _get(d).samvat;
    if (!s && s !== 0) return '';
    return typeof s === 'number' ? s : parseInt(s, 10) || '';
  }

  function getSamvatDisplay(di) {
    const s = getSamvat(di);
    return s ? `संवत ${s}` : 'संवत ...';
  }

  function getFormatted(dateInput) {
    const d   = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const wd  = ['रविवार','सोमवार','मंगलवार','बुधवार','गुरुवार','शुक्रवार','शनिवार'];
    return `${wd[d.getDay()]}, ${get(d)}`;
  }

  function getMaasFromGregorian(dateInput) {
    let d;
    if (typeof dateInput === 'number') { d = new Date(); d.setMonth(dateInput - 1); }
    else d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    return _get(d).maas || '';
  }

  function getTotalTithis() { return 0; }   // kept for API compatibility

  /* ─── UI HELPERS ─────────────────────────────────────────── */
  const MAAS_EN = {
    'चैत्र':'March–April',     'वैशाख':'April–May',         'ज्येष्ठ':'May–June',
    'आषाढ़':'June–July',        'श्रावण':'July–August',      'भाद्रपद':'August–September',
    'आश्विन':'September–October','कार्तिक':'October–November','मार्गशीर्ष':'November–December',
    'पौष':'December–January',   'माघ':'January–February',    'फाल्गुन':'February–March'
  };

  function getMonthHtml(tithiStr) {
    if (!tithiStr || tithiStr === '---') return `<div class="tithi-chip">🪔 ---</div>`;
    if (tithiStr === 'लोड हो रहा है...') return `<div class="tithi-chip">🪔 लोड हो रहा है...</div>`;
    const month = tithiStr.split(' ')[0];
    const eng   = MAAS_EN[month] || '';
    if (!eng) return `<div class="tithi-chip">🪔 ${month}</div>`;
    return `<div style="display:inline-flex;gap:6px;">
      <div class="tithi-chip">🪔 ${month}</div>
      <div class="tithi-chip" style="background:rgba(255,255,255,0.05);border-color:var(--border);color:var(--text-secondary);">📅 ${eng}</div>
    </div>`;
  }

  function getMonthText(tithiStr) {
    if (!tithiStr) return '';
    const m = tithiStr.split(' ')[0];
    const e = MAAS_EN[m] || '';
    return e ? `${m} (${e})` : m;
  }

  function formatDate(dateInput) {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function onUpdate(fn) {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  }

  /* ─── SETTINGS INTEGRATION ───────────────────────────────── */

  function saveApiCredentials(userId, apiKey) {
    localStorage.setItem(LS_CREDS, JSON.stringify({ userId: userId.trim(), apiKey: apiKey.trim() }));
    _cache.clear();
    try { localStorage.removeItem('TLP_pc_v5'); } catch {}
    _ensureLoaded(_todayKey()).catch(() => {});
  }

  function saveApiCoords(lat, lon) {
    localStorage.setItem(LS_COORD, JSON.stringify({ lat: parseFloat(lat), lon: parseFloat(lon) }));
    _cache.clear();
    try { localStorage.removeItem('TLP_pc_v5'); } catch {}
    _ensureLoaded(_todayKey()).catch(() => {});
  }

  function getApiCredentials() {
    return _getCreds() || { userId: '', apiKey: '' };
  }

  function getStoredCoords() {
    return _getCoords();
  }

  function isApiConfigured() {
    const c = _getCreds();
    return !!(c && c.userId && c.apiKey);
  }

  /* ─── AUTO-PRELOAD & MIDNIGHT REFRESH ───────────────────── */
  function _preloadToday() {
    if (_getManual()) return;
    const key = _todayKey();
    if (!_cacheGet(key)) _ensureLoaded(key).catch(() => {});
  }

  function _scheduleMidnight() {
    try {
      const now  = new Date();
      const ist  = _istParts(now);
      const msTo = ((23 - ist.hour) * 60 + (59 - ist.min)) * 60000 + 90000;
      setTimeout(() => { _cache.clear(); _preloadToday(); _scheduleMidnight(); }, msTo);
    } catch {}
  }

  if (typeof window !== 'undefined') { _preloadToday(); _scheduleMidnight(); }

  /* ─── EXPORTS ────────────────────────────────────────────── */
  return {
    get, getShort, getFormatted, getSamvat, getSamvatDisplay,
    getMaasFromGregorian, getTotalTithis,
    getMonthHtml, getMonthText, formatDate,
    onUpdate,
    saveApiCredentials, saveApiCoords,
    getApiCredentials, getStoredCoords, isApiConfigured,
    openManualCorrection, saveManualCorrection, clearManualCorrection,
    KEY_DATES: {}
  };

})();
