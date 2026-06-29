#!/usr/bin/env node
/* eslint-disable */
// Headless acceptance test: extracts the <script> from index.html, runs it in
// a minimal DOM shim, then validates generateMaze() and solveMaze() against the
// same perfect-maze + shortest-path checks used by maze-test.html.

const fs = require("fs");

// --- Extract the inline script from index.html ---
const html = fs.readFileSync("index.html", "utf8");
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error("FAIL: no <script> block in index.html"); process.exit(1); }
const code = m[1];

// --- Minimal DOM/window shim so the script runs under Node ---
const elementStub = {
  style: {},
  width: 0, height: 0,
  getContext: () => ({
    fillRect: () => {}, strokeRect: () => {}, clearRect: () => {},
    beginPath: () => {}, moveTo: () => {}, lineTo: () => {}, stroke: () => {},
    fill: () => {}, arc: () => {}, save: () => {}, restore: () => {},
    set fillStyle(v) {}, get fillStyle() { return ""; },
    set strokeStyle(v) {}, get strokeStyle() { return ""; },
    set lineWidth(v) {}, get lineWidth() { return 1; },
    set lineJoin(v) {}, get lineJoin() { return ""; },
  }),
  addEventListener: () => {},
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
  classList: { add: () => {}, remove: () => {}, toggle: () => {} },
  appendChild: () => {},
  focus: () => {},
};
const documentStub = {
  getElementById: () => elementStub,
  querySelector: () => elementStub,
  querySelectorAll: () => [],
  createElement: () => elementStub,
  addEventListener: () => {},
  documentElement: { clientWidth: 1024, clientHeight: 768 },
};
const windowStub = {
  innerWidth: 1024, innerHeight: 768,
  devicePixelRatio: 1,
  addEventListener: () => {},
  requestAnimationFrame: () => 0,
  cancelAnimationFrame: () => {},
};

// Run the app code in a sandbox that exposes our shims. The app references
// browser globals both as `window.x` and bare `x`, so every shim must live at
// the top level of the context AND on the window object.
const noop = () => {};
const rafStub = () => 0;
const sandbox = {
  document: documentStub,
  console,
  Math,
  Date,
  Array,
  Object,
  parseInt,
  parseFloat,
  isNaN,
  setTimeout: noop,
  clearTimeout: noop,
  requestAnimationFrame: rafStub,
  cancelAnimationFrame: noop,
  addEventListener: noop,
  removeEventListener: noop,
  innerWidth: 1024,
  innerHeight: 768,
  devicePixelRatio: 1,
};
sandbox.window = Object.assign({}, sandbox, { document: documentStub });
sandbox.globalThis = sandbox;

const vm = require("vm");
const context = vm.createContext(sandbox);
try {
  vm.runInContext(code, context);
} catch (e) {
  console.error("FAIL: script threw on load:", e.message);
  process.exit(1);
}

const { generateMaze, solveMaze } = sandbox.window;
if (typeof generateMaze !== "function") { console.error("FAIL: window.generateMaze not exposed"); process.exit(1); }
if (typeof solveMaze !== "function") { console.error("FAIL: window.solveMaze not exposed"); process.exit(1); }

