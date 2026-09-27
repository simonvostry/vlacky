import assert from 'node:assert/strict';
import test from 'node:test';
import { dropdownPosition, typeaheadIndex } from '../src/lib/filter-dropdown';

test('dropdown remains below a toolbar trigger and inside narrow/zoomed viewport edges', () => {
  const anchor = { left: 290, top: 110, bottom: 150, width: 176 };
  const narrow = dropdownPosition(anchor, { left: 0, top: 0, width: 390, height: 844, layoutHeight: 844 });
  assert.equal(narrow.top, 156);
  assert.ok(narrow.left >= 12 && narrow.left + narrow.width <= 378);
  assert.equal(narrow.maxHeight, 640);
  const zoom = dropdownPosition({ ...anchor, left: 220, width: 500 }, { left: 100, top: 80, width: 220, height: 330, layoutHeight: 844 });
  assert.ok(zoom.left >= 112 && zoom.left + zoom.width <= 308);
  assert.ok((zoom.top || 0) + zoom.maxHeight <= 398);
});

test('near the bottom it opens upward with a bounded height', () => {
  const position = dropdownPosition({ left: 20, top: 700, bottom: 740, width: 144 }, { left: 0, top: 0, width: 390, height: 800, layoutHeight: 800 });
  assert.equal(position.bottom, 106);
  assert.equal(position.maxHeight, 640);
  assert.ok(position.bottom + position.maxHeight < 800);
});

test('typeahead handles Czech diacritics, longer prefixes, repeated keys and missing matches', () => {
  const labels = ['Vše', 'Bardotka (751)', 'Bastard (371)', 'Brejlovec (754)', 'ČD', 'ČSD'];
  assert.equal(typeaheadIndex(labels, 'b', 0), 1);
  assert.equal(typeaheadIndex(labels, 'br', 1), 3);
  assert.equal(typeaheadIndex(labels, 'bbb', 2), 3);
  assert.equal(typeaheadIndex(labels, 'bbbb', 3), 1);
  assert.equal(typeaheadIndex(labels, 'cd', 0), 4);
  assert.equal(typeaheadIndex(labels, 'ČS', 4), 5);
  assert.equal(typeaheadIndex(labels, 'xxx', 2), 2);
});


test('moderate lists can open fully, and placement considers the actual content height', () => {
  const viewport = { left: 0, top: 0, width: 1200, height: 1000, layoutHeight: 1000 };
  const toolbar = dropdownPosition({ left: 400, top: 10, bottom: 50, width: 144 }, viewport, 442);
  assert.ok(toolbar.maxHeight >= 442); // twelve rows no longer hit the old 320px limit
  assert.equal(toolbar.top, 56);
  const lower = { left: 400, top: 650, bottom: 690, width: 144 };
  const short = dropdownPosition(lower, viewport, 118);
  assert.equal(short.top, 696); // enough room below for a small list
  const moderate = dropdownPosition(lower, viewport, 442);
  assert.equal(moderate.bottom, 356); // room above avoids an unnecessary scrollbar
  assert.ok(moderate.maxHeight >= 442);
});
