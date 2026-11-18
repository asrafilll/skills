/*
 * layout-sweep.js: layout checks for the current page, the patterns dom-audit.js
 * doesn't cover. Run it at every width the product supports (390x844 phone,
 * 768x1024 tablet, 1024x768 small laptop or landscape tablet, 1440x900 desktop),
 * after the page has loaded its data. Tablet and small-laptop widths are where a
 * desktop layout (sidebar, table, side-by-side pickers) first kicks in with too
 * little room, so don't skip them.
 *
 * Inject as an expression (Playwright: page.evaluate(source); DevTools or an in-app
 * preview: evaluate the file's contents). Returns a JSON-serialisable object:
 *
 * {
 *   page:     { url, viewport: {w, h}, horizontalScroll, height },
 *   summary:  { squeezed, denseMeta, cut, cutUnopenable, imageOverText, longPage },
 *   squeezed: [{ text, cut, lines, textW, rowW, beside, sel }],
 *        // text that wraps to 2+ lines, or is cut with an ellipsis (cut: true), in
 *        // under 65% of its row because a badge, price, button, icon or image sits
 *        // to its right ("Maya's plan / 3 sessions left", "Coach Sam · S…")
 *   denseMeta: [{ text, facts, lines, sel }],
 *        // 3+ facts joined by " · " in one element that wraps to 2+ lines
 *        // ("Main pool · Sam, Lee · Group, Private")
 *   cut:      [{ text, sel }],
 *        // text cut with an ellipsis (truncate, line-clamp) that the reader can't
 *        // see in full here: names, titles, amounts and dates in table cells and lists
 *   cutUnopenable: [{ text, host, sel }],
 *        // text cut with an ellipsis (truncate, line-clamp, text-overflow) inside a
 *        // link, button or label, where tapping does something else instead of
 *        // showing the full text
 *   imageOverText: [{ text, img, sel }],
 *        // a decorative image (mascot, illustration) drawn over text, or text forced
 *        // into a narrow column beside one
 *   longPage: { screens, tallestList: { sel, items, screens } | null }
 *        // page height in phone screens; a list taller than 3 screens is a
 *        // "list that never ends" candidate (paginate, group or show the next few)
 * }
 *
 * Each list holds at most 25 items. These are candidates: look at each one in the
 * screenshot before reporting it.
 */
