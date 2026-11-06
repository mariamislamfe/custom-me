/**
 * White-background removal for product photos, on raw RGBA pixels.
 *
 * Made for photos shot on a sheet of white or light grey paper:
 *
 * 1. The background colour is read from the photo's edges. Coloured, dark or
 *    busy backgrounds are left alone (we'd cut them badly). A thin frame
 *    round the photo (mockup exports and screenshots often have a 1–3 px
 *    border) is ignored and removed with the background.
 * 2. A flood fill from the edges takes the background, following soft grey
 *    shading and contact shadows, but never crossing into the product. White
 *    parts *inside* the design stay, because they aren't connected to the edge.
 *    Paper seen *through* the product (under a bag's strap) goes too.
 * 3. Stray specks are cleared, a pale grey rim left by a shadow or a
 *    highlight is peeled off, and the outline gets a soft, anti-aliased
 *    edge. Edge pixels are "un-mixed" from the background colour, so there's
 *    no white halo when the cut-out sits on navy or mint.
 *
 * No imports, so the dashboard (via sharp) and scripts can share it.
 */

/**
 * Colour distance (0–441) a pixel may be from the background and still count
 * as background. Set per photo from how even the background is: a clean
 * digital white (mockup exports) gets the tight end, so a pale print running
 * into the product's edge isn't taken; photographed paper gets the loose end.
 */
const TOLERANCE = [12, 34] as const;
/** Shading / shadows: how far one step may drift, and how far from the background they may get. */
const STEP = 12;
const SHADOW_CAP = 175;
/** Soft edge: fully transparent up to half the tolerance, fully solid this much further. */
const EDGE_RAMP = 50;
/** Pale grey rim peeled off the outline, in pixels. */
const DEFRINGE = 2;

/** Calls fn for every pixel of the ring `inset` pixels in from the photo's edge. */
export function forEachEdge(w: number, h: number, fn: (i: number) => void, inset = 0) {
  const [l, r, t, b] = [inset, w - 1 - inset, inset, h - 1 - inset];
  if (l > r || t > b) return;
  for (let x = l; x <= r; x++) {
    fn(t * w + x);
    if (b > t) fn(b * w + x);
  }
  for (let y = t + 1; y < b; y++) {
    fn(y * w + l);
    if (r > l) fn(y * w + r);
  }
}

/** Share of the outermost pixels that are (mostly) transparent. */
export function transparentEdgeShare(px: Uint8Array, w: number, h: number) {
  let clear = 0;
  let total = 0;
  forEachEdge(w, h, (i) => {
    total++;
    if (px[i * 4 + 3] < 128) clear++;
  });
  return clear / total;
}

/**
 * Removes a plain light background in place. Returns false (and leaves the
 * pixels untouched) when the photo doesn't have one.
 */
