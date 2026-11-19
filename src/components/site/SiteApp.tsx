'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  COLOURS, CUSTOM_THEME, DESIGNS, INITIAL_SELECTION, byId, designName, specOf, summaryText, themeOf, variantLabel,
  type Pick, type Selection, type Spec,
} from './data';
import Stage, { type Engine, type Hero } from './Stage';
import OrderPage, { type OrderState } from './OrderPage';
import { FabricPills, Swatches, VariantChips } from './controls';
import K4Viewer, { type K4Request } from '../shared/K4Viewer';
import SmoothScroll, { scrollToTop } from '../motion/SmoothScroll';
import { useSiteMotion } from './useSiteMotion';
import ScrollVelocity from '../react-bits/ScrollVelocity';
import SpotlightCard from '../react-bits/SpotlightCard';
import Magnet from '../react-bits/Magnet';
import OroMark from './OroMark';

/* SpotlightCard brings its own dark surface, border and shadow; the cards keep their own look instead */
const SPOT_STYLE = { '--spotlight-card-surface': 'transparent', '--spotlight-card-border': 'transparent', '--spotlight-card-shadow': 'none' } as React.CSSProperties;

type View = 'home' | 'order' | 'custom';
const viewFromHash = (): View => {
  const h = window.location.hash.slice(1);
  return h === 'order' || h === 'custom' ? h : 'home';
};

