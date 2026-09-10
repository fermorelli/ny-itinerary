import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { relateSegments, pointNumbers } from '../src/data.js';
import { validateData } from '../scripts/validate-data.mjs';

const data = Object.fromEntries(await Promise.all(['days', 'points', 'segments', 'logistics'].map(async name => [name, JSON.parse(await fs.readFile(new URL(`../public/data/${name}.json`, import.meta.url), 'utf8'))])));
const metadata = JSON.parse(await fs.readFile(new URL('../public/data/metadata.json', import.meta.url), 'utf8'));

test('datos importados: referencias, horarios, ritmo y totales concilian con el master', () => {
  assert.deepEqual(validateData(data).errors, []);
  assert.equal(data.days.length, 6);
  assert.equal(data.days.flatMap(d => d.blocks).length, metadata.counts.blocks);
});

test('cada segmento aparece exactamente una vez entre los bloques o los tramos adicionales', () => {
  for (const day of data.days) {
    const segments = data.segments.filter(s => s.day === day.label);
    const { assignments, unassigned, route } = relateSegments(day, segments);
    const displayed = [...assignments.values()].flat().concat(unassigned);
    assert.equal(new Set(displayed.map(s => s.id)).size, segments.length, day.label);
    assert.equal(displayed.length, segments.length, day.label);
    assert.equal(route.length, segments.filter(s => !s.optional).length, `${day.label}: todos los tramos base`);
    for (let i = 1; i < route.length; i++) assert.equal(route[i].from, route[i - 1].to);
  }
});

test('las alternativas añadidas al final se ubican en el recorrido correcto', () => {
  const tuesday = data.days.find(d => d.label === 'Mar 15');
  const segments = data.segments.filter(s => s.day === tuesday.label);
  const { assignments, route } = relateSegments(tuesday, segments);
  const fifth = tuesday.blocks.find(b => b.mapId === 'RADIO_CITY');
  assert.ok(assignments.get(fifth.id).some(s => s.order === 22));
  assert.ok(route.findIndex(s => s.order === 22) < route.findIndex(s => s.order === 20));
  const tram = tuesday.blocks.find(b => b.title.startsWith('Roosevelt'));
  assert.deepEqual(assignments.get(tram.id).map(s => s.order), [10, 11, 12, 13]);
  const park = tuesday.blocks.find(b => b.title === 'Central Park clásico');
  assert.deepEqual(assignments.get(park.id).map(s => s.order), [3, 4, 5, 6, 7, 8]);
  assert.equal(pointNumbers(tuesday, segments, data.points).get('SHEEP_MEADOW'), 2);
});

test('no se pierden buffers sin pin, el bonus sin hora ni el fin al día siguiente', () => {
  const blocks = data.days.flatMap(d => d.blocks);
  assert.ok(blocks.some(b => b.mapId === null && b.bufferMinutes > 0));
  const tudor = blocks.find(b => b.mapId === 'TUDOR_BRIDGE');
  assert.equal(tudor.start, null);
  assert.equal(tudor.durationMinutes, null);
  const night = blocks.find(b => b.mapId === 'LE_BAIN');
  assert.ok(night.end.slice(0, 10) > night.start.slice(0, 10));
  const met = blocks.find(b => b.type === 'Museo');
  assert.equal(met.stayMinutes, data.logistics.parameters.find(p => p.name === 'Met planificado').value);
});

test('la vuelta del ferry queda en el paseo y Chrysler no ocupa el buffer de SUMMIT', () => {
  const monday = data.days.find(d => d.label === 'Lun 14');
  const mondayLinks = relateSegments(monday, data.segments.filter(s => s.day === monday.label));
  const ferry = monday.blocks.find(b => b.title.includes('Ferry ida y vuelta'));
  assert.deepEqual(mondayLinks.assignments.get(ferry.id).map(s => s.order), [11, 12]);
  assert.deepEqual(mondayLinks.assignments.get(monday.blocks.find(b => b.title === 'Pausa post-ferry').id), []);
  const thursday = data.days.find(d => d.label === 'Jue 17');
  const thursdayLinks = relateSegments(thursday, data.segments.filter(s => s.day === thursday.label));
  const grandCentral = thursday.blocks.find(b => b.title === 'Grand Central Terminal');
  assert.ok(thursdayLinks.assignments.get(grandCentral.id).some(s => s.to === 'CHRYSLER'));
  const protectedBuffer = thursday.blocks.find(b => b.title === 'Café, baño y acceso a SUMMIT');
  assert.ok(thursdayLinks.assignments.get(protectedBuffer.id).every(s => !s.optional));
});

test('el validador rechaza una referencia inexistente y una distancia alterada', () => {
  const missing = structuredClone(data);
  missing.segments[0].to = 'NO_EXISTE';
  assert.ok(validateData(missing).errors.some(e => e.includes('NO_EXISTE')));
  const changed = structuredClone(data);
  changed.segments.find(s => s.style === 'walk').meters += 100;
  assert.ok(validateData(changed).errors.some(e => e.includes('total base')));
});
