/* Painted worlds behind the beanbag, drawn in code so they stay sharp at any size.
   (cx, cy) = where the beanbag sits on screen, hz = the horizon / floor line just below it. Browser-only. */
import type { Scene } from './data';

type G = CanvasRenderingContext2D;
/* top: on phones and tablets the logo and slogan sit above the beanbag; the scene starts below them (0 = full height) */
type Geo = { w: number; h: number; cx: number; cy: number; hz: number; top?: number };

function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}
function vgrad(g: G, y0: number, y1: number, stops: [number, string][]) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  return gr;
}
function glow(g: G, x: number, y: number, r: number, color: string, alpha: number) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, color.replace('A', String(alpha))); gr.addColorStop(1, color.replace('A', '0'));
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}
function vignette(g: G, { w, h, cx, cy }: Geo, strength: number) {
  const gr = g.createRadialGradient(cx, cy, Math.min(w, h) * 0.25, cx, cy, Math.max(w, h) * 0.85);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${strength})`);
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
}
/* mown pitch stripes receding to the horizon, with a centre circle round the beanbag */
function pitch(g: G, { w, h, cx, hz }: Geo, a: string, b: string, lines: string) {
  let y = hz, band = (h - hz) * 0.05, i = 0;
  while (y < h) { g.fillStyle = i++ % 2 ? a : b; g.fillRect(0, y, w, band + 1); y += band; band *= 1.28; }
  g.strokeStyle = lines; g.lineWidth = Math.max(2, h * 0.004);
  const fy = hz + (h - hz) * 0.22;
  g.beginPath(); g.ellipse(cx, fy, w * 0.17, (h - hz) * 0.1, 0, 0, 7); g.stroke();
  g.beginPath(); g.moveTo(0, fy); g.lineTo(w, fy); g.stroke();
  g.beginPath(); g.arc(cx, fy, h * 0.006, 0, 7); g.fillStyle = lines; g.fill();
}

/* ---------- Neymar Jr: Rio at sunset, Christ the Redeemer on Corcovado above the beanbag ---------- */
function rio(g: G, geo: Geo) {
  const { w, h, cx, cy, hz } = geo, k = h / 900, rnd = seeded(11);
  // dusk sky
  g.fillStyle = vgrad(g, 0, hz, [[0, '#14244f'], [0.4, '#5b3f78'], [0.75, '#e07a4f'], [1, '#ffc977']]); g.fillRect(0, 0, w, hz);
  for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + rnd() * 0.5})`; g.fillRect(rnd() * w, rnd() * hz * 0.35, 1.5 * k, 1.5 * k); }
  // where the statue stands: centred over the beanbag, its feet just above the beanbag's top
  const bagTop = cy - (hz - cy) * 2.1;
  const S = Math.max(80 * k, Math.min(h * 0.3, w * 0.42, bagTop * 0.82)); // statue height
  const peakY = bagTop - S * 0.02, sx = cx;
  glow(g, sx, peakY - S * 0.5, S * 1.6, 'rgba(255,214,150,A)', 0.55);
  // Sugarloaf and the far hills, hazy blue-purple
  g.fillStyle = '#4a3e6b';
  g.beginPath(); g.moveTo(0, hz);
  g.lineTo(0, hz * 0.78); g.quadraticCurveTo(w * 0.06, hz * 0.52, w * 0.12, hz * 0.6); g.quadraticCurveTo(w * 0.16, hz * 0.7, w * 0.2, hz * 0.8);
  g.quadraticCurveTo(w * 0.24, hz * 0.66, w * 0.28, hz * 0.82); g.lineTo(w * 0.3, hz); g.fill();
  g.beginPath(); g.moveTo(w * 0.62, hz); g.quadraticCurveTo(w * 0.8, hz * 0.64, w, hz * 0.7); g.lineTo(w, hz); g.fill();
  // Corcovado: a steep green-black peak rising behind the beanbag to the statue's pedestal
  const mtn = g.createLinearGradient(0, peakY, 0, hz);
  mtn.addColorStop(0, '#2c2a45'); mtn.addColorStop(1, '#1b2a2a');
  g.fillStyle = mtn; g.beginPath();
  g.moveTo(sx - w * 0.75, hz);
  g.bezierCurveTo(sx - w * 0.35, hz * 0.95, sx - S * 0.55, peakY + S * 0.35, sx - S * 0.12, peakY + S * 0.02);
  g.lineTo(sx + S * 0.12, peakY + S * 0.02);
  g.bezierCurveTo(sx + S * 0.6, peakY + S * 0.4, sx + w * 0.3, hz * 0.92, sx + w * 0.75, hz);
  g.closePath(); g.fill();
  // a warm rim of sunset light down the left edge of the peak
  g.save(); g.clip(); g.fillStyle = vgrad(g, peakY, hz, [[0, 'rgba(255,170,110,0.35)'], [1, 'rgba(255,170,110,0)']]);
  g.fillRect(sx - w * 0.75, peakY, w * 0.75 + S * 0.05, hz - peakY); g.restore();
  // city lights along the bay
  for (let i = 0; i < 260; i++) {
    const x = rnd() * w, y = hz - rnd() * hz * 0.07;
    g.fillStyle = rnd() < 0.7 ? `rgba(255,220,150,${0.35 + rnd() * 0.5})` : `rgba(255,255,255,${0.3 + rnd() * 0.4})`;
    g.fillRect(x, y, 2 * k, 2 * k);
  }
  // the statue: pale stone, arms open wide (head, outstretched arms with hanging sleeves, robe, plinth)
  const u = S / 10, top = peakY - S;
  g.save();
  g.shadowColor = 'rgba(255,230,190,0.75)'; g.shadowBlur = u * 2.2;
  const stone = g.createLinearGradient(sx - u * 4, 0, sx + u * 4, 0);
  stone.addColorStop(0, '#fff3dc'); stone.addColorStop(0.55, '#e8dccb'); stone.addColorStop(1, '#a99f97');
  g.fillStyle = stone;
  g.fillRect(sx - u * 0.75, peakY - u * 1.0, u * 1.5, u * 1.0);                  // plinth
  g.beginPath();                                                                 // robe, widening a little to the feet
  g.moveTo(sx - u * 0.55, top + u * 2.0); g.lineTo(sx + u * 0.55, top + u * 2.0);
  g.lineTo(sx + u * 0.75, peakY - u * 1.0); g.lineTo(sx - u * 0.75, peakY - u * 1.0); g.closePath(); g.fill();
  g.beginPath();                                                                 // arms and sleeves
  g.moveTo(sx - u * 4.6, top + u * 1.95); g.lineTo(sx + u * 4.6, top + u * 1.95);
  g.lineTo(sx + u * 4.6, top + u * 2.35); g.lineTo(sx + u * 3.4, top + u * 2.45);
  g.quadraticCurveTo(sx + u * 1.6, top + u * 3.3, sx + u * 0.6, top + u * 3.6);
  g.lineTo(sx - u * 0.6, top + u * 3.6);
  g.quadraticCurveTo(sx - u * 1.6, top + u * 3.3, sx - u * 3.4, top + u * 2.45);
  g.lineTo(sx - u * 4.6, top + u * 2.35); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(sx - u * 0.75, top + u * 1.6); g.lineTo(sx + u * 0.75, top + u * 1.6); // shoulders
  g.lineTo(sx + u * 0.9, top + u * 2.1); g.lineTo(sx - u * 0.9, top + u * 2.1); g.closePath(); g.fill();
  g.beginPath(); g.arc(sx, top + u * 1.05, u * 0.55, 0, 7); g.fill();            // head
  g.restore();
  // a few fold lines in the robe
  g.strokeStyle = 'rgba(120,105,95,0.35)'; g.lineWidth = Math.max(1, u * 0.06);
  [-0.25, 0.05, 0.3].forEach((f) => { g.beginPath(); g.moveTo(sx + u * f, top + u * 3.8); g.lineTo(sx + u * f * 1.3, peakY - u * 1.1); g.stroke(); });
  // pitch in Brazil green with a yellow line at the back
  pitch(g, geo, '#1f6e45', '#247a4d', 'rgba(255,255,255,0.75)');
  g.fillStyle = '#ffdf00'; g.globalAlpha = 0.85; g.fillRect(0, hz, w, 3 * k); g.globalAlpha = 1;
  g.fillStyle = vgrad(g, hz, hz + h * 0.05, [[0, 'rgba(255,190,120,0.25)'], [1, 'rgba(255,190,120,0)']]); g.fillRect(0, hz, w, h * 0.05);
  vignette(g, geo, 0.4);
}

