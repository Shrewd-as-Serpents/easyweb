# Data Model

The notebook loads a single project state object (typically from
`data/notebook.json`). One object, two top-level data keys, two renderers.

## Shared state object

```json
{
  "meta": {
    "title": "Notebook Title",
    "subtitle": "A short description",
    "author": "Xolotzin",
    "created": "2026-07-20",
    "version": "1.0"
  },
  "mode": "notebook",
  "notebook": { ... },
  "blocks": [ ... ]
}
```

- `meta` — identity shown in the banner/header.
- `mode` — `"notebook"` or `"blocks"`. The default renderer on load.
- `notebook` — the structured, fixed-section document (Notebook mode data).
- `blocks` — the freeform typed-block tree (Blocks mode data).

The toggle in the shell only flips which renderer reads the state. It does **not**
transform `notebook` into `blocks` or vice versa — each mode reads its own key.

## Notebook mode — fixed sections

`state.notebook` is an object whose keys are the fixed sections. Each section
holds an array of block entries or raw content. Section keys are stable:

```json
"notebook": {
  "body":        [{ "id": "b1", "type": "paragraph", "content": "..." }],
  "references":  [{ "id": "r1", "slug": "crowley-1999",
                    "file": "references/crowley-1999.json" }],
  "tables":      [{ "id": "t1", "caption": "Tonalpohualli counts",
                    "rows": [["","1","2"],["A","B","C"]] }],
  "figures":     [{ "id": "f1", "caption": "Codex page scan",
                    "src": "assets/figure-1.png" }],
  "appendices":  [{ "id": "a1", "type": "paragraph", "content": "..." }]
}
```

Section order rendered: `body` → `references` → `tables` → `figures` →
`appendices`. Empty sections render nothing (the page still looks clean).

### Reference entries as standalone files

A `references` entry points to a standalone file under `references/<slug>.json`
so git tracks each source individually:

```json
{
  "id": "r1",
  "slug": "crowley-1999",
  "type": "book",
  "title": "The Ionization of Gases by Hot Salts",
  "authors": ["Aleister Crowley"],
  "year": 1899,
  "summary": "Notes on emission spectra from heated salt vapors.",
  "tags": ["spectroscopy", "salts"]
}
```

The renderer fetches each file lazily (or reads from a preloaded bundle) and
links it in the References section.

## Blocks mode — freeform typed blocks

`state.blocks` is a flat array of block records. Nesting is expressed via
`parent_id`, not by embedding children. A block with `parent_id: null` is a
root. Depth is **unlimited** — the renderer recurses through the parent chain
to build a tree of any depth.

```json
"blocks": [
  { "id": "blk-1", "type": "heading",   "content": "Field Notes",
    "parent_id": null },
  { "id": "blk-2", "type": "paragraph", "content": "Observed at dawn...",
    "parent_id": "blk-1" },
  { "id": "blk-3", "type": "quote",     "content": "...",
    "parent_id": "blk-2" },
  { "id": "blk-4", "type": "callout",   "content": "a deeper note",
    "parent_id": "blk-3" }
]
```

### Block record

| field      | type    | notes                                                       |
|------------|---------|-------------------------------------------------------------|
| `id`       | string  | stable, unique. e.g. `blk-<n>` or a generated id            |
| `type`     | string  | `heading`, `paragraph`, `quote`, `list`, `code`, `divider`, `callout`, `reference`, `note` (capture default), `mermaid` |
| `content`  | string  | HTML/markdown for text types; raw Mermaid source for `type: "mermaid"` |
| `parent_id`| string\|null | parent block id; `null` = root. A block may itself be a parent, enabling infinite depth |
| `status`   | string, optional | one of `inceptum` (begun), `in_opere` (in progress), `perfectum` (completed — content locked read-only, see below; root-level Blocks entries also hide from the main view by default), `suspensum` (on hold). Defaults to `inceptum` when absent. Applies to Notebook `body`/`appendices` entries too. |
| `by`       | string\|null, optional | free-text author/system-member tag, e.g. `"robin"`. Purely optional — never required, never inferred. |

`mermaid` blocks render as a source textarea + live SVG preview instead of a
contenteditable div (see `renderMermaidBlock` in `app.js`); Mermaid loads
lazily from a CDN the first time one is rendered in a session.

### Archiving a root block (Blocks mode)

Cycling a **root-level** block's status pill to `perfectum` doesn't commit
right away. Since that status also hides the block from the main Blocks view
(see the table above), doing so silently the instant the pill is clicked would
make the row disappear out from under the cursor with no way to tell what
happened. Instead, `cycleStatus()` pauses on an inline three-way choice:

- **Archive (read-only)** — commits the status change to `perfectum` and locks
  the block's content (`contentEditable`/`readOnly`) until the status is
  cycled again.
- **Clear out** — deletes the block and its children via `removeBlockTree()`.
  Choosing this option *is* the confirmation; there's no second prompt.
- **Keep editing** — cancels; the status is left exactly as it was.

This choice is transient view state, not part of the persisted schema: it
lives in a single `pendingArchive` variable in `app.js` (the id of the block
currently showing the choice, or `null`) and is never written to `data/
notebook.json`. If the page reloads while the choice is showing, it simply
resets — no partial state to clean up.

The same gate only applies to **root** Blocks-mode entries. Non-root blocks
and Notebook-mode entries (`body`/`appendices`) can still be set to
`perfectum` in one click, since nothing hides them from view — only the
content-lock behavior applies to them.

### Building the tree (recursive, no depth cap)

The renderer builds children recursively from the flat array:

```js
function buildTree(blocks, parentId = null) {
  return blocks
    .filter(b => (b.parent_id ?? null) === parentId)
    .map(b => ({ ...b, children: buildTree(blocks, b.id) }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
```

Then `renderBlocks` walks the tree, wrapping each block's children in a nested
`.block-children` container indented one step per level. There is no hard cap —
depth is bounded only by readability and the optional `meta.maxDepth` hint (used
solely to flag extremely deep nesting in the UI, never to block it).

An optional `order` field (number) lets blocks be sequenced within a parent
without drag-and-drop (reordering via drag/drop is deferred past v1).

## Relationship between modes

Both modes may coexist in the same project file. A user can keep a structured
academic draft in `state.notebook` and scratch notes in `state.blocks`, switching
the toggle to view either. The data stays separate; no conversion is implied.
