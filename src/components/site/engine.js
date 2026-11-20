/* eslint-disable */
// @ts-nocheck
/*
 * 3D engine for the main site: the hero beanbag with floating props, design thumbnails and 4K studio renders.
 * Extracted from the "Furniture Website Preview" prototype. Browser-only: import it dynamically from a client component.
 * Product data lives in ./data.ts so the React UI and the 3D scene share one list.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { COLOURS, DESIGNS, CURRENCIES, PROPSETS, byId } from './data';
import { KITS, kitById } from '../shared/kits';
import { drawBadge, drawBadgeBump, kitBadge, scatterBills } from '../shared/kit-art';
import { drawKitFabric, drawKitDecal, drawKitBall } from '../shared/kit-art';
import { bagPoint, sitPoint, smoothstep } from '../shared/beanbag-shape';

/* soft studio reflections so fabric and patches pick up real highlights instead of looking flat */
var envCache = new WeakMap();
function studioEnv(renderer) {
  if (envCache.has(renderer)) return envCache.get(renderer);
  var pm = new T.PMREMGenerator(renderer), tex = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose();
  envCache.set(renderer, tex); return tex;
}

var T = THREE;
var reduce = false;
try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

function webglOK() {
    try { var c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; }
  }
var small = Math.min(window.innerWidth, window.innerHeight) < 700 || (navigator.deviceMemory && navigator.deviceMemory <= 4);
var TEX_W = small ? 1024 : 2048, TEX_H = small ? 512 : 1024, WALES = 96;
function rgbOf(hex) { var c = parseInt(hex.slice(1), 16); return [c >> 16 & 255, c >> 8 & 255, c & 255]; }
function shade(hex, f) {
    var c = rgbOf(hex);
    function m(v) { return Math.max(0, Math.min(255, Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f)))); }
    return 'rgb(' + m(c[0]) + ',' + m(c[1]) + ',' + m(c[2]) + ')';
  }
function rand(a, b) { return a + Math.random() * (b - a); }
function drawWales(g, x0, y0, w, h, count) {
    var p = w / count;
    for (var i = 0; i < count; i++) {
      var x = x0 + i * p, gr = g.createLinearGradient(x, 0, x + p, 0);
      gr.addColorStop(0, 'rgba(0,0,0,0.3)'); gr.addColorStop(0.16, 'rgba(0,0,0,0.07)');
      gr.addColorStop(0.5, 'rgba(255,255,255,0.08)'); gr.addColorStop(0.84, 'rgba(0,0,0,0.07)'); gr.addColorStop(1, 'rgba(0,0,0,0.3)');
      g.fillStyle = gr; g.fillRect(x, y0, p + 0.6, h);
    }
  }
function drawWaleBump(g, x0, y0, w, h, count) {
    var p = w / count;
    for (var i = 0; i < count; i++) {
      var x = x0 + i * p, gr = g.createLinearGradient(x, 0, x + p, 0);
      gr.addColorStop(0, '#000'); gr.addColorStop(0.2, '#6d6d6d'); gr.addColorStop(0.5, '#fff'); gr.addColorStop(0.8, '#6d6d6d'); gr.addColorStop(1, '#000');
      g.fillStyle = gr; g.fillRect(x, y0, p + 0.6, h);
    }
  }
function addNap(g, w, h, amount, hairs) {
    var id = g.getImageData(0, 0, w, h), d = id.data;
    for (var k = 0; k < d.length; k += 4) { var n = (Math.random() - 0.5) * amount; d[k] += n; d[k + 1] += n; d[k + 2] += n; }
    g.putImageData(id, 0, 0);
    g.lineWidth = 1;
    for (var i = 0; i < hairs; i++) {
      var x = Math.random() * w, y = Math.random() * h, l = rand(5, 14);
      g.strokeStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.06)';
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + rand(-2, 2), y + l); g.stroke();
    }
  }
var fabricCache = {}, matCache = {};
var plainMats = {};
function plainMat(hex, rough) { var k = hex + rough; return plainMats[k] || (plainMats[k] = new T.MeshStandardMaterial({ color: hex, roughness: rough })); }
function darkenHex(hex, f) { var c = parseInt(hex.slice(1), 16); function q(v) { v = Math.max(0, Math.min(255, Math.round(v * f))); return ('0' + v.toString(16)).slice(-2); } return '#' + q(c >> 16 & 255) + q(c >> 8 & 255) + q(c & 255); }
/* a money style with no currency named (the design cards, for example) means dollars, everywhere */
function curId(cur) { return cur || 'USD'; }
function curInfo(cur) { cur = curId(cur); for (var i = 0; i < CURRENCIES.length; i++) if (CURRENCIES[i].id === cur) return CURRENCIES[i]; return CURRENCIES[0]; }
/* photos of each currency's note (front, and back where there is one), loaded once before the engine starts */
var noteImgs = {}, notesPromise = null, notesEarly = false, notesListeners = [];
function loadNotes() {
  if (notesPromise) return notesPromise;
  notesPromise = Promise.all(CURRENCIES.map(function (c) {
    return Promise.all((c.img || []).map(function (src) {
      return new Promise(function (res) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { res(null); }; im.src = src; });
    })).then(function (list) { noteImgs[c.id] = list.filter(Boolean); });
  })).then(function () {
    /* on a slow connection the beanbag may already be showing drawn stand-in notes: throw those away and redraw with the photos */
    if (!notesEarly) return;
    notesEarly = false; noteTexC = {};
    [bagMatCache, clipCache].forEach(function (c) { Object.keys(c).forEach(function (k) { if (k.indexOf('$') >= 0) delete c[k]; }); });
    notesListeners.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } });
  });
  return notesPromise;
}
function noteImg(cur, i) { var l = noteImgs[curId(cur)]; return l && l.length ? l[(i || 0) % l.length] : null; }
function noteAspect(cur) { var im = noteImg(cur, 0); return im ? im.naturalWidth / im.naturalHeight : 1 / 0.43; }
function drawBill(g, x, y, w, h, cur, i) {
    var CI = curInfo(cur);
    function rr(a, b, c, d, r) { g.beginPath(); g.moveTo(a + r, b); g.arcTo(a + c, b, a + c, b + d, r); g.arcTo(a + c, b + d, a, b + d, r); g.arcTo(a, b + d, a, b, r); g.arcTo(a, b, a + c, b, r); g.closePath(); }
    var im = noteImg(cur, i);
    if (im) { // the real note at its own proportions, centred in the space given; the paper fill casts the drop shadow
      var ah = w * im.naturalHeight / im.naturalWidth, ty = y + (h - ah) / 2;
      rr(x, ty, w, ah, ah * 0.03); g.fillStyle = CI.paper; g.fill();
      g.save(); g.shadowColor = "transparent"; rr(x, ty, w, ah, ah * 0.03); g.clip(); g.drawImage(im, x, ty, w, ah); g.restore();
      return;
    }
    if ((CI.img || []).length) notesEarly = true; // photo not here yet: draw a stand-in for now
    var dk = CI.ink, gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, CI.paper); gr.addColorStop(1, darkenHex(CI.paper, 0.9));
    rr(x, y, w, h, h * 0.05); g.fillStyle = gr; g.fill();
    g.strokeStyle = dk; g.lineWidth = h * 0.035; rr(x + h * 0.05, y + h * 0.05, w - h * 0.1, h - h * 0.1, h * 0.03); g.stroke();
    g.lineWidth = h * 0.01; rr(x + h * 0.11, y + h * 0.11, w - h * 0.22, h - h * 0.22, h * 0.02); g.stroke();
    g.lineWidth = h * 0.006;
    for (var i = 0; i < 18; i++) { var yy = y + h * 0.2 + i * h * 0.034; g.beginPath(); g.moveTo(x + h * 0.2, yy); g.lineTo(x + w * 0.27, yy); g.moveTo(x + w * 0.73, yy); g.lineTo(x + w - h * 0.2, yy); g.stroke(); }
    [0.12, 0.88].forEach(function (f) {
      var cx = x + w * f, cy = y + h * 0.5;
      g.lineWidth = h * 0.012; [0.22, 0.18, 0.14].forEach(function (r) { g.beginPath(); g.arc(cx, cy, h * r, 0, 7); g.stroke(); });
      g.fillStyle = dk; g.beginPath(); g.arc(cx, cy, h * 0.12, 0, 7); g.fill();
      g.fillStyle = CI.paper; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 ' + (h * 0.17) + 'px Manrope, Arial, sans-serif'; g.fillText(CI.sym, cx, cy + h * 0.01);
    });
    var cx = x + w / 2, cy = y + h / 2;
    g.fillStyle = darkenHex(CI.paper, 0.86); g.beginPath(); g.ellipse(cx, cy, h * 0.3, h * 0.37, 0, 0, 7); g.fill(); g.lineWidth = h * 0.02; g.stroke();
    g.save(); g.beginPath(); g.ellipse(cx, cy, h * 0.3, h * 0.37, 0, 0, 7); g.clip();
    g.fillStyle = dk; g.beginPath(); g.arc(cx, cy - h * 0.08, h * 0.1, 0, 7); g.fill();
    g.beginPath(); g.moveTo(cx - h * 0.25, cy + h * 0.4); g.quadraticCurveTo(cx, cy - h * 0.03, cx + h * 0.25, cy + h * 0.4); g.closePath(); g.fill();
    g.restore();
  }
function ringText(g, phrase, cx, cy, r, size, color) {
    var circ = Math.PI * 2 * r, n = Math.max(1, Math.round(circ / (size * 0.8 * phrase.length))), txt = '', i;
    for (i = 0; i < n; i++) txt += phrase;
    var step = Math.PI * 2 / txt.length;
    g.save(); g.fillStyle = color; g.font = '800 ' + size + 'px Manrope, "Arial Black", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (i = 0; i < txt.length; i++) { var a = -Math.PI / 2 + i * step; g.save(); g.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.rotate(a + Math.PI / 2); g.fillText(txt.charAt(i), 0, 0); g.restore(); }
    g.restore();
  }
function heartPath(g, cx, cy, s) {
    g.beginPath(); g.moveTo(cx, cy + s * 0.9);
    g.bezierCurveTo(cx - s * 1.5, cy + s * 0.1, cx - s * 1.1, cy - s * 1.0, cx, cy - s * 0.35);
    g.bezierCurveTo(cx + s * 1.1, cy - s * 1.0, cx + s * 1.5, cy + s * 0.1, cx, cy + s * 0.9); g.closePath();
  }
function sparkPath(g, cx, cy, r) {
    g.beginPath();
    for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4 - Math.PI / 2, rad = i % 2 ? r * 0.28 : r; if (i) g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); else g.moveTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); }
    g.closePath();
  }