/* ---------- Ronaldo: CR7 under the stadium floodlights ---------- */
function cr7(g: G, geo: Geo) {
  const { w, h, cx, cy, hz } = geo, k = h / 900, rnd = seeded(7);
  g.fillStyle = vgrad(g, 0, hz, [[0, '#040508'], [1, '#121621']]); g.fillRect(0, 0, w, hz);
  // stands with crowd lights (a few in Portugal red and green)
  for (let t = 0; t < 3; t++) {
    const y0 = hz * (0.42 + t * 0.17), y1 = y0 + hz * 0.15;
    g.fillStyle = `rgba(14,16,24,${0.8 - t * 0.15})`; g.fillRect(0, y0, w, y1 - y0);
    for (let i = 0; i < 700; i++) {
      const r = rnd(); g.fillStyle = r < 0.06 ? 'rgba(200,16,46,0.8)' : r < 0.1 ? 'rgba(4,106,56,0.8)' : `rgba(255,240,220,${0.08 + rnd() * 0.3})`;
      g.fillRect(rnd() * w, y0 + rnd() * (y1 - y0), 2 * k, 2 * k);
    }
  }
  // floodlights with beams
  [[0.06, 0.07], [0.3, 0.03], [0.7, 0.03], [0.94, 0.07]].forEach(([fx, fy]) => {
    const x = w * fx, y = h * fy;
    const beam = g.createLinearGradient(x, y, cx, hz);
    beam.addColorStop(0, 'rgba(255,245,225,0.16)'); beam.addColorStop(1, 'rgba(255,245,225,0)');
    g.fillStyle = beam; g.beginPath(); g.moveTo(x - 30 * k, y); g.lineTo(x + 30 * k, y); g.lineTo(cx + w * 0.22, hz); g.lineTo(cx - w * 0.22, hz); g.fill();
    glow(g, x, y, h * 0.32, 'rgba(255,244,220,A)', 0.55);
    g.fillStyle = '#fffaf0';
    for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) g.fillRect(x - 40 * k + c * 17 * k, y - 12 * k + r * 10 * k, 13 * k, 7 * k);
  });
  // giant gold CR7 above the beanbag (kept clear of its top, so it reads on phones too)
  const bagTop = cy - (hz - cy) * 2.1;
  const size = Math.max(54 * k, Math.min(h * 0.24, w * 0.24, bagTop * 0.75));
  g.save(); g.font = `900 ${size}px Manrope, "Arial Black", Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  if ('letterSpacing' in g) (g as G & { letterSpacing: string }).letterSpacing = `${Math.round(size * 0.04)}px`;
  const ty = Math.max(size * 0.55 + h * 0.03, bagTop - size * 0.55);
  const gold = g.createLinearGradient(0, ty - size / 2, 0, ty + size / 2);
  gold.addColorStop(0, '#fff0b5'); gold.addColorStop(0.45, '#d9a640'); gold.addColorStop(1, '#7c5812');
  g.shadowColor = 'rgba(255,196,80,0.6)'; g.shadowBlur = size * 0.25; g.fillStyle = gold; g.globalAlpha = 0.92;
  g.fillText('CR7', cx, ty);
  g.restore();
  // pitch with a soft reflection of the gold letters
  pitch(g, geo, '#0d3c22', '#104629', 'rgba(255,255,255,0.35)');
  g.save(); g.globalAlpha = 0.1; g.translate(0, hz * 2 + size * 0.1); g.scale(1, -1);
  g.font = `900 ${size}px Manrope, "Arial Black", Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#d9a640';
  g.fillText('CR7', cx, hz + (hz - ty) * 0.15); g.restore();
  g.fillStyle = vgrad(g, hz, hz + h * 0.04, [[0, 'rgba(255,220,150,0.25)'], [1, 'rgba(255,220,150,0)']]); g.fillRect(0, hz, w, h * 0.04);
  vignette(g, geo, 0.55);
}

