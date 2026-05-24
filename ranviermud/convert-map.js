'use strict';

const fs   = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// ============================================================
// USAGE: node convert-map.js map.txt map-legend.yml rooms.yml
// ============================================================

const [,, mapFile, legendFile, outputFile] = process.argv;

if (!mapFile || !legendFile || !outputFile) {
  console.error('Usage: node convert-map.js <map.txt> <map-legend.yml> <output/rooms.yml>');
  process.exit(1);
}

// Read input files
const grid   = fs.readFileSync(mapFile, 'utf8')
  .split('\n')
  .map(line => line.replace(/\r/g, ''));

const legend = yaml.load(fs.readFileSync(legendFile, 'utf8'));

const rooms  = [];
const height = grid.length;

for (let row = 0; row < grid.length; row++) {
  const line = grid[row];
  for (let col = 0; col < line.length; col++) {
    const symbol = line[col];

    // Skip walls and spaces
    if (symbol === '#' || symbol === ' ') continue;

    const template = legend[symbol];
    if (!template) {
      console.warn(`Warning: no legend entry for symbol '${symbol}' at row ${row} col ${col} — skipping`);
      continue;
    }

    const x = col;
    const y = (height - 1 - row); // flip Y so north is up

    // Pick a random description from the pool
    let description = '';
    if (Array.isArray(template.descriptions) && template.descriptions.length > 0) {
      const index = Math.floor(Math.random() * template.descriptions.length);
      description = template.descriptions[index];
    } else if (typeof template.description === 'string') {
      description = template.description;
    }

    const room = {
      id:          `${template.id}-${x}-${y}`,
      title:       template.title,
      description: description,
      coordinates: [x, y, 0],
    };

    // Copy optional fields from legend
    if (template.metadata) room.metadata = { ...template.metadata };
    if (template.exits)    room.exits    = template.exits.map(e => ({ ...e }));
    if (template.npcs)     room.npcs     = template.npcs;
    if (template.items)    room.items    = template.items;

    rooms.push(room);
  }
}

// Write output
const output = yaml.dump(rooms, { lineWidth: -1 });
fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, output, 'utf8');

console.log(`Done — wrote ${rooms.length} rooms to ${outputFile}`);