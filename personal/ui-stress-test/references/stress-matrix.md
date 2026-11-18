# Stress matrix (L5 Element, L6 States)

Used in Step 3, after the job walks. Flow checks live in Step 2 and flow-patterns.md, not here. Run every row that applies, on the screens of the jobs in the brief, at each role's device size. For each row, record: pass, break (with screenshot), or n/a.

## Contents
1. Content extremes
2. States
3. Viewports and zoom
4. Input and interaction
5. Accessibility
6. Localisation
7. Layout patterns at every width

## 1. Content extremes
Method adapted from Emil Kowalski's `break-ui` skill (MIT). If `break-ui` is installed, load its `CATALOG.md` for the full list of worst-case values per field type.

**Rules for worst-case values:**
- **Realistic or schema-backed, never random.** Each value is either something a real user could produce, or the actual limit from the validation schema, database column, API type or form `maxLength`. `aaaa…` strings and 5,000-character names prove nothing, and the team will rightly ignore them. No limit found anywhere is a finding of its own: "unbounded".
- **Map the fields first.** For each screen in a job, list every value it renders, with its source and limit. Include the ones people forget: counts in headers, relative timestamps, badge and status text, button labels that come from data, tooltips, avatars, and the list length itself. Where the frontend limit and the backend limit disagree, note it: longer data will arrive through an import or the API.

  | Field | Source | Type | Limit | Optional? |
  |---|---|---|---|---|
  | `name` | `member.name` | string | 255 (`schema.ts:14`) | no |

