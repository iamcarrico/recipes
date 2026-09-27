/**
 * Client-side search and tag filtering for the recipe grid.
 *
 * Every card is already in the DOM, so filtering is a matter of hiding rows —
 * no index to fetch and nothing to re-render. The current query and tags are
 * mirrored into the URL so a filtered view can be bookmarked or shared.
 */

import { foldForSearch } from './text.js';

const TAG_SEPARATOR = ',';

export function initSearch(root = document) {
  const grid = root.querySelector('[data-recipe-grid]');
  if (!grid) return;

  const input = root.querySelector('[data-search-input]');
  const tagButtons = [...root.querySelectorAll('[data-tag]')];
  const clearButton = root.querySelector('[data-clear-filters]');
  const status = root.querySelector('[data-result-count]');
  const emptyState = root.querySelector('[data-empty-state]');

  const cards = [...grid.querySelectorAll('[data-recipe]')].map((element) => ({
    element,
    // Hide the list item rather than the card so grid gaps collapse too.
    container: element.closest('li') ?? element,
    haystack: element.dataset.search ?? '',
    tags: (element.dataset.tags ?? '')
      .split(TAG_SEPARATOR)
      .map((tag) => tag.trim())
      .filter(Boolean)
  }));

  const selectedTags = new Set();
  let query = '';

  function matches(card) {
    for (const tag of selectedTags) {
      if (!card.tags.includes(tag)) return false;
    }
    // Every word must appear somewhere, so "mac cheese" narrows rather than widens.
    return query.split(/\s+/).filter(Boolean).every((term) => card.haystack.includes(term));
  }

  function apply({ updateUrl = true } = {}) {
    let visible = 0;

    for (const card of cards) {
      const isMatch = matches(card);
      card.container.hidden = !isMatch;
      if (isMatch) visible += 1;
    }

    const isFiltered = query !== '' || selectedTags.size > 0;

    if (status) {
      status.textContent = isFiltered
        ? `Showing ${visible} of ${cards.length} ${cards.length === 1 ? 'recipe' : 'recipes'}`
        : '';
    }

    if (emptyState) emptyState.hidden = visible !== 0;
    if (clearButton) clearButton.hidden = !isFiltered;

    if (updateUrl) syncUrl();
  }

  function syncUrl() {
    const params = new URLSearchParams(window.location.search);

    if (query) params.set('q', query);
    else params.delete('q');

    if (selectedTags.size > 0) params.set('tags', [...selectedTags].join(TAG_SEPARATOR));
    else params.delete('tags');

    const search = params.toString();
    const url = search ? `${window.location.pathname}?${search}` : window.location.pathname;
    window.history.replaceState(null, '', url);
  }

  function setTagPressedStates() {
    for (const button of tagButtons) {
      button.setAttribute('aria-pressed', selectedTags.has(button.dataset.tag) ? 'true' : 'false');
    }
  }

  if (input) {
    input.addEventListener('input', () => {
      query = foldForSearch(input.value.trim());
      apply();
    });
  }

  for (const button of tagButtons) {
    button.addEventListener('click', () => {
      const tag = button.dataset.tag;
      if (selectedTags.has(tag)) selectedTags.delete(tag);
      else selectedTags.add(tag);
      setTagPressedStates();
      apply();
    });
  }

  if (clearButton) {
    clearButton.addEventListener('click', () => {
      selectedTags.clear();
      query = '';
      if (input) input.value = '';
      setTagPressedStates();
      apply();
      input?.focus();
    });
  }

  restoreFromUrl();
  apply({ updateUrl: false });

  function restoreFromUrl() {
    const params = new URLSearchParams(window.location.search);

    const initialQuery = params.get('q') ?? '';
    if (initialQuery) {
      query = foldForSearch(initialQuery.trim());
      if (input) input.value = initialQuery;
    }

    const initialTags = params.get('tags');
    if (initialTags) {
      const known = new Set(tagButtons.map((button) => button.dataset.tag));
      for (const tag of initialTags.split(TAG_SEPARATOR).map((value) => value.trim())) {
        if (known.has(tag)) selectedTags.add(tag);
      }
      setTagPressedStates();
    }
  }
}