export function removeWhiteBackground(px: Uint8Array, w: number, h: number): boolean {
  const n = w * h;
  if (n < 16) return false;
  // Read the background just inside any thin frame
  const frame = Math.min(Math.max(2, Math.round(Math.min(w, h) * 0.004)), Math.floor((Math.min(w, h) - 1) / 2));

  // Background = median of the edge pixels, channel by channel
  const er: number[] = [];
  const eg: number[] = [];
  const eb: number[] = [];
  forEachEdge(
    w,
    h,
    (i) => {
      er.push(px[i * 4]);
      eg.push(px[i * 4 + 1]);
      eb.push(px[i * 4 + 2]);
    },
    frame,
  );
  const median = (v: number[]) => v.sort((p, q) => p - q)[v.length >> 1];
  const bg = [median(er), median(eg), median(eb)];
  if (Math.min(...bg) < 165 || Math.max(...bg) - Math.min(...bg) > 40) return false;

  const dist = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const dr = px[o] - bg[0];
    const dg = px[o + 1] - bg[1];
    const db = px[o + 2] - bg[2];
    dist[i] = Math.sqrt(dr * dr + dg * dg + db * db);
  }

  const ring: number[] = [];
  forEachEdge(w, h, (i) => ring.push(dist[i]), frame);
  // The product may run off one side of the photo; most of the edge must still be paper
  if (ring.filter((d) => d <= TOLERANCE[1] * 1.8).length / ring.length < 0.6) return false;
  ring.sort((p, q) => p - q);
  const noise = ring[Math.floor(ring.length * 0.75)];
  const tol = Math.min(TOLERANCE[1], Math.max(TOLERANCE[0], noise * 2.5 + 6));

  // 0 = product, 1 = background, 2 = shading / shadow on the background
  const state = new Uint8Array(n);
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;
  const bgLuma = (bg[0] + bg[1] + bg[2]) / 3;
  // Shadows and paper shading are the paper's own tint, only darker; a cream
  // or pastel print running into the edge has a tint of its own.
  const shade = (i: number) => {
    const o = i * 4;
    const [r, g, b] = [px[o], px[o + 1], px[o + 2]];
    return (
      Math.min(r, g, b) >= 115 &&
      (r + g + b) / 3 <= bgLuma + 4 &&
      Math.abs(r - g - (bg[0] - bg[1])) <= 6 &&
      Math.abs(g - b - (bg[1] - bg[2])) <= 6
    );
  };
  const stepDist = (a: number, b: number) => {
    const dr = px[a * 4] - px[b * 4];
    const dg = px[a * 4 + 1] - px[b * 4 + 1];
    const db = px[a * 4 + 2] - px[b * 4 + 2];
    return Math.sqrt(dr * dr + dg * dg + db * db);
  };
  /** 1 = background, 2 = shading that continues it from `from`, 0 = neither */
  const kind = (i: number, from: number) => (dist[i] <= tol ? 1 : from >= 0 && dist[i] <= SHADOW_CAP && shade(i) && stepDist(i, from) <= STEP ? 2 : 0);
  const visit = (i: number, from: number) => {
    if (state[i]) return;
    state[i] = kind(i, from);
    if (state[i]) queue[tail++] = i;
  };
  // The frame itself is background, whatever its colour
  for (let k = 0; k < frame; k++) forEachEdge(w, h, (i) => (state[i] = 1), k);
  forEachEdge(
    w,
    h,
    (i) => {
      if (dist[i] <= tol * 1.8 && !state[i]) {
        state[i] = 1;
        queue[tail++] = i;
      }
    },
    frame,
  );
  const spread = () => {
    while (head < tail) {
      const i = queue[head++];
      const x = i % w;
      if (x > 0) visit(i - 1, i);
      if (x < w - 1) visit(i + 1, i);
      if (i >= w) visit(i - w, i);
      if (i < n - w) visit(i + w, i);
    }
  };
  spread();
  // Then the paper inside handles and straps, with its own shading
  for (const hole of seenThrough(state, dist, tol, w, h, kind)) {
    for (const i of hole) {
      state[i] = kind(i, -1) || 2;
      queue[tail++] = i;
    }
  }
  spread();

  clearSpecks(state, w, h);

  // Soft outline: a band around the cut, on both sides
  const removed = new Uint8Array(n);
  for (let i = 0; i < n; i++) removed[i] = state[i] ? 1 : 0;
  const nearProduct = dilate(invert(removed), w, h, 1);
  const nearBackground = dilate(removed, w, h, 2);

  for (let i = 0; i < n; i++) {
    const o = i * 4;
    let a: number;
    if (removed[i]) {
      // Shadows go completely; background touching the product keeps its blend
      a = state[i] === 1 && nearProduct[i] ? edgeAlpha(dist[i], tol / 2) : 0;
    } else if (nearBackground[i]) {
      a = edgeAlpha(dist[i], tol / 2);
    } else {
      continue;
    }
    if (a <= 0) {
      px[o + 3] = 0;
      continue;
    }
    if (a < 1) {
      // Un-mix the background: observed = a·colour + (1 − a)·background
      for (let c = 0; c < 3; c++) px[o + c] = clampByte((px[o + c] - (1 - a) * bg[c]) / a);
    }
    px[o + 3] = Math.round(px[o + 3] * a);
  }
  for (let k = 0; k < frame; k++) forEachEdge(w, h, (i) => (px[i * 4 + 3] = 0), k);

  // Peel a pale neutral rim off the outline (a render's edge highlight, the
  // last of a shadow); coloured or dark edges are left alone.
  const pale = (i: number) => {
    const o = i * 4;
    const lo = Math.min(px[o], px[o + 1], px[o + 2]);
    return lo >= bgLuma - 60 && Math.max(px[o], px[o + 1], px[o + 2]) - lo <= 14;
  };
  for (let pass = 0; pass < DEFRINGE; pass++) {
    const rim: number[] = [];
    for (let i = 0; i < n; i++) {
      if (!nearBackground[i] || !px[i * 4 + 3] || !pale(i)) continue;
      const x = i % w;
      const open = (j: number) => px[j * 4 + 3] === 0;
      if ((x > 0 && open(i - 1)) || (x < w - 1 && open(i + 1)) || (i >= w && open(i - w)) || (i < n - w && open(i + w))) rim.push(i);
    }
    for (const i of rim) px[i * 4 + 3] = 0;
  }
  // Half-see-through pale pixels on the outline are paper, not product: on a
  // dark background they'd show as a dotted light halo
  for (let i = 0; i < n; i++) {
    const a = px[i * 4 + 3];
    if (a > 0 && a < 200 && nearBackground[i] && pale(i)) px[i * 4 + 3] = 0;
  }
  // A light rim around a darker edge (a binding, a seam) is the paper and its
  // shadow mixed in, whatever its tint: peel it, and very faint edge pixels too
  const luma = (i: number) => px[i * 4] * 0.3 + px[i * 4 + 1] * 0.59 + px[i * 4 + 2] * 0.11;
  for (let pass = 0; pass < 2; pass++) {
    const rim: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = px[i * 4 + 3];
      if (!a || !nearBackground[i]) continue;
      const x = i % w;
      const around = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i >= w ? i - w : -1, i < n - w ? i + w : -1];
      if (!around.some((j) => j >= 0 && px[j * 4 + 3] === 0)) continue;
      const l = luma(i);
      const darkerInside = around.some((j) => j >= 0 && px[j * 4 + 3] === 255 && luma(j) <= l - 45);
      if (a < 110 || (l >= 150 && darkerInside)) rim.push(i);
    }
    for (const i of rim) px[i * 4 + 3] = 0;
  }
  smoothOutline(px, w, h);
  dropLooseBits(px, w, h);
  return true;
}

