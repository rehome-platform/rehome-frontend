/**
 * Cập nhật tọa độ con trỏ (--mx, --my) cho hiệu ứng spotlight bằng CSS custom properties,
 * không kích hoạt React re-render.
 */
export function updateSpotlightCoords(event) {
  const el = event.currentTarget;
  if (!el || typeof el.getBoundingClientRect !== 'function') return;
  const rect = el.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  el.style.setProperty('--mx', `${x}px`);
  el.style.setProperty('--my', `${y}px`);
}
