/**
 * Tick off ingredients and steps while cooking.
 *
 * Ingredients are real checkboxes; steps are toggle buttons (their number).
 * Both carry a `data-check` key. Progress is saved per recipe so a reload or a
 * locked phone doesn't lose your place, but it expires after a day so the
 * next time you make the recipe you start fresh.
 */

const STORAGE_PREFIX = 'checked:';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function initChecklist(root = document) {
  const boxes = [...root.querySelectorAll('input[data-check]')];
  const stepButtons = [...root.querySelectorAll('button[data-check]')];
  if (boxes.length === 0 && stepButtons.length === 0) return;

  const storageKey = STORAGE_PREFIX + window.location.pathname;
  const reset = root.querySelector('[data-checks-reset]');
  const checked = load(storageKey);

  function render() {
    for (const box of boxes) box.checked = checked.has(box.dataset.check);
    for (const button of stepButtons) {
      const done = checked.has(button.dataset.check);
      button.setAttribute('aria-pressed', done ? 'true' : 'false');
      button.closest('[data-step]')?.classList.toggle('is-done', done);
    }
    if (reset) reset.hidden = checked.size === 0;
  }

  function toggle(key, on) {
    if (on) checked.add(key);
    else checked.delete(key);
    save(storageKey, checked);
    render();
  }

  for (const box of boxes) {
    box.addEventListener('change', () => toggle(box.dataset.check, box.checked));
  }

  for (const button of stepButtons) {
    button.addEventListener('click', () => toggle(button.dataset.check, !checked.has(button.dataset.check)));

    // A tap anywhere on the step works too, except on its own controls
    // (timers, links) and when selecting text.
    const step = button.closest('[data-step]');
    step?.addEventListener('click', (event) => {
      if (event.target.closest('button, a')) return;
      if (String(window.getSelection?.() ?? '')) return;
      button.click();
    });
  }

  reset?.addEventListener('click', () => {
    checked.clear();
    save(storageKey, checked);
    render();
  });

  render();
}

function load(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (!saved || Date.now() - saved.savedAt > MAX_AGE_MS) return new Set();
    return new Set(saved.checked);
  } catch {
    return new Set(); // storage blocked or corrupt: start fresh
  }
}

function save(key, checked) {
  try {
    if (checked.size === 0) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify({ checked: [...checked], savedAt: Date.now() }));
  } catch {
    // Not persisted, but ticking still works on the page.
  }
}
