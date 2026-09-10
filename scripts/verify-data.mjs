import fs from 'node:fs/promises';
import { validateData } from './validate-data.mjs';

const names = ['days', 'points', 'segments', 'logistics'];
const data = Object.fromEntries(await Promise.all(names.map(async name => [name, JSON.parse(await fs.readFile(new URL(`../public/data/${name}.json`, import.meta.url), 'utf8'))])));
const report = validateData(data);
if (report.errors.length) throw new Error(report.errors.join('\n'));
console.log(`Datos verificados: ${data.days.length} días con bloques y segmentos; IDs, coordenadas, horarios y totales consistentes. Observaciones: DATA_AUDIT.md.`);
