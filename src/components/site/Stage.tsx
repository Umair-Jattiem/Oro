'use client';

import { useEffect, useRef, useState } from 'react';
import type { Pick, Spec, Theme } from './data';

export type Hero = {
  set: (spec: Spec, designChanged: boolean, theme: Theme) => void;
  busy: () => boolean;
  onPick: (fn: (p: Pick) => void) => void;
  onHover: (fn: (p: Pick | null, x: number, y: number) => void) => void;
  warm: (fabric: string) => void;
  dispose: () => void;
};
export type Engine = typeof import('./engine');

/* Load the 3D engine once (browser only) after the fonts used on the textures are ready. */
let enginePromise: Promise<Engine | null> | null = null;
export function loadEngine(): Promise<Engine | null> {
  if (!enginePromise) {
    enginePromise = (async () => {
      const mod = await import('./engine');
      if (!mod.webglOK()) return null;
      if (document.fonts?.load) {
        await Promise.race([
          Promise.all([document.fonts.load('800 80px Manrope'), document.fonts.load('400 14px "DM Mono"')]),
          new Promise((r) => setTimeout(r, 2500)),
        ]);
      }
      return mod;
    })().catch((e) => { console.error(e); return null; });
  }
  return enginePromise;
}

type Props = {
  hint: string;
  getInitial: () => { spec: Spec; theme: Theme };
  onHero: (hero: Hero | null) => void;
  onPick: (p: Pick) => void;
  onEngine?: (engine: Engine | null) => void;
  onHover?: (p: Pick | null, x: number, y: number) => void;
};

/* The live 3D beanbag with its floating props. Falls back to a still image without WebGL. */
export default function Stage({ hint, getInitial, onHero, onPick, onEngine, onHover }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false); // the still photo is only for browsers that cannot show 3D
  const pickRef = useRef(onPick);
  const hoverRef = useRef(onHover);
  useEffect(() => { pickRef.current = onPick; hoverRef.current = onHover; });

  useEffect(() => {
    let hero: Hero | null = null, cancelled = false;
    loadEngine().then((engine) => {
      if (cancelled) return;
      onEngine?.(engine);
      if (!engine) { setFailed(true); return; }
      if (!stageRef.current || !canvasRef.current) return;
      try {
        const { spec, theme } = getInitial();
        hero = engine.initHero(stageRef.current, canvasRef.current, spec, theme) as Hero;
        hero.onPick((p) => pickRef.current(p));
        hero.onHover((p, x, y) => hoverRef.current?.(p, x, y));
        document.documentElement.classList.add('gl-on');
        setReady(true);
        onHero(hero);
      } catch (e) {
        console.error(e);
        document.documentElement.classList.remove('gl-on');
        setFailed(true);
      }
    });
    return () => { cancelled = true; if (hero) { hero.dispose(); onHero(null); } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="hero-center" id="stage" ref={stageRef}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="stage-fallback" src="/images/ols01-classic-8-ball.jpg" alt="Concept render of a black corduroy beanbag with a white circle and a black 8" hidden={!failed} />
      <canvas
        id="gl"
        ref={canvasRef}
        role="img"
        tabIndex={0}
        aria-label="Interactive 3D concept. Drag or use the left and right arrow keys to spin it. Use the style buttons to change the player or currency."
        hidden={!ready}
      />
      <div className="hint">{hint}</div>
    </div>
  );
}