var decalCache = {};
function decalTex(full) {
    if (decalCache[full]) return decalCache[full];
    var parts = String(full).split(':'), kind = parts[0], arg = parts[1], S = 1024, t;
    var num = arg || '8', sym = arg || '$';
    if (kind === 'kitpatch' || kind === 'kitprint') {
      t = canvasTex(S, S, function (g) { drawKitDecal(g, S, kind, kitById(arg)); });
    } else if (kind === 'circle') {
      t = canvasTex(S, S, function (g) { drawBadge(g, S, badgeFor(full)); });
    } else if (kind === 'circle-flat') { // the original flat pool-ball patch, kept for reference
      t = canvasTex(S, S, function (g) {
        g.fillStyle = '#F7F6F2'; g.fillRect(0, 0, S, S);
        for (var i = 0; i < 6000; i++) { g.fillStyle = 'rgba(0,0,0,0.035)'; g.fillRect(Math.random() * S, Math.random() * S, rand(10, 40), 1.5); }
        g.setLineDash([S * 0.016, S * 0.012]); g.strokeStyle = '#BDBAB2'; g.lineWidth = S * 0.005; g.beginPath(); g.arc(S / 2, S / 2, S * 0.455, 0, 7); g.stroke(); g.setLineDash([]);
        g.fillStyle = '#121212'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = '800 ' + (S * 0.64) + 'px Manrope, "Arial Black", Arial, sans-serif'; g.fillText(num, S / 2, S * 0.53);
      });
    } else if (kind === 'print') {
      t = canvasTex(S, S, function (g) {
        g.clearRect(0, 0, S, S);
        g.fillStyle = num === '1' ? '#1A1717' : '#F4F2EE'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = '800 ' + (S * 0.72) + 'px Manrope, "Arial Black", Arial, sans-serif'; g.fillText(num, S / 2, S * 0.53);
        g.globalCompositeOperation = 'destination-out';
        var pitch = S / 16;
        for (var i = 0; i < 16; i++) { var gr = g.createLinearGradient(i * pitch, 0, (i + 1) * pitch, 0); gr.addColorStop(0, 'rgba(0,0,0,0.3)'); gr.addColorStop(0.2, 'rgba(0,0,0,0)'); gr.addColorStop(0.85, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.3)'); g.fillStyle = gr; g.fillRect(i * pitch, 0, pitch, S); }
        g.globalCompositeOperation = 'source-over';
      });
    } else if (kind === 'bagsign') {
      t = canvasTex(S, S, function (g) {
        g.fillStyle = '#F2E6C4'; g.fillRect(0, 0, S, S);
        for (var i = 0; i < 2000; i++) { g.fillStyle = 'rgba(0,0,0,0.03)'; g.fillRect(Math.random() * S, Math.random() * S, rand(8, 30), 1); }
        g.setLineDash([16, 12]); g.strokeStyle = '#B9A87A'; g.lineWidth = 5; g.beginPath(); g.arc(S / 2, S / 2, S * 0.455, 0, 7); g.stroke(); g.setLineDash([]);
        var cx = S / 2, cy = S * 0.55;
        g.fillStyle = '#141414';
        g.beginPath(); g.moveTo(cx - S * 0.08, cy - S * 0.2);
        g.bezierCurveTo(cx - S * 0.12, cy - S * 0.1, cx - S * 0.3, cy - S * 0.02, cx - S * 0.3, cy + S * 0.14);
        g.bezierCurveTo(cx - S * 0.3, cy + S * 0.3, cx - S * 0.15, cy + S * 0.34, cx, cy + S * 0.34);
        g.bezierCurveTo(cx + S * 0.15, cy + S * 0.34, cx + S * 0.3, cy + S * 0.3, cx + S * 0.3, cy + S * 0.14);
        g.bezierCurveTo(cx + S * 0.3, cy - S * 0.02, cx + S * 0.12, cy - S * 0.1, cx + S * 0.08, cy - S * 0.2);
        g.closePath(); g.fill();
        g.beginPath(); g.moveTo(cx - S * 0.1, cy - S * 0.2); g.quadraticCurveTo(cx - S * 0.21, cy - S * 0.33, cx - S * 0.12, cy - S * 0.31);
        g.quadraticCurveTo(cx, cy - S * 0.22, cx + S * 0.12, cy - S * 0.31); g.quadraticCurveTo(cx + S * 0.21, cy - S * 0.33, cx + S * 0.1, cy - S * 0.2); g.closePath(); g.fill();
        g.fillStyle = '#F2E6C4'; g.fillRect(cx - S * 0.095, cy - S * 0.215, S * 0.19, S * 0.022);
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 ' + (S * 0.3) + 'px Manrope, "Arial Black", Arial, sans-serif'; g.fillText(sym, cx, cy + S * 0.14);
      });
    }
    return (decalCache[full] = t);
  }
function capGeometry(R, angle) {
    var geo = new T.SphereGeometry(R, 96, 24, 0, Math.PI * 2, 0, angle);
    var pos = geo.attributes.position, uv = geo.attributes.uv, rr = R * Math.sin(angle);
    for (var i = 0; i < pos.count; i++) uv.setXY(i, 0.5 + pos.getX(i) / (2 * rr), 0.5 - pos.getZ(i) / (2 * rr));
    uv.needsUpdate = true; return geo;
  }
function shadowify(m) { m.castShadow = true; m.receiveShadow = true; return m; }
var clipPlane = new T.Plane(new T.Vector3(0, 1, 0), 0), clipCache = {};
function dollarMat(fabric, cur) {
    cur = curId(cur);
    var cord = fabric === 'corduroy', CI = curInfo(cur);
    var map = canvasTex(2048, 1024, function (g, w, h) {
      scatterBills(g, w, h, darkenHex(CI.paper, 0.62), function (g2, x, y, bw, bh, i) { drawBill(g2, x, y, bw, bh, cur, i); });
      if (cord) { g.save(); g.globalAlpha = 0.5; drawWales(g, 0, 0, w, h, 48); g.restore(); }
      addNap(g, w, h, cord ? 6 : 10, 0);
    });
    map.wrapS = map.wrapT = T.RepeatWrapping; map.repeat.set(2, 2);
    return new T.MeshPhysicalMaterial({ map: map, roughness: cord ? 0.95 : 0.88, metalness: 0, sheen: 0.25, sheenRoughness: 0.7, sheenColor: new T.Color(CI.paper) });
  }
function domeMat(s) {
    var dollar = s.patch === 'dollar', k = (dollar ? '$' + (s.cur || 'USD') : s.hex) + s.fabric;
    if (!clipCache[k]) { var m = (dollar ? dollarMat(s.fabric, s.cur) : fabricMat(s.hex, s.fabric)).clone(); m.clippingPlanes = [clipPlane]; m.clipShadows = true; clipCache[k] = m; }
    return clipCache[k];
  }
function buildMoney(s) {
    var g = new T.Group(), pts = [[0, 0], [0.55, 0.01], [0.95, 0.1], [1.16, 0.36], [1.16, 0.7], [1.0, 1.02], [0.66, 1.27], [0.4, 1.44], [0.33, 1.54], [0.42, 1.68], [0.62, 1.86], [0.7, 1.98], [0.55, 2.02]];
    var prof = new T.SplineCurve(pts.map(function (p) { return new T.Vector2(p[0], p[1]); })).getPoints(110);
    prof.forEach(function (v) { v.x = Math.max(0, v.x); });
    var body = shadowify(new T.Mesh(new T.LatheGeometry(prof, 128), fabricMat(s.hex, s.fabric)));
    body.material = body.material; g.add(body);
    var tie = new T.Mesh(new T.TorusGeometry(0.36, 0.08, 16, 72), plainMat('#E8D9B8', 0.7)); tie.rotation.x = Math.PI / 2; tie.position.y = 1.55; tie.castShadow = true; g.add(tie);
    if (s.patch === 'R') {
      var sub = prof.filter(function (v) { return v.y > 0.28 && v.y < 1.0; }).map(function (v) { return new T.Vector2(v.x * 1.007, v.y); });
      var lab = new T.Mesh(new T.LatheGeometry(sub, 64, -0.62, 1.24), new T.MeshStandardMaterial({ map: decalTex('R'), roughness: 0.6, transparent: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      lab.renderOrder = 2; g.add(lab);
    }
    g.scale.setScalar(0.84); g.position.y = -0.03; g.userData.foot = 2.7;
    var outer = new T.Group(); outer.add(g); outer.userData.foot = 2.7; return outer;
  }
function buildChair(s) {
    var g = new T.Group(), mat = fabricMat(s.hex, s.fabric);
    function blob(w, h, d, x, y, z, rx) {
      var m = shadowify(new T.Mesh(new T.SphereGeometry(1, 72, 54), mat)); m.scale.set(w, h, d); m.position.set(x, y, z); if (rx) m.rotation.x = rx; g.add(m);
    }
    blob(0.98, 0.5, 0.9, 0, 0.5, 0.12);
    blob(1.02, 0.9, 0.38, 0, 1.12, -0.62, -0.16);
    blob(0.34, 0.64, 0.92, -1.06, 0.72, 0.06);
    blob(0.34, 0.64, 0.92, 1.06, 0.72, 0.06);
    g.userData.foot = 4.4; return g;
  }
function drawPlainCrest(g, S, hex) {
    g.fillStyle = hex; g.fillRect(0, 0, S, S);
    var cx = S / 2, cy = S / 2, col = '#EADFC8';
    g.strokeStyle = col; g.fillStyle = col; g.lineCap = 'round'; g.lineJoin = 'round';
    g.lineWidth = S * 0.02; g.beginPath(); g.arc(cx, cy, S * 0.43, 0, 7); g.stroke();
    g.lineWidth = S * 0.045;
    for (var k = 0; k < 3; k++) { var y = cy - S * 0.1 + k * S * 0.105; g.beginPath(); g.moveTo(cx - S * 0.18, y + S * 0.075); g.lineTo(cx, y - S * 0.02); g.lineTo(cx + S * 0.18, y + S * 0.075); g.stroke(); }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 ' + (S * 0.04) + 'px Manrope, Arial, sans-serif'; g.fillText('YOUR EMBLEM HERE', cx, cy + S * 0.3);
  }
function drawGameCrest(g, S) {
    var cx = S / 2, cy = S / 2;
    var rim = g.createRadialGradient(cx, cy, S * 0.44, cx, cy, S * 0.5); rim.addColorStop(0, '#c9428a'); rim.addColorStop(1, '#ea64a8');
    g.fillStyle = rim; g.fillRect(0, 0, S, S);
    g.fillStyle = '#140b1f'; g.beginPath(); g.arc(cx, cy, S * 0.462, 0, 7); g.fill();
    ringText(g, 'PLAYER ONE • ', cx, cy, S * 0.418, S * 0.05, '#cbb8f2');
    g.strokeStyle = '#e2589f'; g.lineWidth = S * 0.011; g.beginPath(); g.arc(cx, cy, S * 0.372, 0, 7); g.stroke();

    g.save(); g.beginPath(); g.arc(cx, cy, S * 0.365, 0, 7); g.clip();
    var yh = cy + S * 0.06;
    var sky = g.createLinearGradient(0, cy - S * 0.37, 0, yh);
    sky.addColorStop(0, '#24104f'); sky.addColorStop(0.45, '#6a2490'); sky.addColorStop(0.82, '#e05a9b'); sky.addColorStop(1, '#ffad8c');
    g.fillStyle = sky; g.fillRect(0, 0, S, yh);
    var sy = yh - S * 0.025, sr = S * 0.15;
    var sg = g.createLinearGradient(0, sy - sr, 0, sy + sr * 0.3); sg.addColorStop(0, '#fff0b0'); sg.addColorStop(0.55, '#ffbd7c'); sg.addColorStop(1, '#ff7aa0');
    g.fillStyle = sg; g.beginPath(); g.arc(cx, sy, sr, 0, 7); g.fill();
    g.fillStyle = '#c94585';
    for (var i = 0; i < 5; i++) g.fillRect(cx - sr, sy - sr * 0.28 + i * sr * 0.17, sr * 2, sr * (0.03 + i * 0.022));
    var gd = g.createLinearGradient(0, yh, 0, cy + S * 0.37); gd.addColorStop(0, '#2a0f52'); gd.addColorStop(1, '#0c0520');
    g.fillStyle = gd; g.fillRect(0, yh, S, S);
    g.strokeStyle = 'rgba(190,96,255,0.85)'; g.lineWidth = S * 0.0035;
    for (var j = 1; j <= 8; j++) { var yy = yh + S * 0.32 * Math.pow(j / 8, 1.9); g.beginPath(); g.moveTo(0, yy); g.lineTo(S, yy); g.stroke(); }
    for (var k = -10; k <= 10; k++) { g.beginPath(); g.moveTo(cx + k * S * 0.012, yh); g.lineTo(cx + k * S * 0.12, yh + S * 0.34); g.stroke(); }
    var hz = g.createLinearGradient(0, yh - S * 0.01, 0, yh + S * 0.02); hz.addColorStop(0, 'rgba(255,170,210,0)'); hz.addColorStop(0.4, 'rgba(255,170,210,0.9)'); hz.addColorStop(1, 'rgba(255,170,210,0)');
    g.fillStyle = hz; g.fillRect(0, yh - S * 0.01, S, S * 0.03);
    function palm(x0, y0, lean, sc) {
      var tx = x0 + lean * S * 0.06 * sc, ty = y0 - S * 0.27 * sc;
      g.strokeStyle = '#08030f'; g.fillStyle = '#08030f'; g.lineCap = 'round';
      g.lineWidth = S * 0.012 * sc; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + lean * S * 0.09 * sc, y0 - S * 0.13 * sc, tx, ty); g.stroke();
      [-172, -146, -118, -90, -62, -34, -8].forEach(function (deg) {
        var a = deg * Math.PI / 180, len = S * 0.115 * sc, droop = len * 0.5 * Math.abs(Math.cos(a));
        var ex = tx + Math.cos(a) * len, ey = ty + Math.sin(a) * len * 0.45 + droop;
        var mx = tx + Math.cos(a) * len * 0.55, my = ty + Math.sin(a) * len * 0.6 - len * 0.12;
        g.beginPath(); g.moveTo(tx, ty);
        g.quadraticCurveTo(mx, my - S * 0.014 * sc, ex, ey);
        g.quadraticCurveTo(mx, my + S * 0.012 * sc, tx, ty); g.fill();
      });
      g.beginPath(); g.arc(tx, ty, S * 0.01 * sc, 0, 7); g.fill();
    }
    palm(cx - S * 0.21, yh + S * 0.03, 1, 1); palm(cx + S * 0.22, yh + S * 0.035, -1, 0.9);
    g.restore();

    var fs = S * 0.085, txt = 'GAME ON';
    g.font = 'italic 900 ' + fs + 'px Manrope, "Arial Black", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    var tw = g.measureText(txt).width, ty2 = cy + S * 0.245;
    var lg = g.createLinearGradient(cx - tw / 2, 0, cx + tw / 2, 0); lg.addColorStop(0, '#ffffff'); lg.addColorStop(0.55, '#ffd2ec'); lg.addColorStop(0.75, '#ff6fb5'); lg.addColorStop(1, '#8f6bff');
    g.lineJoin = 'round'; g.strokeStyle = '#12061f'; g.lineWidth = S * 0.014; g.strokeText(txt, cx, ty2);
    g.fillStyle = lg; g.fillText(txt, cx, ty2);
  }
function drawGirlCrest(g, S) {
    var cx = S / 2, cy = S / 2, i;
    var rim = g.createRadialGradient(cx, cy, S * 0.42, cx, cy, S * 0.52); rim.addColorStop(0, '#f77fb6'); rim.addColorStop(1, '#ff9cc8');
    g.fillStyle = rim; g.fillRect(0, 0, S, S);
    g.fillStyle = '#ffe4f0'; g.beginPath(); g.arc(cx, cy, S * 0.425, 0, 7); g.fill();
    for (i = 0; i < 22; i++) { var a = i / 22 * Math.PI * 2; g.fillStyle = i % 2 ? '#ff8fc0' : '#ff4f9a'; heartPath(g, cx + Math.cos(a) * S * 0.39, cy + Math.sin(a) * S * 0.39, S * 0.019); g.fill(); }
    var inner = g.createRadialGradient(cx, cy, 0, cx, cy, S * 0.355); inner.addColorStop(0, '#fff3f8'); inner.addColorStop(1, '#ffc6de');
    g.fillStyle = inner; g.beginPath(); g.arc(cx, cy, S * 0.355, 0, 7); g.fill();
    g.setLineDash([S * 0.018, S * 0.012]); g.strokeStyle = '#ffffff'; g.lineWidth = S * 0.007; g.beginPath(); g.arc(cx, cy, S * 0.352, 0, 7); g.stroke(); g.setLineDash([]);
    ringText(g, 'MAIN CHARACTER ENERGY • ', cx, cy, S * 0.3, S * 0.04, '#b0145e');
    g.save(); g.shadowColor = 'rgba(160,0,70,0.3)'; g.shadowBlur = S * 0.02; g.shadowOffsetY = S * 0.006;
    var hg = g.createLinearGradient(0, cy - S * 0.15, 0, cy + S * 0.15); hg.addColorStop(0, '#ff6aa8'); hg.addColorStop(1, '#dd166c');
    g.fillStyle = hg; heartPath(g, cx, cy - S * 0.01, S * 0.14); g.fill(); g.restore();
    g.strokeStyle = '#ffffff'; g.lineWidth = S * 0.011; heartPath(g, cx, cy - S * 0.01, S * 0.14); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(cx - S * 0.075, cy - S * 0.085, S * 0.026, S * 0.013, -0.7, 0, 7); g.fill();
    [[-0.2, -0.13, 0.042], [0.2, -0.06, 0.034], [0.15, 0.15, 0.042], [-0.17, 0.13, 0.03]].forEach(function (p) {
      g.fillStyle = '#ffffff'; g.strokeStyle = '#f2b84b'; g.lineWidth = S * 0.005; sparkPath(g, cx + p[0] * S, cy + p[1] * S, p[2] * S); g.fill(); g.stroke();
    });
  }
function addPile(g, S) {
    for (var i = 0; i < 260; i++) {
      var x = Math.random() * S, y = Math.random() * S, r = rand(S * 0.03, S * 0.12), gr = g.createRadialGradient(x, y, 0, x, y, r);
      var c = Math.random() < 0.5 ? '0,0,0' : '255,255,255'; gr.addColorStop(0, 'rgba(' + c + ',0.035)'); gr.addColorStop(1, 'rgba(' + c + ',0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    var id = g.getImageData(0, 0, S, S), d = id.data;
    for (var k = 0; k < d.length; k += 4) { var n = (Math.random() - 0.5) * 26; d[k] += n; d[k + 1] += n; d[k + 2] += n; }
    g.putImageData(id, 0, 0);
  }
var pileBumpTex = null;
function pileBump() {
    if (pileBumpTex) return pileBumpTex;
    pileBumpTex = canvasTex(1024, 1024, function (g, w, h) {
      g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
      var id = g.getImageData(0, 0, w, h), d = id.data;
      for (var k = 0; k < d.length; k += 4) { var n = 128 + (Math.random() - 0.5) * 140; d[k] = d[k + 1] = d[k + 2] = n; }
      g.putImageData(id, 0, 0);
      g.lineWidth = 1;
      for (var i = 0; i < 14000; i++) { var x = Math.random() * w, y = Math.random() * h, a = Math.random() * 6.28, l = rand(2, 5); g.strokeStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    }, false);
    return pileBumpTex;
  }
var bindCache = {};
function bindingMat(hex) {
    if (bindCache[hex]) return bindCache[hex];
    var map = canvasTex(512, 64, function (g, w, h) {
      g.fillStyle = hex; g.fillRect(0, 0, w, h);
      var id = g.getImageData(0, 0, w, h), d = id.data;
      for (var k = 0; k < d.length; k += 4) { var n = (Math.random() - 0.5) * 30; d[k] += n; d[k + 1] += n; d[k + 2] += n; }
      g.putImageData(id, 0, 0);
      g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 1;
      for (var x = 0; x < w; x += 6) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 3, h); g.stroke(); }
    });
    map.wrapS = T.RepeatWrapping; map.repeat.set(24, 1);
    return (bindCache[hex] = new T.MeshStandardMaterial({ map: map, roughness: 1, side: T.DoubleSide }));
  }
function crestTexture(s) {
    var S = small ? 1024 : 2048;
    return canvasTex(S, S, function (g) {
      var tmp = document.createElement('canvas'); tmp.width = tmp.height = S; var tg = tmp.getContext('2d');
      if (s.patch === 'game') drawGameCrest(tg, S); else if (s.patch === 'girl') drawGirlCrest(tg, S); else drawPlainCrest(tg, S, s.hex);
      try { g.filter = 'blur(' + (S / 1100).toFixed(2) + 'px)'; } catch (e) {}
      g.drawImage(tmp, 0, 0);
      try { g.filter = 'none'; } catch (e) {}
      addPile(g, S);
    });
  }
function rugTop(tex) { return new T.MeshStandardMaterial({ map: tex, bumpMap: pileBump(), bumpScale: 0.4, roughness: 1, metalness: 0 }); }
function buildMat(s) {
    var g = new T.Group(), R = 1.5, h = 0.036;
    if (s.patch === 'girl') {
      var pts = [], i;
      for (i = 0; i < 720; i++) { var a = i / 720 * Math.PI * 2, r = R * (0.9 + 0.1 * Math.abs(Math.cos(8 * a))); pts.push(new T.Vector2(Math.cos(a) * r, Math.sin(a) * r)); }
      var bs = 0.014, geo = new T.ExtrudeGeometry(new T.Shape(pts), { depth: h - 0.016, bevelEnabled: true, bevelThickness: 0.008, bevelSize: bs, bevelSegments: 3, steps: 1 });
      geo.rotateX(-Math.PI / 2); geo.translate(0, 0.008, 0);
      var tex = crestTexture(s), Rt = R + bs; tex.repeat.set(1 / (2 * Rt), 1 / (2 * Rt)); tex.offset.set(0.5, 0.5);
      var mesh = new T.Mesh(geo, [rugTop(tex), bindingMat('#f27fb3')]); mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh);
    } else {
      var edgeHex = s.patch === 'game' ? '#d9549b' : s.hex;
      var prof = [[R - 0.03, 0], [R - 0.008, 0.004], [R, 0.018], [R - 0.008, h - 0.004], [R - 0.03, h]].map(function (p) { return new T.Vector2(p[0], p[1]); });
      var edge = new T.Mesh(new T.LatheGeometry(prof, 160), bindingMat(edgeHex)); edge.castShadow = true; edge.receiveShadow = true; g.add(edge);
      var bottom = new T.Mesh(new T.CircleGeometry(R - 0.028, 96), plainMat('#1a1418', 1)); bottom.rotation.x = Math.PI / 2; bottom.position.y = 0.001; g.add(bottom);
      var top = new T.Mesh(new T.CircleGeometry(R - 0.026, 160), rugTop(crestTexture(s)));
      top.rotation.x = -Math.PI / 2; top.position.y = h - 0.001; top.castShadow = true; top.receiveShadow = true; g.add(top);
    }
    g.userData.foot = 4.4; return g;
  }
function buildModel(s) {
    if (s.kind === 'money') return buildMoney(s);
    if (s.kind === 'chair') return buildChair(s);
    if (s.kind === 'mat') return buildMat(s);
    return buildDome(s);
  }
function disposeGroup(g) { g.traverse(function (o) { if (o.geometry) o.geometry.dispose(); }); }
function blobTex() { return canvasTex(256, 256, function (g, w, h) { var r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); r.addColorStop(0, 'rgba(0,0,0,0.6)'); r.addColorStop(0.4, 'rgba(0,0,0,0.45)'); r.addColorStop(0.75, 'rgba(0,0,0,0.14)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); }, false); }
function dotTex() { return canvasTex(64, 64, function (g, w, h) { var r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,240,210,1)'); r.addColorStop(1, 'rgba(255,240,210,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); }, false); }
function glowTex() {
    return canvasTex(128, 256, function (g, w, h) {
      var a = g.createLinearGradient(0, 0, w, 0); a.addColorStop(0, 'rgba(255,214,160,0)'); a.addColorStop(0.5, 'rgba(255,226,178,0.95)'); a.addColorStop(1, 'rgba(255,214,160,0)');
      g.fillStyle = a; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'destination-in';
      var b = g.createLinearGradient(0, 0, 0, h); b.addColorStop(0, 'rgba(0,0,0,1)'); b.addColorStop(0.7, 'rgba(0,0,0,0.8)'); b.addColorStop(1, 'rgba(0,0,0,0.25)'); g.fillStyle = b; g.fillRect(0, 0, w, h);
    }, false);
  }
function plankTex() {
    var t = canvasTex(1024, 1024, function (g, w, h) {
      var rows = 8, rh = h / rows;
      for (var r = 0; r < rows; r++) {
        g.fillStyle = 'hsl(' + rand(20, 27) + ',' + rand(38, 48) + '%,' + rand(26, 33) + '%)'; g.fillRect(0, r * rh, w, rh);
        for (var i = 0; i < 70; i++) { g.fillStyle = 'rgba(40,15,5,' + rand(0.03, 0.1) + ')'; g.fillRect(rand(0, w), r * rh + rand(0, rh), rand(60, 340), 1.5); }
        g.fillStyle = 'rgba(30,10,4,0.55)'; g.fillRect(0, r * rh, w, 3);
        g.fillRect(rand(0, w), r * rh, 3, rh);
      }
    });
    t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(5, 4); return t;
  }
function wallTex() {
    return canvasTex(8, 512, function (g, w, h) { var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#EDB296'); gr.addColorStop(0.55, '#F3C6B0'); gr.addColorStop(1, '#F7D7C9'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  }
var CAM = {
    dome:  { pos: [0, 2.0, 6.6], look: [0, 0.62, 0], shadow: 2.7, w: 5.6 },
    mat:   { pos: [0, 5.0, 4.7], look: [0, 0, 0],  shadow: 3.9, w: 8.6 }
  };
var THUMB_CAM = {
    dome:  { pos: [0, 1.7, 5.1], look: [0, 0.72, 0] },
    mat:   { pos: [0, 3.9, 4.7], look: [0, 0.0, 0] }
  };
function addLights(scene, big) {
    scene.add(new T.HemisphereLight(0xfff1e6, 0x8a5a44, 0.6));
    var key = new T.DirectionalLight(0xffe0c0, 1.7); key.position.set(-2.8, 7.5, 3.8); key.castShadow = true;
    var sm = big ? (small ? 2048 : 4096) : 1024; key.shadow.mapSize.set(sm, sm);
    var c = key.shadow.camera; c.near = 1; c.far = 24; c.left = -5; c.right = 5; c.top = 5; c.bottom = -5;
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03; key.target.position.set(0, 0.6, 0);
    scene.add(key); scene.add(key.target);
    var fill = new T.DirectionalLight(0xffc4d8, 0.4); fill.position.set(5, 3, 3); scene.add(fill);
    var rim = new T.DirectionalLight(0xffd9a8, 0.8); rim.position.set(0, 3, -5); scene.add(rim);
  }
var SLOTS = [[-0.34, 0.6, -1], [0.36, 0.66, -1.5], [-0.4, -0.66, -0.5], [0.42, -0.7, -1], [-0.22, 0.88, -2.5], [0.14, -0.9, -2], [0.52, 0.08, -2.5], [0.66, -0.2, -1.2], [0.86, -0.34, -3], [-0.62, 0.92, -3], [0.06, 0.82, -3.6], [-0.18, -0.2, -4]];
var GEO = {};
function geo(n, make) { return GEO[n] || (GEO[n] = make()); }
function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function sphGeo() { return geo('sph', function () { return new T.SphereGeometry(1, 48, 32); }); }
var ballTexCache = {};
function ballTex(n, hex) {
    var k = n + hex; if (ballTexCache[k]) return ballTexCache[k];
    return (ballTexCache[k] = canvasTex(512, 256, function (g, w, h) {
      if (n >= 9) { g.fillStyle = '#F7F6F2'; g.fillRect(0, 0, w, h); g.fillStyle = hex; g.fillRect(0, h * 0.27, w, h * 0.46); } // 9-15 are striped
      else { g.fillStyle = hex; g.fillRect(0, 0, w, h); }
      [128, 384].forEach(function (cx) {
        g.fillStyle = '#F7F6F2'; g.beginPath(); g.arc(cx, 128, 64, 0, 7); g.fill();
        g.fillStyle = '#121212'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 ' + (n >= 10 ? 70 : 84) + 'px Manrope, "Arial Black", Arial, sans-serif'; g.fillText(String(n), cx, 134);
      });
    }));
  }
var coinTexC = {}, noteTexC = {}, pfCache = {};
function getCoinTex(cur) {
    var CI = curInfo(cur);
    return coinTexC[cur] || (coinTexC[cur] = canvasTex(256, 256, function (g) {
      g.fillStyle = '#E7C25A'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#B8902E'; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 108, 0, 7); g.stroke();
      g.lineWidth = 3; g.beginPath(); g.arc(128, 128, 92, 0, 7); g.stroke();
      g.fillStyle = '#9A7420'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 140px Manrope, Arial, sans-serif'; g.fillText(CI.sym, 128, 136);
    }));
  }
function getNoteTex(cur, i) { var k = cur + (i || 0), H = Math.round(768 / noteAspect(cur)); return noteTexC[k] || (noteTexC[k] = canvasTex(768, H, function (g) { drawBill(g, 0, 0, 768, H, cur, i); })); }
function propFabric(hex) {
    if (pfCache[hex]) return pfCache[hex];
    var rgb = rgbOf(hex), lum = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
    var map = canvasTex(512, 256, function (g, w, h) { g.fillStyle = hex; g.fillRect(0, 0, w, h); drawWales(g, 0, 0, w, h, 32); addNap(g, w, h, 4 + 14 * lum, 300); });
    map.wrapS = T.RepeatWrapping;
    return (pfCache[hex] = new T.MeshStandardMaterial({ map: map, roughness: 0.95 }));
  }
function heartGeo() {
    return geo('heart', function () {
      var sh = new T.Shape(); sh.moveTo(0, -0.9); sh.bezierCurveTo(-1.5, -0.1, -1.1, 1.0, 0, 0.35); sh.bezierCurveTo(1.1, 1.0, 1.5, -0.1, 0, -0.9);
      var g = new T.ExtrudeGeometry(sh, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.2, bevelSegments: 5, curveSegments: 24 }); g.center(); g.scale(0.6, 0.6, 0.6); return g;
    });
  }
function sparkGeo() {
    return geo('spark', function () {
      var sh = new T.Shape();
      for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4 - Math.PI / 2, rad = i % 2 ? 0.3 : 1; if (i) sh.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); else sh.moveTo(Math.cos(a) * rad, Math.sin(a) * rad); }
      var g = new T.ExtrudeGeometry(sh, { depth: 0.15, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 2 }); g.center(); return g;
    });
  }
function makeProp(sp) {
    var g = new T.Group(), m, base = 0.2;
    if (sp.t === 'ball') {
      m = new T.Mesh(sphGeo(), new T.MeshPhysicalMaterial({ map: sp.kit ? kitBallTex(sp.kit) : ballTex(sp.n, sp.hex), roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 })); m.userData.own = true; base = 0.27;
    } else if (sp.t === 'cord') {
      m = new T.Mesh(sphGeo(), propFabric(sp.hex)); base = 0.23;
    } else if (sp.t === 'coin') {
      var cap = new T.MeshStandardMaterial({ map: getCoinTex(sp.cur), roughness: 0.4, metalness: 0.2 });
      m = new T.Mesh(geo('coin', function () { return new T.CylinderGeometry(1, 1, 0.16, 40); }), [plainMat('#D9B24C', 0.35), cap, cap]); m.rotation.x = Math.PI / 2; base = 0.24;
    } else if (sp.t === 'note') {
      var side = plainMat(darkenHex(curInfo(sp.cur).paper, 0.85), 0.8), face = new T.MeshStandardMaterial({ map: getNoteTex(sp.cur, 0), roughness: 0.8 }), back = new T.MeshStandardMaterial({ map: getNoteTex(sp.cur, 1), roughness: 0.8 });
      m = new T.Mesh(geo('note' + sp.cur, function () { return new T.BoxGeometry(1, 1 / noteAspect(sp.cur), 0.02); }), [side, side, side, side, face, back]); base = 0.62;
    } else if (sp.t === 'heart') {
      m = new T.Mesh(heartGeo(), new T.MeshPhysicalMaterial({ color: sp.hex, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 })); m.userData.own = true; base = 0.24;
    } else if (sp.t === 'spark') {
      m = new T.Mesh(sparkGeo(), new T.MeshStandardMaterial({ color: sp.hex, emissive: sp.hex, emissiveIntensity: 0.45, roughness: 0.3 })); m.userData.own = true; base = 0.26;
    } else {
      m = new T.Mesh(geo('gem', function () { return new T.OctahedronGeometry(1, 0); }), new T.MeshStandardMaterial({ color: sp.hex, emissive: sp.hex, emissiveIntensity: 0.4, roughness: 0.25, flatShading: true })); m.userData.own = true; m.scale.y = 1.35; base = 0.2;
    }
    g.add(m); g.userData.base = base; if (sp.pick) g.userData.pick = sp.pick; return g;
  }
/* stage: the element that sizes the canvas. spec0/theme0: what to show first. Returns a handle with set/busy/onPick/dispose. */
function initHero(stage, canvas, spec0, theme0) {
    var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(hqPixelRatio(stage.clientWidth, stage.clientHeight)); hqInit(renderer);
    renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
    renderer.localClippingEnabled = true; renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    var scene = new T.Scene(), camera = new T.PerspectiveCamera(32, 1.8, 0.1, 80);
    scene.environment = studioEnv(renderer);
    addLights(scene, true);
    var themeLight = new T.DirectionalLight(0xffffff, 0.9); themeLight.position.set(3.5, 2, -3); scene.add(themeLight);
    var shadowBlob = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: 0.55 }));
    shadowBlob.rotation.x = -Math.PI / 2; shadowBlob.position.y = -0.55; scene.add(shadowBlob);

    var floor = new T.Mesh(new T.PlaneGeometry(40, 40), new T.ShadowMaterial({ opacity: 0.55 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -0.001; floor.receiveShadow = true; floor.visible = false; scene.add(floor);
    var glow = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: 0.35 }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = -0.004; glow.scale.set(8, 8, 1); glow.visible = false; scene.add(glow);
    var holder = new T.Group(); scene.add(holder);
    var propsG = new T.Group(); scene.add(propsG);
    var props = [], current = null, kind = 'dome';
    var camPos = new T.Vector3(0, 2.2, 7), camLook = new T.Vector3(0, 0.95, 0);
    var baseRot = -0.3, userRot = 0, vel = 0, drag = { on: false, x: 0 }, mx = 0, my = 0, pxs = 0, pys = 0;
    var mouse = { nx: 0, ny: 0, on: false };
    var sw = { active: false, t0: null, next: null, nextId: '', swapped: false, model: null }, lastSpin = 0;
    var theme = { cur: null, from: null, to: null, t0: null, anim: false };

    function ease(k) { return k * k * (3 - 2 * k); }
    function backOut(q, c1) { var c3 = c1 + 1; return 1 + c3 * Math.pow(q - 1, 3) + c1 * Math.pow(q - 1, 2); }
    function mixRGB(a, b, e) { return a.map(function (c, i) { return c.map(function (v, j) { return v + (b[i][j] - v) * e; }); }); }
    function applyTheme(cols) {
      theme.cur = cols;
      function s(c) { return 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')'; }
      document.body.style.setProperty('--bg-inner', s(cols[0])); document.body.style.setProperty('--bg-mid', s(cols[1])); document.body.style.setProperty('--bg-outer', s(cols[2]));
      glow.material.color.setRGB(Math.min(1, cols[0][0] / 255 * 1.3), Math.min(1, cols[0][1] / 255 * 1.3), Math.min(1, cols[0][2] / 255 * 1.3));
      themeLight.color.setRGB(Math.min(1, cols[0][0] / 255 * 1.5 + 0.15), Math.min(1, cols[0][1] / 255 * 1.5 + 0.15), Math.min(1, cols[0][2] / 255 * 1.5 + 0.15));
    }
    function setTheme(arr, instant) {
      var to = arr.map(rgbOf);
      if (instant || !theme.cur) { theme.to = to; theme.anim = false; applyTheme(to); return; }
      theme.from = theme.cur.map(function (c) { return c.slice(); }); theme.to = to; theme.t0 = null; theme.anim = true;
    }

    function clearProps() {
      props.forEach(function (p) { propsG.remove(p.g); p.g.traverse(function (o) { if (o.userData && o.userData.own && o.material) o.material.dispose(); }); });
      props = [];
    }
    /* every style floats in one ring around the beanbag; tapping one switches straight to it */
    var canHover = window.matchMedia('(hover: hover)').matches;
    var RING = { rx: 2.15, ry: 1.5, cy: 0.62, z: -0.45 }, ringA = 0, selKey = '', hoverKey = '', hoverCb = null, bornAt = 0;
    function pickKey(p) { return !p ? '' : p.player ? 'player:' + p.player : p.ball ? 'ball:' + p.ball : 'cur:' + p.cur; }
    function specKey(s) { return s.kit ? 'player:' + s.kit.id : s.patch === 'circle' ? 'ball:' + (s.num || 8) : s.patch === 'dollar' ? 'cur:' + (s.cur || 'USD') : ''; }
    var propsKey = '';
    /* where each style floats: never straight above the beanbag (that is where CR7, the statue and the sun are).
       nor in front of it (where its badge is). Three styles: left, upper right and lower right, around its sides. */
    function ringAngle(i, n) { var D = Math.PI / 180; return n === 3 ? [170 * D, 35 * D, -30 * D][i] : -Math.PI * 0.5 + (i + 0.5) / n * Math.PI * 2; }
    function buildProps(id, first) {
      clearProps();
      var d = byId(DESIGNS, id), list = PROPSETS[d.props] || PROPSETS.players, n = list.length;
      propsKey = d.props; bornAt = performance.now();
      for (var i = 0; i < n; i++) {
        var g = makeProp(list[i]); g.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3)); g.scale.setScalar(0.001); propsG.add(g);
        props.push({ g: g, a: ringAngle(i, n), s: g.userData.base * (n <= 3 ? 1.2 : 0.9), cs: 0, delay: (first ? 700 : 0) + i * 70, spin: rand(0.25, 0.6), ph: rand(0, 6.28), key: pickKey(g.userData.pick) });
      }
    }
    /* fit the ring on screen: beside the text on wide screens, centred on tablets and phones */
    var frameZ = 9;
    function frameRing(w, h) {
      var asp = w / h, wide = w >= 1100 && asp > 1.2;
      var x0 = wide ? 0.38 : 0.02, x1 = 0.98, y0 = wide ? 0.12 : 0.05, y1 = 0.97;
      var tanV = Math.tan(16 * Math.PI / 180), hw = RING.rx + 0.5, hh = RING.ry + 0.5;
      frameZ = Math.max(hh / (tanV * (y1 - y0)), hw / (tanV * asp * (x1 - x0)));
      camera.setViewOffset(w, h, (0.5 - (x0 + x1) / 2) * w, (0.5 - (y0 + y1) / 2) * h, w, h);
    }
    function install(s, model) {
      if (current) { holder.remove(current); disposeGroup(current); }
      current = model || buildModel(s); holder.add(current); kind = s.kind; sitShape();
      var f = CAM[kind].shadow; shadowBlob.scale.set(f, f, 1);
      // a real cast shadow on an invisible floor grounds the beanbag (the soft blob stays underneath as contact shadow)
      var isMat = kind === 'mat'; floor.visible = isMat; floor.material.opacity = 0.55; glow.visible = isMat; shadowBlob.position.y = 0.003; shadowBlob.material.opacity = isMat ? 0.45 : 0.8; // on the hero only one soft shadow, centred under the beanbag (no hard cast shadow off to the side)
    }
    /* sitting: the seat sinks in with a little give (sinks slightly past, then settles), and rises back up when you stand */
    var settle = 0, settleTo = 0, lastSpec = spec0, sitClock = 3.2; // first sit comes soon after the beanbag lands
    /* the banknote photos arrived after the beanbag was built: rebuild whatever shows money */
    function onNotes() {
      if (disposed) return;
      if (sw.active && !sw.swapped) { if (sw.next.patch === 'dollar') { if (sw.model) disposeGroup(sw.model); sw.model = buildModel(sw.next); } }
      else if (lastSpec.patch === 'dollar') install(lastSpec);
      if (propsKey === 'notes') buildProps(lastSpec.id);
    }
    notesListeners.push(onNotes);
    function sitAmount() { return settleTo > 0 ? backOut(settle, 1.3) : settle * settle * (3 - 2 * settle); }
    function sitShape() { var ms = current && current.userData.morphs; if (ms) { var v = sitAmount(); ms.forEach(function (m) { if (v > 0 || m.base) applySit(m, v); }); } }
    function set(s, designChanged, th) {
      selKey = specKey(s); lastSpec = s;
      var nextProps = byId(DESIGNS, s.id).props;
      if (!designChanged || reduce) { install(s); if (designChanged) { baseRot = byId(DESIGNS, s.id).rot || 0; userRot = 0; } if (nextProps !== propsKey) buildProps(s.id); setTheme(th, reduce); return; }
      var model = buildModel(s);
      if (sw.active && !sw.swapped) { if (sw.model) disposeGroup(sw.model); }
      else { if (sw.active) userRot += lastSpin; sw.active = true; sw.t0 = null; sw.swapped = false; }
      sw.next = s; sw.nextId = s.id; sw.model = model; sw.leaving = nextProps !== propsKey;
      setTheme(th, false);
    }
    function resize() {
      var w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
      renderer.setPixelRatio(hqPixelRatio(w, h)); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      frameRing(w, h);
    }
    var ro = null;
    if ('ResizeObserver' in window) { ro = new ResizeObserver(resize); ro.observe(stage); } else window.addEventListener('resize', resize);

    function hintOff() {}
    var ray = new T.Raycaster(), ndc = new T.Vector2(), downAt = null, pickCb = null;
    function pickAt(e) {
      var margin = e.pointerType === 'mouse' ? 14 : 26;
      var r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height * 2 - 1));
      /* forgiving tap targets: nearest prop centre on screen within its size plus a margin */
      var best = null, bestD = 1e9, v = new T.Vector3(), tanH = Math.tan(16 * Math.PI / 180);
      for (var i = 0; i < props.length; i++) {
        var p = props[i]; if (!p.g.userData.pick) continue;
        v.copy(p.g.position).project(camera); if (v.z > 1) continue;
        var sx = (v.x + 1) / 2 * r.width, sy = (1 - v.y) / 2 * r.height;
        var dz = Math.max(0.5, camera.position.z - p.g.position.z), rad = p.g.scale.x / (dz * tanH) * r.height / 2 * 1.2 + margin;
        var d = Math.hypot(e.clientX - r.left - sx, e.clientY - r.top - sy);
        if (d < rad && d < bestD) { bestD = d; best = p.g.userData.pick; }
      }
      return best;
    }
    canvas.addEventListener('pointerdown', function (e) { drag.on = true; drag.x = e.clientX; vel = 0; downAt = { x: e.clientX, y: e.clientY }; });
    canvas.addEventListener('pointerup', function (e) {
      if (!downAt) return; var moved = Math.abs(e.clientX - downAt.x) + Math.abs(e.clientY - downAt.y); downAt = null;
      if (moved > 8) return; var p = pickAt(e); if (p && pickCb) pickCb(p);
    });
    canvas.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse' || drag.on) return;
      var p = pickAt(e), r = canvas.getBoundingClientRect();
      hoverKey = pickKey(p); canvas.style.cursor = p ? 'pointer' : '';
      if (hoverCb) hoverCb(p, e.clientX - r.left, e.clientY - r.top);
    });
    canvas.addEventListener('pointerleave', function () { hoverKey = ''; canvas.style.cursor = ''; if (hoverCb) hoverCb(null, 0, 0); });
    var onWinMove = function (e) {
      var r = stage.getBoundingClientRect();
      var inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (drag.on) { var dx = e.clientX - drag.x; drag.x = e.clientX; userRot += dx * 0.011; vel = dx * 0.011; }
      if (!inside) { mouse.on = false; mx = 0; my = 0; return; }
      mouse.nx = (e.clientX - r.left) / r.width * 2 - 1; mouse.ny = -((e.clientY - r.top) / r.height * 2 - 1);
      mouse.on = true; mx = mouse.nx; my = -mouse.ny;
    };
    window.addEventListener('pointermove', onWinMove, { passive: true });
    var endDrag = function () { drag.on = false; };
    window.addEventListener('pointerup', endDrag); window.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') { userRot -= 0.18; hintOff(); e.preventDefault(); } if (e.key === 'ArrowRight') { userRot += 0.18; hintOff(); e.preventDefault(); } });

    var last = performance.now(), running = false, raf = 0, visible = true;
    function frame(now) {
      raf = requestAnimationFrame(frame);
      var dt = Math.min(0.05, (now - last) / 1000); last = now; var t = now / 1000; hqFrame(dt, resize);
      if (theme.anim) {
        if (theme.t0 == null) theme.t0 = now;
        var k = Math.min(1, (now - theme.t0) / 1500), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        applyTheme(mixRGB(theme.from, theme.to, e)); if (k >= 1) theme.anim = false;
      }
      var spinVal = 0;
      if (sw.active) {
        if (sw.t0 == null) sw.t0 = now;
        var el_ = (now - sw.t0) / 1000;
        if (el_ < 0.28) { var k1 = el_ / 0.28; spinVal = Math.PI * k1 * k1; }
        else {
          if (!sw.swapped) {
            install(sw.next, sw.model); sw.model = null; baseRot = byId(DESIGNS, sw.nextId).rot || 0; userRot = 0; vel = 0; sw.swapped = true;
            if (byId(DESIGNS, sw.nextId).props !== propsKey) buildProps(sw.nextId);
          }
          var q = Math.min(1, (el_ - 0.28) / 0.75); spinVal = Math.PI + Math.PI * backOut(q, 1.1);
        }
        if (el_ >= 1.03) { sw.active = false; spinVal = 0; }
      }
      lastSpin = spinVal;

      if (!drag.on) { userRot += vel; vel *= 0.94; }
      pxs += (mx - pxs) * 0.05; pys += (my - pys) * 0.05;
      /* every 5 seconds someone sits down in it, then gets up again (not with reduced motion, and not until it has floated in) */
      if (!reduce && now - introT0 > 1800) { sitClock += dt; if (sitClock >= 5) { sitClock = 0; settleTo = settleTo > 0 ? 0 : 1; } }
      if (settle !== settleTo) { var ds = settleTo - settle, st = reduce ? 1 : dt / (settleTo > 0 ? 0.75 : 0.6); settle = Math.abs(ds) <= st ? settleTo : settle + (ds > 0 ? st : -st); sitShape(); }
      var seated = Math.min(1, settle * 1.5); // how far someone is sitting in it (the beanbag keeps floating and turning either way)
      var bob = (reduce || kind === 'mat') ? 0 : Math.sin(t * 1.05) * 0.08, sway = reduce ? 0 : Math.sin(t * 0.5) * 0.3;
      /* entrance: the beanbag floats up into place when the page opens, its shadow fading in beneath it */
      var ik = reduce ? 1 : Math.min(1, (now - introT0) / 1500), ie = 1 - Math.pow(1 - ik, 3), rise = -2.8 * (1 - ie);
      holder.position.y = bob + rise; clipPlane.constant = -(bob + rise);
      // a real shadow tightens and darkens as the beanbag settles, and spreads and fades as it floats up
      shadowBlob.material.opacity = 0.8 * (1 - bob * 2) * ie; 
      holder.rotation.y = baseRot + userRot + sway + pxs * 0.6 + spinVal;
      shadowBlob.scale.set(CAM[kind].shadow * 1.15 * (1 + bob * 0.6), CAM[kind].shadow * 0.95 * (1 + bob * 0.6), 1);

      camPos.x += (0 - camPos.x) * 0.06; camPos.y += (RING.cy + 1.2 + seated * 0.25 - camPos.y) * 0.03; camPos.z += (frameZ - camPos.z) * 0.06;
      camLook.x += (0 - camLook.x) * 0.06; camLook.y += (RING.cy - camLook.y) * 0.06; camLook.z += (0 - camLook.z) * 0.06;
      camera.position.set(camPos.x + pxs * 0.35, camPos.y - pys * 0.18, camPos.z); camera.lookAt(camLook);

      for (var i = 0; i < props.length; i++) {
        var p = props[i], a = p.a + ringA, sel = p.key === selKey, hov = p.key === hoverKey;
        var pk = reduce ? 1 : Math.min(1, Math.max(0, (now - bornAt - p.delay) / 800)), pe = 1 - Math.pow(1 - pk, 3); // each style floats up as it appears
        p.g.position.set(Math.cos(a) * RING.rx, RING.cy + Math.sin(a) * RING.ry + (reduce ? 0 : Math.sin(t * 0.9 + p.ph) * 0.05) - 1.6 * (1 - pe), RING.z);
        if (now - bornAt < p.delay && !reduce) continue;
        var leaving = sw.active && sw.leaving && !sw.swapped;
        var target = leaving ? 0 : p.s * (sel ? 1.45 : hov ? 1.22 : 1);
        p.cs += (target - p.cs) * (reduce ? 1 : leaving ? 0.3 : 0.14);
        p.g.scale.setScalar(Math.max(0.001, p.cs));
        if (!reduce) { var sp = dt * p.spin * (sel ? 2.2 : 1); p.g.rotation.y += sp; p.g.rotation.x += sp * 0.5; }
      }
      renderer.render(scene, camera);
    }
    function start() { if (running || !visible || document.hidden) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }
    var io = null, disposed = false;
    if ('IntersectionObserver' in window) { io = new IntersectionObserver(function (es) { visible = es[0].isIntersecting; visible ? start() : stop(); }, { threshold: 0 }); io.observe(stage); }
    var onVis = function () { document.hidden ? stop() : start(); };
    document.addEventListener('visibilitychange', onVis);

    var d0 = byId(DESIGNS, spec0.id), introT0 = performance.now();
    resize(); baseRot = d0.rot || 0; selKey = specKey(spec0); install(spec0); buildProps(spec0.id, true); setTheme(theme0, true);
    camPos.set(0, RING.cy + 1.2, frameZ);
    var warmTimer = setTimeout(function () { warmStyles(renderer, spec0.fabric); }, 1500);
    /* compile the shaders for every design and ring object in an idle moment, so even the first switch to a design is smooth */
    var compileTimer = setTimeout(function () {
      var run = function () {
        if (disposed) return;
        var tmp = new T.Group();
        ['players', 'balls', 'notes'].forEach(function (k) { tmp.add(makeProp(PROPSETS[k][0])); });
        [{ id: 'legend', kind: 'dome', patch: 'kitpatch', hex: KITS[0].hex, fabric: spec0.fabric, kit: KITS[0] },
         { id: 'ols01', kind: 'dome', patch: 'circle', hex: '#141213', fabric: spec0.fabric, num: 8 },
         { id: 'dollar', kind: 'dome', patch: 'dollar', hex: '#17503C', fabric: spec0.fabric, cur: 'USD' }].forEach(function (sp) { tmp.add(buildModel(sp)); });
        scene.add(tmp); try { renderer.compile(scene, camera); } catch (e) {} scene.remove(tmp); disposeGroup(tmp);
      };
      if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 3000 }); else run();
    }, 2200);
    if (reduce) renderer.render(scene, camera);
    start();
    function dispose() {
      if (disposed) return; disposed = true; notesListeners = notesListeners.filter(function (f) { return f !== onNotes; }); stop(); clearTimeout(warmTimer); clearTimeout(compileTimer); warmToken++;
      if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
      if (io) io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onWinMove);
      window.removeEventListener('pointerup', endDrag); window.removeEventListener('pointercancel', endDrag);
      clearProps(); if (current) disposeGroup(current);
      renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) {}
    }
    /* where the beanbag sits on screen once the camera has settled, in stage pixels: its centre, and the floor line
       just behind it, so the painted backdrop can put its floor exactly under the beanbag */
    function anchor() {
      var w = stage.clientWidth, h = stage.clientHeight, cam = camera.clone();
      cam.position.set(0, RING.cy + 1.2, frameZ); cam.lookAt(0, RING.cy, 0); cam.updateMatrixWorld();
      function px(x, y, z) { var v = new T.Vector3(x, y, z).project(cam); return { x: (v.x + 1) / 2 * w, y: (1 - v.y) / 2 * h }; }
      var mid = px(0, RING.cy, 0), back = px(0, 0, -1.1), front = px(0, 0, 0.9);
      return { x: mid.x, mid: mid.y, horizon: back.y, floor: front.y, w: w, h: h };
    }
    return { set: set, anchor: anchor, busy: function () { return false; }, onPick: function (fn) { pickCb = fn; }, onHover: function (fn) { hoverCb = fn; }, warm: function (fabric) { warmStyles(renderer, fabric); }, toggleSit: function () { settleTo = settleTo > 0 ? 0 : 1; return settleTo > 0; }, dispose: dispose };
  }
