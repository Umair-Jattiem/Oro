'use client';

import { useRef, type RefObject } from 'react';
import { gsap, SplitText, useGSAP, REDUCED } from '../motion/gsap';

type View = 'home' | 'order' | 'custom';
const CLEAR = 'transform,opacity,visibility'; // hand elements back to their CSS (hover effects use transform)
const reduced = () => window.matchMedia(REDUCED).matches;

/*
 * Motion for the main site (GSAP). Everything is scoped to `root`, reverted on unmount,
 * and skipped for people who prefer reduced motion.
 */
export function useSiteMotion(root: RefObject<HTMLElement | null>, view: View, carStart: number, carDir: RefObject<number>) {
  /* ---------- first load: header, hero copy, carousel, and the script titles letter by letter ---------- */
  useGSAP((_, contextSafe) => {
    document.documentElement.classList.remove('motion-pending');
    if (reduced() || /^#(order|custom)$/.test(window.location.hash)) return;

    const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.9 } });
    tl.from('.header > *', { y: -30, autoAlpha: 0, stagger: 0.08, clearProps: CLEAR })
      .from('#home .oro-hero', { y: 40, scale: 0.92, autoAlpha: 0, duration: 1.1, clearProps: CLEAR }, 0.1)
      .from('#home .hero-left .desc, #home .primary-btn, #home .ctl > *', { y: 28, autoAlpha: 0, stagger: 0.06, clearProps: CLEAR }, 0.35)
      .from('#home .dcard, #home .car-nav', { x: 60, autoAlpha: 0, stagger: 0.1, clearProps: CLEAR }, 0.45)
      .from('#home .proto-note', { autoAlpha: 0, duration: 1.2, clearProps: 'opacity,visibility' }, 0.8);

    // split only once the script font has loaded, so the letters are measured correctly
    const titles = gsap.utils.toArray<HTMLElement>('#home .title');
    gsap.set(titles, { autoAlpha: 0 });
    document.fonts.ready.then(contextSafe!(() => {
      titles.forEach((el, i) => {
        gsap.set(el, { autoAlpha: 1 });
        const split = SplitText.create(el, { type: 'chars' });
        gsap.from(split.chars, {
          yPercent: 60, rotation: 8, autoAlpha: 0, duration: 0.9, ease: 'back.out(1.7)', stagger: 0.035,
          delay: 0.15 + i * 0.3,
          onComplete: () => split.revert(),
        });
      });
    }));
  }, { scope: root });

  /* ---------- home page scroll: hero eases away, "Make it yours" reveals ---------- */
  useGSAP(() => {
    if (view !== 'home' || reduced()) return;

    const mm = gsap.matchMedia();
    mm.add('(min-width: 1201px)', () => {
      const leave = { trigger: '#home', start: 'top top', end: 'bottom top', scrub: true };
      gsap.to('#home .hero-in', { y: -90, autoAlpha: 0.25, ease: 'none', scrollTrigger: leave });
      gsap.to('#home .hero-center', { yPercent: 10, scale: 0.9, ease: 'none', scrollTrigger: leave });
    });

    const reveal = { trigger: '#make', start: 'top 80%', once: true };
    gsap.from('#make .make-copy > *', { y: 40, autoAlpha: 0, stagger: 0.1, duration: 0.9, ease: 'power3.out', clearProps: CLEAR, scrollTrigger: reveal });
    gsap.set('#make .mk-spot', { transition: 'none' }); // their CSS hover transition would fight the tween
    gsap.from('#make .mk-spot', {
      y: 80, rotation: (i: number) => (i ? 3 : -3), autoAlpha: 0, stagger: 0.15, duration: 1, ease: 'power3.out', delay: 0.15,
      clearProps: CLEAR + ',transition', scrollTrigger: reveal,
    });
    return () => mm.revert();
  }, { scope: root, dependencies: [view], revertOnUpdate: true });

  /* ---------- order page: panels come in; switching tabs animates the section that swapped ---------- */
  const prevView = useRef<View>(view);
  useGSAP(() => {
    const prev = prevView.current;
    prevView.current = view;
    if (view === 'home' || prev === view || reduced()) return;
    if (prev !== 'home') {
      gsap.from('#order fieldset.ob:not([hidden])', { y: 24, autoAlpha: 0, duration: 0.6, ease: 'power3.out', clearProps: CLEAR });
      return;
    }
    gsap.from('#order .op-left', { x: -40, autoAlpha: 0, duration: 0.8, ease: 'power3.out', clearProps: CLEAR });
    gsap.from('#order .op-right > *:not([hidden])', { y: 24, autoAlpha: 0, stagger: 0.05, duration: 0.7, ease: 'power3.out', delay: 0.1, clearProps: CLEAR });
  }, { scope: root, dependencies: [view], revertOnUpdate: true });

  /* ---------- carousel: cards slide in from the side you moved towards ---------- */
  const firstCar = useRef(true);
  useGSAP(() => {
    if (firstCar.current) { firstCar.current = false; return; }
    if (reduced()) return;
    gsap.from('#home .dcard', { x: 50 * (carDir.current || 1), autoAlpha: 0, stagger: 0.08, duration: 0.6, ease: 'power3.out', clearProps: CLEAR });
  }, { scope: root, dependencies: [carStart], revertOnUpdate: true });
}
