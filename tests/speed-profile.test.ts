import assert from 'node:assert/strict';
import test from 'node:test';
import { parseSpeedProfile, identicalDirections, profileWarnings } from '../src/lib/speed-profile';
import { fixture } from "./speed-profile-fixture";
test('profile preserves decimals and directional differences; identical detection does not round', () => {
  const p = parseSpeedProfile(fixture);
  assert.equal(p.points[0].forwardKmh, 2.0552878); assert.equal(identicalDirections(p), false);
  assert.equal(identicalDirections({ ...p, points: p.points.map(v => ({ ...v, reverseKmh: v.forwardKmh })) }), true);
  assert.equal(p.measuredOn, '2026-09-19');
  for (const measuredOn of ['2026-02-30', '2026-13-01', '2026-09-19T00:00:00Z']) assert.throws(() => parseSpeedProfile({ ...fixture, measuredOn }));
  for (const forwardKmh of [-1, Infinity, NaN, '3', undefined]) assert.throws(() => parseSpeedProfile({ ...fixture, points: [{ step: 1, forwardKmh, reverseKmh: null }] }));
  for (const points of [[fixture.points[0], fixture.points[0]], [{step:29,forwardKmh:1,reverseKmh:1}], [{step:1,forwardKmh:null,reverseKmh:null}]]) assert.throws(() => parseSpeedProfile({...fixture,points}));
  const missing = parseSpeedProfile({...fixture,points:[{step:1,forwardKmh:0,reverseKmh:null}]});
  assert.equal(missing.points[0].reverseKmh,null); assert.equal(identicalDirections(missing),false);
  const declining=parseSpeedProfile({...fixture,points:[{step:1,forwardKmh:5,reverseKmh:null},{step:2,forwardKmh:4,reverseKmh:null}]});
  assert.equal(profileWarnings(declining).length,1); assert.equal(declining.points[1].forwardKmh,4);
});
