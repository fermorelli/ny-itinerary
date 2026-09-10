export async function loadData() {
  const names = ['days', 'points', 'segments', 'logistics'];
  const entries = await Promise.all(names.map(async name => {
    const response = await fetch(`${import.meta.env.BASE_URL}data/${name}.json`);
    if (!response.ok) throw new Error(`No se pudo cargar ${name} (${response.status}).`);
    return [name, await response.json()];
  }));
  return Object.fromEntries(entries);
}

export const formatNumber = (n, digits = 1) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: digits }).format(n);
export const time = date => date?.slice(11, 16) ?? null;
export function dayName(date) {
  return new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}

export function pointIsOnDay(point, day, segments) {
  if (segments.some(s => s.from === point.id || s.to === point.id) || day.blocks.some(b => b.mapId === point.id)) return true;
  // Range means availability of the base/station; unused transit pins would clutter Thursday.
  return String(point.days).split(/,\s*/u).includes(day.label.split(' ')[0]);
}

// Only relates existing edges to existing timed blocks. It does not create routes or times.
export function relateSegments(day, segments) {
  const sorted = [...segments].sort((a, b) => a.order - b.order);
  const base = sorted.filter(s => !s.optional);
  const route = [];
  const used = new Set();
  let cursor = base[0]?.from;
  while (cursor) {
    const next = base.find(s => s.from === cursor && !used.has(s.id));
    if (!next) break;
    route.push(next);
    used.add(next.id);
    cursor = next.to;
  }
  const assignments = new Map(day.blocks.map(b => [b.id, []]));
  const assigned = new Set();
  let position = 0;
  day.blocks.forEach((block, index) => {
    if (!block.mapId) return;
    const current = route[position]?.from ?? route.at(-1)?.to;
    const end = current === block.mapId ? position - 1 : route.findIndex((s, i) => i >= position && s.to === block.mapId);
    if (end >= position - 1 && end !== -1) {
      let stop = end + 1;
      // A local stroll/return belongs to this block unless it crosses the next scheduled anchor.
      const nextAnchor = day.blocks.slice(index + 1).find(b => b.mapId && b.mapId !== block.mapId)?.mapId;
      const returnIndex = route.findIndex((s, i) => i >= stop && s.to === block.mapId);
      if (returnIndex >= stop && !route.slice(stop, returnIndex + 1).some(s => s.to === nextAnchor)) stop = returnIndex + 1;
      const attached = route.slice(position, stop);
      assignments.set(block.id, attached);
      attached.forEach(s => assigned.add(s.id));
      position = stop;
    }
  });
  // A round-trip ends before the following stationary pause, even when the pause
  // is anchored at the departure terminal rather than the turnaround terminal.
  day.blocks.forEach((block, index) => {
    const previous = day.blocks[index - 1];
    const attached = assignments.get(block.id);
    if (previous && /ida y vuelta/iu.test(previous.title) && !block.mode && attached.length) {
      assignments.get(previous.id).push(...attached);
      assignments.set(block.id, []);
    }
  });
  // Optional branches remain alternatives. They never alter the base traversal or its totals.
  for (const segment of sorted.filter(s => s.optional)) {
    let block = day.blocks.find(b => b.optional && b.mapId === segment.to);
    block ??= day.blocks.find(b => b.optional && b.mapId === segment.from);
    block ??= day.blocks.find(b => b.mapId === segment.from && b.stayMinutes > 0 && !/buffer|traslado|caminata|transición/iu.test(b.type));
    block ??= day.blocks.find(b => assignments.get(b.id).some(s => s.from === segment.from || s.to === segment.to));
    if (block) {
      assignments.get(block.id).push(segment);
      assigned.add(segment.id);
    }
  }
  return { assignments, unassigned: sorted.filter(s => !assigned.has(s.id)), route };
}

export function pointNumbers(day, segments, points) {
  const { route } = relateSegments(day, segments);
  const ids = new Set();
  const optional = [...segments].filter(s => s.optional).sort((a, b) => a.order - b.order);
  for (const segment of route) {
    ids.add(segment.from);
    ids.add(segment.to);
    // Number small branches beside their junction, not after the return home.
    for (const branch of optional.filter(s => s.from === segment.to)) ids.add(branch.to);
  }
  for (const block of day.blocks) if (block.mapId) ids.add(block.mapId);
  for (const s of segments) { ids.add(s.from); ids.add(s.to); }
  const numbers = new Map();
  let number = 1;
  for (const id of ids) {
    const point = points.find(p => p.id === id);
    if (point && !['Base', 'Estación', 'Aeropuerto', 'Terminal'].includes(point.category)) numbers.set(id, number++);
  }
  return numbers;
}
