/* ================================================================
   WIDGET — Mode Switch (inline) + global helper
   ================================================================ */

const ModeSwitch = (() => {

  function isHindu() { return DB.getSetting('isHinduMode', true); }

  function toggle() {
    const current = isHindu();
    DB.saveSetting('isHinduMode', !current);
    const btn = document.getElementById('btnHinduToggle');
    if (btn) btn.textContent = !current ? '🪔' : '💰';
    Toast.show(!current ? '🪔 Hindu Tithi Mode ON' : '💰 Normal Date Mode ON');
    return !current;
  }

  function getDisplayDate(dateInput) {
    if (isHindu()) {
      const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      return TithiService.getShort(d);
    } else {
      const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    }
  }

  function getDisplayDateLong(dateInput) {
    if (isHindu()) {
      const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      return TithiService.getFormatted(d);
    } else {
      const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', weekday: 'long' });
    }
  }

  function updateBtn() {
    const btn = document.getElementById('btnHinduToggle');
    if (btn) btn.textContent = isHindu() ? '🪔' : '💰';
  }

  return { isHindu, toggle, getDisplayDate, getDisplayDateLong, updateBtn };
})();
