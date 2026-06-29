const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error('No script tag found'); process.exit(1); }
const code = m[1];
try {
  new Function(code);
  console.log('Script parses OK (no syntax errors). Length:', code.length, 'chars');
} catch (e) {
  console.error('SYNTAX ERROR:', e.message);
  process.exit(1);
}
console.log('solveMaze defined:', code.includes('function solveMaze'));
console.log('window.solveMaze exposed:', code.includes('window.solveMaze = solveMaze'));
console.log('solveMaze in __maze:', code.includes('solveMaze,'));
