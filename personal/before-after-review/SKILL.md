---
name: before-after-review
description: 'Turn UI findings into a visual before → after review the user can scan in seconds, drawn on a connected design canvas or as a self-contained HTML page. Use after a UI audit or stress test ("show me the changes", "draw the fixes", "visual review", "before and after"), or when given a findings report and screenshots. Unlike audit skills it finds nothing new; unlike redesign skills it mocks only what each finding changes.'
---

# Before → after review

Input: a findings report (the `.ui-stress/*.md` format from `ui-stress-test`, or any list of findings with IDs) and its evidence screenshots. Output: one visual row per finding, shown in chat, and the user's decision on each row (apply, later, skip) written back into the report. You add no new findings; if you notice one, list it at the end as "seen while drawing".

## Step 0: Read the input and pick the medium

1. Read the report. Select **every flow change, every P0 and P1 Fix, and the top 3 Improve items**, unless the user names others. Keep their IDs (FC1, F1, I1).
2. Load the rules the report lists under "Rules applied" (project rules first) so the mocks follow them.
3. Pick the medium, checking each before relying on it:
   - The user named one → use it.
   - A **design-tool MCP** is connected and has a file **for this project** open (check its state tool) → draw on the canvas. A file from another project doesn't count; never draw into it.
   - Otherwise → the **standalone HTML page** (the default): built from [assets/review-template.html](assets/review-template.html), sent as one `index.standalone.html` file.

## Step 1: Draw each row

Same layout in both media. One row per finding, in report order (flow changes, then Fix, then Improve):

```
[ ID · severity · layer · title ]
[ BEFORE ]  →  [ AFTER ]  [ notes: what changed · steps N → M · standard ]
```

- **BEFORE:** the evidence screenshot, a copy of the existing design frame, or the given image. Mark the problem with a red outline and a numbered callout.
- **AFTER:** a mock of the change at the same device size. Draw only what changes, plus enough context to recognise the screen. Mark the change with a green outline. The mock must itself pass the standard the finding cites: a contrast fix uses colours that pass, a target-size fix is drawn at the passing size, a copy fix fits its box.
- **Callouts:** the outline goes around the element without covering its text. The number badge sits on the outline's outer corner. The words for each number go in a numbered legend **under** the frame, never as text laid over the screenshot, where they collide with the UI underneath.
- **Flow changes:** draw the path, not one screen. A strip of small frames for the real path (N steps) above a strip for the proposed path (M steps), with both step counts in large type.
- Use the product's real data, its component look, and the rules from Step 0. Include the long-text or empty case when the finding is about states.
- For copy in a non-English locale, run it through a writing-style skill for that language if one exists.

**On a design canvas:**
- Read the canvas state right before placing anything; other agents or people may be drawing.
- Create a new page or section named `Before-after YYYY-MM-DD <scope>`. Never edit, move or cover existing frames. When a finding is about an existing frame, put the AFTER to the right of it in the same row.
- Export each row to PNG under `.ui-stress/<date>/visual/`.
- Before the first write into a repo, check `git check-ignore -q .ui-stress`; if it isn't ignored, add `.ui-stress/` to `.git/info/exclude`, not to `.gitignore`.

