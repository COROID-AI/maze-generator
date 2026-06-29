const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>/);
const code = match[1];

// Inject browser globals the script references at the top level.
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};
globalThis.devicePixelRatio = 1;

const ctxStub = new Proxy({}, { get: () => () => {} });
const fakeDoc = {
  getElementById: () => ({
    getBoundingClientRect: () => ({ width: 800, height: 600 }),
    textContent: '', style: {}, addEventListener: () => {},
    getContext: () => ctxStub,
  }),
  documentElement: {},
};
const fakeWindow = {
  devicePixelRatio: 1, addEventListener: () => {},
  requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
  getComputedStyle: () => ({ getPropertyValue: () => '' }),
};

const factory = new Function('document', 'window',
  code + '\nreturn { generateMaze, makeEmptyMaze, generateMazeAnimated };');
const { generateMaze, generateMazeAnimated } = factory(fakeDoc, fakeWindow);

function validate(maze) {
  const { cols, rows, cells } = maze;
  if (cells.length !== rows || cells[0].length !== cols) return 'BAD dims';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const cell = cells[r][c];
    if (cell.N && (r === 0 || !cells[r-1][c].S)) return 'asym N ' + r + ',' + c;
    if (cell.S && (r === rows-1 || !cells[r+1][c].N)) return 'asym S ' + r + ',' + c;
    if (cell.E && (c === cols-1 || !cells[r][c+1].W)) return 'asym E ' + r + ',' + c;
    if (cell.W && (c === 0 || !cells[r][c-1].E)) return 'asym W ' + r + ',' + c;
  }
  let ne = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (cells[r][c].N) ne++;
    if (cells[r][c].E) ne++;
  }
  const expected = cols * rows - 1;
  if (ne !== expected) return 'BAD edges=' + ne + ' expected=' + expected;
  return 'OK edges=' + ne;
}

console.log('generateMaze 5x5:', validate(generateMaze(5, 5)));
console.log('generateMaze 10x7:', validate(generateMaze(10, 7)));
const anim = generateMazeAnimated(25, 18);
console.log('generateMazeAnimated 25x18:', validate(anim.maze), 'steps=' + anim.steps.length);