/* ---------- Messi: the Argentine sun over a bright pitch (the sun itself is drawn by drawSun) ---------- */
function sol(g: G, geo: Geo) {
  const { w, h, cx, cy, hz } = geo, k = h / 900, rnd = seeded(5);
  g.fillStyle = vgrad(g, 0, hz, [[0, '#3f7fc4'], [0.55, '#8cc4ef'], [1, '#e9f6ff']]); g.fillRect(0, 0, w, hz);
  // a soft white band across the middle, like the flag
  g.fillStyle = vgrad(g, hz * 0.3, hz * 0.75, [[0, 'rgba(255,255,255,0)'], [0.5, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]); g.fillRect(0, hz * 0.3, w, hz * 0.45);
  glow(g, cx, cy - h * 0.12, h * 0.45, 'rgba(255,214,100,A)', 0.45);
  // clouds
  g.save(); g.shadowColor = 'rgba(255,255,255,0.9)'; g.shadowBlur = 40 * k; g.fillStyle = 'rgba(255,255,255,0.75)';
  for (let i = 0; i < 9; i++) {
    const x = rnd() * w, y = hz * (0.1 + rnd() * 0.45), s = (60 + rnd() * 90) * k;
    g.beginPath(); g.ellipse(x, y, s * 1.8, s * 0.45, 0, 0, 7); g.ellipse(x + s * 0.6, y - s * 0.25, s, s * 0.4, 0, 0, 7); g.fill();
  }
  g.restore();
  // distant stadium rim
  g.fillStyle = '#2b5d8e'; g.fillRect(0, hz - h * 0.045, w, h * 0.045);
  g.fillStyle = 'rgba(255,255,255,0.5)'; for (let x = 0; x < w; x += 22 * k) g.fillRect(x, hz - h * 0.045, 2 * k, h * 0.045);
  pitch(g, geo, '#2f8a3e', '#37984a', 'rgba(255,255,255,0.8)');
  vignette(g, geo, 0.3);
}
/* the Sol de Mayo: a golden sun with alternating straight and wavy rays (drawn once, slowly rotated by CSS) */
export function drawSun(g: G, size: number) {
  const c = size / 2, R = size * 0.2, n = 32;
  g.clearRect(0, 0, size, size);
  g.save(); g.translate(c, c);
  const gold = '#F6B40E', deep = '#C98A06';
  for (let i = 0; i < n; i++) {
    g.save(); g.rotate((i / n) * Math.PI * 2);
    g.fillStyle = i % 2 ? deep : gold;
    if (i % 2 === 0) { // straight ray
      g.beginPath(); g.moveTo(-R * 0.12, -R * 0.95); g.lineTo(0, -size * 0.48); g.lineTo(R * 0.12, -R * 0.95); g.fill();
    } else { // wavy, flame-like ray
      g.beginPath(); g.moveTo(-R * 0.1, -R * 0.95);
      g.bezierCurveTo(-R * 0.35, -R * 1.3, R * 0.2, -R * 1.55, -R * 0.05, -size * 0.42);
      g.bezierCurveTo(R * 0.35, -R * 1.55, -R * 0.05, -R * 1.25, R * 0.1, -R * 0.95); g.fill();
    }
    g.restore();
  }
  const disc = g.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.1, 0, 0, R);
  disc.addColorStop(0, '#FFE58A'); disc.addColorStop(0.7, gold); disc.addColorStop(1, deep);
  g.shadowColor = 'rgba(255,200,60,0.8)'; g.shadowBlur = size * 0.06;
  g.fillStyle = disc; g.beginPath(); g.arc(0, 0, R, 0, 7); g.fill();
  g.shadowBlur = 0; g.strokeStyle = deep; g.lineWidth = size * 0.008; g.beginPath(); g.arc(0, 0, R * 0.98, 0, 7); g.stroke();
  g.restore();
}

