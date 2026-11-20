/* Products for the main site. Edit these lists to add or change designs, colours, players or currencies.
   Players and their kit colours live in ../shared/kits.ts (shared with the room). */
import { kitById, type Kit } from '../shared/kits';

export type Colour = { id: string; name: string; hex: string };
export type Fabric = { id: string; name: string };
export type Design = {
  id: string; code: string; name: string; kind: string; patch: string; colour: string; fabric: string;
  status: string; tone: string; panel: string; rot: number; variant: 'player' | 'ball' | 'cur'; fixedColour?: boolean;
  props: string; blurb: string;
};
export type Ball = { n: number; name: string; hex: string; stripe?: boolean };
export type Currency = { id: string; name: string; sym: string; paper: string; ink: string; theme: string; img: string[] };
export type Pick = { player?: string; ball?: number; cur?: string };
type Prop = { t: string; n?: number; hex?: string; stripe?: boolean; cur?: string; kit?: Kit; pick?: Pick };
type PropSet = Prop[] & { unique?: boolean };

export const COLOURS: Colour[] = [
  { id: 'black',     name: 'Black',      hex: '#141414' },
  { id: 'chocolate', name: 'Chocolate',  hex: '#3A2218' },
  { id: 'charcoal',  name: 'Charcoal',   hex: '#3A3D3F' },
  { id: 'navy',      name: 'Navy',       hex: '#1F2A44' },
  { id: 'oat',       name: 'Oat',        hex: '#CBC3B4' },
  { id: 'sand',      name: 'Sand',       hex: '#B9A27A' },
  { id: 'green',     name: 'Felt green', hex: '#17503C' },
  { id: 'pink',      name: 'Blush pink', hex: '#E9A3BF' },
];
export const FABRICS: Fabric[] = [
  { id: 'corduroy',   name: 'Corduroy' },
  { id: 'microsuede', name: 'Microsuede' },
];
/* Three beanbags, each with its own picker:
   variant 'player' = choose a football legend (kit colours, name and number),
   variant 'ball'   = choose a pool ball (number and colour),
   variant 'cur'    = choose a currency.
   panel = card background; props = the floating objects around the hero (see PROPSETS). */
export const DESIGNS: Design[] = [
  { id: 'legend', code: 'OLS-10', name: 'Football legend', kind: 'dome', patch: 'kitpatch', colour: 'black', fabric: 'corduroy', status: 'Concept',    tone: 'concept', panel: '#F5CDB8', rot: -0.3, variant: 'player', fixedColour: true, props: 'players', blurb: 'Your favourite legend in their national colours, with their name and number on a round patch.' },
  { id: 'ols01',  code: 'OLS-01', name: 'Pool ball',       kind: 'dome', patch: 'circle',   colour: 'black', fabric: 'corduroy', status: 'Concept',    tone: 'concept', panel: '#F4B8CF', rot: -0.3, variant: 'ball', props: 'balls', blurb: 'A corduroy beanbag styled as a pool ball, with the white circle and number.' },
  { id: 'dollar', code: '',       name: 'Money print',     kind: 'dome', patch: 'dollar',   colour: 'green', fabric: 'corduroy', status: 'Idea stage', tone: 'idea',    panel: '#CFE6CB', rot: 0.2,  variant: 'cur', fixedColour: true, props: 'notes', blurb: 'A beanbag covered in a stylised banknote print, in the currency you choose.' },
];
/* the three pool balls: the solid black 8, and the striped 10 (blue) and 11 (red) */
export const BALLS: Ball[] = [
  { n: 8, name: 'Black', hex: '#141213' },
  { n: 10, name: 'Blue stripe', hex: '#1F4FB4', stripe: true },
  { n: 11, name: 'Red stripe', hex: '#C8302A', stripe: true },
];
const ballByN = (n: number) => BALLS.find((b) => b.n === n) || BALLS[0];
/* the three football legends */
export const PLAYERS: Kit[] = ['messi', 'ronaldo', 'neymar'].map(kitById);
/* each currency's note: photos of the front (and back) in /images/notes, used on the fabric, the ring and the falling notes */
export const CURRENCIES: Currency[] = [
  { id: 'EUR', name: 'Euro',   sym: '€', paper: '#DDE6F2', ink: '#2F4F86', theme: '#2F6FC0', img: ['/images/notes/eur-front.jpg'] },
  { id: 'ZAR', name: 'Rand',   sym: 'R', paper: '#ECDDC6', ink: '#7A4B2A', theme: '#B07A3C', img: ['/images/notes/zar-front.jpg', '/images/notes/zar-back.jpg'] },
  { id: 'USD', name: 'Dollar', sym: '$', paper: '#EFEACF', ink: '#3F6E4B', theme: '#1A9A5E', img: ['/images/notes/usd-front.jpg', '/images/notes/usd-back.jpg'] },
];

/* The ring around the beanbag shows the styles of the chosen design (see `props` on each design):
   every football legend, every pool ball, or one note per currency. Tapping one switches to it. */
export const PROPSETS: Record<string, PropSet> = {
  players: PLAYERS.map((k) => ({ t: 'ball', kit: k, pick: { player: k.id } })),
  balls: BALLS.map((b) => ({ t: 'ball', n: b.n, hex: b.hex, stripe: b.stripe, pick: { ball: b.n } })),
  notes: CURRENCIES.map((c) => ({ t: 'note', cur: c.id, pick: { cur: c.id } })),
};

