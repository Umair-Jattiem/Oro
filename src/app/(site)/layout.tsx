import type { Metadata, Viewport } from 'next';
import '../globals.css';
import './site.css';

export const metadata: Metadata = {
  title: 'Oro · Sit Different',
  description: 'Oversized beanbags for rooms with a point of view. Pre-launch prototype.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* hide the hero until its intro animation starts (never with reduced motion; removed after 4s whatever happens) */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&!/^#(order|custom)$/.test(location.hash)){var d=document.documentElement;d.classList.add('motion-pending');setTimeout(function(){d.classList.remove('motion-pending')},4000)}}catch(e){}",
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&family=Galada&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
