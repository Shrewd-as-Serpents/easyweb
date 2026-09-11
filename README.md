# HTML Notebook — Scriptorium edition

A static, framework-free personal & academic writing notebook. One shell, two
data modes, file-based storage, localStorage cache — extended with a capture
bar, a Latin status vocabulary, optional author tags, and Mermaid diagrams.

## What's new in this edition

- **Capere (Quick Capture)** — the text field at the top of the sidebar. Type
  and hit Enter; it drops a new root-level block into Blocks mode, status
  `inceptum`. This is the Keep replacement: fast in, sorted later.
- **Status pills** — every entry (Notebook body/appendices, every Block) shows
  a small italic pill: `inceptum` (begun) → `in opere` (in progress) →
  `perfectum` (completed) → `suspensum` (on hold). Click it to cycle.
- **Archivum toggle** — checkbox in the sidebar. `perfectum` root blocks hide
  from the main Blocks view by default (completed, not deleted) and reappear
  when you check it. Nothing is ever lost — it's shelved, not discarded.
- **Optional author tag** — a `+ who` badge next to the status pill. Click to
  set a name (e.g. for a plural system marking who wrote an entry); leave it
  blank forever if you don't need it. Never required.
- **Mermaid blocks** — a new Blocks-mode block type, `mermaid`. Shows a raw
  source textarea and a live-rendered diagram below it (loads Mermaid from a
  CDN on first use — needs an internet connection the first time you render
  one in a session).

## Open it

Double-click `index.html` (or open it in any modern browser). No install, no
server. The seed data loads from `data/notebook.json` automatically; if the
browser blocks local file fetch (some do on `file://`), an embedded copy is used.

## Two modes

- **Notebook** — fixed sections: Body, References, Tables, Figures, Appendices.
  Structured academic layout.
- **Blocks** — freeform typed blocks (`heading`, `paragraph`, `quote`, `callout`,
  `code`, `divider`). Nestable to **any depth** via the `+ sub-block` button on
  each block. The tree is built recursively from `parent_id`.

Use the toggle in the sidebar to switch renderers. The toggle does **not**
convert data between modes — each mode reads its own part of `data/notebook.json`.

## Where your data lives

```
my-notebook/
├── index.html          # the shell
├── styles.css          # Ink & Paper theme
├── app.js              # renderer + cache + export
├── data/notebook.json  # the active project state (both modes)
├── entries/YYYY/MM/    # one Markdown file per dated entry
├── references/         # one JSON file per source
└── assets/             # images, scans, figures
```

Every entry and reference is a standalone file, so `git` tracks each one
individually and the whole folder exports as a zip.

## Editing & saving — read this

Your browser **cannot silently write files to disk.** So:

- Edits cache to **localStorage** (per-browser, per-file-path) to protect against
  accidental tab loss. A small "Unsaved changes" indicator shows when the cache
  is ahead of the file.
- The file on disk (`data/notebook.json`) is the **source of truth.**
- To save your work, use an **Export** button. Export is always a deliberate
  action — nothing writes back automatically.

## Export

- **Export JSON** — downloads the full current state as `<title>-notebook.json`.
  Replace `data/notebook.json` with it to commit your changes.
- **Export Markdown** — serializes Notebook sections + the Blocks tree to a
  single `.md` file.
- **Export Bundle** — downloads `index.html`, `styles.css`, `app.js`, and the
  updated `data/notebook.json` so you have a complete, self-contained copy.
  Works when served over http(s). Under `file://`, browser security blocks
  reading sibling files, so the shell files come back as placeholders — in that
  case your project folder is already the bundle; just re-export
  `data/notebook.json`.

## Import

**Import JSON** loads any exported `<title>-notebook.json` into the page,
replacing the current state (and caching it).

## Re-theming

All colors and fonts are CSS custom properties at the top of `styles.css` under
`:root`. Change `--accent`, `--bg`, `--ink`, or swap the Google Fonts in
`index.html` and the `--serif` / `--sans` variables.

## Versioning in git

Init a repo in this folder:

```sh
git init
git add .
git commit -m "Initial notebook"
```

Because each entry/reference is its own file, history stays granular and
reviewable.

---

v1 deliberately omits:
drag-and-drop reordering, automatic file write-back, multi-document switching,
APA/PDF export, collaboration/sync, and framework migration. Infinite block
nesting **is** supported.
