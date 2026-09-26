import test from 'node:test';
import assert from 'node:assert/strict';
import { filterMemoryHref, hasExplicitFilters, rememberedFilterQuery, resetFilterQuery, isFilterCollection } from '../src/lib/collection-filter-memory';

test('only list routes and filter parameters persist, never detail IDs or arbitrary URLs', () => {
  assert.equal(isFilterCollection('/vozy/108'), false);
  assert.equal(rememberedFilterQuery('/vozy/108', 'op=ČD'), '');
  const query = rememberedFilterQuery('/katalog', 'typ=wagon&op=ČD&rada=B&barvy=1&redirect=https://example.com&filtry=1');
  assert.equal(new URLSearchParams(query).get('op'), 'ČD');
  assert.equal(new URLSearchParams(query).has('redirect'), false);
  assert.equal(rememberedFilterQuery('/vozy', 'typ=loco&barvy=1&rada=B'), 'rada=B');
  assert.equal(rememberedFilterQuery('/vozy', 'op='+ 'x'.repeat(201)), '');
});
test('explicit URLs, including an intentional all selection, override saved filters', () => {
  assert.equal(hasExplicitFilters('/katalog', ''), false);
  assert.equal(hasExplicitFilters('/katalog', 'op=ČD'), true);
  assert.equal(hasExplicitFilters('/katalog', 'op='), true);
  assert.equal(hasExplicitFilters('/vozy', 'filtry=1'), true);
  assert.equal(hasExplicitFilters('/katalog', 'typ=wagon'), true);
  assert.equal(filterMemoryHref('/vozy', ''), '/vozy?filtry=1');
  assert.equal(filterMemoryHref('/vozy', 'op=DB&rada=Bm'), '/vozy?op=DB&rada=Bm&filtry=1');
});
test('reset clears category and hidden filters too but preserves display and unrelated URL state', () => {
  const params = new URLSearchParams(resetFilterQuery('/katalog', 'op=ČD&rada=754&pohon=diesel&skupina=y&typ=loco&barvy=1&other=ok'));
  for(const key of ['op','rada','pohon','skupina','typ']) assert.equal(params.has(key), false);
  assert.equal(params.get('barvy'), '1');
  assert.equal(params.get('filtry'), '1');
  assert.equal(params.get('other'), 'ok');
  assert.equal(rememberedFilterQuery('/katalog', params.toString()), 'barvy=1');
});
