'use client';

import { useSyncExternalStore } from 'react';
import { BALLS, COLOURS, CURRENCIES, FABRICS, playerLabel, type Pick } from './data';
import { ballIcon, curIcon, playerIcon } from './icons';
import { KITS } from '../shared/kits';

export function FabricPills({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <>
      {FABRICS.map((f) => (
        <button key={f.id} type="button" aria-pressed={f.id === value} onClick={() => onChange(f.id)}>{f.name}</button>
      ))}
    </>
  );
}

export function Swatches({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <>
      {COLOURS.map((c) => (
        <button key={c.id} type="button" style={{ background: c.hex }} aria-label={c.name} aria-pressed={c.id === value} onClick={() => onChange(c.id)} />
      ))}
    </>
  );
}

const noopSubscribe = () => () => {};

/* Ball or currency chips: an accessible way to pick, alongside tapping the floating balls and notes. */
export function VariantChips({ kind, player, ball, cur, onPick }: { kind: 'player' | 'ball' | 'cur'; player: string; ball: number; cur: string; onPick: (p: Pick) => void }) {
  // icons are drawn on a canvas, so only render them in the browser (false during server render and hydration)
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (kind === 'ball') {
    return (
      <>
        {BALLS.map((b) => {
          const label = `${b.name} ${b.n} ball`;
          return (
            <button key={b.n} type="button" aria-label={label} title={label} aria-pressed={b.n === ball} onClick={() => onPick({ ball: b.n })}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {mounted && <img alt="" src={ballIcon(b)} />}
            </button>
          );
        })}
      </>
    );
  }
  if (kind === 'player') {
    return (
      <>
        {KITS.map((k) => {
          const label = playerLabel(k);
          return (
            <button key={k.id} type="button" aria-label={label} title={label} aria-pressed={k.id === player} onClick={() => onPick({ player: k.id })}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {mounted && <img alt="" src={playerIcon(k)} />}
            </button>
          );
        })}
      </>
    );
  }
  return (
    <>
      {CURRENCIES.map((c) => {
        const label = `${c.name} (${c.sym})`;
        return (
          <button key={c.id} type="button" aria-label={label} title={label} aria-pressed={c.id === cur} onClick={() => onPick({ cur: c.id })}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {mounted && <img alt="" src={curIcon(c)} />}
          </button>
        );
      })}
    </>
  );
}
