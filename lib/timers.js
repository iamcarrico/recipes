/**
 * Find cooking durations in step text ("bake for 25 minutes", "8-10 min",
 * "1 1/2 hours") and turn them into timer buttons at build time.
 */

import { parseNumber } from '../src/assets/js/quantity.js';

const NUMBER = String.raw`\d+(?:\.\d+)?(?:\s+\d+/\d+)?[½¼¾⅓⅔]?|\d+/\d+|[½¼¾⅓⅔]`;
const UNIT = String.raw`hours?|hrs?|minutes?|mins?|seconds?|secs?`;

// A number, an optional range ("8-10", "40 to 45"), then a time unit. The
// lookbehind stops matches inside other numbers or fractions ("1/2", "3.5").
const DURATION = new RegExp(
  String.raw`(?<![\w./])(${NUMBER})(?:\s*(?:-|–|—|to)\s*(${NUMBER}))?\s*(${UNIT})\b`,
  'gi'
);

const SECONDS_PER = { h: 3600, m: 60, s: 1 };

/**
 * @param {string} text plain text
 * @returns {Array<{index: number, text: string, seconds: number, label: string}>}
 */
export function findDurations(text) {
  const found = [];
  for (const match of String(text).matchAll(DURATION)) {
    const low = parseNumber(match[1]);
    const high = match[2] ? parseNumber(match[2]) : null;
    const perUnit = SECONDS_PER[match[3][0].toLowerCase()];
    if (low == null || low <= 0) continue;

    // For a range, time the low end: that's when to check.
    const seconds = Math.round(low * perUnit);
    // Nobody wants a four-day kitchen timer.
    if (seconds > 24 * 3600) continue;

    found.push({ index: match.index, text: match[0], seconds, label: match[0].replace(/\s+/g, ' ') });
  }
  return found;
}

const CLOCK_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M9.5 2.5h5" /></svg>';

/**
 * Wrap every duration in rendered step HTML in a timer button. Only text
 * between tags is touched, never markup.
 * @param {string} html
 * @returns {string}
 */
export function timerize(html) {
  return String(html ?? '')
    .split(/(<[^>]+>)/)
    .map((part) => {
      if (part.startsWith('<')) return part;
      let result = '';
      let last = 0;
      for (const duration of findDurations(part)) {
        result += part.slice(last, duration.index);
        result +=
          `<button type="button" class="timer-chip" data-timer="${duration.seconds}" ` +
          `aria-label="Start timer: ${escapeAttribute(duration.label)}">` +
          `${CLOCK_ICON}${duration.text}</button>`;
        last = duration.index + duration.text.length;
      }
      return result + part.slice(last);
    })
    .join('');
}

function escapeAttribute(value) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