function makeThumbs(specs, o, done) {
    var W = o.W, H = o.H, zoom = o.zoom || 1, r;
    try { r = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch (e) { done({}); return; }
    r.setPixelRatio(1); r.setSize(W, H, false); r.outputEncoding = T.sRGBEncoding; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 0.9;
    r.localClippingEnabled = true; r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap; r.setClearColor(0x000000, 0);
    var sc = new T.Scene(); sc.environment = studioEnv(r); addLights(sc, false);
    var ground = new T.Mesh(new T.PlaneGeometry(30, 30), new T.ShadowMaterial({ opacity: 0.3 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; sc.add(ground);
    var blob = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: 0.55 })); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.004; sc.add(blob);
    var cam = new T.PerspectiveCamera(28, W / H, 0.1, 60), out = {}, i = 0;
    (function next() {
      if (i >= specs.length) { r.dispose(); try { r.forceContextLoss(); } catch (e) {} done(out); return; }
      var d = specs[i++], kit = d.variant === 'player' ? KITS[0] : null;
      var s = { id: d.id, kind: d.kind, patch: d.patch, hex: kit ? kit.hex : byId(COLOURS, d.colour).hex, fabric: d.fabric, kit: kit };
      var m = buildModel(s); m.rotation.y = d.rot || 0; sc.add(m);
      var f = CAM[s.kind].shadow; blob.scale.set(f, f, 1);
      var c = THUMB_CAM[s.kind];
      cam.position.set(c.look[0] + (c.pos[0] - c.look[0]) * zoom, c.look[1] + (c.pos[1] - c.look[1]) * zoom, c.look[2] + (c.pos[2] - c.look[2]) * zoom); cam.lookAt(c.look[0], c.look[1], c.look[2]);
      clipPlane.constant = 0;
      r.render(sc, cam); out[d.id] = r.domElement.toDataURL('image/png');
      sc.remove(m); disposeGroup(m); setTimeout(next, 30);
    })();
  }
var HQ_TEX = small ? 2048 : 4096, SNAP_TEX = 4096, ANISO = 8, RIBS = 360;
var hqAcc = 0, hqN = 0, hqScale = 1;
function hqInit(renderer) { try { ANISO = renderer.capabilities.getMaxAnisotropy() || 8; } catch (e) {} }
function hqPixelRatio(w, h) { var d = window.devicePixelRatio || 1; return Math.max(1, Math.min(d, 2, Math.sqrt(8.3e6 / Math.max(1, w * h))) * hqScale); }
function hqFrame(dt, onDrop) { hqAcc += dt; hqN++; if (hqN >= 90) { var avg = hqAcc / hqN; hqAcc = 0; hqN = 0; if (avg > 0.045 && hqScale > 0.62) { hqScale -= 0.15; onDrop(); } } }
function canvasTex(w, h, draw, srgb) {
    var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    var t = new T.CanvasTexture(c); if (srgb !== false) t.encoding = T.sRGBEncoding; t.anisotropy = ANISO; return t;
  }
var tileCache = {};
function fibreTile(size, mode) {
    var key = size + mode; if (tileCache[key]) return tileCache[key];
    var c = document.createElement('canvas'); c.width = c.height = size; var g = c.getContext('2d');
    if (mode === 'grey') {
      var id = g.createImageData(size, size), d = id.data;
      for (var k = 0; k < d.length; k += 4) { var n = 128 + (Math.random() - 0.5) * 70; d[k] = d[k + 1] = d[k + 2] = n; d[k + 3] = 255; }
      g.putImageData(id, 0, 0);
    }
    var count = Math.round(size * size / (mode === 'grey' ? 30 : 55));
    for (var i = 0; i < count; i++) {
      var x = Math.random() * size, y = Math.random() * size, l = rand(2, 7), a = rand(-0.5, 0.5) + (Math.random() < 0.5 ? 0 : Math.PI);
      var light = Math.random() < 0.55;
      g.strokeStyle = light ? 'rgba(255,255,255,' + rand(0.08, 0.22).toFixed(2) + ')' : 'rgba(0,0,0,' + rand(0.08, 0.2).toFixed(2) + ')';
      g.lineWidth = rand(0.5, 1.1); g.beginPath(); g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.sin(a) * l * 0.5 + rand(-1, 1), y + Math.cos(a) * l * 0.5, x + Math.sin(a) * l, y + Math.cos(a) * l); g.stroke();
    }
    return (tileCache[key] = c);
  }
