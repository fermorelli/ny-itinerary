import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { forecastDay, weatherLabel } from '../src/weather.js';
import { restroomsForDay } from '../src/restrooms.js';

test('Forecast matches exact NYC date and keeps unavailable measurements distinct from zero', () => {
  const data = { daily: { time: ['2026-09-13'], temperature_2m_min: [0], weather_code: [95] }, hourly: { time: ['2026-09-13T23:00', '2026-09-14T00:00'], temperature_2m: [null, 20] } };
  const day = forecastDay(data, '2026-09-13');
  assert.equal(day.min, 0);
  assert.equal(day.rain, null);
  assert.equal(day.hours.length, 1);
  assert.equal(day.hours[0].temperature, null);
  assert.equal(weatherLabel(day.code), 'Tormentas');
  assert.equal(forecastDay(data, '2026-09-18'), null);
  assert.equal(weatherLabel(null), 'Sin datos');
});
test('Bathroom references stay near real daily anchors, preserve itinerary and include all user venues', () => {
  const read = name => JSON.parse(readFileSync(new URL(`../public/data/${name}.json`, import.meta.url)));
  const days = read('days'), segments = read('segments'), points = read('points');
  const original = JSON.stringify({ days, segments, points });
  const all = days.flatMap(day => restroomsForDay(day, segments.filter(s => s.day === day.label), points));
  for (const id of ['trump', 'rockefeller', 'bryant', 'grand-central', 'oculus', 'moynihan', 'library', 'harry-potter']) assert.ok(all.some(p => p.id === `wc-${id}`), id);
  assert.ok(all.every(p => p.meters <= 1000 && Number.isFinite(p.lat) && Number.isFinite(p.lng)));
  assert.equal(JSON.stringify({ days, segments, points }), original);
});

