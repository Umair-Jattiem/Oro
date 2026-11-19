'use client';

import { useEffect, useRef, useState } from 'react';
import type { Scene } from './data';
import { drawSun, paintScene, type Geo } from './backdrops';

const SCENES: Scene[] = ['poolhall', 'favela', 'cr7', 'sol', 'vault'];

/* Where the beanbag sits for this screen (must match the 3D framing in engine.js: beside the text on wide
   screens, centred inside the stage on tablets and phones). */
function measure(host: HTMLElement): Geo {
  const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
  if (window.innerWidth >= 1100 && window.innerWidth / window.innerHeight > 1.2) {
    const cy = h * 0.545;
    return { w, h, cx: w * 0.68, cy, hz: cy + h * 0.13 };
  }
  const stage = host.parentElement?.querySelector('#stage') as HTMLElement | null;
  const top = stage ? stage.offsetTop : h * 0.1, sh = stage ? stage.offsetHeight : h * 0.6;
  const cy = top + sh * 0.51;
  return { w, h, cx: w / 2, cy, hz: cy + sh * 0.15 };
}

/*
 * The painted world behind the beanbag. Two canvases crossfade when the scene changes; every scene is painted
 * once per screen size (in idle moments after load), so switching never waits on painting.
 */
export default function Backdrop({ scene, accent }: { scene: Scene; accent: string }) {
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

  /* measure on mount and on resize (repainting everything for the new size) */
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let t = 0;
    const update = () => { cache.current.clear(); shown.current = null; setGeo(measure(host)); };
    const onResize = () => { clearTimeout(t); t = window.setTimeout(update, 180); };
    t = window.setTimeout(update, 0);
    window.addEventListener('resize', onResize);
    return () => { clearTimeout(t); window.removeEventListener('resize', onResize); };
  }, []);

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
    const size = Math.round(Math.min(geo.h * 0.62, geo.w * 0.5));
    c.width = c.height = size;
    drawSun(c.getContext('2d')!, size);
  }, [geo]);

  const sunSize = geo ? Math.round(Math.min(geo.h * 0.62, geo.w * 0.5)) : 0;
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
          style={{ left: geo.cx - sunSize / 2, top: geo.cy - geo.h * 0.13 - sunSize / 2, width: sunSize, height: sunSize, opacity: scene === 'sol' ? 1 : 0 }}
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
