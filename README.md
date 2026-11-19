# Oro: website

Oversized beanbags, shown live in 3D. Pick a football legend, a pool ball or a money print, restyle it, and send an order request. The "O" in Oro becomes whichever beanbag you choose.

Built with Next.js, Three.js, GSAP, Lenis and React Bits. Pre-launch concept: nothing is sold or sent from this site yet.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Where things live

- `src/components/site/data.ts`: designs, colours, pool balls and currencies
- `src/components/shared/kits.ts`: football legends and their kit colours
- `src/components/site/engine.js`: the 3D beanbag scene
- `src/components/site/SiteApp.tsx`: the page
- `src/components/site/useSiteMotion.ts`: GSAP animations