export default function SiteApp() {
  const [sel, setSel] = useState<Selection>(INITIAL_SELECTION);
  const [order, setOrder] = useState<OrderState>({ mode: 'design', qty: 1, fabric: 'corduroy', colour: 'black' });
  const [view, setView] = useState<View>('home');
  const [carStart, setCarStart] = useState(0);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [k4, setK4] = useState<K4Request | null>(null);
  const [engine, setEngine] = useState<Engine | null>(null);
  const [oIcon, setOIcon] = useState<string | null>(null);

  /* the "O" in Oro becomes the chosen beanbag: re-render it whenever the selection changes */
  useEffect(() => {
    if (!engine) return;
    const t = setTimeout(() => {
      try { setOIcon(engine.snapBag(specOf(sel), 320, 320)); } catch (e) { console.error(e); }
    }, 30);
    return () => clearTimeout(t);
  }, [engine, sel]);

  /* refs mirror state for callbacks that come from the 3D scene */
  const selRef = useRef(sel), orderRef = useRef(order), viewRef = useRef(view);
  const heroRef = useRef<Hero | null>(null), engineRef = useRef<Engine | null>(null);
  const thumbsStarted = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null), carDir = useRef(1);
  useSiteMotion(rootRef, view, carStart, carDir);
  useLayoutEffect(() => { selRef.current = sel; orderRef.current = order; viewRef.current = view; });

  const busy = () => !!heroRef.current?.busy();
  const customSpec = (o: OrderState): Spec => ({ id: 'custom', kind: 'dome', patch: 'none', hex: byId(COLOURS, o.colour).hex, fabric: o.fabric });

  function applySel(next: Selection, designChanged: boolean) {
    selRef.current = next; setSel(next);
    heroRef.current?.set(specOf(next), designChanged, themeOf(next));
  }
  function selectDesign(id: string) {
    if (busy()) return;
    const cur = selRef.current, d = byId(DESIGNS, id);
    const n = DESIGNS.indexOf(d);
    carDir.current = 1;
    setCarStart((start) => (((n - start + DESIGNS.length) % DESIGNS.length) >= 2 ? n : start));
    applySel({ ...cur, id: d.id, colour: d.colour, fabric: d.fabric }, d.id !== cur.id);
  }
  const pickVariant = useCallback((p: Pick) => {
    if (busy()) return;
    const cur = selRef.current, d = byId(DESIGNS, cur.id);
    if (p.player && d.variant === 'player') { if (p.player !== cur.player) applySel({ ...cur, player: p.player }, true); }
    else if (p.ball && d.variant === 'ball') { if (p.ball !== cur.ball) applySel({ ...cur, ball: p.ball }, true); }
    else if (p.cur && d.variant === 'cur') { if (p.cur !== cur.cur) applySel({ ...cur, cur: p.cur }, true); }
  }, []);
  function setFabric(id: string) { if (!busy()) applySel({ ...selRef.current, fabric: id }, false); }
  function setColour(id: string) { if (!busy()) applySel({ ...selRef.current, colour: id }, false); }
  function setCustom(patch: Partial<OrderState>) {
    if (busy()) return;
    const next = { ...orderRef.current, ...patch };
    orderRef.current = next; setOrder(next);
    heroRef.current?.set(customSpec(next), false, CUSTOM_THEME);
  }

  /* hash routing: #home, #order, #custom */
  useEffect(() => {
    let prev = viewFromHash();
    const route = () => {
      const v = viewFromHash();
      // switching tabs inside the order page keeps the same 3D stage, so restyle it with a spin
      if (prev === 'order' && v === 'custom') heroRef.current?.set(customSpec(orderRef.current), true, CUSTOM_THEME);
      if (prev === 'custom' && v === 'order') heroRef.current?.set(specOf(selRef.current), true, themeOf(selRef.current));
      if (v !== 'home') setOrder((o) => ({ ...o, mode: v === 'custom' ? 'custom' : 'design' }));
      if (v !== 'home') scrollToTop();
      prev = v; setView(v);
    };
    route();
    window.addEventListener('hashchange', route);
    return () => window.removeEventListener('hashchange', route);
  }, []);

  /* rendered once the engine is ready: 3D thumbnails for the carousel and the order page */
  const onEngine = useCallback((engine: Engine | null) => {
    engineRef.current = engine;
    setEngine(engine);
    if (!engine || thumbsStarted.current) return;
    thumbsStarted.current = true;
    setTimeout(() => {
      try { engine.makeThumbs(DESIGNS, { W: 560, H: 480, zoom: 1.12 }, setThumbs); } catch (e) { console.error(e); }
    }, 400);
  }, []);
  const onHero = useCallback((h: Hero | null) => { heroRef.current = h; }, []);
  const getInitial = useCallback(() => (
    viewRef.current === 'custom'
      ? { spec: customSpec(orderRef.current), theme: CUSTOM_THEME }
      : { spec: specOf(selRef.current), theme: themeOf(selRef.current) }
  ), []);

  function open4K() {
    const engine = engineRef.current;
    if (!engine) return;
    setK4({ spec: specOf(selRef.current), label: designName(selRef.current), render: engine.renderStudio as K4Request['render'] });
  }

  const d = byId(DESIGNS, sel.id);
  const isOrder = view !== 'home';
  const hint = d.variant === 'player' ? 'Tap a ball to change player' : d.variant === 'ball' ? 'Tap a ball to change colour' : 'Tap a note or coin to change currency';
  const stage = <Stage hint={hint} getInitial={getInitial} onHero={onHero} onPick={pickVariant} onEngine={onEngine} />;
  const visibleCards = [0, 1].map((k) => DESIGNS[(carStart + k) % DESIGNS.length]);

  return (
    <div ref={rootRef}>
      <SmoothScroll />
      <div id="progress" aria-hidden="true" />
      <header className="header" id="top">
        <a className="logo" href="#home" aria-label="Oro home"><OroMark icon={oIcon} /></a>
        <nav className="nav" aria-label="Main">
          <a href="#home" aria-current={view === 'home'}>Home</a>
          <a href="#order" aria-current={view === 'order'}>Customise &amp; order</a>
          <a href="#custom" aria-current={view === 'custom'}>Custom design</a>
        </nav>
        <a className="contact-btn" href="#order">Order now</a>
      </header>

      <main>
        <section className="hero2" id="home" hidden={isOrder}>
          <Bubbles active={!isOrder} />
          {!isOrder && stage}
          <div className="hero-in">
            <div className="hero-left">
              <OroMark icon={oIcon} className="oro-hero" />
              <h1 className="title"><span className="o">Sit</span><br />Different</h1>
              <p className="desc">Oversized beanbags for rooms with a point of view. Everything here is an early concept: pick a design, tap a ball or note around it to restyle it, and tell us what you think.</p>
              <Magnet padding={80} magnetStrength={4} maxOffset={14} style={{ alignSelf: 'flex-start' }}>
                <a className="primary-btn" href="#order">Customise &amp; order<span className="plus" aria-hidden="true">+</span></a>
              </Magnet>
              <div className="ctl" aria-label="Customise the concept">
                <div className="now">
                  <span>{(d.code ? d.code + ' · ' : '') + designName(sel, d)}</span>
                  <span className={'chip tone-' + d.tone}>{d.status}</span>
                </div>
                <div className="crow"><span className="lab">Fabric (proposed)</span><div className="mini" role="group" aria-label="Fabric"><FabricPills value={sel.fabric} onChange={setFabric} /></div></div>
                <div className="crow">
                  <span className="lab">{variantLabel(sel, d)}</span>
                  <div className="vchips" role="group" aria-label="Style"><VariantChips kind={d.variant} player={sel.player} ball={sel.ball} cur={sel.cur} onPick={pickVariant} /></div>
                </div>
                <div className="crow" hidden={d.id !== 'bagsign'}>
                  <span className="lab">Colour: {byId(COLOURS, sel.colour).name}</span>
                  <div className="sws" role="group" aria-label="Colour"><Swatches value={sel.colour} onChange={setColour} /></div>
                </div>
                <p className="fine">{summaryText(sel)}</p>
                <p className="fine">Live 3D concept, not a photograph of a finished product. Price, fabric and colour options to be confirmed.</p>
                <div className="btnrow">
                  <button type="button" className="ghost-btn" onClick={() => { window.location.hash = 'order'; }}>Order this design</button>
                  <button type="button" className="ghost-btn" onClick={open4K}>View in 4K</button>
                </div>
              </div>
            </div>
            <div className="hero-right">
              <div className="carousel">
                <div className="cards">
                  {visibleCards.map((x) => (
                    <button key={x.id} type="button" className="dcard" aria-pressed={x.id === sel.id} onClick={() => selectDesign(x.id)}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {thumbs[x.id] && <img className="cimg" alt="" src={thumbs[x.id]} />}
                      <span className="cinfo"><span className="cn">{x.name}</span><span className="cp">Price to be confirmed</span></span>
                    </button>
                  ))}
                </div>
                <div className="car-nav">
                  <button type="button" className="nav-arrow" aria-label="Previous design" onClick={() => { carDir.current = -1; setCarStart((s) => (s - 1 + DESIGNS.length) % DESIGNS.length); }}>&larr;</button>
                  <button type="button" className="nav-arrow" aria-label="Next design" onClick={() => { carDir.current = 1; setCarStart((s) => (s + 1) % DESIGNS.length); }}>&rarr;</button>
                </div>
              </div>
              <h2 className="title side"><span className="o">Made for</span><br />Your Room</h2>
            </div>
          </div>
          <p className="proto-note">Pre-launch prototype · Concept designs only · Prices, sizes and availability to be confirmed</p>
        </section>

        {/* decorative band whose speed and direction follow your scrolling */}
        <div className="marquee rb-marquee" hidden={isOrder} aria-hidden="true">
          <ScrollVelocity
            texts={['Sit different · Made for your room · Corduroy & microsuede', 'Football legends · Pool balls · Money prints · Your own design']}
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

        <section className="make" id="make" hidden={isOrder}>
          <div className="make-in">
            <div className="make-copy">
              <p className="mk-eyebrow">Make it yours</p>
              <h2 className="title mk-title"><span className="o">Your</span> Way</h2>
              <p className="desc">Customise one of our designs in your fabric and colour, or send us your own idea and we will work on it with you.</p>
            </div>
            <SpotlightCard className="mk-spot p-0! rounded-[28px]!" style={SPOT_STYLE} spotlightColor="#fbcfe8" intensity={0.22} spotlightSize={280}>
              <a className="mk-card" href="#order"><span className="mk-n">01</span><b>Customise a design</b><span>Pick a design, fabric, colour and quantity, then send us your order request.</span><span className="mk-go">Start <span className="plus" aria-hidden="true">+</span></span></a>
            </SpotlightCard>
            <SpotlightCard className="mk-spot p-0! rounded-[28px]!" style={SPOT_STYLE} spotlightColor="#fbcfe8" intensity={0.22} spotlightSize={280}>
              <a className="mk-card" href="#custom"><span className="mk-n">02</span><b>Request your own design</b><span>Describe your idea or add a reference image for a one-of-a-kind beanbag.</span><span className="mk-go">Start <span className="plus" aria-hidden="true">+</span></span></a>
            </SpotlightCard>
          </div>
        </section>

        <OrderPage
          hidden={!isOrder}
          stage={isOrder ? stage : null}
          sel={sel}
          order={order}
          thumbs={thumbs}
          onSelectDesign={selectDesign}
          onFabric={setFabric}
          onColour={setColour}
          onPick={pickVariant}
          onCustomFabric={(id) => setCustom({ fabric: id })}
          onCustomColour={(id) => setCustom({ colour: id })}
          onQty={(qty) => setOrder((o) => ({ ...o, qty }))}
        />
      </main>

      <K4Viewer request={k4} onClose={() => setK4(null)} />
    </div>
  );
}

/* rising bubbles behind the hero (skipped with reduced motion, paused when off screen) */
function Bubbles({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = ref.current;
    if (!host || !active) return;
    try { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch {}
    let vis = true;
    const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => { vis = es[0].isIntersecting; }, { threshold: 0 }) : null;
    io?.observe(host);
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const timers: number[] = [];
    const id = window.setInterval(() => {
      if (document.hidden || !vis) return;
      const b = document.createElement('span'), sz = rand(10, 30), dur = rand(4, 10);
      b.className = 'bub';
      b.style.width = b.style.height = sz.toFixed(0) + 'px';
      b.style.left = rand(0, 100).toFixed(1) + '%';
      b.style.animationDuration = dur.toFixed(1) + 's';
      host.appendChild(b);
      timers.push(window.setTimeout(() => b.remove(), dur * 1000 + 60));
    }, 400);
    return () => { clearInterval(id); timers.forEach(clearTimeout); io?.disconnect(); host.replaceChildren(); };
  }, [active]);
  return <div className="bubbles" ref={ref} aria-hidden="true" />;
}
