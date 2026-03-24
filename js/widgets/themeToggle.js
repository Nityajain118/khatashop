/* ================================================================
   WIDGET — Theme Toggle (Dark / Light) with localStorage
   ================================================================ */

const ThemeToggle = (() => {
  const STORAGE_KEY = 'TLP_theme';

  function isDark() {
    return (localStorage.getItem(STORAGE_KEY) || 'dark') === 'dark';
  }

  function apply() {
    const theme = isDark() ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    _updateIcon();
  }

  function toggle() {
    const newTheme = isDark() ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEY, newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    _updateIcon();
    Toast.show(newTheme === 'dark' ? '🌙 Dark Mode ON' : '☀️ Light Mode ON');
  }

  function _updateIcon() {
    const btn = document.getElementById('btnThemeToggle');
    if (btn) btn.textContent = isDark() ? '🌙' : '☀️';
  }

  return { isDark, apply, toggle };
})();
