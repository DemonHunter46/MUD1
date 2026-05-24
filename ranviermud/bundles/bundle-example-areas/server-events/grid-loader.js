'use strict';

const fs   = require('fs');
const path = require('path');
const GridDataSource = require('../datasources/GridDataSource');

module.exports = {
  listeners: {
    startup: state => async function (commander) {
      const bundlesPath = path.join(__dirname, '../../../');
      const bundles = fs.readdirSync(bundlesPath)
        .filter(b => fs.statSync(path.join(bundlesPath, b)).isDirectory());

      for (const bundle of bundles) {
        const areasPath = path.join(bundlesPath, bundle, 'areas');
        if (!fs.existsSync(areasPath)) continue;

        const areas = fs.readdirSync(areasPath)
          .filter(a => fs.statSync(path.join(areasPath, a)).isDirectory());

        for (const areaName of areas) {
          const mapsFile = path.join(areasPath, areaName, 'maps.yml');
          if (!fs.existsSync(mapsFile)) continue;

          const area = state.AreaManager.getArea(areaName);
          if (!area) {
            console.warn(`GridLoader: area '${areaName}' not found in AreaManager — skipping`);
            continue;
          }

          const source = new GridDataSource({
            path: path.join(bundlesPath, '[BUNDLE]', 'areas', '[AREA]')
          });
          source.setBundle(bundle);
          source.setArea(areaName);

          const rooms = await source.fetchAll();

          for (const roomDef of rooms) {
            const entityRef = `${areaName}:${roomDef.id}`;

            // Skip if already loaded
            if (state.RoomManager.getRoom(entityRef)) continue;

            state.RoomFactory.setDefinition(entityRef, roomDef);
            const room = state.RoomFactory.create(area, entityRef);
            area.addRoom(room);
            state.RoomManager.addRoom(room);
            room.hydrate(state);
          }

          console.log(`GridLoader: loaded ${rooms.length} rooms into '${areaName}'`);
        }
      }
    }
  }
};