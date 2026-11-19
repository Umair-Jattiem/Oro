'use client';

import { useRef, useState } from 'react';
import { FABRICS, PROVINCES, byId, designName, summaryText, variantLabel, type Selection } from './data';
import { scrollToId } from '../motion/SmoothScroll';

type Field = 'oName' | 'oEmail' | 'oPhone' | 'oStreet' | 'oSuburb' | 'oCity' | 'oProvince' | 'oPostal' | 'oNotes';
type Values = Record<Field, string>;
const EMPTY: Values = { oName: '', oEmail: '', oPhone: '', oStreet: '', oSuburb: '', oCity: '', oProvince: '', oPostal: '', oNotes: '' };
type Done = { ref: string; items: string[]; name: string; email: string; phone: string; addr: string; notes: string };

/* one style in the order: what it is, how many, and a picture of it taken when it was added */
export type Line = { key: string; sel: Selection; qty: number; img: string | null };
export const lineKey = (s: Selection) => summaryText(s);
export const MAX_EACH = 10;

type Props = {
  sel: Selection; shot: string | null; basket: Line[];
  onAdd: () => void; onQty: (key: string, qty: number) => void; onRemove: (key: string) => void; onClear: () => void;
};

/* Order request for one or more beanbags, in any mix of styles. Prototype: nothing is sent or saved. */
export default function OrderSection({ sel, shot, basket, onAdd, onQty, onRemove, onClear }: Props) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field | 'oAgree' | 'oBasket', string>>>({});
  const [summaryErr, setSummaryErr] = useState('');
  const [done, setDone] = useState<Done | null>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const inBasket = basket.some((l) => l.key === lineKey(sel));
  const count = basket.reduce((n, l) => n + l.qty, 0);

  function set(id: Field, v: string) {
    setValues((s) => ({ ...s, [id]: v }));
    if (errors[id]) setErrors((e) => ({ ...e, [id]: '' }));
  }
  const errProps = (id: Field) => (errors[id] ? { 'aria-invalid': true as const, 'aria-describedby': 'e-' + id } : {});

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = (id: Field) => values[id].trim();
    const next: Partial<Record<Field | 'oAgree' | 'oBasket', string>> = {};
    const bad: string[] = [];
    const check = (id: Field, ok: boolean, msg: string) => { if (!ok) { next[id] = msg; bad.push(id); } };
    check('oName', v('oName').length >= 2, 'Please enter your full name.');
    check('oEmail', /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v('oEmail')), 'Please enter a valid email address.');
    check('oPhone', /^(\+27|0)\d{9}$/.test(v('oPhone').replace(/[\s()-]/g, '')), 'Please enter a South African mobile number, for example 082 123 4567.');
    check('oStreet', v('oStreet').length >= 3, 'Please enter your street address.');
    check('oSuburb', v('oSuburb').length >= 2, 'Please enter your suburb.');
    check('oCity', v('oCity').length >= 2, 'Please enter your city or town.');
    check('oProvince', !!v('oProvince'), 'Please choose your province.');
    check('oPostal', /^\d{4}$/.test(v('oPostal')), 'South African postal codes have 4 digits.');
    if (!basket.length) { next.oBasket = 'Please add at least one beanbag to your order.'; bad.push('oBasket'); }
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
      items: basket.map((l) => summaryText(l.sel) + ' × ' + l.qty),
      name: v('oName'), email: v('oEmail'), phone: v('oPhone'),
      addr: [v('oStreet'), v('oSuburb'), v('oCity'), v('oProvince'), v('oPostal')].join(', '),
      notes: v('oNotes'),
    });
    setTimeout(() => doneRef.current?.focus(), 0);
  }

  function again() {
    setValues(EMPTY); setAgree(false); setErrors({}); setDone(null); onClear();
    scrollToId('order');
  }

  return (
    <section className="order" id="order" aria-labelledby="orderTitle">
      <div className="op">
        <div className="op-left">
          <div className="op-piece">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {shot ? <img src={shot} alt={`Your Oro beanbag: ${designName(sel)}`} /> : <span className="op-wait">Preparing your preview…</span>}
          </div>
          <p className="op-name">{designName(sel)}</p>
          <p className="op-cap">
            {variantLabel(sel)} · {byId(FABRICS, sel.fabric).name} ·{' '}
            <a href="#home" onClick={(e) => { e.preventDefault(); scrollToId('home'); }}>Change style</a>
          </p>
          {inBasket
            ? <p className="op-in" aria-live="polite">✓ In your order</p>
            : <button type="button" className="ghost-btn op-add" onClick={onAdd} hidden={!!done}>Add this style to your order</button>}
        </div>

        <div className="op-right">
          <p className="mk-eyebrow">Order</p>
          <h2 className="op-title" id="orderTitle">Place an order request</h2>
          <p className="desc">Order as many beanbags as you like, in any mix of styles: add each style from the top of the page, then leave your details. We will confirm the price, size and delivery with you before you pay anything.</p>

          <form id="oForm" noValidate onSubmit={submit} hidden={!!done}>
            <fieldset className="ob">
              <legend>1. Your beanbags{count ? ` (${count})` : ''}</legend>
              {basket.length ? (
                <ul className="basket" id="oBasket" tabIndex={-1}>
                  {basket.map((l) => (
                    <li key={l.key}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {l.img ? <img src={l.img} alt="" /> : <span className="b-ph" aria-hidden="true" />}
                      <span className="b-name"><b>{designName(l.sel)}</b>{byId(FABRICS, l.sel.fabric).name}</span>
                      <span className="qty" role="group" aria-label={'How many ' + designName(l.sel)}>
                        <button type="button" aria-label={'One fewer ' + designName(l.sel)} disabled={l.qty <= 1} onClick={() => onQty(l.key, l.qty - 1)}>&minus;</button>
                        <output aria-live="polite">{l.qty}</output>
                        <button type="button" aria-label={'One more ' + designName(l.sel)} disabled={l.qty >= MAX_EACH} onClick={() => onQty(l.key, l.qty + 1)}>+</button>
                      </span>
                      <button type="button" className="b-x" aria-label={'Remove ' + designName(l.sel)} onClick={() => onRemove(l.key)}>×</button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="osum" id="oBasket" tabIndex={-1}><b>Your order is empty</b>Pick a style at the top of the page and press Add to order, or add the one shown here.</div>
              )}
              <div className="mrow2">
                {!inBasket && <button type="button" className="ghost-btn" onClick={onAdd}>Add {designName(sel)}</button>}
                <a className="ghost-btn" href="#home" onClick={(e) => { e.preventDefault(); scrollToId('home'); }}>Add another style</a>
              </div>
              <span className="err" id="e-oBasket">{errors.oBasket}</span>
              <div className="osum">Price to be confirmed. We will send you a quote and delivery details before you pay anything.</div>
            </fieldset>

            <fieldset className="ob">
              <legend>2. Your details</legend>
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
                <dt>{done.items.length === 1 ? 'Item' : 'Items'}</dt><dd>{done.items.map((t) => <span key={t} className="b-line">{t}</span>)}</dd>
                <dt>Name</dt><dd>{done.name}</dd>
                <dt>Email</dt><dd>{done.email}</dd>
                <dt>Mobile</dt><dd>{done.phone}</dd>
                <dt>Deliver to</dt><dd>{done.addr}</dd>
                {done.notes && <><dt>Notes</dt><dd>{done.notes}</dd></>}
              </dl>
              <div className="mrow2">
                <button type="button" className="primary-btn" onClick={again}>Start another request<span className="plus" aria-hidden="true">+</span></button>
                <a className="ghost-btn" href="#home" onClick={(e) => { e.preventDefault(); scrollToId('home'); }}>Back to the top</a>
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