/* ---------- pool balls: a pool hall under a hanging lamp ---------- */
function poolhall(g: G, geo: Geo) {
  const { w, h, cx, hz } = geo, k = h / 900, rnd = seeded(3);
  // wood-panelled wall
  g.fillStyle = '#100a07'; g.fillRect(0, 0, w, hz);
  const plank = w / 16;
  for (let i = 0; i < 17; i++) {
    g.fillStyle = `rgba(${70 + rnd() * 25},${40 + rnd() * 15},${22 + rnd() * 10},${0.35 + rnd() * 0.15})`; g.fillRect(i * plank, 0, plank - 3 * k, hz * 0.78);
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(i * plank - 3 * k, 0, 3 * k, hz * 0.78);
  }
  g.fillStyle = '#1d120b'; g.fillRect(0, hz * 0.78, w, hz * 0.22); g.fillStyle = 'rgba(255,200,140,0.12)'; g.fillRect(0, hz * 0.78, w, 3 * k);
  // the lamp and its cone of light
  const sy = h * 0.11, topW = w * 0.14, botW = w * 0.24;
  const cone = g.createLinearGradient(0, sy, 0, h);
  cone.addColorStop(0, 'rgba(255,224,160,0.32)'); cone.addColorStop(1, 'rgba(255,224,160,0.02)');
  g.fillStyle = cone; g.beginPath(); g.moveTo(cx - botW / 2, sy); g.lineTo(cx + botW / 2, sy); g.lineTo(cx + w * 0.42, h); g.lineTo(cx - w * 0.42, h); g.fill();
  g.strokeStyle = '#1a1a1a'; g.lineWidth = 3 * k; g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx, sy * 0.3); g.stroke();
  g.fillStyle = '#0f3d27'; g.beginPath(); g.moveTo(cx - topW / 2, sy * 0.3); g.lineTo(cx + topW / 2, sy * 0.3); g.lineTo(cx + botW / 2, sy); g.lineTo(cx - botW / 2, sy); g.fill();
  g.fillStyle = '#c9a24a'; g.fillRect(cx - botW / 2, sy - 3 * k, botW, 3 * k);
  glow(g, cx, sy + 8 * k, botW * 0.6, 'rgba(255,236,190,A)', 0.8);
  // the table: felt, rails, pockets
  const farHalf = w * 0.34, nearHalf = w * 0.75, rail = 22 * k;
  g.fillStyle = '#3a2112'; g.beginPath(); g.moveTo(cx - farHalf - rail, hz - rail * 0.6); g.lineTo(cx + farHalf + rail, hz - rail * 0.6); g.lineTo(cx + nearHalf + rail * 3, h); g.lineTo(cx - nearHalf - rail * 3, h); g.fill();
  const felt = g.createRadialGradient(cx, hz + (h - hz) * 0.25, 10, cx, hz + (h - hz) * 0.25, w * 0.55);
  felt.addColorStop(0, '#1d8a4e'); felt.addColorStop(0.55, '#10633a'); felt.addColorStop(1, '#073a21');
  g.fillStyle = felt; g.beginPath(); g.moveTo(cx - farHalf, hz); g.lineTo(cx + farHalf, hz); g.lineTo(cx + nearHalf, h); g.lineTo(cx - nearHalf, h); g.fill();
  for (let i = 0; i < 1200; i++) { g.fillStyle = `rgba(0,0,0,${0.03 + rnd() * 0.05})`; g.fillRect(cx - nearHalf + rnd() * nearHalf * 2, hz + rnd() * (h - hz), 1.5, 1.5); }
  g.fillStyle = 'rgba(255,214,150,0.18)'; g.fillRect(cx - farHalf, hz - rail * 0.6, farHalf * 2, 2 * k);
  g.fillStyle = '#050505';
  // only the two far corner pockets (a middle pocket would sit right under the beanbag and read as a stray shadow)
  [[cx - farHalf, hz], [cx + farHalf, hz]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y, 13 * k, 6 * k, 0, 0, 7); g.fill(); });
  vignette(g, geo, 0.7);
}

