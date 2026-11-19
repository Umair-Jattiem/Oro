/* The beanbag's shape, shared by the main site and the room.
   Takes a direction on a unit sphere and returns the deformed point: a heavy, spread base, a slumped crown
   with a gathered dimple, panel seams, lumps of filling and sharp fabric creases. `s` (0..1) is how far
   someone is sitting in it. out = [x, y, z, crease] where crease (negative = deeper) drives the baked shading. */

export function smoothstep(a: number, b: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
function hash3(x: number, y: number, z: number) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123;
  return s - Math.floor(s);
}
export function vnoise(x: number, y: number, z: number) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  let fx = x - ix, fy = y - iy, fz = z - iz;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  const a = hash3(ix, iy, iz), b = hash3(ix + 1, iy, iz), c = hash3(ix, iy + 1, iz), d = hash3(ix + 1, iy + 1, iz);
  const e = hash3(ix, iy, iz + 1), f = hash3(ix + 1, iy, iz + 1), g = hash3(ix, iy + 1, iz + 1), h = hash3(ix + 1, iy + 1, iz + 1);
  const x0 = a + (b - a) * fx, x1 = c + (d - c) * fx, x2 = e + (f - e) * fx, x3 = g + (h - g) * fx;
  const y0 = x0 + (x1 - x0) * fy, y1 = x2 + (x3 - x2) * fy;
  return y0 + (y1 - y0) * fz;
}

export function bagPoint(nx: number, ny: number, nz: number, s: number, off: number, out: number[]) {
  const th = Math.atan2(nx, nz), hr = Math.sqrt(nx * nx + nz * nz);
  const c3 = Math.cos(3 * th), fade = smoothstep(0.05, 0.4, hr);
  const groove = Math.exp(-(c3 * c3) / 0.035), bulge = Math.sqrt(Math.abs(c3)) - 0.62; // six sewn panels

  // silhouette: flattened crown, base that spreads out where it meets the floor
  const base = 1 + fade * 0.03 * bulge - 0.11 * smoothstep(0.55, 1, ny) + 0.13 * smoothstep(0.15, -0.7, ny);
  // big, soft lumps of filling
  const lumps = (vnoise(nx * 1.4 + 3.1, ny * 1.4 + 1.3, nz * 1.4 + 7.7) - 0.5) * 0.11;
  // creases: ridged noise makes sharp folds, strongest on the upper half where the fabric is loose
  const rn = vnoise(nx * 2.3 + 11, ny * 2.3, nz * 2.3 + 5);
  let ridge = 1 - Math.abs(2 * rn - 1); ridge = ridge * ridge * ridge * ridge;
  const folds = -ridge * 0.045 * (0.3 + 0.7 * smoothstep(-0.3, 0.9, ny));
  // wrinkles gathering towards the crown
  const gather = Math.pow(Math.abs(Math.sin(th * 7 + vnoise(nx * 2, ny * 2, nz * 2) * 4)), 10) * smoothstep(0.35, 0.95, ny) * (1 - smoothstep(0.97, 1, ny));
  const fine = (vnoise(nx * 12 + 2, ny * 12 + 9, nz * 12) - 0.5) * 0.012 + (vnoise(nx * 26, ny * 26 + 3, nz * 26 + 1) - 0.5) * 0.004;
  const dimple = -0.07 * Math.exp(-(hr * hr) / 0.02) * smoothstep(0.8, 1, ny);
  const detail = -fade * 0.012 * groove + folds - gather * 0.03 + fine;

  const r = base + lumps + detail + dimple + off;
  let x = nx * r, z = nz * r;
  const y = ny * r;
  z -= 0.08 * smoothstep(0, 1, y);   // leans back a little
  x += 0.03 * smoothstep(0.2, 1, y); // and not perfectly symmetric
  out[0] = x; out[1] = y; out[2] = z; out[3] = detail + dimple * 0.5;
  if (s > 0) { sitPoint(x, y, z, s, sitOut); out[0] = sitOut[0]; out[1] = sitOut[1]; out[2] = sitOut[2]; out[3] += sitOut[3]; }
}
const sitOut = [0, 0, 0, 0];

/* Someone sitting in the beanbag (s 0..1), applied to a point of the resting shape. Only the top front, where a
   person sits, sinks into a seat; the filling it pushes away lifts the back into a backrest and bulges the sides and
   the front lip out, and the fabric bunches into folds around the rim of the seat. The front is +z.
   out = [x, y, z, crease] where crease (negative = darker) shades the seat and its folds. */
export function sitPoint(x: number, y: number, z: number, s: number, out: number[]) {
  const sx = x / 0.48, sz = (z - 0.42) / 0.4, r2 = sx * sx + sz * sz;
  const seat = Math.exp(-r2) * smoothstep(-0.1, 0.5, y);      // 1 in the middle of the seat, 0 away from it
  const rim = seat * (1 - seat) * 4;                            // strongest on the edge of the seat
  const ang = Math.atan2(sz, sx);
  const folds = Math.pow(Math.abs(Math.sin(ang * 4 + vnoise(x * 3 + 1, y * 3, z * 3 + 4) * 3)), 6) * rim;
  const back = smoothstep(0.15, -0.5, z) * smoothstep(0.05, 0.8, y); // behind the seat: becomes the backrest
  const mid = Math.exp(-((y - 0.12) * (y - 0.12)) / 0.2);           // the belly of the bag, where filling moves to
  const side = smoothstep(0.3, 0.95, Math.abs(x)) * mid;
  const lip = smoothstep(0.3, 0.95, z) * mid;

  let dy = -0.44 * seat - 0.03 * folds + 0.15 * back - 0.03 * smoothstep(-0.6, 0.9, y);
  let dz = -0.08 * seat - 0.05 * back + 0.08 * lip;
  const kx = 1 + 0.08 * side + 0.03 * mid;
  dy *= s; dz *= s;
  out[0] = x * (1 + s * (kx - 1)); out[1] = y + dy; out[2] = (z + dz) * (1 + s * 0.03 * mid);
  out[3] = -s * (0.022 * seat + 0.03 * folds + 0.012 * rim);
}