/**
 * Anything on the outline thinner than a couple of pixels — specks and
 * whiskers of shadow hanging on to an edge — is trimmed off (an opening:
 * shrink the shape by a pixel, grow it back).
 */
function smoothOutline(px: Uint8Array, w: number, h: number) {
  const n = w * h;
  const shape = new Uint8Array(n);
  for (let i = 0; i < n; i++) shape[i] = px[i * 4 + 3] ? 1 : 0;
  const kept = dilate(invert(dilate(invert(shape), w, h, 1)), w, h, 1);
  for (let i = 0; i < n; i++) if (shape[i] && !kept[i]) px[i * 4 + 3] = 0;
}

/**
 * Takes `passes` pixels off the whole outline: for products with a dark
 * binding round the edge (T-ruler cases), where any light pixel left on the
 * outline shows as a halo on a dark page.
 */
export function trimOutline(px: Uint8Array, w: number, h: number, passes = 1) {
  const n = w * h;
  for (let pass = 0; pass < passes; pass++) {
    const edge: number[] = [];
    for (let i = 0; i < n; i++) {
      if (!px[i * 4 + 3]) continue;
      const x = i % w;
      if (x === 0 || x === w - 1 || i < w || i >= n - w || !px[(i - 1) * 4 + 3] || !px[(i + 1) * 4 + 3] || !px[(i - w) * 4 + 3] || !px[(i + w) * 4 + 3]) edge.push(i);
    }
    for (const i of edge) px[i * 4 + 3] = 0;
  }
  dropLooseBits(px, w, h);
}

/** Bits left floating apart from the product (paper texture, dust) are removed. */
function dropLooseBits(px: Uint8Array, w: number, h: number) {
  const n = w * h;
  const minSize = Math.max(30, Math.round(n * 0.00001));
  const seen = new Uint8Array(n);
  const stack = new Int32Array(n);
  const members: number[] = [];
  for (let s = 0; s < n; s++) {
    if (!px[s * 4 + 3] || seen[s]) continue;
    let top = 0;
    stack[top++] = s;
    seen[s] = 1;
    members.length = 0;
    while (top) {
      const i = stack[--top];
      if (members.length < minSize) members.push(i);
      const x = i % w;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i >= w ? i - w : -1, i < n - w ? i + w : -1]) {
        if (j >= 0 && !seen[j] && px[j * 4 + 3]) {
          seen[j] = 1;
          stack[top++] = j;
        }
      }
    }
    if (members.length < minSize) for (const i of members) px[i * 4 + 3] = 0;
  }
}

