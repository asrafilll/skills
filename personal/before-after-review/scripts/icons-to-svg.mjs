#!/usr/bin/env node
/**
 * Export icons from the project's own icon library as inline SVG, for HTML mocks.
 *
 * Usage:
 *   node icons-to-svg.mjs <project-dir> <package> <ExportName>... > icons.json
 *   node icons-to-svg.mjs . @hugeicons/core-free-icons Location01Icon UserIcon
 *   node icons-to-svg.mjs . lucide-react MapPin User
 *
 * Output (stdout): { "<ExportName>": "<svg ...>...</svg>", ... }
 * Each SVG uses stroke="currentColor", so set the colour with CSS `color`, and the
 * size with width/height on a wrapper. Names that aren't found are listed on
 * stderr and left out; exit 1 if none were found.
 *
 * Handles two shapes of export:
 *  - icon data arrays, [[tag, attrs], ...] (Hugeicons core packages);
 *  - React components (lucide-react, @heroicons/react, @tabler/icons-react, ...),
 *    rendered with the project's own react-dom/server.
 * Resolves packages from <project-dir>, so nothing is installed.
 */
import fs from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { pathToFileURL } from "node:url"

const [projectDir, pkg, ...names] = process.argv.slice(2)
if (!projectDir || !pkg || names.length === 0) {
  console.error("usage: node icons-to-svg.mjs <project-dir> <package> <ExportName>...")
  process.exit(2)
}
const require = createRequire(path.resolve(projectDir, "package.json"))
// Prefer the package's ES module entry; fall back to plain require.
const esmEntry = (id) => {
  let dir = path.dirname(require.resolve(id))
  while (!fs.existsSync(path.join(dir, "package.json"))) dir = path.dirname(dir)
  const meta = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"))
  const exp = meta.exports?.["."] ?? meta.exports
  const pick = (e) => (typeof e === "string" ? e : e && (pick(e.import) || pick(e.default)))
  const rel = pick(exp) || meta.module
  return rel ? path.join(dir, rel) : null
}
const load = async (id) => {
  try {
    const entry = esmEntry(id)
    if (entry) return await import(pathToFileURL(entry).href)
  } catch {}
  return require(id)
}

const lib = await load(pkg)
const kebab = (k) => k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())
const attrs = (a) => Object.entries(a).filter(([k]) => k !== "key").map(([k, v]) => `${kebab(k)}="${v}"`).join(" ")

let react, server
const out = {}
const missing = []
for (const name of names) {
  const icon = lib[name] ?? lib.default?.[name]
  if (!icon) { missing.push(name); continue }
  if (Array.isArray(icon)) {
    const body = icon.map(([tag, a]) => `<${tag} ${attrs(a)}/>`).join("")
    out[name] = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`
    continue
  }
  react ??= require("react")
  server ??= require("react-dom/server")
  const markup = server.renderToStaticMarkup(react.createElement(icon, { "aria-hidden": true }))
  out[name] = markup.replace(/\s(width|height)="[^"]*"/g, "")
}
if (missing.length) console.error("not found:", missing.join(", "))
process.stdout.write(JSON.stringify(out, null, 1) + "\n")
process.exit(Object.keys(out).length ? 0 : 1)
