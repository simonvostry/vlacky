import test from 'node:test';
import assert from 'node:assert/strict';
import { facetOptions, matchesFilters, selectedFilters, traction, vehicleClass, vehicleFacets, wagonFamily, UNKNOWN } from '../src/lib/collection-filters';
import { groupVehicles } from '../src/lib/wagon-variants';

test('traction distinguishes Desiro, Czech electric/diesel and steam; unknown foreign classes stay unknown', () => {
  const loco = (designation: string, operator = 'ČD') => ({ designation, operator, type: 'loco' });
  assert.equal(traction(loco('642', 'Vogtlandbahn')), 'diesel');
  assert.equal(traction(loco('388.2', 'RJ')), 'electric');
  assert.equal(traction(loco('754 061-0')), 'diesel');
  assert.equal(vehicleClass('754.061', true), '754');
  assert.equal(traction(loco('498.1', 'ČSD')), 'steam');
  assert.equal(traction(loco('362', 'Unknown railway')), UNKNOWN);
  assert.equal(traction(loco('999')), UNKNOWN);
  assert.equal(traction(loco('681')), 'electric');
  assert.equal(traction(loco('646')), 'diesel');
  assert.equal(traction(loco('063')), UNKNOWN); // unpowered intermediate vehicle

});
test('construction filters use compatible references and resolve only unambiguous legacy groups', () => {
  const catalog = [
    { id: 1, designation: 'BDs', code: '449', operator: 'ČD', wagonFamily: 'CD_Y' },
    { id: 2, designation: 'BDs', code: '450', operator: 'ČD', wagonFamily: 'CD_Y' },
    { id: 3, designation: 'Bmz', code: null, operator: 'RJ', wagonFamily: 'CD_Z' },
  ];
  const wagon = (designation: string, operator = 'ČD', catalogId: number | null = null) => ({ designation, operator, type: 'wagon', catalogId });
  assert.equal(wagonFamily(wagon('BDs'), catalog), 'y');
  assert.equal(wagonFamily(wagon('BDs 450'), catalog), 'y');
  assert.equal(wagonFamily(wagon('BDs 999'), catalog), UNKNOWN);
  assert.equal(wagonFamily(wagon('Bmz', 'DLB', 3), catalog), UNKNOWN);
  assert.equal(wagonFamily(wagon('Bdmteeo 294'), catalog), 'doubledeck');
  assert.equal(wagonFamily(wagon('BDs'), [...catalog, { ...catalog[1], id: 4, wagonFamily: 'CD_Z' }]), UNKNOWN);
});
test('composed filters retain entire variant quantities and exclude no unrelated dimensions', () => {
  const vehicles = [1, 2, 3].map(id => ({ id, type: 'wagon', wagonVariantId: id === 3 ? 2 : 1, designation: 'Rils', operator: id === 3 ? 'DB Cargo' : 'ČD Cargo' }));
  const groups = groupVehicles(vehicles);
  const selected = selectedFilters({ op: 'ČD Cargo', rada: 'Rils', pohon: 'diesel' });
  const visible = groups.filter(g => matchesFilters(vehicleFacets(g.vehicle), selected, ['op', 'rada']));
  assert.equal(visible.length, 1);
  assert.equal(visible[0].pieces.length, 2);
  assert.equal(matchesFilters(vehicleFacets(vehicles[0]), selectedFilters({ rada: 'missing' }), ['rada']), false);
  assert.equal(selectedFilters({ op: ['ČD', 'RJ'] }).op, 'ČD');
  assert.equal(facetOptions(vehicles.map(v => vehicleFacets(v)), 'rada').length, 1);
  assert.ok(facetOptions([], 'pohon').some(o => o.value === 'steam'));
});