/**
 * For products that are a plain rectangle (a notebook cover, a laptop
 * sleeve): finds the rectangle and puts back anything inside it that the
 * background removal took — a white or cream print running into the edge
 * looks like paper, but it's part of the product. `original` is the photo
 * before removal. Corners within `rounding` (a share of the short side; a
 * sleeve's are rounded) are left as cut, and nothing happens if the product
 * doesn't look like a rectangle.
 */
export function restoreRectangle(px: Uint8Array, original: Uint8Array, w: number, h: number, rounding = 0) {
  const top = new Int32Array(w).fill(-1);
  const bottom = new Int32Array(w).fill(-1);
  const count = new Uint32Array(w);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] <= 128) continue;
      if (top[x] < 0) top[x] = y;
      bottom[x] = y;
      count[x]++;
    }
  }
  let maxSpan = 0;
  for (let x = 0; x < w; x++) if (top[x] >= 0) maxSpan = Math.max(maxSpan, bottom[x] - top[x] + 1);
  // The cover's columns are solid from end to end; a spiral binding or a zip pull isn't
  const cover: number[] = [];
  for (let x = 0; x < w; x++) {
    const span = bottom[x] - top[x] + 1;
    if (top[x] >= 0 && span >= maxSpan * 0.5 && count[x] / span >= 0.9) cover.push(x);
  }
  if (cover.length < w * 0.2) return false;
  const left = cover[0];
  const right = cover[cover.length - 1];
  // The cover's real top and bottom edges: a few columns (a printed line
  // running into the edge) can be all that's left of them, so take the
  // outermost, skipping only a stray handful
  const tops = cover.map((x) => top[x]).sort((p, q) => p - q);
  const bottoms = cover.map((x) => bottom[x]).sort((p, q) => q - p);
  const y0 = tops[Math.min(2, tops.length - 1)];
  const y1 = bottoms[Math.min(2, bottoms.length - 1)];
  const corner = Math.round(Math.min(right - left, y1 - y0) * rounding);

  const fill: number[] = [];
  for (let y = y0; y <= y1; y++) {
    for (let x = left; x <= right; x++) {
      const inCorner = (x - left < corner || right - x < corner) && (y - y0 < corner || y1 - y < corner);
      const i = y * w + x;
      if (!inCorner && px[i * 4 + 3] < 255) fill.push(i);
    }
  }
  // Putting back more than a quarter of it means it wasn't a rectangle after all
  if (fill.length > (right - left + 1) * (y1 - y0 + 1) * 0.25) return false;
  for (const i of fill) {
    const o = i * 4;
    px[o] = original[o];
    px[o + 1] = original[o + 1];
    px[o + 2] = original[o + 2];
    px[o + 3] = 255;
  }
  return true;
}

function edgeAlpha(d: number, low: number) {
  const t = Math.min(1, Math.max(0, (d - low) / EDGE_RAMP));
  return t * t * (3 - 2 * t);
}

const clampByte = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));

function invert(mask: Uint8Array) {
  const out = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) out[i] = mask[i] ? 0 : 1;
  return out;
}

/** Square dilation (radius r), done as two 1-D passes. */
function dilate(mask: Uint8Array, w: number, h: number, r: number) {
  const tmp = new Uint8Array(mask.length);
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let v = 0;
      for (let k = Math.max(0, x - r); k <= Math.min(w - 1, x + r) && !v; k++) v = mask[row + k];
      tmp[row + x] = v;
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let v = 0;
      for (let k = Math.max(0, y - r); k <= Math.min(h - 1, y + r) && !v; k++) v = tmp[k * w + x];
      out[y * w + x] = v;
    }
  }
  return out;
}

/**
 * Paper seen through the product, like the gap under a bag's strap: closed
 * areas of background colour (with their shading) whose bounding box
 * reaches past the product into the background around it. White parts of a
 * print lie inside the product, so their box never does.
 */
function seenThrough(state: Uint8Array, dist: Float32Array, tol: number, w: number, h: number, kind: (i: number, from: number) => number) {
  const n = w * h;
  const minSize = Math.max(64, Math.round(n * 0.001));
  const seen = new Uint8Array(n);
  const stack = new Int32Array(n);
  const holes: number[][] = [];
  for (let s = 0; s < n; s++) {
    if (state[s] || seen[s] || dist[s] > tol) continue;
    const members: number[] = [];
    let [x0, x1, y0, y1] = [w, 0, h, 0];
    let top = 0;
    stack[top++] = s;
    seen[s] = 1;
    while (top) {
      const i = stack[--top];
      members.push(i);
      const x = i % w;
      const y = (i - x) / w;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
        if (j >= 0 && j < n && !state[j] && !seen[j] && kind(j, i)) {
          seen[j] = 1;
          stack[top++] = j;
        }
      }
    }
    if (members.length < minSize) continue;
    let outside = 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (state[y * w + x] === 1) outside++;
    if (outside / ((x1 - x0 + 1) * (y1 - y0 + 1)) >= 0.05) holes.push(members);
  }
  return holes;
}

