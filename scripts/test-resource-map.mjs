import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SERVICES } from '../lib/services.ts';
import { toMapEntries, mapServiceId, mapIdsFromResources, mappedIdsFromResources, filterMapEntries, mapFeatures } from '../lib/resource-map.ts';

const entries = toMapEntries(SERVICES);
test('map uses actual directory records and excludes unrelated categories', () => {
  assert.ok(entries.length > 50);
  assert.ok(entries.some(e => e.name === 'Alexander Library' && e.hasLocation));
  assert.ok(entries.every(e => e.categories.length > 0));
  assert.equal(new Set(entries.map(e => e.id)).size, entries.length);
});
test('online resources are never given fabricated coordinates or pins', () => {
  const remote = entries.find(e => e.name === 'Compudopt – Las Vegas');
  assert.ok(remote.remote);
  assert.equal(remote.hasLocation, false);
  assert.deepEqual(remote.categories, ['devices', 'skills']);
  assert.equal(mapFeatures([remote], new Set()).features.length, 0);
  const bad = toMapEntries([{ ...SERVICES[0], lat: 100, long: -115 }]);
  assert.equal(bad[0].hasLocation, false);
});
test('map filters category and keyword without changing the source or selections', () => {
  const count = entries.length;
  const filtered = filterMapEntries(entries, 'devices', 'library');
  assert.ok(filtered.length > 10);
  assert.ok(filtered.every(e => e.categories.includes('devices') && e.name.toLowerCase().includes('library')));
  assert.equal(entries.length, count);
});
test('current-search and selected modes use exact source identities', () => {
  const service = SERVICES[0];
  const resources = [{ id: 's1', category: 'skills', service }, { id: 'internet', category: 'internet', name: 'Not a physical location', plan: {} }];
  const ids = mapIdsFromResources(resources);
  assert.deepEqual([...ids], [mapServiceId(service)]);
  const filtered = filterMapEntries(entries, 'all', '', ids);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].name, service.name);
  assert.equal(filterMapEntries(entries, 'all', '', new Set()).length, 0);
});
test('map feature coordinates and selection flags are correct', () => {
  const local = entries.find(e => e.hasLocation);
  const data = mapFeatures([local], new Set([local.id]));
  assert.deepEqual(data.features[0].geometry.coordinates, [local.long, local.lat]);
  assert.equal(data.features[0].properties.selected, true);
  assert.equal(data.features[0].properties.entryId, local.id);
});
test('map badge counts only resources with real map pins', () => {
  const online = SERVICES.find(s => s.name === 'Compudopt – Las Vegas');
  const local = SERVICES.find(s => s.name === 'Alexander Library' && /device/i.test(s.type));
  assert.equal(mappedIdsFromResources([{ id: 'o', category: 'devices', service: online }]).size, 0);
  assert.equal(mappedIdsFromResources([{ id: 'o', category: 'devices', service: online }, { id: 'l', category: 'devices', service: local }]).size, 1);
  assert.equal(mappedIdsFromResources([{ id: 'i', category: 'internet', plan: {} }]).size, 0);
});
