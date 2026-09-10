import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { el, mapsLink } from './dom.js';
import { pointIsOnDay } from './data.js';
import { segmentLabel } from './itinerary.js';

export function createDayMap(container, day, segments, points, numbers) {
  const touch = matchMedia('(pointer: coarse)').matches;
  const map = L.map(container, {
    scrollWheelZoom: false, dragging: !touch, touchZoom: true, doubleClickZoom: false,
    zoomControl: true, attributionControl: true, zoomAnimation: false, fadeAnimation: false,
  });
  map.attributionControl.setPrefix(false);
  map.zoomControl.setPosition('bottomright');
  const zoomIn = container.querySelector('.leaflet-control-zoom-in');
  const zoomOut = container.querySelector('.leaflet-control-zoom-out');
  zoomIn?.setAttribute('aria-label', 'Acercar mapa');
  zoomOut?.setAttribute('aria-label', 'Alejar mapa');
  const tileNotice = document.getElementById('tile-notice');
  const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
  }).addTo(map);
  tiles.on('tileerror', () => { if (tileNotice) tileNotice.hidden = false; });
  const markers = new Map();
  const dayPoints = points.filter(point => pointIsOnDay(point, day, segments));
  const bounds = L.latLngBounds(dayPoints.map(p => [p.lat, p.lng]));
  let selected;

  for (const segment of segments) {
    const from = points.find(p => p.id === segment.from), to = points.find(p => p.id === segment.to);
    if (!from || !to || segment.from === segment.to) continue;
    const line = L.polyline([[from.lat, from.lng], [to.lat, to.lng]], {
      color: segment.optional ? '#718087' : segment.style === 'walk' ? '#177d79' : '#233f69',
      weight: segment.optional ? 2.5 : 3.5, opacity: segment.optional ? 0.65 : 0.85,
      dashArray: segment.optional ? '3 7' : segment.style === 'walk' ? null : '9 7',
    }).addTo(map);
    line.bindPopup(el('div', { class: 'map-popup' }, el('strong', {}, `${from.name} → ${to.name}`), el('p', {}, segmentLabel(segment)), segment.optional ? el('p', {}, 'Tramo opcional') : null, el('p', { class: 'muted' }, 'Conexión esquemática. Seguí el enlace para navegar.'), mapsLink(segment.mapsUrl, 'Abrir ruta en Google Maps')), { maxWidth: 290 });
  }
  for (const point of dayPoints) {
    const blocks = day.blocks.filter(b => b.mapId === point.id);
    const incoming = segments.filter(s => s.to === point.id);
    const optional = blocks.length ? blocks.every(b => b.optional) : incoming.length ? incoming.every(s => s.optional) : /alternativ/u.test(point.category);
    const number = numbers.get(point.id);
    const symbol = point.category === 'Base' ? '⌂' : number ?? '·';
    const marker = L.marker([point.lat, point.lng], {
      title: point.name, alt: `${number ? `${number}. ` : ''}${point.name}${optional ? ', opcional' : ''}`,
      icon: L.divIcon({ className: `map-marker${optional ? ' map-marker--optional' : ''}${point.category === 'Base' ? ' map-marker--base' : ''}${!number && point.category !== 'Base' ? ' map-marker--context' : ''}`, html: `<span>${symbol}</span>`, iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -20] }),
    }).addTo(map);
    const localWalks = segments.filter(s => s.from === point.id && s.to === point.id);
    marker.getElement()?.setAttribute('aria-label', `${number ? `${number}. ` : ''}${point.name}${optional ? ', opcional' : ''}`);
    const representative = blocks.find(b => b.type.toLowerCase() === point.category.toLowerCase())
      ?? blocks.find(b => !b.mode && b.stayMinutes > 0) ?? blocks.find(b => b.detail);
    const detail = representative?.detail ?? `${point.category}${point.address ? ` · ${point.address}` : ''}`;
    const popup = el('div', { class: 'map-popup' },
      el('span', { class: 'popup-category' }, optional ? 'Opcional' : point.category),
      el('strong', {}, number ? `${number}. ` : '', point.name), el('p', {}, detail),
      localWalks.map(s => el('div', {}, el('p', {}, segmentLabel(s), ' · paseo local'), el('p', {}, s.waypoints), mapsLink(s.mapsUrl, 'Abrir paseo en Google Maps'))),
      point.precision !== 'Alta' ? el('p', { class: 'muted' }, `Ubicación de referencia · precisión ${point.precision.toLowerCase()}.`) : null,
      mapsLink(point.mapsUrl));
    marker.bindPopup(popup, { maxWidth: 290, autoPanPadding: [22, 22] });
    marker.on('click', () => highlight(point.id));
    markers.set(point.id, marker);
  }
  function highlight(id) {
    if (selected) {
      markers.get(selected)?.getElement()?.classList.remove('is-selected');
      markers.get(selected)?.setZIndexOffset(0);
    }
    selected = id;
    const marker = markers.get(id);
    marker?.getElement()?.classList.add('is-selected');
    marker?.setZIndexOffset(1000);
  }
  function fit() {
    map.closePopup();
    map.invalidateSize();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [28, 28], maxZoom: 15, animate: false });
  }
  fit();
  let previousSize = `${container.clientWidth}:${container.clientHeight}`;
  const observer = new ResizeObserver(() => {
    const size = `${container.clientWidth}:${container.clientHeight}`;
    if (size !== previousSize) { previousSize = size; fit(); }
  });
  observer.observe(container);
  return {
    fit,
    focus(id) {
      const marker = markers.get(id);
      if (!marker) return;
      highlight(id);
      map.setView(marker.getLatLng(), Math.max(map.getZoom(), 15), { animate: false });
      marker.openPopup();
    },
    destroy() { observer.disconnect(); map.remove(); },
  };
}
