import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import XLSX from 'xlsx';
import { validateData } from './validate-data.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const input = path.resolve(root, process.argv[2] || 'source/itinerario_nyc_2026_master_mapa_routing_auditado.xlsx');
const bytes = await fs.readFile(input);
const workbook = XLSX.read(bytes, { type: 'buffer', cellDates: false });
const warnings = [];

function rows(name, header, fields) {
  const sheet = workbook.Sheets[name];
  if (!sheet) throw new Error(`Falta la hoja ${name}`);
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
  const headerRow = raw.findIndex(row => row[0] === header);
  if (headerRow < 0) throw new Error(`No se encuentra el encabezado ${header} en ${name}`);
  const headers = raw[headerRow];
  for (const title of Object.values(fields)) {
    if (!headers.includes(title)) throw new Error(`Falta la columna ${name}: ${title}`);
  }
  return raw.slice(headerRow + 1).flatMap((row, i) => {
    if (row[0] === null || row[0] === undefined) return [];
    const data = { sourceRow: headerRow + i + 2 };
    for (const [key, title] of Object.entries(fields)) {
      const value = row[headers.indexOf(title)];
      data[key] = value === '' ? null : (value ?? null);
    }
    return [data];
  });
}

// Read Excel serial dates directly. No timezone conversion and no formula recalculation.
function dateTime(value, context) {
  if (value === null) return null;
  if (typeof value !== 'number') throw new Error(`Fecha/hora inválida en ${context}: ${value}`);
  const d = XLSX.SSF.parse_date_code(value);
  if (!d) throw new Error(`Fecha/hora inválida en ${context}`);
  const pad = n => String(n).padStart(2, '0');
  return `${d.y}-${pad(d.m)}-${pad(d.d)}T${pad(d.H)}:${pad(d.M)}`;
}
const dayKey = label => label.match(/^(Dom|Lun|Mar|Mié|Jue|Vie) \d+$/u);
function flag(value, context) {
  if (value === 'Sí') return true;
  if (value === 'No') return false;
  throw new Error(`Se esperaba Sí/No en ${context}; recibido: ${value}`);
}

const summary = rows('00_Resumen', 'Día', {
  label: 'Día', title: 'Ruta principal', start: 'Inicio', end: 'Fin base',
  baseKm: 'Ruta a pie base km', walkMinutes: 'Tiempo a pie base min', incidentalKm: 'Caminata incidental km',
  totalKm: 'Total km aprox.', restMinutes: 'Descanso reservado min', bufferMinutes: 'Buffer / imprevistos min',
  marginNote: 'Revisión de margen', optionalNote: 'Impacto de opcionales',
}).filter(row => dayKey(String(row.label)));

const blocks = rows('01_Itinerario', 'Día', {
  day: 'Día', date: 'Fecha', order: 'Orden', start: 'Inicio', end: 'Fin', type: 'Tipo',
  title: 'Actividad / Lugar', detail: 'Detalle', mode: 'Modo', stayMinutes: 'Permanencia min',
  restMinutes: 'Descanso min', bufferMinutes: 'Buffer min', durationMinutes: 'Duración planificada min',
  priority: 'Prioridad', optional: 'Opcional', cutOrder: 'Orden recorte', isNew: 'Nuevo', mapId: 'Map_ID',
  mapQuery: 'Map Query', mapsUrl: 'Abrir en Google Maps', routeNote: 'Nota de recorrido', revision: 'Revisión',
}).map(row => ({ ...row, id: `block-${row.sourceRow}`, date: dateTime(row.date, `01 fila ${row.sourceRow}`)?.slice(0, 10),
  start: dateTime(row.start, `01 fila ${row.sourceRow}`), end: dateTime(row.end, `01 fila ${row.sourceRow}`),
  optional: flag(row.optional, `01 fila ${row.sourceRow}`), isNew: flag(row.isNew, `01 fila ${row.sourceRow}`) }));

const points = rows('02_Map_Points', 'Map_ID', {
  id: 'Map_ID', name: 'Lugar', query: 'Query geocoder', address: 'Dirección / referencia', category: 'Categoría',
  days: 'Días', isNew: 'Nuevo', priority: 'Prioridad pin', lat: 'Latitud', lng: 'Longitud', geocodeStatus: 'Estado geocode',
  mapsUrl: 'Abrir en Google Maps', notes: 'Notas', source: 'Fuente', precision: 'Precisión coord',
  coordinateSource: 'Fuente coord / locator', mapUse: 'Uso en mapa', needsReview: 'Revisar antes de publicar',
}).map(row => ({ ...row, isNew: flag(row.isNew, `02 fila ${row.sourceRow}`), needsReview: flag(row.needsReview, `02 fila ${row.sourceRow}`) }));