/* ---------- money: inside a bank vault ---------- */
function vault(g: G, geo: Geo) {
  const { w, h, cx, cy, hz } = geo, k = h / 900, rnd = seeded(9);
  // veined dark marble
  g.fillStyle = vgrad(g, 0, hz, [[0, '#0b100d'], [1, '#131a15']]); g.fillRect(0, 0, w, hz);
  for (let i = 0; i < 46; i++) {
    g.strokeStyle = rnd() < 0.3 ? `rgba(214,178,94,${0.06 + rnd() * 0.1})` : `rgba(255,255,255,${0.03 + rnd() * 0.06})`;
    g.lineWidth = (0.6 + rnd() * 1.8) * k; g.beginPath();
    const x0 = rnd() * w, y0 = rnd() * hz;
    g.moveTo(x0, y0); g.bezierCurveTo(x0 + (rnd() - 0.5) * w * 0.4, y0 + rnd() * hz * 0.3, x0 + (rnd() - 0.5) * w * 0.4, y0 + rnd() * hz * 0.5, x0 + (rnd() - 0.5) * w * 0.6, y0 + rnd() * hz * 0.6); g.stroke();
  }
  // gold glow behind a big round vault door that frames the beanbag
  glow(g, cx, cy, h * 0.62, 'rgba(255,196,90,A)', 0.32);
  const R = Math.min(h * 0.44, w * 0.3);
  const steel = g.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
  steel.addColorStop(0, '#5d6467'); steel.addColorStop(1, '#1d2224');
  g.fillStyle = steel; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
  g.fillStyle = '#0d1012'; g.beginPath(); g.arc(cx, cy, R * 0.9, 0, 7); g.fill();
  const door = g.createRadialGradient(cx - R * 0.25, cy - R * 0.25, R * 0.05, cx, cy, R * 0.86);
  door.addColorStop(0, '#4b5356'); door.addColorStop(1, '#22282a');
  g.fillStyle = door; g.beginPath(); g.arc(cx, cy, R * 0.86, 0, 7); g.fill();
  for (let i = 0; i < 28; i++) { // bolts
    const a = (i / 28) * Math.PI * 2;
    g.fillStyle = '#8b9396'; g.beginPath(); g.arc(cx + Math.cos(a) * R * 0.78, cy + Math.sin(a) * R * 0.78, R * 0.025, 0, 7); g.fill();
  }
  g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 2 * k;
  [0.62, 0.66].forEach((f) => { g.beginPath(); g.arc(cx, cy, R * f, 0, 7); g.stroke(); });
  g.strokeStyle = '#9aa2a5'; g.lineWidth = R * 0.03; g.lineCap = 'round';
  for (let i = 0; i < 6; i++) { // the wheel
    const a = (i / 6) * Math.PI * 2 + 0.3;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * R * 0.08, cy + Math.sin(a) * R * 0.08); g.lineTo(cx + Math.cos(a) * R * 0.3, cy + Math.sin(a) * R * 0.3); g.stroke();
    g.fillStyle = '#b3babd'; g.beginPath(); g.arc(cx + Math.cos(a) * R * 0.32, cy + Math.sin(a) * R * 0.32, R * 0.035, 0, 7); g.fill();
  }
  g.fillStyle = '#c4cbce'; g.beginPath(); g.arc(cx, cy, R * 0.07, 0, 7); g.fill();
  // glossy floor with a gold sheen at the edge
  g.fillStyle = vgrad(g, hz, h, [[0, '#121713'], [1, '#050706']]); g.fillRect(0, hz, w, h - hz);
  g.fillStyle = vgrad(g, hz, hz + h * 0.06, [[0, 'rgba(214,178,94,0.35)'], [1, 'rgba(214,178,94,0)']]); g.fillRect(0, hz, w, h * 0.06);
  g.save(); g.globalAlpha = 0.12; g.fillStyle = steel; g.beginPath(); g.ellipse(cx, hz + (hz - cy) * 0.6, R, R * 0.35, 0, 0, 7); g.fill(); g.restore();
  vignette(g, geo, 0.6);
}

