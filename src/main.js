import './styles.css';
import { loadData, dayName, formatNumber as n, pointNumbers } from './data.js';
import { el } from './dom.js';
import { renderItinerary, renderSecondary } from './itinerary.js';
import { createDayMap } from './map.js';

const app = document.getElementById('app');
let dayMap, activeId;

async function start() {
  const data = await loadData();
  const pointLookup = new Map(data.points.map(p => [p.id, p]));
  const tabs = document.getElementById('days');
  tabs.replaceChildren(...data.days.map(day => {
    const [weekday, date] = day.label.split(' ');
    return el('button', { type: 'button', class: 'day-tab', 'data-day': day.id, 'aria-label': dayName(day.date), onclick: () => {
      if (activeId === day.id) return;
      history.replaceState(null, '', `#${day.id}`);
      showDay(day);
      document.querySelector('.day-nav').scrollIntoView({ block: 'start' });
    } }, el('span', { class: 'day-weekday' }, weekday), el('span', { class: 'day-date' }, date));
  }));

  function showDay(day) {
    dayMap?.destroy();
    activeId = day.id;
    document.title = `${day.label} · NYC septiembre 2026`;
    for (const button of tabs.children) {
      button.classList.toggle('is-active', button.dataset.day === day.id);
      button.setAttribute('aria-pressed', String(button.dataset.day === day.id));
    }
    const segments = data.segments.filter(s => s.day === day.label);
    const numbers = pointNumbers(day, segments, data.points);
    const focusPoint = id => {
      const panel = document.getElementById('map-section');
      if (panel.getBoundingClientRect().bottom < 150 || panel.getBoundingClientRect().top < 0) panel.scrollIntoView({ block: 'start' });
      dayMap?.focus(id);
      document.getElementById('selection-status').textContent = `${pointLookup.get(id)?.name ?? ''} seleccionado en el mapa.`;
    };
    const metrics = el('dl', { class: 'metrics' },
      metric(`${n(day.baseKm)} km`, 'ruta base'), metric(`~${n(day.walkMinutes, 0)} min`, 'caminando'),
      metric(`${n(day.restMinutes, 0)} min`, 'descansos', 'metric--rest'), metric(`${n(day.bufferMinutes, 0)} min`, 'buffer', 'metric--buffer'));
    const summary = el('section', { class: 'day-summary', 'aria-labelledby': 'day-title' },
      el('div', { class: 'day-overview' }, el('p', { class: 'eyebrow' }, dayName(day.date)), el('h1', { id: 'day-title' }, day.title)),
      el('div', { class: 'summary-numbers' }, metrics, el('p', { class: 'metrics-note' }, `~${n(day.totalKm)} km con caminata incidental. Minutos de la ruta base, a 100 m/min.`)),
    );
    const mapContainer = el('div', { id: 'day-map', class: 'day-map', role: 'region', 'aria-label': `Mapa del ${dayName(day.date)}` });
    const mapPanel = el('section', { id: 'map-section', class: 'map-panel', 'aria-labelledby': 'map-title' },
      el('div', { class: 'section-heading map-heading' }, el('h2', { id: 'map-title' }, 'Mapa del día'), el('button', { type: 'button', class: 'fit-button', onclick: () => dayMap?.fit(), 'aria-label': 'Ver el recorrido completo en el mapa' }, el('span', { 'aria-hidden': true }, '⌗ '), 'Ver todo')),
      mapContainer,
      el('div', { class: 'map-legend', 'aria-label': 'Leyenda del mapa' }, legend('A pie', 'walk'), legend('Transporte / mixto', 'transit'), legend('Opcional', 'optional')),
      el('p', { class: 'map-caption' }, 'Líneas orientativas. Abrí Google Maps para seguir la ruta.'),
      el('p', { class: 'map-touch-note' }, 'Deslizá para seguir leyendo. Acercá el mapa con dos dedos.'),
      el('p', { id: 'tile-notice', hidden: true, class: 'tile-notice', role: 'status' }, 'No se pudo cargar parte del mapa base. El itinerario y los enlaces siguen disponibles.'),
      el('p', { id: 'selection-status', class: 'sr-only', 'aria-live': 'polite' }),
    );
    const context = el('div', { class: 'day-context' }, el('span', { class: 'context-symbol', 'aria-hidden': true }, '↳'), el('p', {}, day.marginNote));
    const itinerary = renderItinerary(day, segments, pointLookup, numbers, focusPoint);
    const detailColumn = el('div', { class: 'detail-column' }, itinerary, renderSecondary(day, data.logistics));
    app.replaceChildren(summary,
      el('p', { class: 'time-note' }, 'Las pausas y los buffers ya están dentro de los horarios.'),
      el('div', { class: 'day-layout' }, el('aside', { class: 'map-column' }, mapPanel, context), detailColumn));
    app.setAttribute('aria-busy', 'false');
    dayMap = createDayMap(mapContainer, day, segments, data.points, numbers);
  }
  function fromHash() {
    const selected = data.days.find(day => day.id === location.hash.slice(1)) || data.days[0];
    if (selected.id !== activeId) showDay(selected);
  }
  window.addEventListener('hashchange', fromHash);
  fromHash();
}

function metric(value, label, className = '') {
  return el('div', { class: `metric ${className}` }, el('dt', {}, label), el('dd', {}, value));
}
function legend(label, style) {
  return el('span', {}, el('i', { class: `line-sample line-sample--${style}`, 'aria-hidden': true }), label);
}
start().catch(error => {
  console.error(error);
  app.setAttribute('aria-busy', 'false');
  app.replaceChildren(el('div', { class: 'load-error', role: 'alert' }, el('h1', {}, 'No pudimos cargar el itinerario'), el('p', {}, 'Revisá la conexión y volvé a intentarlo.'), el('button', { type: 'button', class: 'retry-button', onclick: () => location.reload() }, 'Volver a cargar')));
});
