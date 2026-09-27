import test from 'node:test';
import assert from 'node:assert/strict';
import { locomotiveNicknames, nicknameSources, locomotiveNickname } from '../src/lib/locomotive-nicknames';

test('reference table has unique IDs, unambiguous scoped classes and traceable sources', () => {
  const ids = new Set<string>();
  const mappings = new Set<string>();
  for (const row of locomotiveNicknames) {
    assert.ok(!ids.has(row.id), `duplicate family ${row.id}`);
    ids.add(row.id);
    assert.ok(row.classes.length && row.operators.length && row.sources.length);
    for (const source of row.sources) assert.ok(new URL(nicknameSources[source].url).protocol.startsWith('http'));
    for (const operator of row.operators) for (const series of row.classes) {
      const key = `${operator}:${series}`;
      assert.ok(!mappings.has(key), `ambiguous nickname ${key}`);
      mappings.add(key);
      assert.equal(locomotiveNickname(series, operator), row.name);
    }
  }
  assert.equal(locomotiveNickname('754', null), undefined);
  assert.equal(locomotiveNickname('754.99', 'ČD'), undefined);
});
