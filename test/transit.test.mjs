import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { relateSegments } from '../src/data.js';
import { TRANSIT_GUIDES, segmentInstruction } from '../src/transit-guides.js';
import { guideSegmentIds, journeyMapsUrl } from '../src/transit.js';

const read = name => JSON.parse(readFileSync(new URL(`../public/data/${name}.json`, import.meta.url)));
const days = read('days'), segments = read('segments');

test('las guías cubren todos los tramos de transporte, sin ocultar referencias inexistentes o de otro bloque', () => {
  const assignedIds = [];
  for (const day of days) {
    const routes = segments.filter(segment => segment.day === day.label);
    const { assignments } = relateSegments(day, routes);
    for (const block of day.blocks) {
      const ids = guideSegmentIds(TRANSIT_GUIDES[block.id]);
      const attached = assignments.get(block.id);
      for (const id of ids) assert.ok(attached.some(segment => segment.id === id), `${block.id}: ${id}`);
      for (const segment of attached.filter(segment => segment.style !== 'walk')) {
        assert.ok(ids.has(segment.id), `${block.id}: falta narrativa de ${segment.id}`);
        assert.ok(segmentInstruction(segment.id));
      }
      assignedIds.push(...ids);
    }
  }
  assert.equal(new Set(assignedIds).size, assignedIds.length, 'Una conexión se presenta en un solo bloque');
  assert.ok(Object.keys(TRANSIT_GUIDES).every(id => days.some(day => day.blocks.some(block => block.id === id))));
});

test('el enlace del viaje une los extremos y conserva el tramo de ida para un ferry de ida y vuelta', () => {
  const arrival = ['segment-2', 'segment-3', 'segment-4', 'segment-5'].map(id => segments.find(segment => segment.id === id));
  const before = JSON.stringify(arrival);
  const url = new URL(journeyMapsUrl(arrival));
  assert.equal(url.searchParams.get('origin'), new URL(arrival[0].mapsUrl).searchParams.get('origin'));
  assert.equal(url.searchParams.get('destination'), new URL(arrival.at(-1).mapsUrl).searchParams.get('destination'));
  assert.equal(url.searchParams.get('travelmode'), 'transit');
  const ferry = ['segment-20', 'segment-21'].map(id => segments.find(segment => segment.id === id));
  assert.equal(journeyMapsUrl(ferry), ferry[0].mapsUrl);
  assert.equal(journeyMapsUrl([]), null);
  assert.equal(JSON.stringify(arrival), before);
});
