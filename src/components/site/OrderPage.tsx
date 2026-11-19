'use client';

import { useRef, useState, type ReactNode } from 'react';
import { COLOURS, DESIGNS, FABRICS, PROVINCES, byId, summaryText, variantLabel, type Pick, type Selection } from './data';
import { FabricPills, Swatches, VariantChips } from './controls';
import { scrollToTop } from '../motion/SmoothScroll';

export type OrderState = { mode: 'design' | 'custom'; qty: number; fabric: string; colour: string };

type Props = {
  hidden: boolean;
  stage: ReactNode;
  sel: Selection;
  order: OrderState;
  thumbs: Record<string, string>;
  onSelectDesign: (id: string) => void;
  onFabric: (id: string) => void;
  onColour: (id: string) => void;
  onPick: (p: Pick) => void;
  onCustomFabric: (id: string) => void;
  onCustomColour: (id: string) => void;
  onQty: (qty: number) => void;
};

type Field = 'oDesc' | 'oName' | 'oEmail' | 'oPhone' | 'oStreet' | 'oSuburb' | 'oCity' | 'oProvince' | 'oPostal' | 'oNotes';
type Values = Record<Field, string>;
const EMPTY: Values = { oDesc: '', oName: '', oEmail: '', oPhone: '', oStreet: '', oSuburb: '', oCity: '', oProvince: '', oPostal: '', oNotes: '' };

type Done = { ref: string; item: string; desc?: string; name: string; email: string; phone: string; addr: string; notes: string };

