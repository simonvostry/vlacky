import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeDesignation } from '../src/components/designation-decoder';

test('historical Bap uses four axles and double-deck, not modern two-axle/open-plan meanings', () => {
  for (const operator of ['ČSD', 'ČSD/ČD', 'ČD']) {
    assert.deepEqual(decodeDesignation('Bap', operator).map(d => [d.letter, d.meaning]), [
      ['B', 'vůz 2. třídy se sedadly'], ['a', 'čtyřnápravový vůz'], ['p', 'patrový vůz'],
    ]);
  }
  assert.equal(decodeDesignation('Bap', 'DB')[1].meaning, 'dvounápravový vůz');
  assert.equal(decodeDesignation('Bdmpee 233', 'ČD').find(d => d.letter === 'p')?.meaning, 'velkoprostorový se středovou uličkou (dálková)');
});
