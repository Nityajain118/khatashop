/* ================================================================
   TOAST WIDGET
   ================================================================ */

const Toast = (() => {
  let timer;
  function show(msg, duration = 2800) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(timer);
    timer = setTimeout(() => el.classList.add('hidden'), duration);
  }
  return { show };
})();