// --- Validators (ported from maze-test.html) ---
function neighbours(cells, r, c) {
  const cell = cells[r][c], out = [];
  if (cell.N) out.push([r - 1, c]);
  if (cell.S) out.push([r + 1, c]);
  if (cell.E) out.push([r, c + 1]);
  if (cell.W) out.push([r, c - 1]);
  return out;
}
function validatePerfectMaze(maze) {
  if (!maze || !maze.cells) return { ok: false, reason: "no maze / cells returned" };
  const { cols, rows, cells } = maze;
  if (cells.length !== rows || cells[0].length !== cols)
    return { ok: false, reason: `cells dimensions ${cells.length}x${cells[0].length} != ${rows}x${cols}` };
  let edges = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = cells[r][c];
      if (cell.N) { if (r === 0) return { ok: false, reason: `passage N off-grid at ${r},${c}` }; if (!cells[r-1][c].S) return { ok: false, reason: `asymmetric passage (N) at ${r},${c}` }; edges++; }
      if (cell.S) { if (r === rows-1) return { ok: false, reason: `passage S off-grid at ${r},${c}` }; if (!cells[r+1][c].N) return { ok: false, reason: `asymmetric passage (S) at ${r},${c}` }; }
      if (cell.E) { if (c === cols-1) return { ok: false, reason: `passage E off-grid at ${r},${c}` }; if (!cells[r][c+1].W) return { ok: false, reason: `asymmetric passage (E) at ${r},${c}` }; edges++; }
      if (cell.W) { if (c === 0) return { ok: false, reason: `passage W off-grid at ${r},${c}` }; if (!cells[r][c-1].E) return { ok: false, reason: `asymmetric passage (W) at ${r},${c}` }; }
    }
  }
  const total = cols * rows;
  const seen = Array.from({ length: rows }, () => new Array(cols).fill(false));
  const q = [[0, 0]]; seen[0][0] = true; let cnt = 1;
  while (q.length) {
    const [r, c] = q.shift();
    for (const [nr, nc] of neighbours(cells, r, c)) {
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !seen[nr][nc]) { seen[nr][nc] = true; cnt++; q.push([nr, nc]); }
    }
  }
  if (cnt !== total) return { ok: false, reason: `not fully connected: ${cnt}/${total} cells reachable` };
  if (edges !== total - 1) return { ok: false, reason: `not a tree: ${edges} passages, expected ${total - 1}` };
  return { ok: true, msg: `${cols}x${rows}: connected, ${edges} passages = cols*rows-1 -> perfect maze.` };
}
function bfsDistance(maze, start, end) {
  const { cols, rows, cells } = maze;
  const dist = Array.from({ length: rows }, () => new Array(cols).fill(-1));
  dist[start[0]][start[1]] = 0;
  const q = [start];
  while (q.length) {
    const [r, c] = q.shift();
    for (const [nr, nc] of neighbours(cells, r, c)) {
      if (dist[nr][nc] === -1) { dist[nr][nc] = dist[r][c] + 1; q.push([nr, nc]); }
    }
  }
  return dist[end[0]][end[1]];
}
function validateSolution(maze, path, start, end) {
  if (!Array.isArray(path) || path.length === 0) return { ok: false, reason: "no path returned" };
  const first = path[0], last = path[path.length - 1];
  if (first[0] !== start[0] || first[1] !== start[1]) return { ok: false, reason: "path does not start at the start cell" };
  if (last[0] !== end[0] || last[1] !== end[1]) return { ok: false, reason: "path does not end at the end cell" };
  const { cells } = maze;
  for (let i = 1; i < path.length; i++) {
    const [r, c] = path[i - 1], [nr, nc] = path[i];
    const dr = nr - r, dc = nc - c;
    let open = false;
    if (dr === -1 && dc === 0) open = cells[r][c].N;
    else if (dr === 1 && dc === 0) open = cells[r][c].S;
    else if (dr === 0 && dc === 1) open = cells[r][c].E;
    else if (dr === 0 && dc === -1) open = cells[r][c].W;
    if (!open) return { ok: false, reason: `illegal move ${r},${c} -> ${nr},${nc}` };
  }
  const optimal = bfsDistance(maze, start, end);
  const steps = path.length - 1;
  if (steps !== optimal) return { ok: false, reason: `path length ${steps} is not shortest (optimal is ${optimal})` };
  return { ok: true, msg: `valid path of ${steps} steps = shortest distance.` };
}

// --- Run tests across multiple sizes ---
let failures = 0;
const sizes = [[5, 5], [10, 10], [20, 20], [25, 18], [50, 50], [100, 100]];
for (const [cols, rows] of sizes) {
  const maze = generateMaze(cols, rows);
  const gen = validatePerfectMaze(maze);
  if (!gen.ok) { console.error(`FAIL generate ${cols}x${rows}: ${gen.reason}`); failures++; continue; }
  console.log(`PASS generate ${cols}x${rows}: ${gen.msg}`);

  const start = [0, 0], end = [rows - 1, cols - 1];
  const path = solveMaze(maze, start, end);
  const sol = validateSolution(maze, path, start, end);
  if (!sol.ok) { console.error(`FAIL solve ${cols}x${rows}: ${sol.reason}`); failures++; continue; }
  console.log(`PASS solve ${cols}x${rows}: ${sol.msg}`);
}

if (failures > 0) { console.error(`\n${failures} test(s) FAILED`); process.exit(1); }
console.log("\nAll acceptance tests PASSED");
