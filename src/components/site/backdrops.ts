/* Painted worlds behind the beanbag, drawn in code so they stay sharp at any size.
   (cx, cy) = where the beanbag sits on screen, hz = the horizon / floor line just below it. Browser-only. */
import type { Scene } from './data';

type G = CanvasRenderingContext2D;
type Geo = { w: number; h: number; cx: number; cy: number; hz: number };

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

/* ---------- Neymar: a favela street court at sunset ---------- */
function favela(g: G, geo: Geo) {
  const { w, h, cx, hz } = geo, k = h / 900, rnd = seeded(11);
  g.fillStyle = vgrad(g, 0, hz, [[0, '#1b2b5a'], [0.38, '#6a4778'], [0.72, '#e6834a'], [1, '#ffd07c']]); g.fillRect(0, 0, w, hz);
  glow(g, w * 0.18, hz * 0.7, h * 0.5, 'rgba(255,214,140,A)', 0.55);
  // far hills
  g.fillStyle = '#3d3452'; g.beginPath(); g.moveTo(0, hz * 0.5);
  for (let x = 0; x <= w; x += w / 12) g.lineTo(x, hz * (0.42 + 0.08 * Math.sin(x / w * 5 + 1)));
  g.lineTo(w, hz); g.lineTo(0, hz); g.fill();
  // hillside covered in colourful houses, smaller and hazier towards the top
  const palette = ['#e94f37', '#f6c90e', '#3bb273', '#2e86ab', '#f18f01', '#c5d86d', '#f7a1c4', '#8ecae6', '#ffb4a2', '#e9edc9'];
  for (let r = 0; r < 11; r++) {
    const rowY = hz * 0.36 + r * hz * 0.062, scale = (0.55 + r * 0.06) * k;
    let x = -rnd() * 40 * k;
    while (x < w) {
      const hw = (34 + rnd() * 50) * scale * 1.4, hh = (26 + rnd() * 30) * scale * 1.3;
      const top = hz * (0.33 + 0.1 * Math.sin(x / w * 3.2 + 0.6));
      if (rowY > top) {
        g.fillStyle = palette[Math.floor(rnd() * palette.length)];
        g.fillRect(x, rowY - hh, hw, hh + 4 * k);
        g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x, rowY - hh, hw, 3 * k);
        for (let wv = 0; wv < 3; wv++) if (rnd() < 0.55) {
          g.fillStyle = rnd() < 0.45 ? '#ffe39a' : 'rgba(20,20,30,0.55)';
          g.fillRect(x + hw * (0.15 + wv * 0.28), rowY - hh * 0.65, hw * 0.14, hh * 0.3);
        }
      }
      x += hw + rnd() * 6 * k;
    }
  }
  g.fillStyle = vgrad(g, hz * 0.25, hz, [[0, 'rgba(255,170,110,0.4)'], [1, 'rgba(255,170,110,0)']]); g.fillRect(0, hz * 0.25, w, hz * 0.75);
  // chain-link fence along the back of the court
  const fy = hz - h * 0.13;
  g.strokeStyle = 'rgba(30,40,40,0.55)'; g.lineWidth = 1;
  for (let x = -h; x < w + h; x += 14 * k) {
    g.beginPath(); g.moveTo(x, fy); g.lineTo(x + h * 0.13, hz); g.stroke();
    g.beginPath(); g.moveTo(x, hz); g.lineTo(x + h * 0.13, fy); g.stroke();
  }
  g.fillStyle = '#26302e'; for (let x = 0; x < w; x += 160 * k) g.fillRect(x, fy - 6 * k, 5 * k, h * 0.13 + 6 * k);
  g.fillRect(0, fy - 6 * k, w, 4 * k);
  // painted court
  g.fillStyle = vgrad(g, hz, h, [[0, '#2f7a5c'], [1, '#174233']]); g.fillRect(0, hz, w, h - hz);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${0.04 + rnd() * 0.08})`; g.fillRect(rnd() * w, hz + rnd() * (h - hz), 2 + rnd() * 6, 1 + rnd() * 2); }
  g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = Math.max(2, h * 0.004);
  const cyF = hz + (h - hz) * 0.22;
  g.beginPath(); g.ellipse(cx, cyF, w * 0.16, (h - hz) * 0.1, 0, 0, 7); g.stroke();
  g.beginPath(); g.moveTo(0, cyF); g.lineTo(w, cyF); g.stroke();
  g.fillStyle = '#ffdf00'; g.globalAlpha = 0.85; g.fillRect(0, hz, w, 3 * k); g.globalAlpha = 1;
  // bunting in Brazil's colours
  const flags = ['#009C3B', '#FFDF00', '#002776'];
  for (let line = 0; line < 2; line++) {
    const y0 = h * (0.06 + line * 0.07), sag = h * 0.05;
    for (let i = 0; i < 26; i++) {
      const t = i / 25, x = w * t, y = y0 + Math.sin(t * Math.PI) * sag;
      g.fillStyle = flags[(i + line) % 3]; g.beginPath(); g.moveTo(x - 12 * k, y); g.lineTo(x + 12 * k, y); g.lineTo(x, y + 26 * k); g.fill();
    }
  }
  vignette(g, geo, 0.45);
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
  // giant gold CR7 behind the beanbag
  const size = Math.min(h * 0.38, w * 0.2);
  g.save(); g.font = `900 ${size}px Manrope, "Arial Black", Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  if ('letterSpacing' in g) (g as G & { letterSpacing: string }).letterSpacing = `${Math.round(size * 0.04)}px`;
  const ty = cy - size * 0.3;
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
  [[cx - farHalf, hz], [cx + farHalf, hz], [cx, hz - rail * 0.25]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y, 16 * k, 8 * k, 0, 0, 7); g.fill(); });
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

const PAINTERS: Record<Scene, (g: G, geo: Geo) => void> = { favela, cr7, sol, poolhall, vault };
export function paintScene(g: G, scene: Scene, geo: Geo) { PAINTERS[scene](g, geo); }
export type { Geo };
