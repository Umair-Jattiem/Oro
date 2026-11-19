'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  DESIGNS, INITIAL_SELECTION, byId, curOf, designName, pickLabel, picksFor, sceneOf, specOf, themeOf,
  type Pick, type Selection,
} from './data';
import Stage, { type Anchor, type Engine, type Hero } from './Stage';
import OrderSection, { lineKey, MAX_EACH, type Line } from './OrderSection';
import { FabricPills } from './controls';
import K4Viewer, { type K4Request } from '../shared/K4Viewer';
import SmoothScroll, { scrollToId } from '../motion/SmoothScroll';
import { useSiteMotion } from './useSiteMotion';
import ScrollVelocity from '../react-bits/ScrollVelocity';
import Magnet from '../react-bits/Magnet';
import OroMark from './OroMark';
import Backdrop from './Backdrop';

/* which design a ring item belongs to, and whether it is the one showing */
const designFor = (p: Pick) => (p.player ? 'legend' : p.ball ? 'ols01' : 'dollar');
const isCurrent = (p: Pick, s: Selection) =>
  s.id === designFor(p) && (p.player ? s.player === p.player : p.ball ? s.ball === p.ball : s.cur === p.cur);

/*
 * One page: pick a style from the ring around the 3D beanbag, choose the fabric, then order it further down.
 */