/* label for a ring item, used in the tooltip and the keyboard list */
export function pickLabel(p: Pick) {
  if (p.player) { const k = kitById(p.player); return `${k.name} ${k.num} · ${k.team}`; }
  if (p.ball) { const b = ballByN(p.ball); return `${b.name} ${b.n} ball`; }
  const c = byId(CURRENCIES, p.cur || 'USD'); return `${c.name} money print`;
}
/* the styles of one design, in ring order (for the keyboard and screen-reader list) */
export const picksFor = (designId: string): Pick[] => (PROPSETS[byId(DESIGNS, designId).props] || []).map((p) => p.pick!);

export const PROVINCES = ['Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape'];

export function byId<T extends { id: string }>(list: T[], id: string): T {
  for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
  return list[0];
}

/* ---------- the current selection and what it means ---------- */
export type Selection = { id: string; colour: string; fabric: string; player: string; ball: number; cur: string };
export type Theme = [string, string, string];
export type Spec = { id: string; kind: string; patch: string; hex: string; fabric: string; num?: number; stripe?: boolean; cur?: string; kit?: Kit };

export const INITIAL_SELECTION: Selection = { id: 'ols01', colour: 'black', fabric: 'corduroy', player: 'messi', ball: 8, cur: 'USD' };

export const playerOf = (s: Selection) => kitById(s.player);
export const ballOf = (s: Selection) => ballByN(s.ball);
export const curOf = (s: Selection) => byId(CURRENCIES, s.cur);
export const playerLabel = (k: Kit) => `${k.name} ${k.num} · ${k.team}`;

/* label for the picker row: "Player: Messi 10 · Argentina", "Ball: Black 8", "Currency: Dollar" */
export function variantLabel(s: Selection, d: Design = byId(DESIGNS, s.id)) {
  if (d.variant === 'player') return 'Player: ' + playerLabel(playerOf(s));
  if (d.variant === 'ball') return `Ball: ${ballOf(s).name} ${s.ball}`;
  return 'Currency: ' + curOf(s).name;
}

export function designName(s: Selection, d: Design = byId(DESIGNS, s.id)) {
  const k = playerOf(s);
  if (d.id === 'legend') return `${k.name} ${k.num}`;
  if (d.id === 'ols01') return 'Classic ' + s.ball + '-ball';
  if (d.id === 'dollar') return curOf(s).name + ' print';
  return d.name;
}
function shadeHex(hex: string, f: number) {
  const c = parseInt(hex.slice(1), 16);
  const h = (v: number) => ('0' + Math.max(0, Math.min(255, Math.round(v * f))).toString(16)).slice(-2);
  return '#' + h((c >> 16) & 255) + h((c >> 8) & 255) + h(c & 255);
}
const themeFromHex = (hex: string): Theme => [shadeHex(hex, 0.78), shadeHex(hex, 0.36), shadeHex(hex, 0.1)];
export function themeOf(s: Selection): Theme {
  const d = byId(DESIGNS, s.id);
  return SCENE_THEMES[sceneOf(s).scene] || themeFromHex(d.variant === 'cur' ? curOf(s).theme : '#5b2a86');
}

/* ---------- the world behind each beanbag ---------- */
export type Scene = 'rio' | 'cr7' | 'sol' | 'poolhall' | 'vault';
/* which painted scene sits behind the current style, and the accent colour it picks up */
export function sceneOf(s: Selection): { scene: Scene; accent: string } {
  const d = byId(DESIGNS, s.id);
  if (d.variant === 'player') return { scene: s.player === 'neymar' ? 'rio' : s.player === 'ronaldo' ? 'cr7' : 'sol', accent: playerOf(s).hex };
  if (d.variant === 'ball') return { scene: 'poolhall', accent: ballOf(s).hex };
  return { scene: 'vault', accent: curOf(s).theme };
}
/* page colours (order section, fallbacks) that match each scene */
const SCENE_THEMES: Record<Scene, Theme> = {
  rio: ['#e8843f', '#4a2f5e', '#120c18'],
  cr7: ['#6f521b', '#241a08', '#060607'],
  sol: ['#5b95c8', '#1c4672', '#091523'],
  poolhall: ['#1f7a4a', '#0c3622', '#04110a'],
  vault: ['#6e5a23', '#262010', '#090a07'],
};
export function specOf(s: Selection): Spec {
  const d = byId(DESIGNS, s.id);
  if (d.variant === 'player') { const kit = playerOf(s); return { id: d.id, kind: d.kind, patch: d.patch, hex: kit.hex, fabric: s.fabric, kit }; }
  if (d.variant === 'ball') { const b = ballOf(s); return { id: d.id, kind: d.kind, patch: d.patch, hex: b.hex, fabric: s.fabric, num: b.n, stripe: b.stripe }; }
  return { id: d.id, kind: d.kind, patch: d.patch, hex: byId(COLOURS, s.colour).hex, fabric: s.fabric, cur: s.cur };
}
export function summaryText(s: Selection) {
  return designName(s) + ' · ' + byId(FABRICS, s.fabric).name;
}
