'use client';

import { useRef } from 'react';
import { gsap, useGSAP, REDUCED } from '../motion/gsap';

/* The Oro wordmark. The "O" is a live render of the beanbag the visitor has chosen (falls back to the letter). */
export default function OroMark({ icon, className = '' }: { icon: string | null; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const first = useRef(true);

  // pop the new beanbag into the "O" whenever the choice changes
  useGSAP(() => {
    if (!icon) return;
    if (first.current) { first.current = false; return; }
    if (window.matchMedia(REDUCED).matches) return;
    gsap.fromTo('.oro-o img', { scale: 0.55, rotation: -30, autoAlpha: 0 }, { scale: 1, rotation: 0, autoAlpha: 1, duration: 0.7, ease: 'back.out(2)', clearProps: 'transform,opacity,visibility' });
  }, { scope: ref, dependencies: [icon], revertOnUpdate: true });

  return (
    <span ref={ref} className={'oro-mark ' + className} role="img" aria-label="Oro">
      <span className="oro-o" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {icon ? <img src={icon} alt="" /> : 'O'}
      </span>
      <span aria-hidden="true">ro</span>
    </span>
  );
}
