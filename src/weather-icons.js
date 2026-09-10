// Small inline SVGs keep the forecast readable without another image service.
const cloud = 'M7 16H6a4 4 0 0 1-.6-8A6 6 0 0 1 17 7a4.5 4.5 0 0 1 1 9h-1';
const paths = {
  sun: ['M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8', 'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5'],
  moon: ['M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z'],
  cloud: [cloud, 'M7 16h10'],
  fog: [cloud, 'M3 20h18M8 16h8'],
  rain: [cloud, 'M8 19l-1 3m5-3-1 3m5-3-1 3'],
  snow: [cloud, 'M8 19v3m-1.3-2.2 2.6 1.4m0-1.4-2.6 1.4M16 19v3m-1.3-2.2 2.6 1.4m0-1.4-2.6 1.4'],
  storm: [cloud, 'm13 14-4 5h4l-2 4'],
  drop: ['M12 3S5 11 5 15a7 7 0 0 0 14 0c0-4-7-12-7-12Z', 'M8 15a4 4 0 0 0 4 4'],
  wind: ['M3 8h12a3 3 0 1 0-3-3M2 12h17a3 3 0 1 1-3 3M4 17h5a2 2 0 1 1-2 2'],
  unknown: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18', 'M9 9a3 3 0 1 1 5 2c-1 1-2 1-2 3m0 3h.01'],
};

export function weatherIconName(code, isDay = 1) {
  if (code === 0) return isDay === 0 ? 'moon' : 'sun';
  if ([1, 2, 3].includes(code)) return 'cloud';
  if ([45, 48].includes(code)) return 'fog';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
  if ([95, 96, 99].includes(code)) return 'storm';
  return 'unknown';
}

export function weatherIcon(name) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  for (const [key, value] of Object.entries({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false', class: `weather-icon weather-icon--${name}` })) svg.setAttribute(key, value);
  for (const d of paths[name] ?? paths.unknown) {
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}
