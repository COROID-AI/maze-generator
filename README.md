# Maze Generator & Solver — Interactive Single-File Build

Build an interactive **maze generator and solver** as a single, self-contained `index.html` file.
It generates a maze with a visible animation, then solves it from start to finish — also animated. It must be visually polished and interactive enough to feature on a public marketing page.

## Hard constraints (auto-fail if violated)

- **One file only**: everything (HTML, CSS, JS) lives in `index.html`.
- **Zero network requests**: no CDNs, no external fonts, no images, no `fetch`. Must run from `file://` offline.
- **No build step**: opening the file in a browser just works.
- **No frameworks or libraries.** Vanilla JS + Canvas. System fonts only.
- Ship clean, readable JavaScript — no dead code, no console errors.

## Core requirements (the gate — these must all work)

1. A `<canvas>` rendering a grid maze with walls, sized responsively to the viewport.
2. **Generates a perfect maze**: fully connected, with exactly one path between any two cells (a spanning tree — no loops, no isolated cells). Any standard algorithm is fine (recursive backtracker, Prim's, Kruskal's…).
3. **Animated generation** — you can watch the maze being carved.
4. **Solves** from a start cell to an end cell and finds the **shortest path**, with an animation showing explored cells and the final path.
5. **Regenerate** (new maze) and **Solve** controls.
6. **Adjustable maze size**.
7. Smooth animation with no visible stutter at the default size.

### Correctness acceptance test (the build must pass this)

- **Generation**: the produced maze must be a *perfect maze* — every cell reachable from every other (connected), and exactly `cols·rows − 1` open passages (a spanning tree, so no loops). Passages must be symmetric (if a cell opens east, its eastern neighbour opens west) and never lead outside the grid.
- **Solving**: given any perfect maze, the solver must return a path that starts at the start cell, ends at the end cell, only steps through open passages, and is of **minimum length** (equal to the breadth-first shortest-path distance). A path with loops, illegal moves, or any non-shortest length fails.

### Automated grading hook (optional, recommended)

To allow `maze-test.html` to verify your maze and solver automatically, expose two **pure functions** on the global scope:

```js
// Returns a maze object: { cols, rows, cells }
// cells[row][col] = { N, E, S, W } booleans — true means an OPEN passage in
// that direction (no wall). Passages must be symmetric between neighbours.
window.generateMaze = function (cols, rows) { /* ... */ };

// maze:  a { cols, rows, cells } object in the format above
// start: [row, col]   end: [row, col]
// Returns the path as an array of [row, col] from start to end (inclusive),
// each consecutive pair connected by an open passage; must be SHORTEST.
window.solveMaze = function (maze, start, end) { /* ... */ };
```

These hooks are optional and do not affect the rendered app; they only enable one-click correctness checking. The harness tests your solver against a reference-generated maze, so a working solver passes even if your generator differs.

## Weighted quality rubric (score out of 100)

Implement as many as you can, prioritising correctness and polish over raw feature count.

### A. Correctness — 30 pts
- 18 — Generates a perfect maze (passes the structural test: connected spanning tree, symmetric passages, `cols·rows − 1` edges).
- 12 — Solver returns a valid **shortest** path (passes the optimality test).

### B. Core interactivity — 20 pts
- 7 — Regenerate / new maze.
- 6 — Adjustable size (columns and rows).
- 7 — Trigger solve and see both explored cells and the final path.

### C. Features & depth — 25 pts
- 6 — Choice of **generation algorithm** (≥2, e.g. recursive backtracker + Prim's or Kruskal's).
- 6 — Choice of **solver** (≥2, e.g. BFS + A* or DFS) with a visible difference in how they explore.
- 5 — Set a custom start and end by clicking cells.
- 4 — Animation speed / step control.
- 4 — Stats (path length, cells explored, generation time).

### D. Visual design & polish — 15 pts
- 6 — Cohesive palette, crisp walls, a glowing solution path, tasteful control layout (not default browser buttons).
- 5 — Pleasing generation and solve animation (gradient flood, easing).
- 4 — Considered typography, spacing, and a short inline "how to use" hint.

### E. Robustness & UX — 10 pts
- 4 — Responsive, and a large maze (e.g. 60×40) renders and solves without freezing.
- 3 — Regenerating mid-solve (or spamming controls) doesn't break the animation.
- 2 — Keyboard shortcuts (e.g. G = generate, S = solve).
- 1 — No console errors or warnings.

## Deliverable

A single `index.html` that, opened in any modern browser, presents a finished, attractive, fully interactive maze generator and solver meeting the above. Optimise for a screenshot that looks production-ready.

---

### Verifying correctness locally

`maze-test.html` runs the structural and shortest-path acceptance tests. Serve the folder over HTTP so it can read `index.html`'s optional grading hooks:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/maze-test.html
```

If `window.generateMaze` / `window.solveMaze` are exposed, the harness tests your implementation directly. Otherwise it falls back to verifying the reference algorithms so you can see exactly what "correct" looks like.