/* Order request page. Prototype: nothing is sent or saved. */
export default function OrderPage(p: Props) {
  const { sel, order } = p;
  const custom = order.mode === 'custom';
  const d = byId(DESIGNS, sel.id);
  const [values, setValues] = useState<Values>(EMPTY);
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field | 'oAgree', string>>>({});
  const [summaryErr, setSummaryErr] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);

  const itemText = custom ? `Custom beanbag · ${byId(FABRICS, order.fabric).name} · ${byId(COLOURS, order.colour).name}` : summaryText(sel);

  function set(id: Field, v: string) {
    setValues((s) => ({ ...s, [id]: v }));
    if (errors[id]) setErrors((e) => ({ ...e, [id]: '' }));
  }
  const errProps = (id: Field) => (errors[id] ? { 'aria-invalid': true as const, 'aria-describedby': 'e-' + id } : {});

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = (id: Field) => values[id].trim();
    const next: Partial<Record<Field | 'oAgree', string>> = {};
    const bad: string[] = [];
    const check = (id: Field, ok: boolean, msg: string) => { if (!ok) { next[id] = msg; bad.push(id); } };
    if (custom) check('oDesc', v('oDesc').length >= 10, 'Tell us a little more about your design (at least 10 characters).');
    check('oName', v('oName').length >= 2, 'Please enter your full name.');
    check('oEmail', /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v('oEmail')), 'Please enter a valid email address.');
    check('oPhone', /^(\+27|0)\d{9}$/.test(v('oPhone').replace(/[\s()-]/g, '')), 'Please enter a South African mobile number, for example 082 123 4567.');
    check('oStreet', v('oStreet').length >= 3, 'Please enter your street address.');
    check('oSuburb', v('oSuburb').length >= 2, 'Please enter your suburb.');
    check('oCity', v('oCity').length >= 2, 'Please enter your city or town.');
    check('oProvince', !!v('oProvince'), 'Please choose your province.');
    check('oPostal', /^\d{4}$/.test(v('oPostal')), 'South African postal codes have 4 digits.');
    if (!agree) { next.oAgree = 'Please confirm you understand this is a request, not a purchase.'; bad.push('oAgree'); }
    setErrors(next);
    if (bad.length) {
      setSummaryErr('Please check the ' + (bad.length === 1 ? 'highlighted field.' : bad.length + ' highlighted fields.'));
      document.getElementById(bad[0])?.focus();
      return;
    }
    setSummaryErr('');
    setDone({
      ref: 'REQ-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
      item: itemText + ' × ' + order.qty,
      desc: custom ? v('oDesc') : undefined,
      name: v('oName'), email: v('oEmail'), phone: v('oPhone'),
      addr: [v('oStreet'), v('oSuburb'), v('oCity'), v('oProvince'), v('oPostal')].join(', '),
      notes: v('oNotes'),
    });
    setTimeout(() => doneRef.current?.focus(), 0);
  }

  function again() {
    setValues(EMPTY); setAgree(false); setErrors({}); setPreview(null); setDone(null);
    p.onQty(1); scrollToTop();
  }

  return (
    <section className="order" id="order" hidden={p.hidden} aria-label="Order request">
      <div className="op">
        <div className="op-left">
          <div className="op-stage" id="opStage">{p.stage}</div>
          <p className="op-cap">
            {custom
              ? 'Live 3D preview of a plain beanbag in your base colour. Your own artwork is added once we have discussed your idea.'
              : 'Live 3D preview of your selection. A concept, not a photograph of a finished product.'}
          </p>
        </div>
        <div className="op-right">
          <a className="op-back" href="#home">&larr; Back</a>
          <h1 className="op-title">Place an order request</h1>
          <p className="desc">Choose your piece and leave your details. We will confirm the price, size and delivery with you before you pay anything.</p>
          <div className="tabs" role="tablist" aria-label="Order type">
            <a href="#order" role="tab" aria-selected={!custom}>Customise a design</a>
            <a href="#custom" role="tab" aria-selected={custom}>Request your own design</a>
          </div>

          <form id="oForm" ref={formRef} noValidate onSubmit={submit} hidden={!!done}>
            <fieldset className="ob" hidden={custom}>
              <legend>1. Your piece</legend>
              <div className="orow">
                <div className="ol">Design</div>
                <div className="ochips" role="group" aria-label="Design">
                  {DESIGNS.map((x) => (
                    <button key={x.id} type="button" className="ochip" aria-pressed={x.id === sel.id} onClick={() => p.onSelectDesign(x.id)}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.thumbs[x.id] && <img alt="" src={p.thumbs[x.id]} />}
                      <span className="ph" />
                      <span>{x.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="orow"><div className="ol">Fabric (proposed)</div><div className="mini" role="group" aria-label="Fabric"><FabricPills value={sel.fabric} onChange={p.onFabric} /></div></div>
              <div className="orow">
                <div className="ol">{variantLabel(sel, d)}</div>
                <div className="vchips" role="group" aria-label="Style"><VariantChips kind={d.variant} player={sel.player} ball={sel.ball} cur={sel.cur} onPick={p.onPick} /></div>
                <p className="hintx">{d.variant === 'cur' ? 'You can also tap the notes and coins floating around the preview.' : 'You can also tap the balls floating around the preview.'}</p>
              </div>
              <div className="orow" hidden={d.id !== 'bagsign'}>
                <div className="ol">Colour: <span>{byId(COLOURS, sel.colour).name}</span></div>
                <div className="sws" role="group" aria-label="Colour"><Swatches value={sel.colour} onChange={p.onColour} /></div>
              </div>
            </fieldset>

            <fieldset className="ob" hidden={!custom}>
              <legend>1. Your idea</legend>
              <div className="orow"><div className="ol">Fabric (proposed)</div><div className="mini" role="group" aria-label="Fabric"><FabricPills value={order.fabric} onChange={p.onCustomFabric} /></div></div>
              <div className="orow">
                <div className="ol">Base colour: <span>{byId(COLOURS, order.colour).name}</span></div>
                <div className="sws" role="group" aria-label="Base colour"><Swatches value={order.colour} onChange={p.onCustomColour} /></div>
              </div>
              <div className="of">
                <label htmlFor="oDesc">Describe your design</label>
                <textarea id="oDesc" rows={4} placeholder="For example: a black beanbag with my initials in gold" value={values.oDesc} onChange={(e) => set('oDesc', e.target.value)} {...errProps('oDesc')} />
                <span className="err" id="e-oDesc">{errors.oDesc}</span>
              </div>
              <div className="of">
                <label htmlFor="oFile">Reference image (optional)</label>
                <input
                  id="oFile" type="file" accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) { setPreview(null); return; }
                    const r = new FileReader(); r.onload = () => setPreview(String(r.result)); r.readAsDataURL(f);
                  }}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {preview && <img id="oFilePrev" alt="Your reference image" src={preview} />}
                <span className="hintx">Prototype: your image stays on your device and is not uploaded.</span>
              </div>
            </fieldset>

            <fieldset className="ob">
              <legend>2. Quantity</legend>
              <div className="qty">
                <button type="button" aria-label="Fewer" disabled={order.qty <= 1} onClick={() => p.onQty(Math.max(1, order.qty - 1))}>&minus;</button>
                <output aria-live="polite">{order.qty}</output>
                <button type="button" aria-label="More" disabled={order.qty >= 10} onClick={() => p.onQty(Math.min(10, order.qty + 1))}>+</button>
              </div>
              <div className="osum"><b>{itemText} × {order.qty}</b>Price to be confirmed. We will send you a quote and delivery details before you pay anything.</div>
            </fieldset>

            <fieldset className="ob">
              <legend>3. Your details</legend>
              <div className="ogrid">
                <TextField id="oName" label="Full name" className="span2" autoComplete="name" values={values} errors={errors} set={set} errProps={errProps} />
                <TextField id="oEmail" label="Email" type="email" autoComplete="email" values={values} errors={errors} set={set} errProps={errProps} />
                <TextField id="oPhone" label="Mobile number" type="tel" autoComplete="tel" placeholder="e.g. 082 123 4567" values={values} errors={errors} set={set} errProps={errProps} />
                <TextField id="oStreet" label="Street address" className="span2" autoComplete="address-line1" values={values} errors={errors} set={set} errProps={errProps} />
                <TextField id="oSuburb" label="Suburb" autoComplete="address-level3" values={values} errors={errors} set={set} errProps={errProps} />
                <TextField id="oCity" label="City or town" autoComplete="address-level2" values={values} errors={errors} set={set} errProps={errProps} />
                <div className="of">
                  <label htmlFor="oProvince">Province</label>
                  <select id="oProvince" autoComplete="address-level1" value={values.oProvince} onChange={(e) => set('oProvince', e.target.value)} {...errProps('oProvince')}>
                    <option value="">Choose your province</option>
                    {PROVINCES.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                  <span className="err" id="e-oProvince">{errors.oProvince}</span>
                </div>
                <TextField id="oPostal" label="Postal code" inputMode="numeric" autoComplete="postal-code" maxLength={4} values={values} errors={errors} set={set} errProps={errProps} />
                <div className="of span2">
                  <label htmlFor="oNotes">Notes (optional)</label>
                  <textarea id="oNotes" rows={2} value={values.oNotes} onChange={(e) => set('oNotes', e.target.value)} />
                </div>
              </div>
            </fieldset>

            <div className="of">
              <label className="agree" htmlFor="oAgree">
                <input type="checkbox" id="oAgree" checked={agree} onChange={(e) => { setAgree(e.target.checked); if (e.target.checked) setErrors((x) => ({ ...x, oAgree: '' })); }} />
                <span>I understand this is an order request, not a purchase. The price and delivery will be confirmed with me before I pay.</span>
              </label>
              <span className="err" id="e-oAgree">{errors.oAgree}</span>
            </div>
            <div className="oerr" role="alert" hidden={!summaryErr}>{summaryErr}</div>
            <button type="submit" className="primary-btn">Place order request<span className="plus" aria-hidden="true">+</span></button>
            <p className="hintx">[PRIVACY WORDING TO BE CONFIRMED, INCLUDING HOW YOUR DETAILS ARE STORED AND USED]</p>
          </form>

          {done && (
            <div className="odone" role="status" tabIndex={-1} ref={doneRef}>
              <p className="ref">Reference {done.ref} · prototype</p>
              <h2>Request ready</h2>
              <p className="desc">Prototype only: nothing has been sent or saved. On the live site, this request will go to [ORDER EMAIL OR ORDER SYSTEM TO BE SET UP], and we will contact you with a price and delivery details before any payment.</p>
              <dl>
                <dt>Item</dt><dd>{done.item}</dd>
                {done.desc && <><dt>Your idea</dt><dd>{done.desc}</dd></>}
                <dt>Name</dt><dd>{done.name}</dd>
                <dt>Email</dt><dd>{done.email}</dd>
                <dt>Mobile</dt><dd>{done.phone}</dd>
                <dt>Deliver to</dt><dd>{done.addr}</dd>
                {done.notes && <><dt>Notes</dt><dd>{done.notes}</dd></>}
              </dl>
              <div className="mrow2">
                <button type="button" className="primary-btn" onClick={again}>Start another request<span className="plus" aria-hidden="true">+</span></button>
                <a className="ghost-btn" href="#home">Back to home</a>
              </div>
            </div>
          )}
        </div>
      </div>
      <p className="op-foot">© [YEAR] Oro · Prototype for review · Not a live store</p>
    </section>
  );
}

type TextFieldProps = {
  id: Field; label: string; className?: string; type?: string; autoComplete?: string; placeholder?: string;
  inputMode?: 'numeric'; maxLength?: number;
  values: Values; errors: Partial<Record<string, string>>;
  set: (id: Field, v: string) => void;
  errProps: (id: Field) => object;
};
function TextField({ id, label, className, type = 'text', values, errors, set, errProps, ...rest }: TextFieldProps) {
  return (
    <div className={'of' + (className ? ' ' + className : '')}>
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type} value={values[id]} onChange={(e) => set(id, e.target.value)} {...rest} {...errProps(id)} />
      <span className="err" id={'e-' + id}>{errors[id]}</span>
    </div>
  );
}
