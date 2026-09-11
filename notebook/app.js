/* ============================================================
   create-html-notebook — app.js
   One shell, one state, two renderers (Notebook + Blocks).
   File is truth; localStorage is a cache. Browser cannot write
   files silently, so export is always a deliberate user action.
   ============================================================ */

(() => {
  "use strict";

  // ---- Default seed state (also lives in data/notebook.json) ----
  const DEFAULT_STATE = {
    meta: {
      title: "Field Notebook",
      subtitle: "Notes on spectroscopy & Mesoamerican calendrics",
      author: "Xolotzin",
      created: "2026-07-20",
      version: "1.0"
    },
    mode: "notebook",
    notebook: {
      body: [
        { id: "b1", type: "paragraph", content: "Open this file and start writing. Edits cache to your browser; export to save to disk." }
      ],
      references: [
        { id: "r1", slug: "example-source", file: "references/example-source.json", label: "Example source" }
      ],
      tables: [
        { id: "t1", caption: "Tonalpohualli (sample)", rows: [["Day", "Sign", "Number"], ["1", "Crocodile", "1"]] }
      ],
      figures: [
        { id: "f1", caption: "Placeholder figure", src: "assets/figure-placeholder.svg" }
      ],
      appendices: [
        { id: "a1", type: "paragraph", content: "Appendix material lives here." }
      ]
    },
    blocks: [
      { id: "blk-1", type: "heading",   content: "Field Notes", parent_id: null, status: "in_opere" },
      { id: "blk-2", type: "paragraph", content: "Observed at dawn — the salt vapor glow.", parent_id: "blk-1", status: "perfectum" },
      { id: "blk-3", type: "quote",     content: "Light bends through what it cannot hold.", parent_id: "blk-2", status: "perfectum" },
      { id: "blk-4", type: "callout",   content: "A deeper reflection on the quote above.", parent_id: "blk-3", status: "inceptum", by: "robin" },
      { id: "blk-5", type: "paragraph", content: "Root-level note, sibling to the heading.", parent_id: null, status: "inceptum" },
      { id: "blk-6", type: "mermaid",   content: "flowchart LR\n  Capere[Capere\\ncapture] --> Registrum[Registrum\\nreview & log]\n  Registrum --> Archivum[Archivum\\nperfectum]", parent_id: null, status: "in_opere" }
    ]
  };

  const STORAGE_KEY = "create-html-notebook:" + (location.pathname || "default");
  const SECTION_ORDER = ["body", "references", "tables", "figures", "appendices"];
  const SECTION_LABELS = {
    body: "Body", references: "References", tables: "Tables",
    figures: "Figures", appendices: "Appendices"
  };

  // ---- Scriptorium status vocabulary (medieval Latin, cycles on click) ----
  const STATUS_ORDER = ["inceptum", "in_opere", "perfectum", "suspensum"];
  const STATUS_META = {
    inceptum:  { label: "inceptum",  title: "begun" },
    in_opere:  { label: "in opere",  title: "in progress" },
    perfectum: { label: "perfectum", title: "completed \u2014 archived" },
    suspensum: { label: "suspensum", title: "on hold" }
  };
  let showArchive = false; // toggled by the "Archivum" checkbox — perfectum items hide by default

  let state = null;
  let saveTimer = null;

  // ---------- DOM ----------
  const $ = (sel) => document.querySelector(sel);
  const content = $("#content");
  const nav = $("#nav");
  const status = $("#status");
  const elTitle = $("#banner-title");
  const elSubtitle = $("#banner-subtitle");
  const elAuthor = $("#banner-author");
  const elDate = $("#banner-date");

  // ---------- Load ----------
  async function load() {
    let fileState = null;
    try {
      const res = await fetch("data/notebook.json", { cache: "no-store" });
      if (res.ok) fileState = await res.json();
    } catch (e) {
      // file:// blocks fetch in some browsers — fall back to embedded seed.
    }
    if (!fileState) fileState = structuredClone(DEFAULT_STATE);

    const cached = readCache();
    if (cached && cached.__savedAt) {
      state = cached;
      setStatus("Restored unsaved changes from cache — export to save to disk.", true);
    } else {
      state = fileState;
    }
    hydrateBanner();
    setMode(state.mode || "notebook", false);
    render();
  }

  // ---------- Banner ----------
  function hydrateBanner() {
    elTitle.textContent = state.meta.title;
    elSubtitle.textContent = state.meta.subtitle;
    elAuthor.textContent = state.meta.author || "";
    elDate.textContent = state.meta.created || "";
  }
  for (const [el, key] of [[elTitle, "title"], [elSubtitle, "subtitle"]]) {
    el.addEventListener("input", () => {
      state.meta[key] = el.textContent;
      scheduleSave();
    });
  }

  // ---------- Mode toggle ----------
  function setMode(mode, doRender = true) {
    state.mode = mode;
    $("#mode-notebook").classList.toggle("active", mode === "notebook");
    $("#mode-blocks").classList.toggle("active", mode === "blocks");
    $("#mode-notebook").setAttribute("aria-selected", mode === "notebook");
    $("#mode-blocks").setAttribute("aria-selected", mode === "blocks");
    if (doRender) { render(); scheduleSave(); }
  }
  $("#mode-notebook").addEventListener("click", () => setMode("notebook"));
  $("#mode-blocks").addEventListener("click", () => setMode("blocks"));

  // ---------- Render dispatch ----------
  function render() {
    content.innerHTML = "";
    if (state.mode === "notebook") renderNotebook(state.notebook);
    else renderBlocks(state.blocks);
    buildNav();
  }

  // ---------- Nav ----------
  function buildNav() {
    nav.innerHTML = "";
    if (state.mode === "notebook") {
      const h = document.createElement("h3"); h.textContent = "Sections"; nav.appendChild(h);
      for (const key of SECTION_ORDER) {
        const arr = state.notebook[key] || [];
        if (!arr.length) continue;
        const a = document.createElement("a");
        a.href = "#sec-" + key; a.textContent = SECTION_LABELS[key];
        nav.appendChild(a);
      }
    } else {
      const h = document.createElement("h3"); h.textContent = "Top-level blocks"; nav.appendChild(h);
      (state.blocks || []).filter(b => !b.parent_id).slice(0, 12).forEach(b => {
        const a = document.createElement("a");
        a.href = "#" + b.id;
        a.textContent = (b.content || "(" + b.type + ")").slice(0, 40);
        nav.appendChild(a);
      });
    }
  }

  // ---------- Renderer: Notebook mode ----------
  function renderNotebook(nb) {
    for (const key of SECTION_ORDER) {
      const items = nb[key] || [];
      if (!items.length) continue;
      const sec = document.createElement("section");
      sec.className = "notebook-section"; sec.id = "sec-" + key;
      const title = document.createElement("h2");
      title.className = "section-title"; title.textContent = SECTION_LABELS[key];
      sec.appendChild(title);

      if (key === "references") {
        const ul = document.createElement("ul"); ul.className = "ref-list";
        for (const r of items) {
          const li = document.createElement("li");
          const a = document.createElement("a"); a.href = "#"; a.textContent = r.label || r.slug;
          a.addEventListener("click", (e) => { e.preventDefault(); loadReference(r); });
          li.appendChild(a);
          if (r.summary) { const s = document.createElement("span"); s.textContent = " — " + r.summary; s.style.color = "var(--ink-faint)"; li.appendChild(s); }
          ul.appendChild(li);
        }
        sec.appendChild(ul);
      } else if (key === "tables") {
        for (const t of items) {
          if (t.caption) { const c = document.createElement("p"); c.className = "caption-note"; c.textContent = t.caption; sec.appendChild(c); }
          sec.appendChild(renderTable(t));
        }
      } else if (key === "figures") {
        for (const f of items) {
          const fig = document.createElement("figure"); fig.className = "nb-figure";
          const img = document.createElement("img"); img.src = f.src; img.alt = f.caption || "";
          fig.appendChild(img);
          if (f.caption) { const cap = document.createElement("figcaption"); cap.textContent = f.caption; fig.appendChild(cap); }
          sec.appendChild(fig);
        }
      } else {
        for (const b of items) {
          const wrap = document.createElement("div");
          wrap.className = "entry-wrap";
          wrap.appendChild(renderEntryTags(b, key));
          wrap.appendChild(renderEntry(b, key));
          sec.appendChild(wrap);
        }
      }
      content.appendChild(sec);
    }
    if (!content.children.length) {
      const p = document.createElement("p"); p.className = "muted-note";
      p.textContent = "Empty notebook. Edit the banner, switch to Blocks, or import JSON.";
      content.appendChild(p);
    }
  }

  function renderTable(t) {
    const tbl = document.createElement("table"); tbl.className = "nb-table";
    (t.rows || []).forEach((row, i) => {
      const tr = document.createElement("tr");
      row.forEach(cell => { const c = document.createElement(i === 0 ? "th" : "td"); c.textContent = cell; tr.appendChild(c); });
      tbl.appendChild(tr);
    });
    return tbl;
  }

  function loadReference(r) {
    // Show inline metadata (robust under file://). Full standalone file lives at r.file.
    const parts = [
      r.label || r.slug || "(reference)",
      r.summary ? "\n" + r.summary : "",
      "\n\nStandalone file: " + r.file
    ];
    alert(parts.join(""));
  }

  // ---------- Renderer: Blocks mode (recursive) ----------
  function buildTree(blocks, parentId = null, seen = new Set()) {
    return blocks
      .filter(b => (b.parent_id ?? null) === parentId)
      .map(b => {
        if (seen.has(b.id)) return { ...b, children: [] }; // cycle guard
        seen.add(b.id);
        return { ...b, children: buildTree(blocks, b.id, seen) };
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  function renderBlocks(blocks) {
    const allRoots = buildTree(blocks || []);
    const archivedCount = allRoots.filter(n => n.status === "perfectum").length;
    const roots = showArchive ? allRoots : allRoots.filter(n => n.status !== "perfectum");

    if (!roots.length) {
      const p = document.createElement("p"); p.className = "muted-note";
      p.textContent = showArchive ? "No blocks yet. Click + Add block below." : "Nothing in progress — check Archivum, or add a block.";
      content.appendChild(p);
    }
    roots.forEach(node => content.appendChild(renderBlockNode(node, 0)));

    const add = document.createElement("button");
    add.className = "action-btn"; add.textContent = "+ Add block";
    add.addEventListener("click", () => addBlock(null));
    content.appendChild(add);

    if (archivedCount > 0) {
      const note = document.createElement("p"); note.className = "muted-note archive-note";
      note.textContent = (showArchive ? "Showing" : "Hiding") + " " + archivedCount +
        " perfectum item" + (archivedCount === 1 ? "" : "s") + " in the Archivum.";
      content.appendChild(note);
    }
  }

  function renderBlockNode(node, depth) {
    const wrap = document.createElement("div");
    wrap.className = "block"; wrap.dataset.type = node.type; wrap.id = node.id;

    const row = document.createElement("div"); row.className = "block-row";
    const handle = document.createElement("span"); handle.className = "block-handle"; handle.textContent = "⠿";
    const body = document.createElement("div"); body.className = "block-body";

    body.appendChild(renderEntryTags(node, "blocks"));
    if (pendingArchive === node.id) body.appendChild(renderArchiveChoice(node.id));
    body.appendChild(renderEntry(node, "blocks"));

    if (depth >= 4) {
      const flag = document.createElement("span"); flag.className = "block-depth-flag";
      flag.textContent = "depth " + depth; body.appendChild(flag);
    }

    const meta = document.createElement("div"); meta.className = "block-meta";
    const addSub = document.createElement("button"); addSub.textContent = "+ sub-block";
    addSub.addEventListener("click", () => addBlock(node.id));
    const del = document.createElement("button"); del.textContent = "delete";
    del.addEventListener("click", () => deleteBlock(node.id));
    meta.appendChild(addSub); meta.appendChild(del);

    body.appendChild(meta);
    row.appendChild(handle); row.appendChild(body);
    wrap.appendChild(row);

    if (node.children && node.children.length) {
      const kids = document.createElement("div"); kids.className = "block-children";
      node.children.forEach(c => kids.appendChild(renderBlockNode(c, depth + 1)));
      wrap.appendChild(kids);
    }
    return wrap;
  }

  // ---------- Entry dispatcher: mermaid gets its own renderer, everything else is editable text ----------
  function renderEntry(b, sectionKey) {
    if (b.type === "mermaid") return renderMermaidBlock(b, sectionKey);
    return renderEditableBlock(b, sectionKey);
  }

  // ---------- Mermaid block: raw source (textarea) + live rendered preview ----------
  let mermaidReady = null;
  function ensureMermaid() {
    if (window.mermaid) { window.mermaid.initialize({ startOnLoad: false, theme: "neutral" }); return Promise.resolve(); }
    if (mermaidReady) return mermaidReady;
    mermaidReady = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
      s.onload = () => { window.mermaid.initialize({ startOnLoad: false, theme: "neutral" }); resolve(); };
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return mermaidReady;
  }

  function renderMermaidBlock(b, sectionKey) {
    const wrap = document.createElement("div");
    wrap.className = "mermaid-block";

    const label = document.createElement("div");
    label.className = "mermaid-label muted-note";
    label.textContent = "mermaid diagram — edit source below";
    wrap.appendChild(label);

    const ta = document.createElement("textarea");
    ta.className = "mermaid-source";
    ta.spellcheck = false;
    ta.readOnly = b.status === "perfectum";
    ta.value = b.content || "";
    wrap.appendChild(ta);

    const preview = document.createElement("div");
    preview.className = "mermaid-preview";
    wrap.appendChild(preview);

    let debounce = null;
    const draw = async () => {
      try {
        await ensureMermaid();
        const id = "mmd-" + b.id + "-" + Math.random().toString(36).slice(2, 8);
        const { svg } = await window.mermaid.render(id, ta.value || " ");
        preview.innerHTML = svg;
      } catch (err) {
        preview.innerHTML = "";
        const p = document.createElement("p");
        p.className = "mermaid-error";
        p.textContent = "Diagram error: " + (err && err.message ? err.message : err);
        preview.appendChild(p);
      }
    };

    ta.addEventListener("input", () => {
      writeBack(b.id, sectionKey, ta.value);
      clearTimeout(debounce);
      debounce = setTimeout(draw, 500);
    });

    draw();
    return wrap;
  }

  // ---------- Editable block (shared) ----------
  // A "perfectum" block is archived: its content locks read-only (the status
  // pill stays clickable, so cycling the status again is how you reopen it).
  function renderEditableBlock(b, sectionKey) {
    const archived = b.status === "perfectum";
    const div = document.createElement("div");
    div.className = "editable notebook-block" + (archived ? " is-archived" : "");
    div.contentEditable = archived ? "false" : "true";
    div.spellcheck = !archived;
    div.dataset.id = b.id;
    div.dataset.section = sectionKey;
    if (b.type === "divider") { div.textContent = "— — —"; }
    else { div.innerHTML = b.content || ""; }
    div.addEventListener("input", () => {
      const val = div.dataset.type === "divider" ? "— — —" : div.innerHTML;
      writeBack(div.dataset.id, div.dataset.section, val);
    });
    return div;
  }

  function findRecord(id, section) {
    if (section === "blocks") return (state.blocks || []).find(x => x.id === id);
    return (state.notebook[section] || []).find(x => x.id === id);
  }

  function writeBack(id, section, val) {
    const b = findRecord(id, section);
    if (b) b.content = val;
    scheduleSave();
  }

  // ---------- Status cycling (Latin vocabulary) ----------
  // A root-level Blocks-mode item becomes eligible to vanish into the Archivum
  // the moment its status cycles to "perfectum" (renderBlocks() hides
  // perfectum roots unless the Archivum checkbox is on). Rather than let that
  // happen mid-click, we pause on a choice instead of committing silently.
  let pendingArchive = null; // id of the block currently showing the choice, or null
  function cycleStatus(id, section) {
    const b = findRecord(id, section);
    if (!b) return;
    const i = STATUS_ORDER.indexOf(b.status);
    const next = STATUS_ORDER[(i + 1) % STATUS_ORDER.length];
    const archiving = section === "blocks" && next === "perfectum" &&
      (b.parent_id ?? null) === null && !showArchive;
    if (archiving) { pendingArchive = id; render(); return; }
    b.status = next;
    render(); scheduleSave();
  }

  // Renders the three-way choice in place of a pill cycle that would archive
  // a root block: archive it read-only, delete it outright, or back out.
  // Takes the block's id rather than the rendered node itself — `node` here
  // comes from buildTree()'s `{ ...b, children: [...] }` spread, a throwaway
  // copy for rendering, so mutating it would silently vanish on the next
  // render() instead of reaching the real record in state.blocks.
  function renderArchiveChoice(id) {
    const box = document.createElement("div");
    box.className = "archive-choice";

    const msg = document.createElement("span");
    msg.className = "muted-note";
    msg.textContent = "Mark this complete?";
    box.appendChild(msg);

    const archiveBtn = document.createElement("button");
    archiveBtn.textContent = "Archive (read-only)";
    archiveBtn.title = "Moves to the Archivum; content becomes read-only until you cycle the status again";
    archiveBtn.addEventListener("click", () => {
      const b = findRecord(id, "blocks");
      if (b) b.status = "perfectum";
      pendingArchive = null;
      render(); scheduleSave();
    });

    const clearBtn = document.createElement("button");
    clearBtn.textContent = "Clear out";
    clearBtn.title = "Delete this block and its children — choosing this is the confirmation";
    clearBtn.addEventListener("click", () => { pendingArchive = null; removeBlockTree(id); });

    const keepBtn = document.createElement("button");
    keepBtn.textContent = "Keep editing";
    keepBtn.addEventListener("click", () => { pendingArchive = null; render(); });

    box.appendChild(archiveBtn); box.appendChild(clearBtn); box.appendChild(keepBtn);
    return box;
  }

  // ---------- Optional author tag (@who — plural-system friendly, never required) ----------
  function editAuthor(id, section) {
    const b = findRecord(id, section);
    if (!b) return;
    const next = prompt("Who wrote this? (leave blank to clear)", b.by || "");
    if (next === null) return; // cancelled
    b.by = next.trim() || null;
    render(); scheduleSave();
  }

  // ---------- Entry tags row: status pill + optional author badge ----------
  function renderEntryTags(b, sectionKey) {
    const row = document.createElement("div");
    row.className = "entry-tags";

    const status = b.status || "inceptum";
    const meta = STATUS_META[status] || STATUS_META.inceptum;
    const pill = document.createElement("button");
    pill.className = "status-pill status-" + status;
    pill.title = meta.title + " — click to change";
    pill.textContent = meta.label;
    pill.addEventListener("click", () => cycleStatus(b.id, sectionKey));
    row.appendChild(pill);

    const author = document.createElement("button");
    author.className = "author-badge" + (b.by ? "" : " author-badge--ghost");
    author.textContent = b.by ? "@" + b.by : "+ who";
    author.title = "Optional — tag who wrote this";
    author.addEventListener("click", () => editAuthor(b.id, sectionKey));
    row.appendChild(author);

    return row;
  }

  // ---------- Block mutations ----------
  function nextId() {
    let n = 0;
    (state.blocks || []).forEach(b => { const m = /blk-(\d+)$/.exec(b.id); if (m) n = Math.max(n, +m[1]); });
    return "blk-" + (n + 1);
  }
  function addBlock(parentId) {
    const b = { id: nextId(), type: "paragraph", content: "", parent_id: parentId, status: "inceptum" };
    state.blocks.push(b);
    render(); scheduleSave();
    const el = document.getElementById(b.id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // ---------- Quick Capture (the "Keep replacement") ----------
  // Always lands as a root block, status inceptum, in Blocks mode — regardless
  // of which mode you're currently viewing. Migrate it during your own review.
  function capture(text) {
    const trimmed = (text || "").trim();
    if (!trimmed) return;
    const b = { id: nextId(), type: "note", content: escapeHtml(trimmed), parent_id: null, status: "inceptum", order: Date.now() };
    state.blocks.push(b);
    if (state.mode !== "blocks") setMode("blocks", false);
    render(); scheduleSave();
    setStatus("Captured. Migrate it into place when you review.", true);
  }
  function escapeHtml(s) {
    const d = document.createElement("div"); d.textContent = s; return d.innerHTML;
  }
  const captureInput = $("#capture-input");
  const captureBtn = $("#capture-btn");
  if (captureInput && captureBtn) {
    const doCapture = () => { capture(captureInput.value); captureInput.value = ""; captureInput.focus(); };
    captureBtn.addEventListener("click", doCapture);
    captureInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); doCapture(); }
    });
  }

  // ---------- Archivum toggle ----------
  const archiveToggle = $("#toggle-archive");
  if (archiveToggle) {
    archiveToggle.addEventListener("change", () => { showArchive = archiveToggle.checked; render(); });
  }
  function removeBlockTree(id) {
    const toRemove = new Set([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const b of state.blocks) {
        if (toRemove.has(b.parent_id) && !toRemove.has(b.id)) { toRemove.add(b.id); changed = true; }
      }
    }
    state.blocks = state.blocks.filter(b => !toRemove.has(b.id));
    render(); scheduleSave();
  }
  function deleteBlock(id) {
    if (!confirm("Delete this block and its children?")) return;
    removeBlockTree(id);
  }

  // ---------- localStorage cache ----------
  function readCache() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
  }
  function scheduleSave() {
    setStatus("Unsaved changes — export to save to disk.", true);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        state.__savedAt = Date.now();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) { /* storage full / disabled — non-fatal */ }
    }, 400);
  }
  function setStatus(msg, unsaved = false) {
    status.textContent = msg;
    status.classList.toggle("unsaved", unsaved);
  }

  // ---------- Import ----------
  $("#import-input").addEventListener("change", async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const text = await file.text();
      const next = JSON.parse(text);
      state = next; hydrateBanner(); setMode(state.mode || "notebook", false); render();
      scheduleSave();
      setStatus("Imported " + file.name, false);
    } catch (err) { alert("Could not parse JSON: " + err.message); }
    e.target.value = "";
  });

  // ---------- Exports ----------
  function download(filename, text, mime = "text/plain") {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("Exported " + filename, false);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  $("#export-json").addEventListener("click", () => {
    const clean = { ...state }; delete clean.__savedAt;
    download(slugify(state.meta.title) + "-notebook.json", JSON.stringify(clean, null, 2), "application/json");
  });

  $("#export-md").addEventListener("click", () => {
    download(slugify(state.meta.title) + ".md", toMarkdown(), "text/markdown");
  });

  // Bundle: re-fetch the shell files + current data, download each.
  $("#export-bundle").addEventListener("click", async () => {
    const clean = { ...state }; delete clean.__savedAt;
    const files = [
      ["index.html", await fetchText("index.html")],
      ["styles.css", await fetchText("styles.css")],
      ["app.js", await fetchText("app.js")],
      ["data/notebook.json", JSON.stringify(clean, null, 2)]
    ];
    for (const [name, text] of files) download(name, text);
    setStatus("Exported bundle (4 files).", false);
  });

  async function fetchText(path) {
    try { const r = await fetch(path); if (r.ok) return await r.text(); } catch {}
    return "/* unavailable when opened via file:// — present in the source folder */";
  }

  function toMarkdown() {
    const lines = [];
    lines.push("# " + (state.meta.title || ""));
    if (state.meta.subtitle) lines.push("\n*" + state.meta.subtitle + "*");
    if (state.meta.author) lines.push("\n— " + state.meta.author + (state.meta.created ? ", " + state.meta.created : ""));
    lines.push("");
    if (state.mode === "notebook" || true) {
      for (const key of SECTION_ORDER) {
        const items = state.notebook[key] || [];
        if (!items.length) continue;
        lines.push("\n## " + SECTION_LABELS[key]);
        if (key === "references") items.forEach(r => lines.push("- [" + (r.label || r.slug) + "](" + r.file + ")"));
        else if (key === "tables") items.forEach(t => { lines.push("\n**" + (t.caption || "Table") + "**"); (t.rows || []).forEach(r => lines.push("| " + r.join(" | ") + " |")); });
        else if (key === "figures") items.forEach(f => lines.push("![" + (f.caption || "") + "](" + f.src + ")"));
        else items.forEach(b => lines.push(stripHtml(b.content || "")));
      }
    }
    if ((state.blocks || []).length) {
      lines.push("\n## Blocks");
      walkMd(buildTree(state.blocks), 0, lines);
    }
    return lines.join("\n");
  }
  function walkMd(nodes, depth, lines) {
    for (const n of nodes) {
      const pad = "  ".repeat(depth) + "- ";
      lines.push(pad + "[" + n.type + "] " + stripHtml(n.content || ""));
      if (n.children) walkMd(n.children, depth + 1, lines);
    }
  }
  function stripHtml(s) { const d = document.createElement("div"); d.innerHTML = s; return (d.textContent || "").trim(); }
  function slugify(s) { return (s || "notebook").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "notebook"; }

  // ---------- Go ----------
  load();
})();
