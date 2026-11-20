'use client';

import { useEffect, useRef, useState } from 'react';
import type { Scene } from './data';
import { drawSun, paintScene, type Geo } from './backdrops';
import type { Anchor } from './Stage';

const SCENES: Scene[] = ['poolhall', 'rio', 'cr7', 'sol', 'vault'];

/* Where the beanbag sits for this screen. With the 3D engine running, its own measurement (`anchor`) is used, so the
   painted floor line lands just behind the beanbag; before that (or without 3D) an estimate of the same framing. */
function measure(host: HTMLElement, anchor: Anchor | null): Geo {
  const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
  const stage = host.parentElement?.querySelector('#stage') as HTMLElement | null;
  if (anchor && stage) {
    const left = stage.offsetLeft, top = stage.offsetTop;
    return { w, h, cx: left + anchor.x, cy: top + anchor.mid, hz: top + anchor.horizon, top };
  }
  if (window.innerWidth >= 1100 && window.innerWidth / window.innerHeight > 1.2) {
    const cy = h * 0.545;
    return { w, h, cx: w * 0.68, cy, hz: cy + h * 0.13 };
  }
  const top = stage ? stage.offsetTop : h * 0.1, sh = stage ? stage.offsetHeight : h * 0.6;
  const cy = top + sh * 0.51;
  return { w, h, cx: w / 2, cy, hz: cy + sh * 0.15, top };
}

/* the Argentine sun: big behind the beanbag on wide screens; on phones and tablets it fits the gap between the
   slogan and the top of the beanbag, so it is clearly visible and never sits behind the words */
function sunBox(g: Geo) {
  if (!g.top) return { size: Math.round(Math.min(g.h * 0.62, g.w * 0.5)), x: g.cx, y: g.cy - g.h * 0.13 };
  const bagTop = g.cy - (g.hz - g.cy) * 2.1, avail = Math.max(70, bagTop - g.top);
  const size = Math.round(Math.min(g.w * 0.8, avail * 1.3));
  return { size, x: g.cx, y: g.top + size / 2 };
}

/*
 * The painted world behind the beanbag. Two canvases crossfade when the scene changes; every scene is painted
 * once per screen size (in idle moments after load), so switching never waits on painting.
 */
export default function Backdrop({ scene, accent, anchor }: { scene: Scene; accent: string; anchor: Anchor | null }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvases = useRef<(HTMLCanvasElement | null)[]>([null, null]);
  const sunRef = useRef<HTMLCanvasElement>(null);
  const cache = useRef<Map<Scene, HTMLCanvasElement>>(new Map());
  const front = useRef(0);
  const shown = useRef<Scene | null>(null);
  const [geo, setGeo] = useState<Geo | null>(null);
  const [active, setActive] = useState(0);

  /* paint (or reuse) a scene at the current size */
  function canvasFor(s: Scene, g: Geo) {
    let c = cache.current.get(s);
    if (!c) {
      c = document.createElement('canvas');
      c.width = Math.round(g.w); c.height = Math.round(g.h);
      paintScene(c.getContext('2d')!, s, g);
      cache.current.set(s, c);
    }
    return c;
  }

  /* measure when the beanbag's position is known (and again whenever it changes), repainting for the new layout */
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const t = window.setTimeout(() => { cache.current.clear(); shown.current = null; setGeo(measure(host, anchor)); }, 0);
    return () => clearTimeout(t);
  }, [anchor]);

  /* show the current scene: draw it on the hidden canvas, then crossfade */
  useEffect(() => {
    if (!geo || shown.current === scene) return;
    const next = shown.current === null ? front.current : 1 - front.current;
    const target = canvases.current[next];
    if (!target) return;
    target.width = Math.round(geo.w); target.height = Math.round(geo.h);
    target.getContext('2d')!.drawImage(canvasFor(scene, geo), 0, 0);
    front.current = next; shown.current = scene; setActive(next);
  }, [scene, geo]);

  /* paint the other scenes in idle moments, so later switches are instant */
  useEffect(() => {
    if (!geo) return;
    let i = 0, id = 0;
    const step = () => {
      const s = SCENES[i++]; if (!s) return;
      canvasFor(s, geo);
      id = typeof requestIdleCallback === 'function' ? requestIdleCallback(step, { timeout: 2500 }) : window.setTimeout(step, 120);
    };
    const start = window.setTimeout(step, 2500);
    return () => { clearTimeout(start); if (typeof cancelIdleCallback === 'function') cancelIdleCallback(id); clearTimeout(id); };
  }, [geo]);

  /* the Argentine sun is its own layer so it can turn slowly */
  useEffect(() => {
    const c = sunRef.current;
    if (!c || !geo) return;
    const size = sunBox(geo).size;
    c.width = c.height = size;
    drawSun(c.getContext('2d')!, size);
  }, [geo]);

  const sun = geo ? sunBox(geo) : null, sunSize = sun ? sun.size : 0;
  const tinted = scene === 'poolhall' || scene === 'vault';
  return (
    <div className={'backdrop scene-' + scene} ref={hostRef} aria-hidden="true">
      {[0, 1].map((i) => (
        <canvas key={i} ref={(el) => { canvases.current[i] = el; }} className="bd-layer" style={{ opacity: active === i ? 1 : 0 }} />
      ))}
      {geo && (
        <canvas
          ref={sunRef}
          className="bd-sun"
          style={{ left: sun!.x - sunSize / 2, top: sun!.y - sunSize / 2, width: sunSize, height: sunSize, opacity: scene === 'sol' ? 1 : 0 }}
        />
      )}
      <div
        className="bd-accent"
        style={{
          opacity: tinted ? 1 : 0,
          background: geo ? `radial-gradient(circle at ${geo.cx}px ${geo.cy}px, ${accent}55 0%, ${accent}22 28%, transparent 55%)` : undefined,
        }}
      />
      <div className="bd-scrim" />
    </div>
  );
}
