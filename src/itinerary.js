import { el, mapsLink, disclosure } from './dom.js';
import { formatNumber as n, time, relateSegments, blockMapPoints, blockMapOptionalPoints, mapNumberLabel } from './data.js';
import { transitGuide, TRANSPORT_NOTE_OVERRIDES } from './transit-guides.js';
import { guideSegmentIds, renderTransitGuide, renderTransitDetails } from './transit.js';

export function segmentLabel(segment) {
  if (segment.style === 'transit') return `${segment.mode} · ~${n(segment.transportMinutes, 2)} min`;
  const walk = `${n(segment.meters, 0)} m · ~${n(segment.walkMinutes, 2)} min a pie`;
  return segment.style === 'mixed' ? `${segment.mode} · Caminata de enlace: ${walk}` : walk;
}

export function segmentItem(segment, points, focusPoint, numbers) {
  const from = points.get(segment.from), to = points.get(segment.to);
  const label = segment.from === segment.to ? `Paseo local · ${to.name}` : `${from.name} → ${to.name}`;
  return el('li', { class: `segment segment--${segment.style}${segment.optional ? ' is-optional' : ''}`, 'data-segment': segment.id },
    el('div', { class: 'segment-metric' }, el('span', { class: `line-sample line-sample--${segment.style}`, 'aria-hidden': true }), segmentLabel(segment), segment.optional ? el('span', { class: 'small-optional' }, 'Opcional') : null),
    el('button', { class: 'segment-place', type: 'button', onclick: () => focusPoint(segment.to) }, label,
      el('span', { class: 'point-link-hint' }, numbers.get(segment.to) ? `Ver en mapa · ${numbers.get(segment.to)} ↗` : 'Ver en mapa ↗')),
    disclosure('Calles y enlace de este tramo', [segment.waypoints ? el('p', {}, segment.waypoints) : null, segment.notes ? el('p', {}, segment.notes) : null, segment.style === 'mixed' ? el('p', { class: 'muted' }, 'El tiempo indicado corresponde solo a la caminata. El horario del bloque incluye el traslado completo.') : null, mapsLink(segment.mapsUrl, 'Abrir ruta en Google Maps')], { class: 'segment-details' }),
  );
}

export function renderItinerary(day, segments, points, numbers, focusPoint) {
  const { assignments, unassigned } = relateSegments(day, segments);
  const list = el('ol', { class: 'timeline' });
  for (const block of day.blocks) {
    const guide = transitGuide(block.id);
    const title = guide?.title ?? block.title;
    const covered = guideSegmentIds(guide);
    const routes = assignments.get(block.id);
    const narratedRoutes = routes.filter(s => covered.has(s.id));
    const baseRoutes = routes.filter(s => !s.optional && !covered.has(s.id));
    const optionalRoutes = routes.filter(s => s.optional && !covered.has(s.id));
    const mapPoints = blockMapPoints(block, routes, numbers);
    const numbered = mapNumberLabel(mapPoints.map(id => numbers.get(id)));
    const optionalMapPoints = blockMapOptionalPoints(block, routes, numbers);
    const optionalLabel = optionalMapPoints.length ? ` · ${mapNumberLabel(optionalMapPoints.map(id => numbers.get(id)))} ${optionalMapPoints.length === 1 ? 'opcional' : 'opcionales'}` : '';
    const point = points.get(block.mapId);
    const mapLabel = numbered ? `Ver en mapa · ${numbered}${optionalLabel}` : point?.category === 'Base' ? 'Ver base en mapa' : 'Ver en mapa';
    const heading = el('span', { class: 'stop-title' }, title);
    const mapNames = mapPoints.length > 1 ? mapPoints.map(id => points.get(id).name).join(', ') : point?.name;
    const mapButton = point || mapPoints.length ? el('button', {
      type: 'button', class: 'stop-map-link', onclick: () => focusPoint(mapPoints.length > 1 ? mapPoints : block.mapId ?? mapPoints[0]),
      'aria-label': `${mapLabel}: ${mapNames}`, title: mapNames,
    }, mapLabel, el('span', { 'aria-hidden': true }, ' ↗')) : null;
    const nextDay = block.end && block.start && block.end.slice(0, 10) !== block.start.slice(0, 10);
    const meta = el('div', { class: 'block-meta' },
      block.durationMinutes !== null ? el('span', {}, guide ? `Tiempo reservado: ${n(block.durationMinutes, 0)} min` : `${n(block.durationMinutes, 0)} min de bloque`) : null,
      block.restMinutes > 0 ? el('span', { class: 'rest-meta' }, `Pausa ${n(block.restMinutes, 0)} min`) : null,
      block.bufferMinutes > 0 ? el('span', { class: 'buffer-meta' }, `Buffer ${n(block.bufferMinutes, 0)} min`) : null);
    const extra = [el('p', {}, `Prioridad: ${block.priority}.`), block.stayMinutes > 0 ? el('p', {}, `Permanencia: ${n(block.stayMinutes, 0)} min.`) : null,
      block.routeNote ? el('p', {}, block.routeNote) : null, block.revision ? el('p', {}, block.revision) : null,
      block.cutOrder ? el('p', {}, `Orden de recorte: ${block.cutOrder}.`) : null, mapsLink(block.mapsUrl)];
    const description = guide?.description ?? (!guide || guide.preserveDescription ? block.detail : null);
    list.append(el('li', { class: `timeline-item${block.optional ? ' timeline-item--optional' : ''}${guide ? ' timeline-item--transport' : ''}`, 'data-block': block.id },
      el('div', { class: 'time-column' }, block.start ? [el('time', { datetime: block.start }, time(block.start)), el('span', { class: 'end-time' }, time(block.end), nextDay ? el('abbr', { title: 'Día siguiente' }, ' +1') : null)] : el('span', { class: 'unscheduled' }, 'Sin hora')),
      el('article', { class: 'stop-content' },
        el('div', { class: 'block-kicker' }, el('span', { class: 'block-type' }, block.type), el('span', { class: block.optional ? 'optional-badge' : 'priority' }, block.optional ? `Opcional${block.priority === 'Bonus' ? ' · Bonus' : ''}` : block.priority)),
        el('h3', {}, heading), mapButton,
        description ? el('p', { class: 'block-description' }, description) : null,
        guide ? renderTransitGuide(guide, narratedRoutes) : null, meta,
        guide ? renderTransitDetails(guide, narratedRoutes, points, focusPoint, numbers) : disclosure('Detalle de la parada', extra, { class: 'stop-details' }),
        baseRoutes.length ? el('ol', { class: 'block-segments', 'aria-label': `Tramos de ${block.title}` }, baseRoutes.map(s => segmentItem(s, points, focusPoint, numbers))) : null,
        optionalRoutes.length ? disclosure('Tramos opcionales', el('ol', { class: 'block-segments' }, optionalRoutes.map(s => segmentItem(s, points, focusPoint, numbers))), { class: 'optional-routes' }) : null,
      ),
    ));
  }
  return el('section', { id: 'itinerary', class: 'itinerary', 'aria-labelledby': 'itinerary-title', tabindex: '-1' },
    el('div', { class: 'section-heading' }, el('h2', { id: 'itinerary-title' }, 'Recorrido'), el('span', {}, `${day.blocks.length} bloques`)),
    el('p', { class: 'section-intro' }, 'Seguí los horarios de arriba hacia abajo. Los números de «Ver en mapa» identifican lugares, no pasos.'), list,
    unassigned.length ? disclosure('Otros tramos del día', el('ol', { class: 'block-segments' }, unassigned.map(s => segmentItem(s, points, focusPoint, numbers)))) : null,
  );
}

