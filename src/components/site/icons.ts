/* Small canvas-drawn icons for the player and currency chips. Browser-only (call after mount). */
import type { Ball, Currency } from './data';
import type { Kit } from '../shared/kits';
import { kitIconURL } from '../shared/kit-art';

const cache: Record<string, string> = {};

export function playerIcon(k: Kit) {
  return cache['k' + k.id] || (cache['k' + k.id] = kitIconURL(k));
}

export function ballIcon(b: Ball) {
  const key = 'b' + b.n;
  if (cache[key]) return cache[key];
  const S = 72, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d')!;
  g.fillStyle = b.hex; g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, 7); g.fill();
  g.fillStyle = '#F7F6F2'; g.beginPath(); g.arc(S / 2, S / 2, S * 0.24, 0, 7); g.fill();
  g.fillStyle = '#121212'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 ' + S * 0.3 + 'px Manrope, Arial, sans-serif'; g.fillText(String(b.n), S / 2, S * 0.53);
  const hl = g.createRadialGradient(S * 0.32, S * 0.28, 1, S * 0.5, S * 0.5, S * 0.55);
  hl.addColorStop(0, 'rgba(255,255,255,0.55)'); hl.addColorStop(0.35, 'rgba(255,255,255,0)'); hl.addColorStop(1, 'rgba(0,0,0,0.35)');
  g.fillStyle = hl; g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, 7); g.fill();
  return (cache[key] = c.toDataURL('image/png'));
}

export function curIcon(cu: Currency) {
  if (cache[cu.id]) return cache[cu.id];
  const S = 72, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d')!;
  g.fillStyle = cu.paper; g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, 7); g.fill();
  g.strokeStyle = cu.ink; g.lineWidth = 4; g.beginPath(); g.arc(S / 2, S / 2, S * 0.4, 0, 7); g.stroke();
  g.fillStyle = cu.ink; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 ' + S * 0.42 + 'px Manrope, Arial, sans-serif'; g.fillText(cu.sym, S / 2, S * 0.54);
  return (cache[cu.id] = c.toDataURL('image/png'));
}
