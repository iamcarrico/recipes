/**
 * Kitchen timers started from the durations in a recipe's steps.
 *
 * Tapping a timer button starts a countdown in a tray pinned to the bottom of
 * the screen. Timers are stored as end times, so they stay correct if the
 * phone throttles the page, and they survive a reload. When one finishes it
 * beeps, vibrates where supported, and stays up until dismissed.
 */

const STORAGE_PREFIX = 'timers:';

export function initTimers(root = document) {
  const chips = [...root.querySelectorAll('[data-timer]')];
  if (chips.length === 0) return;

  const storageKey = STORAGE_PREFIX + window.location.pathname;
  chips.forEach((chip, index) => {
    chip.dataset.timerId = String(index);
  });

  const tray = document.createElement('section');
  tray.className = 'timer-tray';
  tray.setAttribute('aria-label', 'Timers');
  tray.hidden = true;
  const list = document.createElement('ul');
  list.className = 'timer-tray__list';
  tray.append(list);
  // Announce finished timers once, rather than reading out every second.
  const announcer = document.createElement('p');
  announcer.className = 'visually-hidden';
  announcer.setAttribute('role', 'status');
  tray.append(announcer);
  document.body.append(tray);

  let timers = load(storageKey);
  let ticker = null;
  let audio = null;
  const baseTitle = document.title;

  function start(chip) {
    // The tap is a user gesture: the moment to unlock audio on iOS.
    audio ??= createAudio();

    const id = chip.dataset.timerId;
    if (timers.some((timer) => timer.id === id && !timer.done)) {
      rows.get(id)?.querySelector('button')?.focus();
      return;
    }
    timers = timers.filter((timer) => timer.id !== id);
    timers.push({
      id,
      label: labelFor(chip),
      endsAt: Date.now() + Number(chip.dataset.timer) * 1000,
      done: false
    });
    save(storageKey, timers);
    render();
  }

  function dismiss(id) {
    timers = timers.filter((timer) => timer.id !== id);
    save(storageKey, timers);
    render();
  }

  function tick() {
    const now = Date.now();
    let finished = false;
    for (const timer of timers) {
      if (!timer.done && timer.endsAt <= now) {
        timer.done = true;
        finished = true;
        announcer.textContent = `Timer done: ${timer.label}`;
      }
    }
    if (finished) {
      save(storageKey, timers);
      alarm(audio);
    }
    render();
  }

  // Rows are updated in place rather than rebuilt each second, so focus on a
  // dismiss button isn't lost while a timer counts down.
  const rows = new Map();

  function rowFor(timer) {
    let row = rows.get(timer.id);
    if (row) return row;

    row = document.createElement('li');
    row.className = 'timer-tray__row';

    const label = document.createElement('span');
    label.className = 'timer-tray__label';
    label.textContent = timer.label;

    const time = document.createElement('span');
    time.className = 'timer-tray__time';

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'timer-tray__dismiss';
    close.textContent = '×';
    close.addEventListener('click', () => dismiss(timer.id));

    row.append(label, time, close);
    rows.set(timer.id, row);
    return row;
  }

  function render() {
    const now = Date.now();
    tray.hidden = timers.length === 0;
    document.body.classList.toggle('has-timers', timers.length > 0);

    for (const [id, row] of rows) {
      if (!timers.some((timer) => timer.id === id)) {
        row.remove();
        rows.delete(id);
      }
    }

    for (const timer of timers) {
      const row = rowFor(timer);
      row.classList.toggle('is-done', timer.done);
      row.querySelector('.timer-tray__time').textContent = timer.done
        ? 'Done!'
        : formatRemaining(timer.endsAt - now);
      row
        .querySelector('.timer-tray__dismiss')
        .setAttribute('aria-label', `${timer.done ? 'Dismiss' : 'Cancel'} ${timer.label} timer`);
      if (row.parentNode !== list) list.append(row);
    }

    for (const chip of chips) {
      const running = timers.some((timer) => timer.id === chip.dataset.timerId && !timer.done);
      chip.classList.toggle('is-running', running);
    }

    const anyDone = timers.some((timer) => timer.done);
    document.title = anyDone ? `⏰ Done · ${baseTitle}` : baseTitle;

    const needsTicking = timers.some((timer) => !timer.done);
    if (needsTicking && !ticker) ticker = window.setInterval(tick, 1000);
    if (!needsTicking && ticker) {
      window.clearInterval(ticker);
      ticker = null;
    }
  }

  for (const chip of chips) {
    chip.addEventListener('click', () => start(chip));
  }

  // Timers that finished while the page was closed ring on return.
  tick();
}

/** "Step 3 · 25 minutes" */
function labelFor(chip) {
  const step = chip.closest('[data-step]');
  const number = step?.querySelector('.step__number')?.textContent.trim();
  const duration = chip.textContent.trim();
  return number ? `Step ${number} · ${duration}` : duration;
}

function formatRemaining(milliseconds) {
  const total = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
}

function createAudio() {
  try {
    const context = new AudioContext();
    context.resume();
    return context;
  } catch {
    return null;
  }
}

/** Three short beeps and a buzz. */
function alarm(context) {
  navigator.vibrate?.([300, 150, 300, 150, 300]);
  if (!context) return;
  context.resume?.();
  for (let beep = 0; beep < 3; beep += 1) {
    const start = context.currentTime + beep * 0.35;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.4, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.3);
  }
}

function load(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function save(key, timers) {
  try {
    if (timers.length === 0) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(timers));
  } catch {
    // Timers still run on this page; they just won't survive a reload.
  }
}
