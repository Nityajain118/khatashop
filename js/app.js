/* ================================================================
   APP.JS — Stable Boot + Router + Safe Loading
   ================================================================ */

const App = (() => {

  let _currentScreen = 'home';
  let _historyStack  = [];

  /* ───────────────── NAVIGATION ───────────────── */

  function navigate(screen, param = null) {
    try {
      if (!screen) screen = 'home';

      // PREVENT INVALID ROUTES
      const allowed = ['home','addEntry','customer','detail','settings','report','common','sbook'];
      if (!allowed.includes(screen)) {
        console.warn('Blocked invalid route:', screen);
        screen = 'home';
      }

      _historyStack.push({ screen: _currentScreen, param });
      _currentScreen = screen;

      _render(screen, param);
      _updateNav(screen);
      _updateTopbar(screen, param);

      document.getElementById('screenContainer')
        ?.scrollTo(0, 0);

    } catch (e) {
      console.error('[NAV ERROR]', e);
      _render('home');
    }
  }

  function goBack() {
    const prev = _historyStack.pop();

    if (prev) {
      _currentScreen = prev.screen;
      _render(prev.screen, prev.param);
      _updateNav(prev.screen);
      _updateTopbar(prev.screen, prev.param);
    } else {
      navigate('home');
    }
  }

  /* ───────────────── RENDER ───────────────── */

  function _render(screen, param) {
    const container = document.getElementById('screenContainer');
    if (!container) return;

    try {
      switch (screen) {
        case 'home':       HomeScreen.render(container); break;
        case 'addEntry':   AddEntryScreen.render(container, param); break;
        case 'customer':   DetailScreen.renderCustomer(container, param); break;
        case 'detail':     DetailScreen.render(container, param); break;
        case 'settings':   SettingsScreen.render(container); break;
        case 'report':     ReportScreen.render(container); break;
        case 'common':     CommonScreen.render(container); break;
        case 'sbook':      SBookScreen.render(container, param); break;
        default:           HomeScreen.render(container);
      }
    } catch (err) {
      console.error('[Render Error]', err);

      container.innerHTML = `
        <div class="screen">
          <div class="empty-state">
            <div class="empty-icon">⚠️</div>
            <div class="empty-title">Something went wrong</div>
            <div class="empty-sub">${err.message}</div>
            <button class="btn btn-primary" onclick="App.navigate('home')">
              Go Home
            </button>
          </div>
        </div>
      `;
    }
  }

  /* ───────────────── UI UPDATE ───────────────── */

  function _updateNav(screen) {
    document.querySelectorAll('.nav-btn')
      .forEach(b => b.classList.remove('active'));

    const map = {
      home: 'nav-home',
      addEntry: 'nav-add',
      report: 'nav-report',
      settings: 'nav-settings',
      common: 'nav-common'
    };

    document.getElementById(map[screen])?.classList.add('active');
  }

  function _updateTopbar(screen, param) {
    const titles = {
      home: 'Tithi Ledger Pro',
      addEntry: 'Add New Loan',
      settings: 'Settings',
      report: 'Daily Report',
      common: '🔗 Common Customers',
      sbook: 'Statement Book',
    };

    let title = titles[screen] || 'Tithi Ledger Pro';

    if (screen === 'customer' && param) {
      const c = DB.getCustomer(param);
      title = c ? c.name : 'Customer Detail';
    }

    if (screen === 'detail' && param) {
      const e = DB.getEntry(param);
      title = e ? e.name : 'Loan Detail';
    }

    document.getElementById('topbarTitle').textContent = title;

    const backBtn = document.getElementById('btnBack');
    if (backBtn) {
      backBtn.classList.toggle('hidden', screen === 'home');
    }
  }

  /* ───────────────── MODE ───────────────── */

  function toggleMode() {
    ModeSwitch.toggle();
    _render(_currentScreen);
  }

  /* ───────────────── FIRM SELECTOR ───────────────── */

  function _initFirmSelector() {
    const select = document.getElementById('topbarFirmSelect');
    if (!select) return;
    select.innerHTML = FirmManager.buildSelectOptions(FirmManager.getActiveFirmId());
  }

  window.onFirmChanged = () => {
    const select = document.getElementById('topbarFirmSelect');
    if (!select) return;
    const val = select.value;
    DB.setActiveFirm(val || null);
    _render(_currentScreen); // Refresh the current screen
  };

  /* ───────────────── DEMO DATA ───────────────── */

  function _seedDemoData() {
    if (DB.getEntries().length > 0) return;

    const today = new Date();
    const fmt = d => d.toISOString().split('T')[0];

    const c1 = DB.getOrCreateCustomer({ name: 'Ramesh Kumar', phone: '9876543210', address: 'City A' });

    const e1 = createEntry({
      customerId: c1.customerId,
      name: c1.name,
      phone: c1.phone,
      address: c1.address,
      principal: 50000,
      interestRate: 2,
      loanDate: fmt(today),
      dueDate: '',
      notes: ''
    });

    DB.addEntry(e1);
  }

  /* ───────────────── SAFE INIT (NO FREEZE) ───────────────── */

  function init() {
    try {
      // PREVENT DOUBLE BOOT
      if (window.__APP_STARTED) return;
      window.__APP_STARTED = true;

      // CLEAN ANY OLD STATE (VERY IMPORTANT)
      try {
        sessionStorage.clear();
      } catch (e) {}

      DB.migrateIfNeeded();
      DB.patchV3();
      FirmManager.seedDefaultFirm();
      _initFirmSelector();

      if (typeof FinanceEngine !== 'undefined') {
        FinanceEngine.resetCacheAndRecalculate();
      }

      _seedDemoData();

      ModeSwitch.updateBtn();
      ThemeToggle.apply();

      // FORCE SAFE HOME STATE
      _currentScreen = 'home';
      _historyStack = [];

      // SAFE FIRST RENDER
      setTimeout(() => {
        navigate('home');
      }, 50);

      // NOTIFICATIONS SAFE INIT
      try {
        if (DB.getSetting('notificationsEnabled', false)) {
          NotificationService.scheduleDaily();
        }
      } catch (e) {
        console.warn('Notification init failed:', e);
      }

    } catch (err) {
      console.error('[APP INIT CRASH]', err);
      document.getElementById('screenContainer').innerHTML =
        `<div style="padding:20px;color:red;">App failed to start</div>`;
    }
  }

  return {
    navigate,
    goBack,
    toggleMode,
    init,
    refreshFirmSelector: _initFirmSelector
  };

})();

/* ───────────────── BOOT ───────────────── */

window.addEventListener('load', () => {
  setTimeout(() => App.init(), 300);
});