export default function SiteApp() {
  const [sel, setSel] = useState<Selection>(INITIAL_SELECTION);
  const [k4, setK4] = useState<K4Request | null>(null);
  const [engine, setEngine] = useState<Engine | null>(null);
  const [shot, setShot] = useState<string | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [sitting, setSitting] = useState(false);
  const [basket, setBasket] = useState<Line[]>([]); // every style the visitor wants, with how many of each
  const [added, setAdded] = useState<string | null>(null); // short confirmation after adding a style
  const addedTimer = useRef(0);
  const [notesIn, setNotesIn] = useState(false); // banknote photos loaded (re-render the logo and cards with them)

  const selRef = useRef(sel), heroRef = useRef<Hero | null>(null);
  const rootRef = useRef<HTMLDivElement>(null), tipRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { selRef.current = sel; });
  useSiteMotion(rootRef);

  /* the "O" in Oro and the order summary show the chosen beanbag: re-render it once the switch has settled */
  useEffect(() => {
    if (!engine) return;
    let idle = 0;
    const timer = setTimeout(() => {
      const run = () => { try { setShot(engine.snapBag(specOf(sel), 560, 560)); } catch (e) { console.error(e); } };
      if ('requestIdleCallback' in window) idle = requestIdleCallback(run, { timeout: 800 }); else run();
    }, 1050);
    return () => { clearTimeout(timer); if (idle) cancelIdleCallback(idle); };
  }, [engine, sel, notesIn]);

  /* tapping a ball or note in the ring (or a button in the keyboard list) switches straight to that style */
  const choose = useCallback((p: Pick) => {
    const cur = selRef.current;
    if (isCurrent(p, cur)) return;
    const id = designFor(p), d = byId(DESIGNS, id);
    const next: Selection = { ...cur, id, colour: d.colour, player: p.player ?? cur.player, ball: p.ball ?? cur.ball, cur: p.cur ?? cur.cur };
    selRef.current = next; setSel(next);
    heroRef.current?.set(specOf(next), true, themeOf(next));
  }, []);
  function setFabric(fabric: string) {
    if (fabric === selRef.current.fabric) return;
    const next = { ...selRef.current, fabric };
    selRef.current = next; setSel(next);
    heroRef.current?.set(specOf(next), false, themeOf(next));
    heroRef.current?.warm(fabric);
  }

  /* label beside the cursor for the style it is over (updated directly, so moving the mouse never re-renders the page) */
  const onHover = useCallback((p: Pick | null, x: number, y: number) => {
    const el = tipRef.current;
    if (!el) return;
    if (!p) { el.hidden = true; return; }
    el.textContent = pickLabel(p); el.hidden = false;
    el.style.transform = `translate(${Math.round(x + 16)}px, ${Math.round(y - 12)}px)`;
  }, []);
  const onHero = useCallback((h: Hero | null) => { heroRef.current = h; setAnchor(h ? h.anchor() : null); }, []);
  /* the painted floor follows where the 3D beanbag actually sits, so re-measure when the window changes size */
  useEffect(() => {
    let t = 0;
    const onResize = () => { clearTimeout(t); t = window.setTimeout(() => { const h = heroRef.current; if (h) setAnchor(h.anchor()); }, 300); };
    window.addEventListener('resize', onResize);
    return () => { clearTimeout(t); window.removeEventListener('resize', onResize); };
  }, []);
  /* once the 3D engine is ready: remember it, and render a small 3D thumbnail for each design card */
  const onEngine = useCallback((e: Engine | null) => {
    setEngine(e);
    if (e) e.loadNotes().then(() => { setNotesIn(true); setTimeout(() => { try { e.makeThumbs(DESIGNS, { W: 280, H: 240, zoom: 1.12 }, setThumbs); } catch (err) { console.error(err); } }, 300); });
  }, []);
  /* the design cards switch between football legends, pool balls and money; the ring then shows that design's styles */
  const selectDesign = useCallback((id: string) => {
    const cur = selRef.current;
    if (cur.id === id) return;
    const d = byId(DESIGNS, id), next: Selection = { ...cur, id, colour: d.colour };
    selRef.current = next; setSel(next);
    heroRef.current?.set(specOf(next), true, themeOf(next));
  }, []);
  const getInitial = useCallback(() => ({ spec: specOf(selRef.current), theme: themeOf(selRef.current) }), []);

  /* put the beanbag showing at the top into the order (one more of it if it is already there) */
  function addToOrder() {
    const s = selRef.current, key = lineKey(s);
    let img: string | null = null;
    try { img = engine ? engine.snapBag(specOf(s), 240, 240) : null; } catch (e) { console.error(e); }
    setBasket((b) => {
      const i = b.findIndex((l) => l.key === key);
      if (i < 0) return [...b, { key, sel: s, qty: 1, img }];
      return b.map((l, j) => (j === i ? { ...l, qty: Math.min(MAX_EACH, l.qty + 1) } : l));
    });
    setAdded(designName(s));
    clearTimeout(addedTimer.current); addedTimer.current = window.setTimeout(() => setAdded(null), 3200);
  }
  const setLineQty = (key: string, qty: number) => setBasket((b) => b.map((l) => (l.key === key ? { ...l, qty: Math.max(1, Math.min(MAX_EACH, qty)) } : l)));
  const removeLine = (key: string) => setBasket((b) => b.filter((l) => l.key !== key));
  const count = basket.reduce((n, l) => n + l.qty, 0);
  useEffect(() => () => clearTimeout(addedTimer.current), []);

  function open4K() {
    if (!engine) return;
    setK4({ spec: specOf(selRef.current), label: designName(selRef.current), render: engine.renderStudio as K4Request['render'] });
  }
  const go = (id: string) => (e: React.MouseEvent) => { e.preventDefault(); scrollToId(id); };

  const d = byId(DESIGNS, sel.id);
  return (
    <div ref={rootRef}>
      <SmoothScroll />
      <div id="progress" aria-hidden="true" />
      <header className="header" id="top">
        <a className="logo" href="#home" aria-label="Oro, back to the top" onClick={go('home')}><OroMark icon={shot} /></a>
        <a className="contact-btn" href="#order" onClick={go('order')}>{count ? <>Your order <span className="count" aria-label={count + ' beanbags'}>{count}</span></> : 'Order now'}</a>
      </header>

      <main>
        <section className="hero2" id="home">
          <Backdrop {...sceneOf(sel)} anchor={anchor} />
          <Particles kind={d.variant === 'cur' ? 'notes' : 'dust'} color={curOf(sel).paper} imgs={curOf(sel).img} />
          <Stage hint={d.variant === 'player' ? 'Tap a ball to change player · drag to spin' : d.variant === 'ball' ? 'Tap a ball to change colour · drag to spin' : 'Tap a note to change currency · drag to spin'} getInitial={getInitial} onHero={onHero} onPick={choose} onEngine={onEngine} onHover={onHover} />
          <div className="ring-tip" ref={tipRef} hidden aria-hidden="true" />
          <div className="hero-in">
            <div className="hero-left">
              <OroMark icon={shot} className="oro-hero" />
              <h1 className="title"><span className="o">Sit</span><br />Different</h1>
              <p className="desc">Oversized beanbags for rooms with a point of view. Tap any ball or note around the beanbag to restyle it, then order it below.</p>
              <div className="ctl" aria-label="Your beanbag">
                <div className="now">
                  <span aria-live="polite">{designName(sel, d)}</span>
                </div>
                <div className="crow">
                  <span className="lab">Fabric (proposed)</span>
                  <div className="mini" role="group" aria-label="Fabric"><FabricPills value={sel.fabric} onChange={setFabric} /></div>
                </div>
                {/* design: football legends, pool balls or money (each card shows a 3D thumbnail) */}
                <div className="design-cards" role="group" aria-label="Design">
                  {DESIGNS.map((x) => (
                    <button key={x.id} type="button" className="design-card" aria-pressed={x.id === sel.id} onClick={() => selectDesign(x.id)}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {thumbs[x.id] ? <img alt="" src={thumbs[x.id]} /> : <span className="design-ph" aria-hidden="true" />}
                      <span>{x.name}</span>
                    </button>
                  ))}
                </div>
                {/* keyboard and screen-reader way to pick a style of this design: hidden until you Tab into it */}
                <div className="key-styles" role="group" aria-label="Choose a style">
                  {picksFor(sel.id).map((p) => (
                    <button key={pickLabel(p)} type="button" aria-pressed={isCurrent(p, sel)} onClick={() => choose(p)}>{pickLabel(p)}</button>
                  ))}
                </div>
                <div className="btnrow">
                  <Magnet padding={70} magnetStrength={4} maxOffset={12}>
                    <button type="button" className="primary-btn" onClick={addToOrder}>Add to order<span className="plus" aria-hidden="true">+</span></button>
                  </Magnet>
                  <button type="button" className="ghost-btn" aria-pressed={sitting} onClick={() => { if (heroRef.current) setSitting(heroRef.current.toggleSit()); }}>{sitting ? 'Stand up' : 'Sit on it'}</button>
                  <button type="button" className="ghost-btn" onClick={open4K}>View in 4K</button>
                </div>
                <p className="fine">Live 3D concept, not a photograph of a finished product. Price, fabric and sizes to be confirmed.</p>
              </div>
            </div>
          </div>
          <p className="proto-note">Pre-launch prototype · Concept designs only · Prices, sizes and availability to be confirmed</p>
        </section>

        {/* decorative band whose speed and direction follow your scrolling */}
        <div className="marquee rb-marquee" aria-hidden="true">
          <ScrollVelocity
            texts={['Football legends · Pool balls · Money prints', 'Sit different · Made for your room · Cape Town']}
            velocity={40}
            separator="·"
            gap={24}
            fadeEdges
            outlineAlternate
            fontSize="clamp(22px, 3.4vw, 40px)"
            fontWeight={800}
            color="var(--cream)"
            scrollerStyle={{ fontFamily: 'var(--display)', textTransform: 'uppercase', padding: '12px 0' }}
          />
        </div>

        <OrderSection sel={sel} shot={shot} basket={basket} onAdd={addToOrder} onQty={setLineQty} onRemove={removeLine} onClear={() => setBasket([])} />
      </main>

      <K4Viewer request={k4} onClose={() => setK4(null)} />
      <div className="added-toast" role="status" aria-live="polite" data-show={added ? '' : undefined}>
        {added && <>Added {added} · {count} {count === 1 ? 'beanbag' : 'beanbags'} in your order <a href="#order" onClick={go('order')}>View order</a></>}
      </div>
    </div>
  );
}