const segments = rows('03_Map_Segments', 'Día', {
  day: 'Día', order: 'Orden', from: 'From_ID', to: 'To_ID', mode: 'Modo',
  provisionalMeters: 'Distancia a pie m (provisional)', provisionalWalkMinutes: 'Tiempo a pie min',
  sourceTransportMinutes: 'Tiempo transporte plan min', optional: 'Opcional', group: 'Grupo ruta', style: 'Estilo mapa',
  isNew: 'Nuevo', provisionalConfidence: 'Confianza distancia', verifyOnMap: 'Verificar en mapa', notes: 'Notas',
  meters: 'Distancia auditada m', walkMinutes: 'Min a 100 m/min', waypoints: 'Ruta / calles / waypoint',
  mapsUrl: 'URL Google Maps ruta', routingSource: 'Fuente routing', routingStatus: 'Estado routing',
  confidence: 'Confianza auditada', auditDate: 'Fecha auditoría',
}).map(row => ({ ...row, id: `segment-${row.sourceRow}`, optional: flag(row.optional, `03 fila ${row.sourceRow}`),
  isNew: flag(row.isNew, `03 fila ${row.sourceRow}`),
  transportMinutes: row.style === 'transit' ? row.sourceTransportMinutes : null }));

const logistics = {
  items: rows('04_Logistica', 'Sección', { section: 'Sección', title: 'Tema', text: 'Información', source: 'Fuente / nota' }),
  budget: rows('05_Presupuesto', 'Categoría', { category: 'Categoría', title: 'Concepto', minUsd: 'Mín USD', maxUsd: 'Máx USD', scope: 'Tipo', note: 'Nota' }),
  reservations: rows('06_Reservas_Opciones', 'Prioridad', { priority: 'Prioridad', title: 'Elemento', target: 'Día / hora objetivo', action: 'Acción', fixed: '¿Fijo?', cost: 'Costo / referencia', alternative: 'Plan B / recorte', note: 'Nota' }),
  sources: rows('07_Fuentes', 'Fuente / tema', { title: 'Fuente / tema', url: 'URL', use: 'Uso en la guía', status: 'Estado' }),
  notes: rows('08_Detalle_Guia', 'Día / sección', { day: 'Día / sección', title: 'Tema', text: 'Detalle preservado / revisado', relation: 'Map_ID / relación', source: 'Fuente' }),
  audit: rows('09_Auditoria_Mapa', 'Día', { day: 'Día', baseKm: 'Km base auditados', walkMinutes: 'Min caminata base', optionalKm: 'Km opcionales/spurs', webRoutes: 'Rutas web verificadas', manualRoutes: 'Rutas auditadas manual', transitRoutes: 'Transporte', note: 'Lectura rápida' }).filter(row => dayKey(String(row.day))),
  parameters: rows('99_Parametros', 'Parámetro', { name: 'Parámetro', value: 'Valor', unit: 'Unidad / uso', note: 'Nota' }),
};

const knownDays = new Set(summary.map(row => row.label));
for (const block of blocks) {
  if (!knownDays.has(block.day)) throw new Error(`01_Itinerario fila ${block.sourceRow}: día desconocido ${block.day}. No se descartó ni importó ningún bloque.`);
}
const days = summary.map(row => {
  const dailyBlocks = blocks.filter(block => block.day === row.label).sort((a, b) => a.order - b.order);
  return { ...row, id: dailyBlocks[0]?.date, date: dailyBlocks[0]?.date,
    start: dateTime(row.start, `00 fila ${row.sourceRow}`), end: dateTime(row.end, `00 fila ${row.sourceRow}`), blocks: dailyBlocks };
});

for (const [name, sheet] of Object.entries(workbook.Sheets)) {
  for (const [address, cell] of Object.entries(sheet)) {
    if (!address.startsWith('!') && cell.t === 'e') throw new Error(`Error de Excel en ${name}!${address}`);
  }
}

const report = validateData({ days, points, segments, logistics });
if (report.errors.length) throw new Error(report.errors.join('\n'));
warnings.push(...report.warnings);
const metadata = {
  source: path.basename(input), sha256: createHash('sha256').update(bytes).digest('hex'),
  sheets: workbook.SheetNames, counts: { days: days.length, blocks: blocks.length, points: points.length, segments: segments.length },
  warnings,
};
const out = path.join(root, 'public/data');
await fs.mkdir(out, { recursive: true });
for (const [name, data] of Object.entries({ days, points, segments, logistics, metadata })) {
  await fs.writeFile(path.join(out, `${name}.json`), JSON.stringify(data, null, 2) + '\n');
}
const reportText = `# Auditoría de importación\n\nFuente: ${metadata.source}\n\nSHA-256: ${metadata.sha256}\n\n${days.length} días, ${blocks.length} bloques, ${points.length} puntos, ${segments.length} segmentos.\n\nTodos los Map_ID / From_ID / To_ID utilizados existen. Los cuatro archivos de contenido conservan los valores del master y la fila de origen.\n\n## Observaciones del master\n\n${warnings.map(w => `- ${w}`).join('\n')}\n\nNo se recalculan rutas, horarios ni el presupuesto. Los totales se verifican, no se reemplazan. Las fórmulas se leen desde sus resultados guardados: guardar el Excel recalculado antes de importar.\n`;
await fs.writeFile(path.join(root, 'DATA_AUDIT.md'), reportText);
console.log(`Importado: ${days.length} días · ${blocks.length} bloques · ${points.length} puntos · ${segments.length} segmentos.`);
for (const day of days) console.log(`${day.label}: ${day.blocks.length} bloques · ${day.baseKm} km base · ${day.walkMinutes} min · ${day.restMinutes} min descanso · ${day.bufferMinutes} min buffer`);
console.log(`${warnings.length} observaciones documentadas en DATA_AUDIT.md. Sin referencias inexistentes.`);