export function renderSecondary(day, logistics, extraSections = []) {
  const notes = logistics.notes.filter(item => item.day === day.label);
  const reservations = logistics.reservations.filter(r => r.target.startsWith(day.label) || r.title.startsWith(day.label === 'Dom 13' ? 'Domingo' : '__'));
  const cuts = day.blocks.filter(b => b.cutOrder).sort((a, b) => Number(a.cutOrder) - Number(b.cutOrder));
  const noteList = items => items.map(item => el('div', { class: 'secondary-item' }, el('h4', {}, item.title), el('p', {}, item.text)));
  const sections = [
    disclosure('Notas del día', [el('p', {}, day.marginNote), ...noteList(notes.map(note => {
      const related = note.relation?.split(/\s*(?:\/|→)\s*/u).map(id => day.blocks.find(b => b.mapId === id && b.start)).filter(Boolean) ?? [];
      const text = note.title === 'Opción incorporación tarde' && related.length
        ? `${note.text} Horarios del recorrido actualizado: ${related.map(b => `${b.title}, ${time(b.start)}`).join('; ')}.` : note.text;
      return { ...note, text: TRANSPORT_NOTE_OVERRIDES[note.title] ?? text };
    }))]),
    disclosure('Qué recortar primero', [el('p', {}, day.optionalNote), ...cuts.map(b => el('div', { class: 'secondary-item' }, el('h4', {}, `${b.cutOrder}. ${b.title}`), el('p', {}, b.revision || b.detail)))]),
  ];
  if (reservations.length) sections.push(disclosure('Reservas', reservations.map(r => el('div', { class: 'secondary-item' }, el('h4', {}, r.title), el('p', { class: 'reservation-target' }, r.target), el('p', {}, r.action), el('p', {}, r.note), el('p', { class: 'muted' }, `Plan B / recorte: ${r.alternative}`)))));
  sections.push(...extraSections);
  sections.push(disclosure('Logística para el viaje', [
    ...noteList(logistics.items.filter(item => ['Movilidad', 'Accesibilidad', 'Uso diario', 'Cansancio', 'Clima'].includes(item.section))),
    el('div', { class: 'secondary-item' }, el('h4', {}, 'Antes de salir'),
      el('p', {}, 'Las indicaciones describen el servicio habitual. Revisá cambios de servicio y ascensores antes de viajar. Los horarios del itinerario reservan tiempo; no son salidas confirmadas de tren.'),
      el('p', {}, 'Google Maps consulta el viaje y puede proponer otra combinación. Los detalles de cada traslado conservan los enlaces por tramo.'),
      el('div', { class: 'transport-sources' },
        mapsLink('https://www.mta.info/', 'Estado del servicio MTA'),
        mapsLink('https://www.mta.info/elevator-escalator-status', 'Ascensores y escaleras mecánicas'),
        mapsLink('https://www.mta.info/traintime', 'TrainTime · trenes LIRR'),
        mapsLink('https://www.mta.info/fares-tolls/subway-bus/tap-and-ride', 'OMNY · cómo pagar'))),
  ]));
  const budget = logistics.budget.find(item => item.category === 'Total general');
  if (budget) sections.push(disclosure('Presupuesto de referencia', [el('p', { class: 'budget-total' }, `USD ${n(budget.minUsd, 0)}–${n(budget.maxUsd, 0)}`), el('p', {}, budget.note), el('p', { class: 'muted' }, 'Estimación conservada del master. Las incorporaciones nuevas no recalculan este presupuesto.') ]));
  return el('section', { class: 'secondary', 'aria-label': 'Información para el día' }, ...sections);
}