function layTile(g, w, h, tile, alpha, op) {
    g.save(); g.globalAlpha = alpha; g.globalCompositeOperation = op || 'source-over';
    g.fillStyle = g.createPattern(tile, 'repeat'); g.fillRect(0, 0, w, h); g.restore();
  }
function mottle(g, w, h, a, count) {
    for (var i = 0; i < count; i++) {
      var x = Math.random() * w, y = Math.random() * h, r = rand(w * 0.02, w * 0.09), gr = g.createRadialGradient(x, y, 0, x, y, r);
      var c = Math.random() < 0.5 ? '0,0,0' : '255,255,255'; gr.addColorStop(0, 'rgba(' + c + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + c + ',0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
function lumOf(hex) { var c = rgbOf(hex); return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255; }
function drawRibs(g, w, h, n, lum) {
    var p = w / n, d = 0.05 + 0.08 * lum, l = 0.01 + 0.016 * (1 - lum);
    for (var i = 0; i < n; i++) {
      var x = i * p, gr = g.createLinearGradient(x, 0, x + p, 0);
      gr.addColorStop(0, 'rgba(0,0,0,' + d + ')'); gr.addColorStop(0.3, 'rgba(0,0,0,' + (d * 0.25).toFixed(3) + ')'); gr.addColorStop(0.5, 'rgba(255,255,255,' + l + ')');
      gr.addColorStop(0.7, 'rgba(0,0,0,' + (d * 0.25).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(0,0,0,' + d + ')');
      g.fillStyle = gr; g.fillRect(x, 0, p + 0.5, h);
    }
  }
function drawSeams(g, w, h) {
    var sw = Math.max(1.5, w * 0.0009), st = Math.max(2, h * 0.006), gap = h * 0.011;
    for (var k = 0; k <= 6; k++) {
      var x = k * w / 6;
      g.fillStyle = 'rgba(0,0,0,0.34)'; g.fillRect(x - sw, 0, sw * 2, h);
      g.fillStyle = 'rgba(255,255,255,0.035)'; g.fillRect(x - sw * 3.4, 0, sw * 0.8, h); g.fillRect(x + sw * 2.6, 0, sw * 0.8, h);
      for (var y = 0; y < h; y += gap) {
        g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(x - sw * 5.2, y, sw * 0.9, st); g.fillRect(x + sw * 4.3, y, sw * 0.9, st);
        g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(x - sw * 5.2, y + st, sw * 0.9, st * 0.3); g.fillRect(x + sw * 4.3, y + st, sw * 0.9, st * 0.3);
      }
    }
  }
/* Fabric = a tiny colour layer per style (so switching styles is instant) multiplied by ONE shared, high-resolution
   greyscale fabric layer per fabric type (ribs, fibres, mottling, sewn seams) and a shared bump map. */
var FABRIC_TEX = small ? 1024 : 2048;
var fabricDetailCache = {}, fabricDetailOf = new WeakMap(), colourCache = {};
function fabricDetail(fabric) {
    if (fabricDetailCache[fabric]) return fabricDetailCache[fabric];
    var cord = fabric === 'corduroy', W = FABRIC_TEX, H = W / 2;
    var map = canvasTex(W, H, function (g, w, h) {
      g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
      mottle(g, w, h, cord ? 0.035 : 0.06, cord ? 170 : 320);
      if (cord) drawRibs(g, w, h, RIBS, 0.45);
      layTile(g, w, h, fibreTile(509, 'grey'), cord ? 0.32 : 0.45, 'overlay');
      layTile(g, w, h, fibreTile(383, 'hair'), 0.42);
      layTile(g, w, h, fibreTile(257, 'hair'), 0.3);
      drawSeams(g, w, h);
    }, false);
    map.wrapS = T.RepeatWrapping;
    var t = fabricBump(fabric, W, H);
    return (fabricDetailCache[fabric] = { map: map, bump: t });
  }
function colourTex(hex, kit, stripe) {
    var key = kit ? 'kit|' + kit.id : stripe ? 'stripe|' + hex : hex; if (colourCache[key]) return colourCache[key];
    var big = kit || stripe;
    var t = canvasTex(big ? 1024 : 4, big ? 512 : 2, function (g, w, h) {
      if (stripe) { g.fillStyle = '#F2EEE6'; g.fillRect(0, 0, w, h); g.fillStyle = hex; g.fillRect(0, h * 0.3, w, h * 0.34); return; } // striped pool ball: white with a coloured band round the middle
      g.fillStyle = hex; g.fillRect(0, 0, w, h); if (kit) drawKitFabric(g, w, h, kit);
    });
    t.wrapS = T.RepeatWrapping;
    return (colourCache[key] = t);
  }
function fabricBump(fabric, W, H) {
    var cord = fabric === 'corduroy';
    var bump = canvasTex(W, H, function (g, w, h) {
      g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
      if (cord) { var p = w / RIBS; for (var i = 0; i < RIBS; i++) { var x = i * p, gr = g.createLinearGradient(x, 0, x + p, 0); gr.addColorStop(0, '#4a4a4a'); gr.addColorStop(0.3, '#9a9a9a'); gr.addColorStop(0.5, '#c4c4c4'); gr.addColorStop(0.7, '#9a9a9a'); gr.addColorStop(1, '#4a4a4a'); g.fillStyle = gr; g.fillRect(x, 0, p + 0.5, h); } }
      layTile(g, w, h, fibreTile(509, 'grey'), cord ? 0.35 : 0.5, 'overlay');
      for (var k = 0; k <= 6; k++) { var sx = k * w / 6, sg = g.createLinearGradient(sx - w * 0.005, 0, sx + w * 0.005, 0); sg.addColorStop(0, 'rgba(0,0,0,0)'); sg.addColorStop(0.5, 'rgba(0,0,0,0.5)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sg; g.fillRect(sx - w * 0.005, 0, w * 0.01, h); }
    }, false);
    bump.wrapS = T.RepeatWrapping;
    return bump;
  }
function fabricMat(hex, fabric, size, kit, stripe) {
    var key = (kit ? 'kit|' + kit.id : stripe ? 'stripe|' + hex : hex) + '|' + fabric; if (matCache[key]) return matCache[key];
    var d = fabricDetail(fabric), cord = fabric === 'corduroy';
    var m = new T.MeshPhysicalMaterial({
      map: colourTex(hex, kit, stripe), bumpMap: d.bump, bumpScale: cord ? 0.018 : 0.025, roughness: cord ? 0.92 : 0.86, metalness: 0, envMapIntensity: 0.38,
      sheen: cord ? 0.55 : 0.65, sheenRoughness: 0.45, sheenColor: new T.Color(shade(hex, cord ? 0.16 : 0.26))
    });
    fabricDetailOf.set(m, d.map);
    return (matCache[key] = m);
  }
var neutralTex = null;
function neutralGrey() {
    return neutralTex || (neutralTex = canvasTex(2, 2, function (g) { g.fillStyle = '#808080'; g.fillRect(0, 0, 2, 2); }, false));
  }
var detailTexV = null;
function detailTex() {
    if (detailTexV) return detailTexV;
    var t = new T.CanvasTexture(fibreTile(1024, 'grey')); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = ANISO;
    return (detailTexV = t);
  }
/* shader: shared fabric layer (multiplied, plus a little added so dark fabrics still show their texture) and fine fibres */
function addFibreDetail(m, fabricLayer) {
    var fd = fabricLayer || neutralGrey();
    m.onBeforeCompile = function (sh) {
      sh.uniforms.detailMap = { value: detailTex() };
      sh.uniforms.fabricDetail = { value: fd };
      sh.fragmentShader = 'uniform sampler2D detailMap;\nuniform sampler2D fabricDetail;\n' + sh.fragmentShader
        .replace('#include <map_fragment>', '#include <map_fragment>\n  vec3 fabD = texture2D( fabricDetail, vUv ).rgb;\n  diffuseColor.rgb = max( diffuseColor.rgb * fabD * 2.0 + ( fabD - 0.5 ) * 0.1, 0.0 );\n  vec3 fibreD = texture2D( detailMap, vUv * vec2( 40.0, 20.0 ) ).rgb;\n  diffuseColor.rgb *= mix( vec3( 1.0 ), fibreD * 2.0, 0.28 );')
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor *= mix( 0.88, 1.08, fibreD.r );');
    };
    m.customProgramCacheKey = function () { return 'fibre-detail-2'; };
    return m;
  }




function morphable(geo, off, ao) {
    var p = geo.attributes.position, n = p.count, d = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { var x = p.getX(i), y = p.getY(i), z = p.getZ(i), l = Math.sqrt(x * x + y * y + z * z) || 1; d[i * 3] = x / l; d[i * 3 + 1] = y / l; d[i * 3 + 2] = z / l; }
    if (ao) geo.setAttribute('color', new T.BufferAttribute(new Float32Array(n * 3), 3));
    return { geo: geo, dirs: d, off: off, ao: ao };
  }
function applyShape(m, s) {
    var p = m.geo.attributes.position, d = m.dirs, o = [0, 0, 0, 0], col = m.ao ? m.geo.attributes.color : null;
    for (var i = 0; i < p.count; i++) {
      bagPoint(d[i * 3], d[i * 3 + 1], d[i * 3 + 2], s, m.off, o); p.setXYZ(i, o[0], o[1], o[2]);
      if (col) { var hgt = o[1] * 0.88 + 0.7, ao = 1 + Math.max(-0.42, Math.min(0.06, o[3] * 9)); ao *= 0.5 + 0.5 * smoothstep(0.0, 0.45, hgt); col.setXYZ(i, ao, ao, ao); }
    }
    p.needsUpdate = true; if (col) col.needsUpdate = true; m.geo.computeVertexNormals(); m.geo.computeBoundingSphere();
  }
function capGeometryHQ(R, angle) {
    var geo = new T.SphereGeometry(R, small ? 128 : 192, small ? 32 : 48, 0, Math.PI * 2, 0, angle);
    var pos = geo.attributes.position, uv = geo.attributes.uv, rr = R * Math.sin(angle);
    for (var i = 0; i < pos.count; i++) uv.setXY(i, 0.5 + pos.getX(i) / (2 * rr), 0.5 - pos.getZ(i) / (2 * rr));
    uv.needsUpdate = true; return geo;
  }
var bagMatCache = {};
function bagBodyMat(s) {
    var dollar = s.patch === 'dollar', k = 'bag|' + (dollar ? '$' + (s.cur || 'USD') : s.kit ? 'kit|' + s.kit.id : (s.stripe ? 'stripe|' : '') + s.hex) + '|' + s.fabric;
    if (!bagMatCache[k]) {
      var src = dollar ? dollarMat(s.fabric, s.cur) : fabricMat(s.hex, s.fabric, 0, s.kit, s.stripe), m = src.clone();
      m.clippingPlanes = [clipPlane]; m.clipShadows = true; m.vertexColors = true; m.envMapIntensity = 0.38;
      bagMatCache[k] = addFibreDetail(m, fabricDetailOf.get(src));
    }
    return bagMatCache[k];
  }
/* someone sitting in it: bend the resting shape (kept from the first call) into the seated one, s 0..1 */
function applySit(m, s) {
    var p = m.geo.attributes.position, col = m.ao ? m.geo.attributes.color : null, o = [0, 0, 0, 0];
    if (!m.base) { m.base = p.array.slice(); if (col) m.baseCol = col.array.slice(); }
    var b = m.base, bc = m.baseCol, n = p.count;
    for (var i = 0; i < n; i++) {
      var j = i * 3;
      if (s <= 0) { p.setXYZ(i, b[j], b[j + 1], b[j + 2]); if (col) col.setXYZ(i, bc[j], bc[j + 1], bc[j + 2]); continue; }
      sitPoint(b[j], b[j + 1], b[j + 2], s, o); p.setXYZ(i, o[0], o[1], o[2]);
      if (col) { var f = 1 + Math.max(-0.4, o[3] * 9); col.setXYZ(i, bc[j] * f, bc[j + 1] * f, bc[j + 2] * f); }
    }
    p.needsUpdate = true; if (col) col.needsUpdate = true; m.geo.computeVertexNormals(); m.geo.computeBoundingSphere();
  }
/* the beanbag shape is the same for every style: work it out once, then hand out cheap copies */
var shapeCache = {};
function shapedCopy(key, make, off, ao) {
    if (!shapeCache[key]) { var m0 = morphable(make(), off, ao); applyShape(m0, 0); shapeCache[key] = m0; }
    var c = shapeCache[key];
    return { geo: c.geo.clone(), dirs: c.dirs, off: c.off, ao: c.ao };
  }
function buildDome(s) {
    var g = new T.Group(), inner = new T.Group();
    inner.scale.set(1, 0.88, 1); inner.position.y = 0.7; g.add(inner);
    var hq = !small || s.texSize === SNAP_TEX;
    var mb = shapedCopy('body' + hq, function () { return new T.SphereGeometry(1, hq ? 256 : 160, hq ? 192 : 120); }, 0, true);
    var body = shadowify(new T.Mesh(mb.geo, bagBodyMat(s))); inner.add(body);
    var morphs = [mb];
    var printed = s.patch === 'print' || s.patch === 'kitprint';
    if (s.patch === 'circle' || printed || s.patch === 'bagsign' || (s.patch === 'kitpatch' && s.kit)) {
      var mc = shapedCopy('cap', function () { var cg0 = capGeometryHQ(1, 0.56); cg0.rotateX(Math.PI / 2 - 0.12); return cg0; }, 0.0045, false), cg = mc.geo;
      var dk = s.patch + ':' + (s.kit ? s.kit.id : s.patch === 'bagsign' ? curInfo(s.cur).sym : String(s.num || 8));
      var badge = s.patch === 'kitpatch' || s.patch === 'circle';
      var mat = new T.MeshStandardMaterial({ map: decalTex(dk), bumpMap: badge ? decalBump(dk) : detailTex(), bumpScale: badge ? 0.9 : 0.02, roughness: printed ? 0.92 : badge ? 0.72 : 0.85, envMapIntensity: 0.4, transparent: printed, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      var cap = new T.Mesh(cg, mat); cap.castShadow = true; cap.receiveShadow = true; if (printed) cap.renderOrder = 2;
      inner.add(cap); morphs.push(mc);
    }
    g.userData.morphs = morphs; return g;
  }
/* textures for the floating balls in a player's kit colours */
var kitBallCache = {};
function kitBallTex(kit) {
  return kitBallCache[kit.id] || (kitBallCache[kit.id] = canvasTex(512, 256, function (g, w, h) { drawKitBall(g, w, h, kit); }));
}

/* a small transparent render of one beanbag, used as the "O" in the Oro wordmark (one renderer, reused) */
var snap = null;
function snapBag(spec, W, H) {
  if (!snap) {
    var r = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1); r.outputEncoding = T.sRGBEncoding; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    r.localClippingEnabled = true; r.setClearColor(0x000000, 0);
    var sc = new T.Scene(); sc.environment = studioEnv(r); addLights(sc, false);
    snap = { r: r, sc: sc, cam: new T.PerspectiveCamera(24, 1, 0.1, 60) };
  }
  snap.r.setSize(W, H, false); snap.cam.aspect = W / H; snap.cam.updateProjectionMatrix();
  var m = buildModel(spec); m.rotation.y = -0.2; snap.sc.add(m);
  snap.cam.position.set(0, 1.05, 5.6); snap.cam.lookAt(0, 0.66, 0);
  clipPlane.constant = 0; snap.r.render(snap.sc, snap.cam);
  var url = snap.r.domElement.toDataURL('image/png');
  snap.sc.remove(m); disposeGroup(m);
  return url;
}

function renderStudio(spec, W, H) {
    var r = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    try {
      r.setPixelRatio(1); r.setSize(W, H, false);
      r.outputEncoding = T.sRGBEncoding; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
      r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap; r.localClippingEnabled = true;
      var sc = new T.Scene(); sc.background = new T.Color('#E9E2D9');
      var fl = canvasTex(2048, 2048, function (g, w, h) { g.fillStyle = '#CFC7BC'; g.fillRect(0, 0, w, h); mottle(g, w, h, 0.05, 420); layTile(g, w, h, fibreTile(509, 'grey'), 0.18, 'overlay'); });
      fl.wrapS = fl.wrapT = T.RepeatWrapping; fl.repeat.set(5, 5);
      var floor = new T.Mesh(new T.PlaneGeometry(40, 40), new T.MeshStandardMaterial({ map: fl, roughness: 0.9 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
      var wall = new T.Mesh(new T.PlaneGeometry(40, 16), new T.MeshStandardMaterial({ color: '#F2EDE6', roughness: 1 })); wall.position.set(0, 8, -4); wall.receiveShadow = true; sc.add(wall);
      sc.add(new T.HemisphereLight(0xfffaf3, 0xb8ab9b, 0.75));
      var key = new T.DirectionalLight(0xfff1df, 1.9); key.position.set(-4.5, 7, 5.5); key.castShadow = true; key.shadow.mapSize.set(4096, 4096);
      var c = key.shadow.camera; c.near = 1; c.far = 26; c.left = -4; c.right = 4; c.top = 4; c.bottom = -4; key.shadow.bias = -0.0002; key.shadow.normalBias = 0.015; key.target.position.set(0, 0.6, 0);
      sc.add(key); sc.add(key.target);
      var fill = new T.DirectionalLight(0xffffff, 0.35); fill.position.set(5, 3, 4); sc.add(fill);
      var rim = new T.DirectionalLight(0xfff4e8, 0.6); rim.position.set(2, 4, -6); sc.add(rim);
      var es = new T.Scene(); es.add(new T.Mesh(new T.BoxGeometry(12, 6, 12), new T.MeshBasicMaterial({ color: '#6a5f56', side: T.BackSide })));
      var lp = new T.Mesh(new T.PlaneGeometry(4, 4), new T.MeshBasicMaterial({ color: new T.Color(2.4, 2.2, 2.0) })); lp.position.set(-3, 3, 5.9); lp.rotation.y = Math.PI; es.add(lp);
      var pm = new T.PMREMGenerator(r); sc.environment = pm.fromScene(es, 0.04).texture; pm.dispose();
      var blob = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: 0.55 })); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.003; blob.scale.set(2.6, 2.6, 1); sc.add(blob);
      var s = {}; for (var k in spec) s[k] = spec[k]; s.texSize = SNAP_TEX;
      var m = buildModel(s); m.rotation.y = -0.3; sc.add(m);
      var cam = new T.PerspectiveCamera(28, W / H, 0.1, 60); cam.position.set(1.3, 1.45, 4.6); cam.lookAt(0, 0.72, 0);
      clipPlane.constant = 0; r.render(sc, cam);
      var url = r.domElement.toDataURL('image/jpeg', 0.93);
      disposeGroup(m);
      return url;
    } finally { r.dispose(); try { r.forceContextLoss(); } catch (e) {} }
  }

export { webglOK, initHero, makeThumbs, renderStudio, snapBag, loadNotes };

/* embroidered badge for a decal key ('kitpatch:messi' or 'circle:8') and its relief map */
function badgeFor(full) {
  var parts = String(full).split(':');
  if (parts[0] === 'kitpatch') return kitBadge(kitById(parts[1]));
  return { bg: '#F3EFE6', ring: '#E4DDCD', ink: '#151515', main: parts[1] || '8' };
}
var decalBumpCache = {};
function decalBump(full) {
  if (decalBumpCache[full]) return decalBumpCache[full];
  var S = 1024;
  return (decalBumpCache[full] = canvasTex(S, S, function (g) { drawBadgeBump(g, S, badgeFor(full)); }, false));
}

/* Prepare every style's textures in idle moments after the page loads, so switching styles never waits on painting.
   On phones and tablets only the light colour layers are prepared, to save memory. */
var warmToken = 0;
function warmStyles(renderer, fabric) {
  var token = ++warmToken, list = [], i = 0;
  ['players', 'balls', 'notes'].forEach(function (key) { PROPSETS[key].forEach(function (sp) {
    if (sp.kit) list.push({ id: 'legend', kind: 'dome', patch: 'kitpatch', hex: sp.kit.hex, fabric: fabric, kit: sp.kit });
    else if (sp.t === 'ball') list.push({ id: 'ols01', kind: 'dome', patch: 'circle', hex: sp.hex, fabric: fabric, num: sp.n, stripe: sp.stripe });
    else if (sp.t === 'note' && !small) list.push({ id: 'dollar', kind: 'dome', patch: 'dollar', hex: '#17503C', fabric: fabric, cur: sp.cur });
  }); });
  function upload(tex) { if (tex && renderer.initTexture) try { renderer.initTexture(tex); } catch (e) {} }
  function step(deadline) {
    if (token !== warmToken) return;
    do {
      var s = list[i++]; if (!s) return;
      var m = bagBodyMat(s); upload(m.map);
      if (!small && s.patch !== 'dollar') { var dk = s.patch + ':' + (s.kit ? s.kit.id : String(s.num || 8)); upload(decalTex(dk)); upload(decalBump(dk)); }
    } while (deadline && deadline.timeRemaining() > 12);
    if (i < list.length) { if (window.requestIdleCallback) requestIdleCallback(step, { timeout: 2000 }); else setTimeout(step, 80); }
  }
  step(null);
}
