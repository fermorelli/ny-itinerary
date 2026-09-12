import { el, mapsLink, disclosure } from './dom.js';
import { formatNumber as n } from './data.js';

// Emphasis is text, never HTML from the guide or imported workbook.
export function guideText(text = '') {
  return text.split(/(\*\*[^*]+\*\*)/u).map(part => part.startsWith('**')
    ? el('strong', {}, part.slice(2, -2)) : part);
}

export function guideSegmentIds(guide) {
  return new Set([...(guide?.steps ?? []), ...(guide?.variants ?? []).flatMap(v => v.steps)]
    .flatMap(step => step.segmentIds ?? []));
}

export function journeyMapsUrl(routes) {
  if (!routes.length) return null;
  const first = new URL(routes[0].mapsUrl);
  const last = new URL(routes.at(-1).mapsUrl);
  const origin = first.searchParams.get('origin');
  const destination = last.searchParams.get('destination');
  // For a round trip, consult the outbound journey rather than origin = destination.
  if (!origin || !destination || origin === destination) return routes[0].mapsUrl;
  const url = new URL('https://www.google.com/maps/dir/');
  url.search = new URLSearchParams({ api: '1', origin, destination, travelmode: 'transit' });
  return url.href;
}

function narrative(steps) {
  if (steps.length === 1) return el('p', { class: 'transport-instruction' }, guideText(steps[0].text));
  return el('ol', { class: 'transport-steps' }, steps.map(step => el('li', {}, guideText(step.text))));
}

export function renderTransitGuide(guide, routes) {
  const mainIds = new Set(guide.steps.flatMap(step => step.segmentIds ?? []));
  const mainRoutes = routes.filter(route => mainIds.has(route.id));
  return el('div', { class: 'transport-guide' },
    guide.label ? el('p', { class: 'transport-condition' }, guide.label) : null,
    narrative(guide.steps),
    guide.note ? el('p', { class: 'transport-note' }, guideText(guide.note)) : null,
    mapsLink(guide.mapsUrl ?? journeyMapsUrl(mainRoutes), 'Consultar viaje en Google Maps'),
    (guide.variants ?? []).map(variant => {
      const ids = new Set(variant.steps.flatMap(step => step.segmentIds ?? []));
      return el('div', { class: 'transport-variant' },
        el('p', { class: 'transport-condition' }, variant.label), narrative(variant.steps),
        mapsLink(variant.mapsUrl ?? journeyMapsUrl(routes.filter(route => ids.has(route.id))), 'Consultar esta alternativa en Google Maps'));
    }));
}

export function renderTransitDetails(guide, routes, points, focusPoint, numbers) {
  return disclosure('Detalles del traslado', [
    (guide.details ?? []).map(text => el('p', {}, guideText(text))),
    routes.length ? el('ol', { class: 'transport-legs', 'aria-label': 'Conexiones y enlaces del traslado' }, routes.map(route => {
      const from = points.get(route.from), to = points.get(route.to);
      const label = route.from === route.to ? `Paseo local · ${to.name}` : `${from.name} → ${to.name}`;
      const metric = route.style === 'transit'
        ? `${route.mode} · referencia del itinerario: ~${n(route.transportMinutes, 0)} min`
        : `Caminata de enlace: ${n(route.meters, 0)} m · ~${n(route.walkMinutes, 0)} min`;
      return el('li', { 'data-segment': route.id },
        route.optional ? el('p', { class: 'transport-condition' },
          guide.variants?.find(variant => variant.steps.some(step => step.segmentIds?.includes(route.id)))?.label ?? 'Alternativa') : null,
        el('button', { type: 'button', class: 'segment-place', onclick: () => focusPoint(route.to) }, label,
          el('span', { class: 'point-link-hint' }, numbers.get(route.to) ? `Ver en mapa · ${numbers.get(route.to)} ↗` : 'Ver en mapa ↗')),
        el('p', { class: 'transport-leg-meta' }, metric),
        mapsLink(route.mapsUrl, 'Consultar este tramo en Google Maps'));
    })) : null,
    (guide.sources ?? []).length ? el('div', { class: 'transport-sources' },
      el('span', {}, 'Referencias y estado del servicio'),
      guide.sources.map(source => mapsLink(source.url, source.label))) : null,
  ], { class: 'transport-details' });
}
