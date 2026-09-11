# Architecture — One Shell, Two Renderers

The generated notebook is a single HTML page (`index.html`) that hosts:

1. **The shell** — banner header, sidebar/nav, the content region, and the mode
   toggle. The shell is constant regardless of which mode is active.
2. **The state** — one loaded project object (see `data-model.md`) held in
   memory by `app.js`.
3. **Two renderers** — `renderNotebook(state.notebook)` and
   `renderBlocks(state.blocks)`. The toggle calls one or the other into the same
   content region.

```
┌──────────────────────────────────────────────┐
│  BANNER (title / subtitle)        [mode ▾]  │  ← shell
├────────────┬─────────────────────────────────┤
│            │                                 │
│  SIDEBAR   │   CONTENT REGION               │
│  / NAV     │   (renderer output goes here)   │
│            │                                 │
└────────────┴─────────────────────────────────┘
```

## The toggle

The toggle is a switch (two buttons or a checkbox) bound to `state.mode`. On
change:

1. Set `state.mode` and persist it to localStorage.
2. Clear the content region.
3. If `state.mode === 'notebook'`, call `renderNotebook(state.notebook)`.
4. Else call `renderBlocks(state.blocks)`.

The toggle **switches views over the current data mode**. It does not convert
`notebook` data into `blocks` data or vice versa. Each renderer reads its own
top-level key. This is the data-boundary rule: **one shell, one state, two render
paths, no lossy conversion**.

If a converter is ever wanted (e.g., flatten Notebook sections into Blocks), it
must be an explicit, user-triggered action — never an implicit side effect of the
toggle. v1 ships without one.

## Rendering contract

Both renderers share these contracts:

- Output goes into `#content` (a single container).
- Rich text is rendered into `<div contenteditable>` nodes so the user can edit
  inline.
- On `input`/`blur` of any editable node, the renderer writes the updated
  content back to the in-memory state and caches to localStorage (see below).
- The renderer tags each rendered node with a `data-id` (and `data-type`) so
  edits can be mapped back to the right record.

## localStorage caching layer

- **Key namespace:** `create-html-notebook:<project-title>` to avoid collisions.
- **On load:** if a cache exists and is newer than the bundled file's meta, show
  a small "unsaved changes — restore / discard" banner. The file remains truth.
- **On edit:** debounce ~400ms, then write the full state to localStorage.
- **On export:** after a successful export/download, clear the cache (or mark it
  synced) so the banner disappears.
- **Never** auto-overwrite a file on disk — the browser cannot, and the UX must
  not pretend otherwise. Export is always a deliberate user action.

## Export paths

`app.js` provides three exports (all client-side, no backend):

1. **JSON** — download the full current `state` as `<slug>-notebook.json`.
2. **Markdown** — serialize Notebook sections (or a flattened Blocks tree) to a
   single `.md` file.
3. **Project bundle** — download the current `index.html`, `styles.css`,
   `app.js`, and the updated `data/notebook.json` as individual files. This works
   when the notebook is served over http(s) (deployed or a local static server).
   Under `file://`, browser security blocks reading sibling files, so the shell
   files come back as placeholders — in that case the project folder itself is
   the bundle and only `data/notebook.json` needs re-exporting. A true one-click
   zip download is a later-version nicety.

## What v1 deliberately omits

- Drag-and-drop reordering of blocks (infinite nesting IS supported; only DnD reordering is deferred)
- Automatic file write-back to disk
- Multi-document switching (one project per page)
- APA/PDF export
- Collaboration/sync
- Framework migration

Keep the renderer and `app.js` small and readable. Future versions extend from
this base, so avoid baking in assumptions (e.g., don't hardcode section order
deep in the renderer — drive it from a list).