/* themed particles over the backdrop: drifting light dust (stadium, court, pool hall) or the chosen currency's
   notes falling (vault). Skipped with reduced motion, paused when off screen. */
function Particles({ kind, color, imgs }: { kind: 'dust' | 'notes'; color: string; imgs: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    try { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch {}
    let vis = true;
    const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => { vis = es[0].isIntersecting; }, { threshold: 0 }) : null;
    io?.observe(host);
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const timers: number[] = [];
    const id = window.setInterval(() => {
      if (document.hidden || !vis) return;
      const p = document.createElement('span');
      const dur = kind === 'notes' ? rand(7, 12) : rand(6, 11);
      if (kind === 'notes') {
        const wpx = rand(26, 48);
        p.className = 'fall-note';
        p.style.width = wpx.toFixed(0) + 'px'; p.style.height = (wpx * 0.45).toFixed(0) + 'px';
        p.style.background = `${color} center / 100% 100% no-repeat url(${imgs[Math.floor(Math.random() * imgs.length)]})`;
        p.style.setProperty('--spin', rand(-260, 260).toFixed(0) + 'deg');
        p.style.opacity = rand(0.35, 0.75).toFixed(2);
      } else {
        const sz = rand(2, 6);
        p.className = 'dust';
        p.style.width = p.style.height = sz.toFixed(1) + 'px';
      }
      p.style.left = rand(0, 100).toFixed(1) + '%';
      p.style.animationDuration = dur.toFixed(1) + 's';
      host.appendChild(p);
      timers.push(window.setTimeout(() => p.remove(), dur * 1000 + 60));
    }, kind === 'notes' ? 520 : 260);
    return () => { clearInterval(id); timers.forEach(clearTimeout); io?.disconnect(); host.replaceChildren(); };
  }, [kind, color, imgs]);
  return <div className="bubbles" ref={ref} aria-hidden="true" />;
}
