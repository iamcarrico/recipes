/**
 * Keep the screen on while a recipe is open, so the phone doesn't lock with
 * flour on your hands.
 *
 * On by default and remembered once changed. Browsers drop the lock whenever
 * the page is hidden, so it is taken again each time the page comes back.
 * The button only appears where the Screen Wake Lock API exists.
 */

const PREFERENCE_KEY = 'keep-screen-on';

export function initWakeLock(root = document) {
  const button = root.querySelector('[data-wake-lock]');
  if (!button || !('wakeLock' in navigator)) return;

  button.hidden = false;
  let wanted = readPreference();
  let lock = null;
  // Load and visibility events can overlap; one request at a time, or a
  // second lock would be taken and never released.
  let requesting = null;

  function render() {
    button.setAttribute('aria-pressed', lock ? 'true' : 'false');
  }

  async function acquire() {
    if (!wanted || lock || document.visibilityState !== 'visible') return;
    if (requesting) return requesting;

    requesting = (async () => {
      try {
        const sentinel = await navigator.wakeLock.request('screen');
        sentinel.addEventListener('release', () => {
          if (lock === sentinel) lock = null;
          render();
        });
        // Switched off while the request was in flight.
        if (!wanted) await sentinel.release();
        else lock = sentinel;
      } catch {
        // Refused (battery saver, or no user gesture yet): the button stays
        // off, and a tap tries again with a gesture.
      } finally {
        requesting = null;
        render();
      }
    })();
    return requesting;
  }

  async function release() {
    const current = lock;
    lock = null;
    await current?.release();
    render();
  }

  button.addEventListener('click', async () => {
    // A request still in flight counts as on, so this tap turns it off.
    wanted = !(lock || requesting);
    savePreference(wanted);
    if (wanted) await acquire();
    else await release();
  });

  document.addEventListener('visibilitychange', acquire);
  acquire();
}

function readPreference() {
  try {
    return localStorage.getItem(PREFERENCE_KEY) !== 'off';
  } catch {
    return true;
  }
}

function savePreference(on) {
  try {
    localStorage.setItem(PREFERENCE_KEY, on ? 'on' : 'off');
  } catch {
    // Works for this page, just isn't remembered.
  }
}
