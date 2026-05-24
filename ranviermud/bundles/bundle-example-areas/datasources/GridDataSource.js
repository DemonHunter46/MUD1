'use strict';

const fs   = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class GridDataSource {
  constructor(config = {}) {
    this.config = config;
    this.bundle = null;
    this.area   = null;
  }

  setBundle(bundle) { this.bundle = bundle; }
  setArea(area)     { this.area   = area;   }

  _areaPath() {
    return this.config.path
      .replace('[BUNDLE]', this.bundle)
      .replace('[AREA]',   this.area);
  }

  async hasData() {
    return fs.existsSync(path.join(this._areaPath(), 'maps.yml'));
  }

  async fetchAll() {
    const areaPath   = this._areaPath();
    const mapsFile   = path.join(areaPath, 'maps.yml');
    const legendFile = path.join(areaPath, 'map-legend.yml');

    if (!fs.existsSync(mapsFile) || !fs.existsSync(legendFile)) {
      return [];
    }

    const maps   = yaml.load(fs.readFileSync(mapsFile,   'utf8'));
    const legend = yaml.load(fs.readFileSync(legendFile, 'utf8'));
    const rooms  = [];

    for (const mapConfig of maps) {
      const gridFile = path.join(areaPath, 'maps', mapConfig.file);
      if (!fs.existsSync(gridFile)) {
        console.warn(`GridDataSource: map file not found: ${gridFile}`);
        continue;
      }

      const grid    = fs.readFileSync(gridFile, 'utf8')
        .split('\n')
        .map(line => line.replace(/\r/, ''));

      const offsetX = (mapConfig.offset && mapConfig.offset[0]) || 0;
      const offsetY = (mapConfig.offset && mapConfig.offset[1]) || 0;
      const z       = mapConfig.z !== undefined ? mapConfig.z : 0;
      const height  = grid.length;

      for (let row = 0; row < grid.length; row++) {
        const line = grid[row];
        for (let col = 0; col < line.length; col++) {
          const symbol = line[col];

          if (symbol === '#' || symbol === ' ') continue;

          const template = legend[symbol];
          if (!template) {
            console.warn(`GridDataSource: no legend entry for '${symbol}' in ${mapConfig.file}`);
            continue;
          }

          const x = col + offsetX;
          const y = (height - 1 - row) + offsetY;

          // Make each room's id unique by appending coordinates
          const roomId = `${template.id}-${x}-${y}-${z}`;

          const room = {
            id:          roomId,
            title:       template.title,
            description: template.description,
            coordinates: [x, y, z],
          };

          if (template.exits)    room.exits    = template.exits.map(e => ({ ...e }));
          if (template.items)    room.items    = template.items;
          if (template.npcs)     room.npcs     = template.npcs;
          if (template.script)   room.script   = template.script;
          if (template.metadata) room.metadata = template.metadata;

          rooms.push(room);
        }
      }
    }

    return rooms;
  }
}

module.exports = GridDataSource;