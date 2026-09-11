---
name: create-html-notebook
description: "Generate a static, single-file-or-few-file HTML/CSS/JS personal and academic writing notebook artifact. Use when the user asks to build, scaffold, or create a writing notebook, research notebook, academic notebook, digital notebook, or a Notion-style blocks editor as a plain static site with no frameworks. Produces an elegant default-styled notebook that supports two data modes (fixed-section Notebook mode and freeform nestable Blocks mode), file-based JSON/Markdown storage, localStorage caching, and a git-friendly archival folder layout."
license: MIT
metadata:
  version: '1.0'
  author: Xolotzin
---

# Create HTML Notebook

Generate a static, framework-free HTML/CSS/JS writing notebook that looks elegant
even with no content and is structured for git versioning and folder export.

## When to Use This Skill

Use when the user asks to create, build, scaffold, or generate any of these:

- A personal or academic writing notebook as a static website
- A research notebook, lab notebook, or zettelkasten-style static page
- A Notion-style blocks editor (typed, nestable blocks) with no backend
- A single-file or few-file HTML writing surface with rich-text editing
- A git-friendly, exportable-as-folder notebook project

Do NOT use for full web apps requiring a database, auth, sync, collaboration,
multi-document switching, or a JS build pipeline. Those are explicitly deferred
past v1. Route those to the website-building skill instead.

## Non-Negotiable Requirements (v1)

These constraints must hold for every generated notebook:

1. **No build tools or frameworks.** Plain HTML, CSS, and vanilla JS only. No
   React/Vue/Svelte, no bundlers, no npm install step. A browser opens
   `index.html` and it works.
2. **Two selectable data modes**, each with its own renderer:
   - **Notebook mode** — fixed sections: `Body`, `References`, `Tables`,
     `Figures`, `Appendices`, mapped to JSON keys. Structured, academic layout.
   - **Blocks mode** — freeform typed blocks with `id` / `type` / `content` /
     `parent_id`, nestable to **infinite depth** via recursive parent linkage
     (Notion-style). Depth is bounded only by readability; the renderer recurses.
3. **One shell, two render paths.** A single page shell holds the loaded project
   state object and the mode toggle. The toggle selects which renderer runs
   against the current data; it does not convert data between modes (see
   `references/architecture.md`).
4. **File-based storage, no database/backend.** Data lives in JSON and Markdown
   files in an archival folder hierarchy (see `references/file-layout.md`).
5. **Standalone reference files.** Each reference/entry is its own file so git
   tracks it individually and the whole project exports as a folder/zip.
6. **localStorage as a cache only.** Edits cache to localStorage to guard against
   tab loss. The file on disk is the source of truth. Export/download updates the
   files; localStorage never silently overwrites a saved file.
7. **Visual baseline by default.** A banner/cover header, one serif + one sans
   Google Font pairing, otherwise plain and readable content areas.
8. **Sidebar/nav layout** via CSS grid or flexbox.
9. **contenteditable divs** for rich text unless a stronger reason emerges.

### Important: Browser file-write limitation

Browser JavaScript **cannot silently write standalone files back to disk.**
"File-based storage" in this static notebook therefore means:

- **Load/import** project files into the page (File input, drag-drop, or fetch of
  a bundled `data/notebook.json`).
- **Export/download** updated files: JSON and Markdown always work; "Export Bundle"
  downloads the shell files + updated `data/notebook.json` as individual files when
  served over http. Under `file://`, browser security blocks reading sibling
  files, so use the project folder itself as your bundle and re-export
  `data/notebook.json`. A true one-click zip is deferred past v1.
- localStorage caches edits **between** imports/exports so nothing is lost in a
  tab, but it is not persistence.

State this clearly to the user when delivering the notebook, and document it in the
generated project's `README.md`.

## The Starter Template (in `assets/`)

This skill bundles a working starter template. **Copy it, then adapt** rather than
writing from scratch each time — this keeps generated notebooks consistent.

```
assets/
├── index.html              # the one shell + mode toggle
├── styles.css              # Ink & Paper theme (Newsreader + DM Sans)
├── app.js                  # state, dual renderer, localStorage, export
├── README.md               # usage for the GENERATED notebook project
├── data/
│   └── notebook.json       # sample project state (both modes seeded)
├── entries/
│   └── 2026/07/example-entry.md
└── references/
    └── example-source.json
```

The template is functional but modest: renders both modes, toggles renderers,
edits contenteditable areas, caches to localStorage, and exports JSON + Markdown +
a downloadable project bundle. It intentionally omits drag/drop reordering,
auto file write-back, APA/PDF export, and multi-document switching.

## Build Workflow

1. **Clarify intent.** Confirm whether the user wants the default theme or a
   palette/font swap. If they give no preference, ship the defaults below.
2. **Copy the template.** Create the new notebook project directory and copy
   every file from `assets/` into it, preserving the folder structure.
3. **Adapt identity.** Edit the banner title/subtitle and metadata in
   `index.html` and the seeded `data/notebook.json`.
4. **Apply theme overrides** (only if requested): edit CSS custom properties at
   the top of `styles.css`. Defaults below.
5. **Wire data.** Replace seeded content in `data/notebook.json` with the user's
   real notebook or blocks. Keep both `state.notebook` and `state.blocks` keys.
6. **Test in a browser.** Open `index.html` directly — both modes must render,
   the toggle must switch renderers, edits must cache, and export must download.
7. **Deploy or deliver.** Use `deploy_website`/`publish_website` if the user wants
   it hosted; otherwise deliver as a zipped folder the user unzips and opens
   locally. When delivering a folder, remind them to open `index.html` and that
   edits save to localStorage until they export.

### Default theme — Ink & Paper

- Background: warm white `#fbfaf7`; text: near-black `#1a1a1a`
- Single muted accent: a desaturated indigo `#4a4e69` for links, toggles, focus
- Serif (headings, body prose): **Newsreader**; Sans (UI, nav, meta): **DM Sans**
- Both loaded from Google Fonts via `<link>` in `index.html`

## Validation Checklist (run before delivering)

- [ ] No frameworks/build tools — opens by double-clicking `index.html`
- [ ] Both Notebook and Blocks modes render from `data/notebook.json`
- [ ] Toggle switches the active renderer without page reload
- [ ] Blocks render recursively to any depth via `parent_id` (no hard cap)
- [ ] Edits persist to localStorage; a "unsaved changes" indicator shows
- [ ] Export produces downloadable JSON + Markdown + project bundle
- [ ] Banner, fonts, and content areas look clean with empty/seed data
- [ ] `README.md` explains the localStorage-caches, file-is-truth model
- [ ] Folder structure matches `references/file-layout.md`
- [ ] Citations/references load from standalone files in `references/`

## References

Read these when you need the detail behind a decision in SKILL.md:

- `references/data-model.md` — JSON shapes for `state.notebook` and
  `state.blocks`, block types, and the shared `state` object.
- `references/architecture.md` — the one-shell / two-renderers design and the
  data-boundary rule (the toggle does not convert between modes).
- `references/file-layout.md` — the archival `entries/YYYY/MM/` +
  `references/<slug>.json` + `assets/` folder convention and naming rules.

## Deferred to Later Versions (skip for v1)

Multi-document switching, APA/PDF export, collaboration/sync, framework migration,
drag-and-drop block reordering, and automatic file write-back. Infinite nesting
is now supported in v1.
