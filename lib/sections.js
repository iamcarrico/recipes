/**
 * Section headings inside ingredient and direction lists.
 *
 * Both lists are flat in front matter. A heading is a line on its own that is
 * either wholly bold (`**Topping**`, `**For the filling:**`, which is what
 * Paprika exports) or short and ends in a colon (`For the crust:`). A bold
 * label followed by more text (`**Oven**: bake 25 minutes`) is not a heading.
 */

const BOLD_LINE = /^\*\*([^*]+?)\*\*\s*:?\s*$/;
const COLON_LINE = /^([^*]+?):\s*$/;
const MAX_PLAIN_HEADING_LENGTH = 60;

/**
 * Coerce a front-matter entry to a string.
 *
 * YAML reads a bare list item that ends in a colon — `- For the crust:` — as a
 * mapping rather than a string, and that is exactly how anyone writing a
 * section heading by hand will type it. Restore the colon instead of making
 * people remember to quote it.
 * @param {unknown} line
 * @returns {string}
 */
export function toLine(line) {
  if (line == null) return '';
  if (typeof line === 'string') return line.trim();

  if (typeof line === 'object' && !Array.isArray(line)) {
    const entries = Object.entries(line);
    if (entries.length === 1) {
      const [key, value] = entries[0];
      return value == null ? `${key}:` : `${key}: ${value}`.trim();
    }
  }

  return String(line).trim();
}

/**
 * The heading text if this line is a section heading, otherwise null.
 * @param {string} line
 * @returns {string|null}
 */
export function headingText(line) {
  const bold = line.match(BOLD_LINE);
  if (bold) return bold[1].trim().replace(/:$/, '').trim();

  const plain = line.match(COLON_LINE);
  // Long colon-terminated lines are sentences introducing a list, not labels.
  if (plain && line.length <= MAX_PLAIN_HEADING_LENGTH && !/[.!?]\s/.test(plain[1])) {
    return plain[1].trim();
  }

  return null;
}

/**
 * Group a flat list into titled sections.
 *
 * Lines before the first heading go in an untitled section. A heading with
 * nothing under it is kept, so a typo never silently swallows a label.
 * @template T
 * @param {unknown[]} lines
 * @param {(line: string) => T} mapItem
 * @param {(line: string) => boolean} [canBeHeading] veto, e.g. lines with a quantity
 * @returns {Array<{title: string|null, items: T[]}>}
 */
export function toSections(lines = [], mapItem, canBeHeading = () => true) {
  const sections = [];
  let current = { title: null, items: [] };

  for (const line of (lines ?? []).map(toLine).filter(Boolean)) {
    const title = canBeHeading(line) ? headingText(line) : null;

    if (title) {
      if (current.title || current.items.length) sections.push(current);
      current = { title, items: [] };
      continue;
    }

    current.items.push(mapItem(line));
  }

  if (current.title || current.items.length) sections.push(current);
  return sections;
}

/** Drop markdown emphasis markers, for plain-text contexts like search and JSON-LD. */
export function stripMarkdown(text) {
  return String(text ?? '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1');
}
