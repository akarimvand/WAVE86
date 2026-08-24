import fs from 'fs';
import readline from 'readline';
const f = process.argv[2] || 'oytblnmz_mouj (3).sql';
const reader = readline.createInterface({ input: fs.createReadStream(f, 'utf8'), crlfDelay: Infinity });
const sizes = {}, counts = {};
let total = 0, lines = 0, currentTable = null;
const biggest = [];
for await (let line of reader) {
  lines++;
  const m = line.match(/^INSERT INTO `([^`]+)`/);
  if (m) currentTable = m[1];
  if (currentTable) {
    sizes[currentTable] = (sizes[currentTable] || 0) + line.length + 1;
    total += line.length + 1;
    if (/^\(/.test(line) || m) counts[currentTable]++;
    if (line.length > 500000) {
      biggest.push({ table: currentTable, len: line.length, head: line.slice(0, 160) });
      // keep only first few giant lines
    }
  }
}
console.log('== bytes per table (desc) ==');
Object.entries(sizes).sort((a, b) => b[1] - a[1]).forEach(([t, b]) =>
  console.log(String(t).padEnd(24), String((b / 1048576).toFixed(2)).padStart(9), 'MB | rows~', counts[t]));
console.log('total MB:', (total / 1048576).toFixed(2), '| lines:', lines);
console.log('== sample giant lines (>500KB) ==');
biggest.slice(0, 5).forEach(b => console.log(b.table, '|', (b.len / 1048576).toFixed(2), 'MB |', b.head.replace(/\s+/g, ' ').slice(0, 140)));

