export function validateData({ days, points, segments, logistics }) {
  const errors = [], warnings = [];
  const ids = new Set(points.map(p => p.id));
  const labels = new Set(days.map(d => d.label));
  if (days.length !== 6) errors.push(`Se esperan 6 días; encontrados ${days.length}.`);
  if (labels.size !== days.length || new Set(days.map(d => d.id)).size !== days.length) errors.push('Días duplicados.');
  if (ids.size !== points.length) errors.push('Map_ID duplicado en 02_Map_Points.');
  for (const point of points) {
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng) || Math.abs(point.lat) > 90 || Math.abs(point.lng) > 180) errors.push(`Coordenadas inválidas: ${point.id}, 02 fila ${point.sourceRow}.`);
  }
  const close = (a, b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 0.00001;
  const rhythm = logistics.parameters.find(p => p.name === 'Ritmo caminata')?.value;
  if (rhythm !== 100) errors.push(`Ritmo de caminata inesperado: ${rhythm}; revisar la presentación antes de importar.`);
  for (const segment of segments) {
    if (!labels.has(segment.day)) errors.push(`Día desconocido en 03 fila ${segment.sourceRow}: ${segment.day}.`);
    for (const id of [segment.from, segment.to]) if (!ids.has(id)) errors.push(`Map_ID inexistente: ${id}, 03 fila ${segment.sourceRow}.`);
    if (!['walk', 'mixed', 'transit'].includes(segment.style)) errors.push(`Estilo no reconocido: 03 fila ${segment.sourceRow}.`);
    if (segment.style !== 'transit' && (!close(segment.meters / rhythm, segment.walkMinutes) || segment.meters < 0)) errors.push(`Distancia/minutos auditados inválidos: 03 fila ${segment.sourceRow}.`);
    if (segment.style === 'transit' && !Number.isFinite(segment.transportMinutes)) errors.push(`Tiempo transporte faltante: 03 fila ${segment.sourceRow}.`);
    if (!segment.mapsUrl) warnings.push(`03 fila ${segment.sourceRow}: falta URL del tramo ${segment.from} → ${segment.to}.`);
    if (segment.from === segment.to) warnings.push(`03 fila ${segment.sourceRow}: paseo local ${segment.from} (${segment.meters} m), con waypoint textual y sin coordenadas intermedias. Se muestra en el pin, sin inventar un circuito.`);
  }
  for (const day of days) {
    if (!day.blocks.length) errors.push(`${day.label}: sin bloques.`);
    if (new Set(day.blocks.map(b => b.order)).size !== day.blocks.length) errors.push(`${day.label}: orden de bloques duplicado.`);
    const segs = segments.filter(s => s.day === day.label);
    if (!segs.length) errors.push(`${day.label}: sin segmentos.`);
    if (new Set(segs.map(s => s.order)).size !== segs.length) errors.push(`${day.label}: orden de segmentos duplicado.`);
    const base = segs.filter(s => !s.optional);
    const sum = (items, key) => items.reduce((n, item) => n + (item[key] ?? 0), 0);
    if (!close(sum(base, 'meters') / 1000, day.baseKm) || !close(sum(base, 'walkMinutes'), day.walkMinutes)) errors.push(`${day.label}: total base de 00 no coincide con distancias auditadas de 03.`);
    if (!close(sum(day.blocks, 'restMinutes'), day.restMinutes) || !close(sum(day.blocks, 'bufferMinutes'), day.bufferMinutes)) errors.push(`${day.label}: descansos/buffers de 00 no coinciden con 01.`);
    if (!close(day.baseKm + day.incidentalKm, day.totalKm)) errors.push(`${day.label}: total aproximado inconsistente en 00.`);
    const audit = logistics.audit.find(a => a.day === day.label);
    if (!audit || !close(day.baseKm, audit.baseKm) || !close(day.walkMinutes, audit.walkMinutes) || !close(sum(segs.filter(s => s.optional), 'meters') / 1000, audit.optionalKm)) errors.push(`${day.label}: totales de 09 no coinciden con 00/03.`);
    for (const block of day.blocks) {
      if (block.day !== day.label || block.date !== day.date || (block.start && !block.start.startsWith(day.date))) errors.push(`01 fila ${block.sourceRow}: día/fecha no coincide con el resumen.`);
      if (block.mapId && !ids.has(block.mapId)) errors.push(`Map_ID inexistente: ${block.mapId}, 01 fila ${block.sourceRow}.`);
      for (const key of ['restMinutes', 'bufferMinutes', 'stayMinutes']) if (!Number.isFinite(block[key]) || block[key] < 0) errors.push(`01 fila ${block.sourceRow}: ${key} inválido.`);
      if ((block.start === null) !== (block.end === null)) errors.push(`01 fila ${block.sourceRow}: horario incompleto.`);
      if (block.start && block.end) {
        const duration = (Date.parse(block.end + ':00Z') - Date.parse(block.start + ':00Z')) / 60000;
        if (!close(duration, block.durationMinutes) || duration < 0) errors.push(`01 fila ${block.sourceRow}: duración no coincide con horario.`);
      }
      if (block.optional && block.mapId && segs.some(s => !s.optional && s.to === block.mapId) && !day.blocks.some(b => !b.optional && b.mapId === block.mapId)) warnings.push(`${day.label}, 01 fila ${block.sourceRow}: ${block.title} es opcional en la agenda pero tiene acceso incluido en los segmentos base. Se conservan ambas marcas y los totales del resumen.`);
    }
  }
  const review = points.filter(p => p.needsReview);
  warnings.push(`${review.length} pins marcados para revisión por el master: ${review.map(p => p.id).join(', ')}. Se conservan las coordenadas y precisión originales.`);
  warnings.push('03: las filas de regreso/base pueden estar añadidas al final (lunes WHITEHALL → CHELSEA_BASE, martes ROCKEFELLER → RADIO_CITY, jueves NYPL_MAIN → GRAND_CENTRAL). El mapa dibuja cada From_ID → To_ID; no une filas consecutivas ni suma alternativas al total base.');
  warnings.push('03: la columna H conserva tiempos previos también en tramos a pie/mixtos. Solo se presenta como transporte en estilo transit; para caminar se usa Q. En tramos mixtos no hay duración total de transporte desglosada.');
  warnings.push('09: los km opcionales son la suma bruta de ramas; algunas reemplazan tramos base. No se presentan como aumento neto ni se suman al resumen.');
  const late = logistics.notes.find(note => note.title === 'Opción incorporación tarde');
  if (late) {
    const related = late.relation?.split(/\s*(?:\/|→)\s*/u).map(id => days.flatMap(d => d.blocks).find(b => b.day === late.day && b.mapId === id && b.start)).filter(Boolean) ?? [];
    warnings.push(`08_Detalle_Guia fila ${late.sourceRow}: nota de incorporación tardía preservada: «${late.text}». Horarios de 01: ${related.map(b => `${b.title} ${b.start.slice(11)}`).join('; ')}. La nota no reemplaza la agenda.`);
  }
  const night = days.flatMap(d => d.blocks).find(b => b.type === 'Salida de pareja');
  const booking = logistics.reservations.find(r => r.title === 'Noche de pareja');
  if (night && booking) warnings.push(`06 fila ${booking.sourceRow}: objetivo «${booking.target}». 01 fila ${night.sourceRow}: ${night.start}–${night.end}. Se conservan el objetivo y el bloque completo.`);
  const promenade = segments.find(s => s.from === 'BK_PROMENADE' && s.to === s.from && s.waypoints?.includes('Orange'));
  if (promenade) warnings.push(`03 fila ${promenade.sourceRow}: la descripción de Promenade avanza hasta Orange; origen y destino usan el mismo pin. Se conservan el texto y el enlace literal, sin inventar geometría.`);
  for (const item of logistics.items.filter(item => /provisional/iu.test(item.text))) warnings.push(`04 fila ${item.sourceRow}: texto heredado sobre distancias provisionales. Prevalecen las columnas auditadas P/Q de 03.`);
  for (const source of logistics.sources.filter(source => /rutear|recalcul|provisional/iu.test(`${source.use} ${source.status}`))) warnings.push(`07 fila ${source.sourceRow}: nota heredada de routing pendiente. La importación no recalcula rutas ni horarios.`);
  return { errors, warnings };
}
