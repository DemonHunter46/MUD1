'use strict';

const { Broadcast: B } = require('ranvier');
const LineOfSight = require('../../bundle-example-lib/lib/LineOfSight');

const MAX_SCAN_RANGE = 3;

module.exports = {
  usage: 'scan [direction]',
  command: state => (args, player) => {
    args = args.trim().toLowerCase();

    if (args.length) {
      // Scan a specific direction
      scanDirection(state, player, args);
    } else {
      // Scan all directions
      scanAll(state, player);
    }
  }
};

function scanDirection(state, player, direction) {
  const validDirs = LineOfSight.DIRECTIONS;
  if (!validDirs.includes(direction)) {
    return B.sayAt(player, `Invalid direction. Valid directions: ${validDirs.join(', ')}.`);
  }

  const rooms = LineOfSight.traceLineOfSight(state, player.room, direction, MAX_SCAN_RANGE);

  if (!rooms.length) {
    return B.sayAt(player, `You can't see anything to the ${direction}.`);
  }

  B.sayAt(player, '');
  B.sayAt(player, `<b><white>Scanning ${direction}...</white></b>`);

  let found = false;
  for (const { room, distance } of rooms) {
    const npcs    = [...room.npcs];
    const players = [...room.players];

    if (!npcs.length && !players.length) continue;

    found = true;
    B.sayAt(player, ` <yellow>${distance} room(s) ${direction}</yellow> — <white>${room.title}</white>`);

    for (const npc of npcs) {
      const targetFlag = player._rangedTarget === npc ? ' <b><red>[TARGET]</red></b>' : '';
      B.sayAt(player, `   <green>[NPC]</green> ${npc.name}${targetFlag}`);
    }

    for (const p of players) {
      if (p === player) continue;
      const targetFlag = player._rangedTarget === p ? ' <b><red>[TARGET]</red></b>' : '';
      B.sayAt(player, `   <cyan>[Player]</cyan> ${p.name}${targetFlag}`);
    }
  }

  if (!found) {
    B.sayAt(player, ` Nothing visible to the ${direction}.`);
  }

  B.sayAt(player, '');
}

function scanAll(state, player) {
  const results = LineOfSight.scanAllDirections(state, player.room, MAX_SCAN_RANGE);

  B.sayAt(player, '');
  B.sayAt(player, '<b><white>====== Scan ======</white></b>');

  if (!Object.keys(results).length) {
    B.sayAt(player, ' Nothing visible in any direction.');
    B.sayAt(player, '<b><white>=================</white></b>');
    B.sayAt(player, '');
    return;
  }

  for (const [direction, entries] of Object.entries(results)) {
    B.sayAt(player, ` <yellow>${direction.toUpperCase()}</yellow>`);

    for (const { room, distance, npcs, players } of entries) {
      B.sayAt(player, `   <white>${distance} room(s) — ${room.title}</white>`);

      for (const npc of npcs) {
        const targetFlag = player._rangedTarget === npc ? ' <b><red>[TARGET]</red></b>' : '';
        B.sayAt(player, `     <green>[NPC]</green> ${npc.name}${targetFlag}`);
      }

      for (const p of players) {
        if (p === player) continue;
        const targetFlag = player._rangedTarget === p ? ' <b><red>[TARGET]</red></b>' : '';
        B.sayAt(player, `     <cyan>[Player]</cyan> ${p.name}${targetFlag}`);
      }
    }
  }

  B.sayAt(player, '<b><white>=================</white></b>');
  B.sayAt(player, '');
}