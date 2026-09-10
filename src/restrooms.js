import { el, mapsLink, disclosure } from './dom.js';
import { pointIsOnDay } from './data.js';

// Venue reference coordinates, never the exact bathroom entrance.
const entries = [
  ['trump', 'Trump Tower', null, 40.7624, -73.9738, 'Dato aportado por Fer. Consultar acceso y ubicación dentro del edificio.'],
  ['rockefeller', 'Rockefeller Center', 'ROCKEFELLER'],
  ['bryant', 'Bryant Park', 'BRYANT_PARK', null, null, 'Baños en calle 42 y junto a Le Carrousel en calle 40. Consultar horarios de cada instalación.', 'https://bryantpark.org/the-park/public-restrooms'],
  ['grand-central', 'Grand Central', 'GRAND_CENTRAL', null, null, 'Baños públicos en el nivel inferior (Lower Level).', 'https://grandcentralterminal.com/about/'],
  ['oculus', 'The Oculus', 'OCULUS', null, null, 'Consultar el plano oficial para encontrar los baños y el nivel de acceso.', 'https://www.explorewtc.com/en/local/plan-your-visit/campus---building-maps.html'],
  ['moynihan', 'Moynihan Train Hall', 'MOYNIHAN', null, null, 'Baños públicos en concourse y primer piso. Los de salas de espera reservadas tienen acceso restringido.', 'https://moynihantrainhall.nyc/visit/getting-here/'],
  ['library', 'Biblioteca pública · edificio principal', 'NYPL_MAIN'],
  ['harry-potter', 'Harry Potter Store', null, 40.7407, -73.9899, 'Dato aportado por Fer. Tienda en 935 Broadway; consultar condiciones de acceso al baño.'],
  ['little-island', 'Little Island', 'LITTLE_ISLAND', null, null, 'Cerca de The Glade, después de la entrada por South Bridge. Hay baño accesible y cambiadores.', 'https://littleisland.org/accessibility/'],
  ['brooklyn', 'Brooklyn Bridge Park · Main Street', 'MAIN_ST_PARK', null, null, 'El parque informa baños en el Education Center de Main Street y en Empire Stores. Consultar acceso al llegar.', 'https://brooklynbridgepark.org/about/'],
];

export function distanceMeters(a, b) {
  const rad = Math.PI / 180;
  const x = (a.lng - b.lng) * rad * Math.cos((a.lat + b.lat) * rad / 2);
  const y = (a.lat - b.lat) * rad;
  return Math.hypot(x, y) * 6371000;
}

export function restroomsForDay(day, segments, points) {
  const anchors = points.filter(p => pointIsOnDay(p, day, segments));
  return entries.map(([id, name, pointId, lat, lng, note, source]) => {
    const point = points.find(p => p.id === pointId);
    const place = { lat: lat ?? point?.lat, lng: lng ?? point?.lng };
    if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return null;
    const nearest = anchors.reduce((best, p) => {
      const meters = distanceMeters(place, p);
      return !best || meters < best.meters ? { point: p, meters } : best;
    }, null);
    if (!nearest || nearest.meters > 1000) return null;
    return { id: `wc-${id}`, name, ...place, nearest: nearest.point.name, meters: nearest.meters,
      note: note ?? 'Dato aportado por Fer. Consultar ubicación, horario y condiciones de acceso al baño.', source,
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' New York')}` };
  }).filter(Boolean);
}

export function restroomContent(place) {
  return el('div', { class: 'restroom-content' }, el('strong', {}, place.name),
    el('p', {}, place.note), el('p', { class: 'muted' }, 'Pin del lugar de referencia; no indica la puerta del baño. Apertura no comprobada en tiempo real.'),
    mapsLink(place.mapsUrl, 'Buscar lugar en Google Maps'),
    place.source ? mapsLink(place.source, 'Información oficial') : el('p', { class: 'muted' }, 'Referencia personal · sin verificación oficial del baño'));
}

export function renderRestrooms(places, focus) {
  return disclosure(`Baños cerca del recorrido · ${places.length}`, [
    el('p', {}, 'Referencias a menos de 1000 m en línea recta de una parada del día. La caminata real puede ser mayor. No son paradas añadidas al itinerario.'),
    places.map(p => el('article', { class: 'restroom-item' }, restroomContent(p),
      el('p', { class: 'muted' }, `Cerca de ${p.nearest} · ~${Math.round(p.meters / 10) * 10} m en línea recta`),
      el('button', { type: 'button', class: 'fit-button', onclick: () => focus(p.id) }, 'Ver WC en el mapa'))),
    mapsLink('https://portal.311.nyc.gov/article/?kanumber=KA-03643', 'Directorio oficial de baños de NYC'),
    mapsLink('https://www.centralparknyc.org/restrooms', 'Mapa de baños de Central Park'),
  ]);
}