- **Change the data, not the component.** Put the worst case in through the same place the demo data comes in (fixture, mock, props, API stub, a seeded staging record). Never hand-edit markup or CSS to cause a break; that tests your edit.
- **Spread failures across the visible rows.** Row 1 has the long name, row 2 the long email, row 3 the one-letter name, as real data does.
- **Check three counts on purpose:** **Empty** (zero items, no results), **One** (one item, and every count at exactly 1, which catches "1 members"), and **Huge** (the realistic upper bound, 1,000+ rows if the list isn't paginated).

Take the real extremes from the data (`SELECT max(length(name))`, the longest seed rows, production samples) before inventing any.

| Case | Try | Look for |
|---|---|---|
| Long single word | The longest word in the product's language (German compounds, Indonesian `Pertanggungjawabannya`), a long email, a URL, an unbroken SKU | Overflow out of the container, horizontal scroll |
| Long multi-word | Names of 60+ characters, titles of 120+ characters, a long legal company name (for example "PT Bank Rakyat Indonesia (Persero) Tbk") | Wrapping that breaks alignment, widows, no truncation, truncation that hides meaning with no tooltip |
| Big numbers | 3 to 4 digit counts, the largest real amount in the product's currency (for example `Rp 1.250.000.000.000`), negative values, 0 | Badge overflow, misaligned columns (use tabular numbers), wrong locale formatting |
| Short or missing | 1 character, an empty optional field, null, a missing avatar or image | Collapsed layout, the string "undefined" or "null", broken image icon |
| Many items | 0, 1, 2, 50, 500+ rows; 20+ tags or chips; 10+ tabs | Missing empty state, missing pagination or virtualisation, chips wrapping badly, tab overflow |
| Media | A portrait image in a landscape slot, a tiny or huge image, a slow image | Bad focal crop, layout shift (CLS), no placeholder |
| Long messages | A long toast, modal body or validation error | Clipped text, buttons pushed off screen |
| Derived text | A name of one letter ("Jo"), a name with a suffix ("… Montgomery III"), an emoji-first name; counts of exactly 0 and 1 | Wrong initials, "1 members" or "0 member", an orphaned `—` where an optional field was empty |
| Raw values | Large and fractional numbers, null, unescaped markup (`<b>`, `&amp;`, `**text**`) in user text | `1284` with no grouping, `1,284.000000001`, `NaN`, `undefined`, markup shown raw or rendered |

### Failure signatures (what you see → usual cause → usual fix)

| What you see | Usual cause | Usual fix |
|---|---|---|
| Avatar or icon squashed into an oval | A flex child is shrinking | `flex-shrink: 0` on fixed-size boxes |
| Text runs out of its box instead of wrapping | Flex or grid child with `min-width: auto` | `min-width: 0` (in grid, `minmax(0, 1fr)`) |
| An email or URL runs past the edge | The string has no break opportunities | `overflow-wrap: anywhere` |
| A trailing action (menu, button) is pushed off-screen | The middle content took all the space | `min-width: 0` on the middle, `flex-shrink: 0` on the action |
| A badge wraps onto two lines | The badge is allowed to shrink | `white-space: nowrap; flex-shrink: 0`, and decide what gives way instead |
| Truncated text you can't read in full | Only `text-overflow: ellipsis` | A tooltip or `title`, and the full value in a detail view |
| Items that look identical after truncation | Truncated at the end, but they differ at the end (files, paths, emails on one domain) | Truncate in the middle |
| Numbers jitter or columns don't line up | Proportional figures | `font-variant-numeric: tabular-nums` |
| Tall scripts or diacritics clipped | Tight `line-height` with `overflow: hidden` | Looser line height; don't clip text boxes |

**Truncate, wrap or clamp, decided per field:** wrap what the user needs in full to identify something (names, titles); truncate secondary metadata at the end, with a way to see the full value; truncate in the middle when items differ at the end; clamp multi-line previews in cards; **never truncate** numbers, amounts, dates, or anything the user compares.

## 2. States
Check every one of these on every data view and every action:
- Empty (first use versus no results from a filter, which need different copy and a different call to action)
- Loading (skeleton versus spinner, layout shift when data lands, very slow responses over 3 seconds)
- Partial (some items failed to load)
- Error (network, 500, 403, 404, validation): is there a clear message, a way out and a retry?
- Offline and reconnect
- Success (toast, redirect, or both)
- Disabled (is there a reason, and is it discoverable?)
- Permission variants (viewer, editor, admin) and what each role sees
- Stale data and concurrent edits (another user changed it)
- First run versus power user (a filled account)

## 3. Viewports and zoom
Use widths of 320, 375, 768, 1024, 1280, 1440 and 1920 pixels, plus browser zoom at 200% and 400% (WCAG reflow), and landscape phone.
Look for: horizontal scroll, sticky elements covering content, tables with no mobile strategy, modals taller than the viewport, touch targets that are too small, a hover-only action with no touch equivalent.

## 4. Input and interaction
- Keyboard only: tab order, visible focus, Esc closes overlays, Enter submits, focus trap in modals, focus returns to the trigger on close
- Double-click and double-submit on save or pay buttons (duplicate records?)
- Paste a 5,000-character string, emoji 👩🏽‍💻, RTL text, leading and trailing spaces, HTML `<b>x</b>`
- Invalid formats: date, phone, NPWP, currency with `.` versus `,`
- Back button mid-flow, refresh mid-form (is the data lost?), leaving with unsaved changes (is there a warning?)
- Slow network: is the button disabled with a pending state, and does a second click do anything?
- Destructive action: is there a confirm modal, and can it be undone?
- Search: no results, one character, a typo, a very long query

## 5. Accessibility (WCAG 2.2 AA)
- Text contrast of 4.5:1, or 3:1 for large text and UI components. Check placeholder and disabled text too.
- Target size of at least 24×24 px (2.5.8). 44×44 is recommended on touch.
- Color is never the only signal (status chips need text or an icon).
- Every input has a label (a placeholder is not a label). Errors are tied to their field and announced.
- Headings follow a logical order. Landmarks exist. Images have alt text. Icon buttons have names.
- Focus is not hidden behind sticky headers (2.4.11).
- Motion respects `prefers-reduced-motion`.
- Running app: use `scripts/dom-audit.js` and `scripts/axe.js` (see SKILL.md Step 3) and cite the rule ids.

## 6. Localisation
Test in **the product's locale(s)**. Examples below use Indonesian; swap in the product's own.
- Translated copy often runs 20 to 35% longer than English (German and Indonesian are typical). Swap in the longest real translation.
- Mixed languages on one screen; right-to-left scripts if they're supported.
- The locale's date format (`DD/MM/YYYY` versus ISO), currency (`Rp 1.250.000`, `1.250,00 €`), decimal and grouping separators.
- The locale's name formats: single names (common in Indonesia), very long full names, family name first, titles and suffixes (Dr., H., S.Kom.).

## 7. Layout patterns at every width

Run on **every page each role can open**, at phone, tablet, 1024 and desktop widths, with [scripts/layout-sweep.js](../scripts/layout-sweep.js) and a look at each contact sheet (SKILL.md Step 3). These pass every per-element check (tap size, contrast, overflow) and still make a page hard to read, so look for them by eye too. Each one is a Fix when the cut or squeezed text is something the role needs (a name, an amount, a date); otherwise an Improve.

| Pattern | What you see | Script key | Usual fix |
|---|---|---|---|
| Text squeezed beside a badge, price or button | A title or detail wraps to 2 to 4 lines in half the row because a badge, price column or button sits on its right ("Maya's plan / 3 sessions left … [Renew]") | `squeezed` | Move the button or price to its own row under the text. A name and its badge can share the top row (space between) when the details go below. |
| Text cut beside icons or a badge | A name or date ends in "…" while two icon buttons or a status pill take the rest of the row | `squeezed` (`cut: true`) | Let the name wrap; move the pill or the secondary detail under it. Never cut a date or amount. |
| Several facts in one "·" line | "Pool · coaches · class type" or "ref · parent · type · age" wraps over 2+ lines, breaking mid-phrase | `denseMeta` | One fact per row, each with the product's icon; drop the facts the detail page already shows (class type, capacity). |
| Cut text inside a link or button | The ellipsis sits inside a link or button, so tapping opens something else and the full text is never reachable | `cutUnopenable` | Wrap instead of cutting, or shorten the label (drop the year); a tap-to-reveal can't work there. |
| Illustration sharing a row with content | A mascot or illustration keeps the right third of a card, so the content beside it wraps into a narrow column, or the picture covers text | `squeezed` (`beside: img`), `imageOverText` | Put the illustration beside the heading only; the content below uses the full width. |
| List that never ends | A page or section is more than 3 phone screens of repeated rows (every session of the month, every raport in full) | `longPage.tallestList` | Show the next few or the latest few as short cards that open a detail, with "Lihat semua"; group by day or paginate. |
| Cut cells in a table | At tablet or desktop, a table column cuts names, package names or the line under a reference ("Kevin Gunawan, Kezia Gu…") while other columns have room | `cut` | Let the name and title columns wrap (2 lines), give fixed-content columns (amounts, status) their natural width, or drop a column below a breakpoint and show it under the name. |
| Desktop layout too early | At 768 to 1024 the desktop layout (sidebar plus table, pickers side by side) appears but its columns or buttons cut their text | `cut`, `cutUnopenable`, `squeezed` | Move the breakpoint up (keep the stacked layout until there's room), or stack the controls at that width. |
| Two controls squeezing each other | Two buttons or selects side by side, each cutting its label ("Bulan ini · Nov 20…") | `cutUnopenable`, `squeezed` | Shorter labels, or stack them on phones. |

Not a finding: a page description wrapping beside the page's main button in the header; that wrap is by design. Report a pattern with the widths where it shows.

Short demo data hides most of these. If every name in the seed data is short, add one test record per list with a long realistic value (prefix `uist-<date>-`, revert at the end), or the truncation checks find nothing.

