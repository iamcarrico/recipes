/**
 * Serving-size scaler.
 *
 * Quantities are parsed at build time into data attributes, so scaling here is
 * pure arithmetic plus re-formatting — no parsing in the browser, and the same
 * formatting rules as the build (see quantity.js).
 */

import { formatAmount } from './quantity.js';

const HIGHLIGHT_MS = 700;

export function initScaler(root = document) {
  const scaler = root.querySelector('[data-scaler]');
  if (!scaler) return;

  const buttons = [...scaler.querySelectorAll('[data-scale]')];
  const amounts = [...root.querySelectorAll('[data-amount]')].map((element) => ({
    element,
    amount: readAmount(element)
  }));
  const servings = root.querySelector('[data-servings]');
  const notice = root.querySelector('[data-scale-notice]');

  function scaleTo(multiplier) {
    for (const { element, amount } of amounts) {
      const next = formatAmount(amount, multiplier);
      if (next === element.textContent) continue;

      element.textContent = next;
      flash(element);
    }

    if (servings) {
      const amount = readAmount(servings);
      if (amount.quantity != null) {
        servings.textContent = [
          servings.dataset.prefix,
          formatAmount(amount, multiplier),
          servings.dataset.suffix
        ]
          .filter(Boolean)
          .join(' ');
      }
    }

    for (const button of buttons) {
      button.setAttribute(
        'aria-pressed',
        Number(button.dataset.scale) === multiplier ? 'true' : 'false'
      );
    }

    // Step text still quotes the original amounts; say so rather than pretend.
    if (notice) notice.hidden = multiplier === 1;
  }

  for (const button of buttons) {
    button.addEventListener('click', () => {
      const multiplier = Number(button.dataset.scale);
      if (Number.isFinite(multiplier) && multiplier > 0) scaleTo(multiplier);
    });
  }
}

function readAmount(element) {
  const quantity = Number(element.dataset.qty);
  const quantityMax = Number(element.dataset.qtyMax);

  return {
    quantity: Number.isFinite(quantity) && element.dataset.qty !== undefined ? quantity : null,
    quantityMax: element.dataset.qtyMax !== undefined && Number.isFinite(quantityMax) ? quantityMax : null,
    unit: element.dataset.unit ?? ''
  };
}

function flash(element) {
  element.classList.remove('is-changed');
  // Force a reflow so the class re-triggers when scaling twice in a row.
  void element.offsetWidth;
  element.classList.add('is-changed');
  window.setTimeout(() => element.classList.remove('is-changed'), HIGHLIGHT_MS);
}