(() => {
  const MAX = 25;
  const W = innerWidth, H = innerHeight;
  const vis = (e) => {
    const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity !== 0;
  };
  const txt = (e) => (e.innerText || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
  const short = (s, n = 90) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
  const sel = (e) => {
    const p = []; let n = e;
    for (let i = 0; i < 4 && n && n !== document.body; i++) {
      p.unshift(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (n.classList[0] ? '.' + n.classList[0] : ''));
      n = n.parentElement;
    }
    return p.join(' > ');
  };
  const inChrome = (e) => e.closest('nav, [role="tablist"], [role="navigation"], header[role="banner"], [data-slot="sidebar"]');
  // Rendered text lines: distinct line boxes of the element's own text, so a tall
  // button or padded box doesn't count as a wrap.
  const lines = (e) => {
    const tops = [];
    const walker = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    for (let n; (n = walker.nextNode()); ) {
      if (!n.textContent.trim()) continue;
      const range = document.createRange(); range.selectNodeContents(n);
      for (const r of range.getClientRects()) {
        if (r.width < 1 || r.height < 1) continue;
        if (!tops.some((t) => Math.abs(t - r.top) < r.height / 2)) tops.push(r.top);
      }
    }
    return tops.length;
  };
  // Cut for real: a one-line ellipsis that overflows its width, or a line clamp
  // that hides lines. Tight line-height on big headings isn't a cut.
  const isCutEl = (e) => {
    const s = getComputedStyle(e);
    const clamp = s.webkitLineClamp && s.webkitLineClamp !== 'none';
    // A clamp cuts only when the text has more lines than it allows; a clamp class
    // on an element whose display overrides it (flow-root) clamps nothing.
    if (clamp) return lines(e) > parseInt(s.webkitLineClamp, 10);
    if (s.textOverflow !== 'ellipsis' || s.overflowX === 'visible' || e.scrollWidth <= e.clientWidth + 3) return false;
    // Confirm with the laid-out text width: big headings with negative tracking
    // report a scrollWidth larger than the text they actually show.
    const range = document.createRange(); range.selectNodeContents(e);
    const textW = range.getBoundingClientRect().width;
    const pad = parseFloat(s.paddingLeft) + parseFloat(s.paddingRight);
    return textW > e.clientWidth - pad + 3;
  };
  // A text leaf: has text of its own and no block-level children.
  const isLeaf = (e) => {
    if (!e.innerText || !e.innerText.trim()) return false;
    if (e.querySelectorAll('button, a, [role="tab"], input, select').length >= 2) return false;
    for (const c of e.children) {
      const d = getComputedStyle(c).display;
      if (d === 'block' || d === 'flex' || d === 'grid' || d === 'list-item' || d === 'table') return false;
    }
    return true;
  };
  const leaves = [...document.querySelectorAll('body p, body span, body h1, body h2, body h3, body h4, body dd, body dt, body li, body a, body strong, body small, body div')]
    .filter((e) => vis(e) && isLeaf(e) && !inChrome(e));

  // ---------- squeezed: text wrapping beside something on its right ----------
  const squeezed = []; const seenRows = new Set();
  const sideItems = [...document.querySelectorAll('button, a, [role="button"], [class*="badge"], [class*="pill"], [class*="rounded-full"], [data-slot="badge"], svg, img')]
    .filter((e) => vis(e) && !inChrome(e));
  const isCut = isCutEl;
  for (const t of leaves) {
    const text = txt(t);
    const cut = isCut(t);
    if (text.length < 12 || (lines(t) < 2 && !cut)) continue;
    const tr = t.getBoundingClientRect();
    let row = t.parentElement;
    for (let i = 0; i < 5 && row && row.getBoundingClientRect().width < W * 0.6; i++) row = row.parentElement;
    if (!row || row === document.body) continue;
    const rr = row.getBoundingClientRect();
    if (tr.width >= rr.width * 0.65) continue;
    const beside = sideItems.find((b) => {
      if (b.contains(t) || t.contains(b) || !row.contains(b)) return false;
      const br = b.getBoundingClientRect();
      // Close to the text: a crowded row, not a header button far across the page.
      return br.left >= tr.right - 2 && br.left - tr.right <= 64 && br.width >= 20 && br.top < tr.bottom && br.bottom > tr.top;
    });
    if (!beside || seenRows.has(row) || tr.width < 40) continue;
    seenRows.add(row);
    squeezed.push({ text: short(text), cut, lines: lines(t), textW: Math.round(tr.width), rowW: Math.round(rr.width), beside: short(txt(beside) || beside.tagName.toLowerCase(), 40), sel: sel(t) });
  }

  // ---------- denseMeta: 3+ facts in one wrapping line ----------
  const denseMeta = [];
  for (const e of leaves) {
    const text = txt(e);
    const facts = text.split(/\s·\s/).length;
    if (facts < 3 || text.length > 200 || lines(e) < 2) continue;
    if ([...e.querySelectorAll('*')].some((c) => leaves.includes(c) && txt(c).split(/\s·\s/).length >= 3)) continue; // report the innermost
    denseMeta.push({ text: short(text, 110), facts, lines: lines(e), sel: sel(e) });
  }

  // ---------- cut / cutUnopenable: text cut with an ellipsis ----------
  // cut: any cut text the reader may need (names, titles, amounts, dates in table
  // cells and lists). cutUnopenable: the subset inside a link, button or label.
  const cut = [];
  const cutUnopenable = [];
  for (const e of document.querySelectorAll('body *')) {
    if (!vis(e) || inChrome(e)) continue;
    if (!isCutEl(e)) continue;
    const host = e.closest('a, button, [role="button"], [role="link"], label, summary');
    const label = short(txt(e), 80);
    if (!label) continue;
    if (!host) { cut.push({ text: label, sel: sel(e) }); continue; }
    cutUnopenable.push({ text: short(txt(e), 80), host: host.tagName.toLowerCase() + (host.getAttribute('href') ? ' ' + host.getAttribute('href') : ''), sel: sel(e) });
  }

  // ---------- imageOverText: decorative image over or beside text ----------
  const imageOverText = [];
  const decor = [...document.querySelectorAll('img')].filter((i) => {
    if (!vis(i)) return false;
    const r = i.getBoundingClientRect();
    return r.width >= 48 && r.height >= 48 && (i.alt === '' || /mascot|illustr|hero|character/i.test(i.src + i.className));
  });
  for (const img of decor) {
    const ir = img.getBoundingClientRect();
    const core = { l: ir.left + ir.width * 0.15, r: ir.right - ir.width * 0.15, t: ir.top + ir.height * 0.1, b: ir.bottom - ir.height * 0.1 };
    for (const t of leaves) {
      if (t.contains(img)) continue;
      const range = document.createRange(); range.selectNodeContents(t);
      const hit = [...range.getClientRects()].some((r) => Math.min(r.right, core.r) - Math.max(r.left, core.l) > 6 && Math.min(r.bottom, core.b) - Math.max(r.top, core.t) > 4);
      if (hit) { imageOverText.push({ text: short(txt(t), 60), img: img.src.split('/').pop(), sel: sel(t) }); break; }
    }
  }

  // ---------- longPage: page height and the tallest repeated list ----------
  let tallestList = null;
  for (const list of document.querySelectorAll('ul, ol, [role="list"], tbody, div')) {
    if (!vis(list) || list.children.length < 6) continue;
    const kids = [...list.children].filter(vis);
    const tags = new Set(kids.map((k) => k.tagName));
    if (kids.length < 6 || tags.size > 2) continue;
    const h = list.getBoundingClientRect().height;
    if (!tallestList || h > tallestList.h) tallestList = { h, sel: sel(list), items: kids.length };
  }
  const longPage = {
    screens: +(document.documentElement.scrollHeight / H).toFixed(1),
    tallestList: tallestList && tallestList.h > H * 3 ? { sel: tallestList.sel, items: tallestList.items, screens: +(tallestList.h / H).toFixed(1) } : null,
  };

  const cap = (a) => a.slice(0, MAX);
  return {
    page: { url: location.href, viewport: { w: W, h: H }, horizontalScroll: document.documentElement.scrollWidth - W, height: document.documentElement.scrollHeight },
    summary: { squeezed: squeezed.length, denseMeta: denseMeta.length, cut: cut.length, cutUnopenable: cutUnopenable.length, imageOverText: imageOverText.length, longPage: longPage.tallestList ? 1 : 0 },
    squeezed: cap(squeezed), denseMeta: cap(denseMeta), cut: cap(cut), cutUnopenable: cap(cutUnopenable), imageOverText: cap(imageOverText), longPage,
  };
})();
