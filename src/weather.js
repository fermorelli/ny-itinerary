import { el, mapsLink, disclosure } from './dom.js';
import { weatherIcon, weatherIconName } from './weather-icons.js';

const endpoint = 'https://api.open-meteo.com/v1/forecast?latitude=40.74175&longitude=-74.00045&timezone=America%2FNew_York&forecast_days=16&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_gusts_10m_max&hourly=temperature_2m,precipitation_probability,weather_code,is_day';
let cached, pending;
export function weatherLabel(code) {
  if (code === 0) return 'Despejado';
  if ([1, 2, 3].includes(code)) return 'Nubosidad variable';
  if ([45, 48].includes(code)) return 'Niebla';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Llovizna';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Lluvia';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Nieve';
  if ([95, 96, 99].includes(code)) return 'Tormentas';
  return 'Sin datos';
}
export function forecastDay(data, date) {
  const i = data.daily?.time?.indexOf(date) ?? -1;
  if (i < 0) return null;
  const value = key => data.daily[key]?.[i] ?? null;
  return { code: value('weather_code'), min: value('temperature_2m_min'), max: value('temperature_2m_max'),
    rain: value('precipitation_probability_max'), mm: value('precipitation_sum'), gust: value('wind_gusts_10m_max'),
    hours: (data.hourly?.time ?? []).flatMap((time, index) => time.startsWith(date + 'T') ? [{ time: time.slice(11, 16), temperature: data.hourly.temperature_2m?.[index] ?? null, rain: data.hourly.precipitation_probability?.[index] ?? null, code: data.hourly.weather_code?.[index] ?? null, isDay: data.hourly.is_day?.[index] ?? null }] : []) };
}
async function forecast() {
  if (cached && Date.now() - cached.at < 30 * 60 * 1000) return cached;
  if (!pending) pending = (async () => {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('Forecast unavailable');
    const data = await response.json();
    if (!Array.isArray(data.daily?.time)) throw new Error('Invalid forecast');
    cached = { data, at: Date.now() };
    return cached;
  })().finally(() => { pending = null; });
  return pending;
}
const unit = (value, suffix) => Number.isFinite(value) ? `${value.toLocaleString('es-AR', { maximumFractionDigits: 1 })}${suffix}` : 'Sin datos';

function weatherMetric(icon, label, value) {
  return el('div', { class: 'weather-metric' }, el('dt', {}, weatherIcon(icon), label), el('dd', {}, value));
}
function hourCard(hour) {
  return el('li', { class: 'weather-hour' },
    el('time', {}, hour.time), weatherIcon(weatherIconName(hour.code, hour.isDay)),
    el('span', { class: 'weather-hour-condition' }, weatherLabel(hour.code)),
    el('strong', {}, unit(hour.temperature, '°C')),
    el('span', { class: 'weather-hour-rain', 'aria-label': `Probabilidad de precipitación: ${unit(hour.rain, '%')}` }, weatherIcon('drop'), unit(hour.rain, '%')));
}
function forecastVisual(f) {
  const sampledHours = f.hours.filter(h => ['08:00', '11:00', '14:00', '17:00', '20:00', '23:00'].includes(h.time));
  return el('div', { class: 'weather-forecast' },
    el('div', { class: 'weather-hero' }, weatherIcon(weatherIconName(f.code)),
      el('div', {}, el('strong', { class: 'weather-condition' }, weatherLabel(f.code)),
        el('p', { class: 'weather-temperatures' }, el('span', {}, 'Mín. ', el('b', {}, unit(f.min, '°C'))), el('span', {}, 'Máx. ', el('b', {}, unit(f.max, '°C')))))),
    el('dl', { class: 'weather-metrics' }, weatherMetric('drop', 'Prob. precip. máx.', unit(f.rain, '%')), weatherMetric('rain', 'Precip. total', unit(f.mm, ' mm')), weatherMetric('wind', 'Ráfagas máx.', unit(f.gust, ' km/h'))),
    [95, 96, 99].includes(f.code) ? el('p', { class: 'weather-warning' }, weatherIcon('storm'), 'Tormentas previstas. Revisá paseos al aire libre y alertas.') : null,
    f.hours.length ? el('div', { class: 'weather-hourly' },
      el('p', { class: 'weather-hours-label' }, 'Durante el día', el('span', {}, 'Hora de Nueva York · % precip.')),
      el('ul', { class: 'weather-hour-strip', tabindex: '0', 'aria-label': 'Pronóstico durante el día. Deslizá para ver más horas.' }, (sampledHours.length ? sampledHours : f.hours).map(hourCard)),
      disclosure('Ver todas las horas', el('ul', { class: 'weather-hour-grid' }, f.hours.map(hourCard)), { class: 'disclosure weather-more-hours' })) : el('p', { class: 'muted' }, 'Sin datos por hora.'),
  );
}

