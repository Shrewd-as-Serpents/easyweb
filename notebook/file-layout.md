# File Layout — Archival Hierarchy

The generated project uses an archiving-style folder convention so a growing
multitude of entries stays navigable, sortable by date, and individually
git-trackable. The whole project exports cleanly as a folder or zip.

```
my-notebook/
├── index.html
├── styles.css
├── app.js
├── README.md
├── data/
│   └── notebook.json                 # the loaded project state (both modes)
├── entries/
│   └── 2026/
│       └── 07/
│           └── example-entry.md      # one file per dated entry
├── references/
│   └── example-source.json          # one file per reference/source
└── assets/
    └── (images, scans, attachments)
```

## Top-level files

| file          | role                                                        |
|---------------|-------------------------------------------------------------|
| `index.html`  | the one shell: banner, sidebar, content region, mode toggle|
| `styles.css`  | Ink & Paper theme via CSS custom properties                |
| `app.js`      | state loader, dual renderer, localStorage cache, export    |
| `README.md`   | usage + the "localStorage caches, file is truth" note      |
| `data/notebook.json` | the active project state object (see data-model.md)  |

## entries/ — dated hierarchy

Each entry is a standalone Markdown file under `entries/YYYY/MM/`.

- **Path:** `entries/YYYY/MM/<slug>.md`
- **Slug:** lowercase, hyphen-separated, ASCII-safe; derived from the entry
  title or a short date. e.g. `entries/2026/07/tonalpohualli-counts.md`
- **Front matter (optional YAML):** `id`, `title`, `date`, `tags`
- **Body:** the entry content as Markdown, mirrored into `state.notebook` or
  `state.blocks` when the entry is loaded into the active project.

Why dated: a journal/archive accumulates many entries over years. A `YYYY/MM/`
tree keeps any single directory shallow, sorts chronologically in a file
manager and in `git log`, and makes per-entry git diffs obvious.

## references/ — standalone sources

Each reference/source is its own JSON file under `references/`.

- **Path:** `references/<slug>.json`
- **Slug:** lowercase, hyphen-separated; prefer `author-year` or a short
  stable id. e.g. `references/crowley-1899.json`
- **Contents:** the reference record (see data-model.md → "Reference entries").
- Referenced from `state.notebook.references[]` by `slug` + `file`, so git
  tracks each source as an independent object.

## assets/ — binaries

Images, scans, figures, and any non-text attachments live under `assets/`.

- **Path:** `assets/<descriptive-name>.<ext>`
- Keep names lowercase, hyphen-separated, no spaces.
- Figures referenced from `state.notebook.figures[]` by `src`.

## Naming rules

- Slugs: lowercase `a-z0-9`, words joined by single hyphens, no leading/
  trailing hyphens, no consecutive hyphens.
- Dates: ISO `YYYY-MM-DD` in front matter; folder path uses `YYYY/MM`.
- One record per file — never bundle multiple entries or references into one
  file. This is what makes git track each individually.

## Export as a folder/zip

Because every record is a standalone file and the shell is plain HTML/CSS/JS,
the entire `my-notebook/` directory is the export. To ship it: zip the folder
(or hand it to `git`). A recipient unzips and opens `index.html`. No install,
no server.
