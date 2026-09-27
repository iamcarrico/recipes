import { initSearch } from './search.js';
import { initScaler } from './scaler.js';
import { initChecklist } from './checklist.js';
import { initWakeLock } from './wakelock.js';

initSearch();
initScaler();
initChecklist();
initWakeLock();

// Save the site for offline use and let it run as a home-screen app.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Offline support unavailable:', error);
    });
  });
}
