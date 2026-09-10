import { el, mapsLink, disclosure } from './dom.js';

const endpoint = 'https://api.open-meteo.com/v1/forecast?latitude=40.74175&longitude=-74.00045&timezone=America%2FNew_York&forecast_days=16&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_gusts_10m_max&hourly=temperature_2m,precipitation_probability,weather_code';
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
    hours: (data.hourly?.time ?? []).flatMap((time, index) => time.startsWith(date + 'T') ? [{ time: time.slice(11, 16), temperature: data.hourly.temperature_2m?.[index] ?? null, rain: data.hourly.precipitation_probability?.[index] ?? null, code: data.hourly.weather_code?.[index] ?? null }] : []) };
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

export function renderWeather(day) {
  const status = el('span', { 'aria-live': 'polite' }, 'Consultar pronóstico');
  const body = el('div', {});
  const panel = disclosure(el('span', {}, 'Clima del día · ', status), body);
  let loading = false, loaded = false;
  async function load() {
    if (loading) return;
    loading = true;
    status.textContent = 'Consultando…';
    try {
      const result = await forecast();
      const forecastForDay = forecastDay(result.data, day.date);
      status.textContent = forecastForDay ? `${weatherLabel(forecastForDay.code)} · ${unit(forecastForDay.min, '°')} / ${unit(forecastForDay.max, '°')}` : 'Fecha fuera del pronóstico disponible';
      const f = forecastForDay;
      body.replaceChildren(
        el('p', { class: 'muted' }, `${day.label} · Referencia: Manhattan / Chelsea. Horas de Nueva York; puede variar en Brooklyn, Staten Island y JFK.`),
        f ? el('div', {},
          el('p', {}, `Temperatura: ${unit(f.min, ' °C')} a ${unit(f.max, ' °C')}. Probabilidad máxima de precipitación: ${unit(f.rain, '%')}. Acumulación: ${unit(f.mm, ' mm')}. Ráfagas máximas: ${unit(f.gust, ' km/h')}.`),
          el('p', {}, [95, 96, 99].includes(f.code) ? 'Se pronostican tormentas: revisá los paseos al aire libre y las alertas oficiales antes de salir.' : 'Revisá las horas de lluvia antes de los paseos al aire libre. El pronóstico puede cambiar; no confirma si una actividad operará.'),
          disclosure('Pronóstico por hora', el('div', { class: 'weather-hours' }, f.hours.map(h => el('p', {}, el('strong', {}, h.time), ` · ${unit(h.temperature, ' °C')} · ${weatherLabel(h.code)} · precipitación ${unit(h.rain, '%')}`)))),
        ) : el('p', {}, 'La fuente ofrece hasta 16 días desde la fecha de consulta. No hay un pronóstico para esta fecha en la respuesta actual. Volvé a consultar cuando se acerque el viaje.'),
        el('p', {}, 'Si llueve · Sugerencia del Excel: priorizar The Met, Grand Central, biblioteca y SUMMIT; reducir High Line, Little Island o Brooklyn Heights. Revisá reservas y horarios antes de cambiar de día.'),
        el('p', { class: 'muted' }, `Consultado: ${new Date(result.at).toLocaleString('es-AR', { timeZone: 'America/New_York' })} (Nueva York). Se reutiliza durante 30 minutos.`),
        mapsLink('https://open-meteo.com/', 'Pronóstico: Open-Meteo · CC BY 4.0'),
        el('p', {}, 'Alertas oficiales vigentes: corresponden al momento de consulta, no al día futuro seleccionado.'),
        mapsLink('https://www.weather.gov/okx/', 'Consultar alertas del National Weather Service'),
        el('button', { type: 'button', class: 'fit-button', onclick: () => { cached = null; load(); } }, 'Actualizar pronóstico'),
      );
      loaded = true;
    } catch {
      status.textContent = 'No se pudo consultar';
      body.replaceChildren(el('p', {}, 'Revisá tu conexión o intentá más tarde. El itinerario sigue disponible.'),
        el('button', { type: 'button', class: 'fit-button', onclick: load }, 'Reintentar'),
        mapsLink('https://www.weather.gov/okx/', 'Consultar clima y alertas oficiales'));
    } finally { loading = false; }
  }
  panel.addEventListener('toggle', () => { if (panel.open && !loaded) load(); });
  return panel;
}
