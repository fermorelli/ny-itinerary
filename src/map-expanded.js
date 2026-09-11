import { el } from './dom.js';

// Reuse the same Leaflet container so selection, layers and zoom survive closing.
export function createExpandedMap(container, { label, fit, resize, setExpanded, notice }) {
  const parent = container.parentNode;
  const nextSibling = container.nextSibling;
  const noticeParent = notice?.parentNode;
  const noticeNextSibling = notice?.nextSibling;
  const slot = el('div', { class: 'expanded-map-slot' });
  const closeButton = el('button', { type: 'button', class: 'fit-button map-close-button', autofocus: true, onclick: () => close() },
    el('span', { 'aria-hidden': true }, '× '), 'Volver');
  const dialog = el('dialog', { id: 'expanded-map', class: 'map-dialog', 'aria-labelledby': 'expanded-map-title' },
    el('div', { class: 'expanded-map-header' },
      el('h2', { id: 'expanded-map-title' }, `Mapa · ${label}`),
      el('div', { class: 'map-actions' },
        el('button', { type: 'button', class: 'fit-button', onclick: fit, 'aria-label': 'Ver el recorrido completo' }, 'Ver todo'), closeButton)),
    slot,
    el('div', { class: 'expanded-map-footer' },
      el('p', {}, 'Arrastrá para moverte · dos dedos o doble toque para acercar.'),
      el('p', { class: 'muted' }, 'Líneas orientativas · tocá un punto o tramo para ver sus enlaces.')));
  document.body.append(dialog);
  let active = false, scrollPosition, previousTop, trigger;

  function restore() {
    if (!active) return;
    active = false;
    parent.insertBefore(container, nextSibling);
    if (noticeParent) noticeParent.insertBefore(notice, noticeNextSibling);
    setExpanded(false);
    document.body.classList.remove('map-modal-open');
    document.body.style.top = previousTop;
    resize();
    trigger?.setAttribute('aria-expanded', 'false');
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    window.scrollTo(scrollPosition.x, scrollPosition.y);
  }
  function close() {
    if (dialog.open) dialog.close();
    restore();
  }
  dialog.addEventListener('close', () => { if (!dialog.open) restore(); });

  return {
    open(button) {
      if (active) return;
      trigger = button;
      scrollPosition = { x: window.scrollX, y: window.scrollY };
      previousTop = document.body.style.top;
      active = true;
      document.body.style.top = `-${scrollPosition.y}px`;
      document.body.classList.add('map-modal-open');
      slot.append(container);
      if (notice) dialog.querySelector('.expanded-map-footer').append(notice);
      dialog.showModal();
      setExpanded(true);
      resize();
      trigger?.setAttribute('aria-expanded', 'true');
      closeButton.focus({ preventScroll: true });
    },
    destroy() { close(); dialog.remove(); },
  };
}
