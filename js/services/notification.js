/* ================================================================
   NOTIFICATION SERVICE — Browser push notifications for due dates
   ================================================================ */

const NotificationService = (() => {

  async function requestPermission() {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    const perm = await Notification.requestPermission();
    DB.saveSetting('notificationsEnabled', perm === 'granted');
    return perm;
  }

  function isEnabled() {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  function show(title, body, icon = '🪔') {
    if (!isEnabled()) return;
    new Notification(title, {
      body,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">' + icon + '</text></svg>',
    });
  }

  function checkDueReminders() {
    if (!isEnabled()) return;
    const entries = DB.getEntries();
    const dueSoon = InterestService.getDueSoon(entries, 7);
    const overdue = entries.filter(e => InterestService.isOverdue(e));

    dueSoon.forEach(e => {
      const days = Math.ceil((new Date(e.dueDate) - new Date()) / (1000 * 3600 * 24));
      show(
        `📅 Due Soon: ${e.name}`,
        `Loan due in ${days} day(s). Balance: ${InterestService.fmt(InterestService.getBalance(e))}`,
        '⏰'
      );
    });

    overdue.forEach(e => {
      show(
        `⚠️ Overdue: ${e.name}`,
        `Balance: ${InterestService.fmt(InterestService.getBalance(e))} — Please collect.`,
        '🔴'
      );
    });
  }

  function scheduleDaily() {
    // Check once on load, then every 4 hours
    checkDueReminders();
    setInterval(checkDueReminders, 4 * 60 * 60 * 1000);
  }

  return { requestPermission, isEnabled, show, checkDueReminders, scheduleDaily };
})();