**As HTML (the default):**
- Copy `assets/review-template.html` to `.ui-stress/<date>/index.html`. Fill in the header and duplicate the example cards (they show a flow-change card and a fix card); delete the examples you didn't use. The three counts in the header are computed from the cards; leave them.
- **BEFORE is a close-up**, not a whole page: crop the screenshot at the **full device width** (390px for a phone, at 2x), only the rows around the problem, so it shows at the same scale as the AFTER mock. A crop narrower than the device gets zoomed up and the two sides stop being comparable. Include neighbours that cause the problem (the second button that squeezes the first). When the whole crop is the problem, outline it with `<div class="mark whole" data-n="1">`, which sits outside the image, so nothing covers its text.
- **AFTER is an HTML mock in the product's look**, drawn at the same device width inside `<div class="device mock">`:
  - Copy the project's real token values (colours, font, radius) from its CSS or theme into the `.mock` block, and build with the `m-*` classes. Match the real component's font sizes and weights from its code, not by eye.
  - Embed the product font: base64 its `.woff2` (for example from `node_modules/@fontsource*/`) into an `@font-face` in the page's `<style>`. Without it the mock falls back to a system font and looks wrong next to the screenshot.
  - Icons come from the project's own icon library as inline SVG: `node <skill-dir>/scripts/icons-to-svg.mjs <project-dir> <package> Name1 Name2 > icons.json` (handles Hugeicons data and React icon packages such as lucide-react). Use the same icon the real component uses. **Never emoji or text glyphs** (📍 ✏️ ⋯ ›) in a mock; `bundle.py` fails on emoji. With no icon library, use a mascot or image asset from the repo, or leave the icon out.
  - Wrap each changed element in `.m-hl` with its `.mark` inside; the outline sits 9px out. Two outlines must not touch: add space between the elements rather than shrinking the outlines.
  - Keep the layout the user would recognise: when a row had a name and a badge side by side, keep them on one row (`m-row`, space between) unless moving the badge is the fix itself.
- **Group by pattern** when several findings share one (for example "text squeezed beside a badge", "names cut off"): an `<h2>` per pattern with one line saying which earlier finding or feedback it repeats, then its cards.
- Put the `file:line` to change in each card's notes.
- Every card keeps its decision block, with the radio `name` set to `decide-<ID>`. The bar at the bottom turns the choices into one line (`Apply: FC1, F1 · Later: F3 · Skip: I2`).
- Inline CSS, images by relative path, no CDN, no build step.
- Run `python3 <skill-dir>/scripts/bundle.py .ui-stress/<date>/index.html` (`<skill-dir>` is this file's folder, as an absolute path). It must print `PASS`: it fails on a missing image, leftover template text, a card without an ID or decision block, or a callout number with no legend line. On `PASS` it writes `index.standalone.html` with the images inlined; that single file is the one to send to someone else.

## Step 2: Check, then show

1. Look at every exported PNG or rendered card: nothing clipped, each callout sits on the right element, no badge, outline or caption covers text in the screenshot, no two outlines touch, the IDs match the report, long text fits. If the preview caps the page height, hide the cards already checked with a temporary style and look at the rest; check every card.
2. Fix what's wrong and look again.
3. In chat, **lead with the visuals**:
   - Embed each row's PNG by absolute path.
   - If the environment can render HTML inline (an HTML preview tool), render `index.html` too. Otherwise capture each card to PNG with whatever browser automation is available and embed those.
4. Under the visuals: one line per row (ID and what changes), then the path to `index.standalone.html` (the file to open or send; name it first), `index.html`, or the canvas section, and the PNG folder.
5. Ask for a decision on each row in one message: the line from the page's **Copy decisions** button, or typed as `Apply: … · Later: … · Skip: …`. Don't apply anything before the answer.
6. When the answer comes, append it to the source report under a `## Decisions` heading (date, then the three lists, with the user's reason for a skip if they gave one). Audit skills read that section on the next run, so a skipped finding isn't raised again as new. Then offer to apply the **Apply** list.

## Failure modes

- **No screenshots in the report:** capture the BEFORE from the live app or design file if you can reach it; otherwise draw a labelled wireframe of the current state and mark it `(reconstructed)`.
- **The design tool errors out:** retry once, then use its command-line or headless mode if it has one, then fall back to HTML. Say which you used.
- **The report has more than 15 selected findings:** draw the flow changes and P0 items first, show them, and ask before drawing the rest.
- **The finding is about code only** (for example a server-side rule with no visible change): show the screen where the user meets the rule, before and after, and note the code change in the notes column.
- **Personal data in screenshots:** blur or replace it before embedding.
