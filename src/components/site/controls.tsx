'use client';

import { FABRICS } from './data';

/* Corduroy / microsuede switch: the only choice besides the style ring */
export function FabricPills({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <>
      {FABRICS.map((f) => (
        <button key={f.id} type="button" aria-pressed={f.id === value} onClick={() => onChange(f.id)}>{f.name}</button>
      ))}
    </>
  );
}