export function renderWeather(day) {
  const status = el('span', { class: 'weather-status', 'aria-live': 'polite' }, 'Consultar pronóstico');
  const summaryIcon = el('span', { class: 'weather-summary-icon' }, weatherIcon('sun'));
  const body = el('div', { class: 'weather-body' });
  const panel = disclosure(el('span', { class: 'weather-summary' }, summaryIcon, el('span', {}, el('span', { class: 'weather-title' }, 'Clima del día'), status)), body, { class: 'disclosure weather-panel' });
  let loading = false, loaded = false;
  async function load() {
    if (loading) return;
    loading = true;
    status.textContent = 'Consultando…';
    body.setAttribute('aria-busy', 'true');
    try {
      const result = await forecast();
      const forecastForDay = forecastDay(result.data, day.date);
      status.textContent = forecastForDay ? `${weatherLabel(forecastForDay.code)} · Mín. ${unit(forecastForDay.min, '°')} / Máx. ${unit(forecastForDay.max, '°')}` : 'Sin pronóstico para esta fecha';
      const f = forecastForDay;
      summaryIcon.replaceChildren(weatherIcon(weatherIconName(f?.code)));
      body.replaceChildren(
        el('p', { class: 'weather-location' }, `${day.label} · Manhattan / Chelsea`),
        f ? forecastVisual(f) : el('p', { class: 'weather-empty' }, 'Disponible hasta 16 días desde la consulta. Volvé a mirar cuando se acerque esta fecha.'),
        disclosure('Detalles y plan si llueve', [
          el('p', {}, 'Plan del Excel: The Met, Grand Central, biblioteca o SUMMIT. Reducir High Line, Little Island y Brooklyn Heights. Revisá reservas y horarios antes de cambiar de día.'),
          el('p', {}, 'Referencia: Chelsea, Manhattan. Puede variar en Brooklyn, Staten Island y JFK. El pronóstico puede cambiar y no confirma la apertura de actividades.'),
          el('p', {}, 'Precipitación incluye lluvia y nieve. El porcentaje indica probabilidad; los mm, cantidad acumulada. Las ráfagas son el máximo previsto del día.'),
          el('p', {}, 'Las alertas oficiales son las vigentes al consultar, no un pronóstico para el día seleccionado.'),
          el('p', { class: 'muted' }, `Consultado: ${new Date(result.at).toLocaleString('es-AR', { timeZone: 'America/New_York' })} (Nueva York). Se reutiliza durante 30 minutos.`),
        ], { class: 'disclosure weather-notes' }),
        el('div', { class: 'weather-actions' }, mapsLink('https://www.weather.gov/okx/', 'Alertas vigentes'),
          el('button', { type: 'button', class: 'fit-button', onclick: () => { cached = null; load(); } }, 'Actualizar')),
        el('div', { class: 'weather-credit' }, mapsLink('https://open-meteo.com/', 'Open-Meteo · CC BY 4.0')),
      );
      loaded = true;
    } catch {
      status.textContent = 'No se pudo consultar';
      summaryIcon.replaceChildren(weatherIcon('unknown'));
      body.replaceChildren(el('p', { class: 'weather-empty' }, 'Sin conexión al pronóstico. Intentá de nuevo.'),
        el('button', { type: 'button', class: 'fit-button', onclick: load }, 'Reintentar'),
        mapsLink('https://www.weather.gov/okx/', 'Consultar clima y alertas oficiales'));
    } finally { loading = false; body.setAttribute('aria-busy', 'false'); }
  }
  panel.addEventListener('toggle', () => { if (panel.open && !loaded) load(); });
  return panel;
}
