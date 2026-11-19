'use client';

import { type RefObject } from 'react';
import { gsap, SplitText, useGSAP, REDUCED } from '../motion/gsap';

const CLEAR = 'transform,opacity,visibility'; // hand elements back to their CSS (hover effects use transform)
const reduced = () => window.matchMedia(REDUCED).matches;

/*
 * Motion for the main site (GSAP). Everything is scoped to `root`, reverted on unmount,
 * and skipped for people who prefer reduced motion.
 */
export function useSiteMotion(root: RefObject<HTMLElement | null>) {
  /* ---------- first load: header, wordmark, hero copy, and the script title letter by letter ---------- */
  useGSAP((_, contextSafe) => {
    document.documentElement.classList.remove('motion-pending');
    if (reduced()) return;

    const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.9 } });
    tl.from('.header > *', { y: -30, autoAlpha: 0, stagger: 0.08, clearProps: CLEAR })
      .from('#home .oro-hero', { y: 40, scale: 0.92, autoAlpha: 0, duration: 1.1, clearProps: CLEAR }, 0.1)
      .from('#home .hero-left .desc, #home .ctl > :not(.key-styles)', { y: 28, autoAlpha: 0, stagger: 0.06, clearProps: CLEAR }, 0.35)
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

  /* ---------- scrolling: the hero eases away, the order section rises in ---------- */
  useGSAP(() => {
    if (reduced()) return;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1201px)', () => {
      const leave = { trigger: '#home', start: 'top top', end: 'bottom top', scrub: true };
      gsap.to('#home .hero-in', { y: -90, autoAlpha: 0.25, ease: 'none', scrollTrigger: leave });
      gsap.to('#home .hero-center', { yPercent: 10, scale: 0.92, ease: 'none', scrollTrigger: leave });
    });
    const reveal = { trigger: '#order', start: 'top 78%', once: true };
    gsap.from('#order .op-left', { y: 50, autoAlpha: 0, duration: 0.9, ease: 'power3.out', clearProps: CLEAR, scrollTrigger: reveal });
    gsap.from('#order .op-right > *', { y: 30, autoAlpha: 0, stagger: 0.06, duration: 0.8, ease: 'power3.out', delay: 0.1, clearProps: CLEAR, scrollTrigger: reveal });
    return () => mm.revert();
  }, { scope: root });
}