/** Islands of "product" smaller than a speck of dust become background. */
function clearSpecks(state: Uint8Array, w: number, h: number) {
  const n = w * h;
  const minSize = Math.max(24, Math.round(n * 0.0002));
  const seen = new Uint8Array(n);
  const stack = new Int32Array(n);
  const members: number[] = [];
  const push = (j: number, top: number) => {
    if (state[j] || seen[j]) return top;
    seen[j] = 1;
    stack[top] = j;
    return top + 1;
  };
  for (let s = 0; s < n; s++) {
    if (state[s] || seen[s]) continue;
    let top = 0;
    stack[top++] = s;
    seen[s] = 1;
    members.length = 0;
    while (top) {
      const i = stack[--top];
      if (members.length <= minSize) members.push(i);
      const x = i % w;
      // (no per-pixel arrays: this runs millions of times)
      if (x > 0) top = push(i - 1, top);
      if (x < w - 1) top = push(i + 1, top);
      if (i >= w) top = push(i - w, top);
      if (i < n - w) top = push(i + w, top);
    }
    if (members.length < minSize) for (const i of members) state[i] = 1;
  }
}

/**
 * Cut-outs that show the same product more than once side by side (front
 * and back, as mockup generators export them): the x-ranges of each view,
 * split at the clear gaps between them. One range when there's nothing to
 * split.
 */
export function sideBySideViews(px: Uint8Array, w: number, h: number) {
  const minCol = Math.max(3, h * 0.005);
  const solid: boolean[] = [];
  for (let x = 0; x < w; x++) {
    let n = 0;
    for (let y = 0; y < h && n < minCol; y++) if (px[(y * w + x) * 4 + 3] > 16) n++;
    solid.push(n >= minCol);
  }
  const runs: { from: number; to: number }[] = [];
  for (let x = 0; x < w; x++) {
    if (!solid[x]) continue;
    const last = runs[runs.length - 1];
    // A gap narrower than 2% of the photo is part of the same view (a strap, a shadow)
    if (last && x - last.to <= Math.max(4, w * 0.02)) last.to = x;
    else runs.push({ from: x, to: x });
  }
  const widest = Math.max(0, ...runs.map((r) => r.to - r.from));
  // Specks and loose bits next to a view aren't views of their own
  const views = runs.filter((r) => r.to - r.from >= widest * 0.4);
  if (views.length < 2 || views.length > 4) return [{ left: 0, width: w }];
  return views.map((r, i) => {
    // Each view gets the clear space halfway to its neighbours
    const left = i === 0 ? 0 : Math.round((views[i - 1].to + r.from) / 2);
    const right = i === views.length - 1 ? w : Math.round((r.to + views[i + 1].from) / 2);
    return { left, width: right - left };
  });
}

/**
 * The product's bounding box plus a little breathing room, or null if it
 * already fills the photo. Rows and columns with only a few stray pixels
 * don't count.
 */
export function productBox(px: Uint8Array, w: number, h: number) {
  const cols = new Uint32Array(w);
  const rows = new Uint32Array(h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] > 16) {
        cols[x]++;
        rows[y]++;
      }
    }
  }
  const minCol = Math.max(3, h * 0.005);
  const minRow = Math.max(3, w * 0.005);
  let left = 0;
  let right = w - 1;
  let top = 0;
  let bottom = h - 1;
  while (left < w && cols[left] < minCol) left++;
  while (right > left && cols[right] < minCol) right--;
  while (top < h && rows[top] < minRow) top++;
  while (bottom > top && rows[bottom] < minRow) bottom--;
  if (left >= right || top >= bottom) return null;
  const pad = Math.round(Math.max(right - left, bottom - top) * 0.02);
  left = Math.max(0, left - pad);
  top = Math.max(0, top - pad);
  right = Math.min(w - 1, right + pad);
  bottom = Math.min(h - 1, bottom + pad);
  if (left === 0 && top === 0 && right === w - 1 && bottom === h - 1) return null;
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}