const PAINTERS: Record<Scene, (g: G, geo: Geo) => void> = { rio, cr7, sol, poolhall, vault };
export function paintScene(g: G, scene: Scene, geo: Geo) {
  const top = Math.round(geo.top || 0);
  if (top <= 0) { PAINTERS[scene](g, geo); return; }
  // the scene fills the beanbag's area only, so CR7, the statue and the rest never sit behind the logo and slogan
  g.save(); g.translate(0, top);
  PAINTERS[scene](g, { w: geo.w, h: geo.h - top, cx: geo.cx, cy: geo.cy - top, hz: geo.hz - top });
  g.restore();
  // above it: the scene's own sky colour, plain and darkening upwards, blended into the scene
  const row = g.getImageData(0, top + 2, Math.max(1, Math.round(geo.w)), 1).data;
  let r = 0, gg = 0, b = 0; const n = row.length / 4;
  for (let i = 0; i < row.length; i += 4) { r += row[i]; gg += row[i + 1]; b += row[i + 2]; }
  r = Math.round(r / n); gg = Math.round(gg / n); b = Math.round(b / n);
  // kept a little darker than the sky so the white logo and slogan stay easy to read, even over Messi's pale blue
  const tone = (f: number, a = 1) => `rgba(${Math.round(r * f)},${Math.round(gg * f)},${Math.round(b * f)},${a})`;
  g.fillStyle = vgrad(g, 0, top, [[0, tone(0.3)], [1, tone(0.62)]]); g.fillRect(0, 0, geo.w, top);
  g.fillStyle = vgrad(g, top, top + 44, [[0, tone(0.62)], [1, tone(0.62, 0)]]); g.fillRect(0, top, geo.w, 44);
}
export type { Geo };
