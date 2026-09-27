import { initSearch } from './search.js';
import { initScaler } from './scaler.js';
import { initChecklist } from './checklist.js';
import { initWakeLock } from './wakelock.js';
import { initTimers } from './timers.js';

initSearch();
initScaler();
initChecklist();
initWakeLock();
initTimers();

// Printing: the home-screen app has no browser menu to print from.
const printButton = document.querySelector('[data-print]');
if (printButton && typeof window.print === 'function') {
  printButton.hidden = false;
  printButton.addEventListener('click', () => window.print());
}

// Save the site for offline use and let it run as a home-screen app.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Offline support unavailable:', error);
    });
  });
}
