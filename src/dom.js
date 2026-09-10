export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat(Infinity)) if (child !== null && child !== undefined && child !== false) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  return node;
}

export function mapsLink(url, text = 'Abrir en Google Maps') {
  if (!url) return null;
  try {
    if (new URL(url).protocol !== 'https:') return null;
  } catch { return null; }
  return el('a', { href: url, target: '_blank', rel: 'noopener noreferrer', class: 'maps-link', 'aria-label': `${text} (pestaña nueva)` }, text, el('span', { 'aria-hidden': true }, ' ↗'));
}

export function disclosure(title, children, attrs = {}) {
  return el('details', { class: 'disclosure', ...attrs }, el('summary', {}, title, el('span', { class: 'disclosure-plus', 'aria-hidden': true }, '+')), el('div', { class: 'disclosure-body' }, children));
}
