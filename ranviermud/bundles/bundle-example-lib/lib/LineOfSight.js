'use strict';

/**
 * Line of sight utility — shared by ranged combat and ranged spells.
 * Traces cardinal exits from a room up to maxRange steps in a straight line.
 * Doors that are closed or locked break line of sight.
 */

const DIRECTIONS = ['north', 'south', 'east', 'west', 'up', 'down'];

const OPPOSITES = {
  north: 'south',
  south: 'north',
  east:  'west',
  west:  'east',
  up:    'down',
  down:  'up',
};

/**
 * Trace a straight line of sight from a room in a direction up to maxRange steps.
 * Returns an array of { room, distance } objects representing visible rooms.
 * Stops at closed/locked doors or missing exits.
 *
 * @param {GameState} state
 * @param {Room} fromRoom
 * @param {string} direction
 * @param {number} maxRange
 * @return {Array<{room: Room, distance: number}>}
 */
function traceLineOfSight(state, fromRoom, direction, maxRange) {
  const visible = [];
  let currentRoom = fromRoom;

  for (let distance = 1; distance <= maxRange; distance++) {
    const exit = currentRoom.getExits().find(e => e.direction === direction);
    if (!exit) break;

    const nextRoom = state.RoomManager.getRoom(exit.roomId);
    if (!nextRoom) break;

    // Check for doors blocking line of sight
    const door = currentRoom.getDoor(nextRoom) || nextRoom.getDoor(currentRoom);
    if (door && (door.locked || door.closed)) break;

    visible.push({ room: nextRoom, distance });
    currentRoom = nextRoom;
  }

  return visible;
}

/**
 * Scan all directions from a room up to maxRange.
 * Returns a map of direction -> array of { room, distance, npcs, players }
 *
 * @param {GameState} state
 * @param {Room} fromRoom
 * @param {number} maxRange
 * @return {Object}
 */
function scanAllDirections(state, fromRoom, maxRange) {
  const results = {};

  for (const direction of DIRECTIONS) {
    const rooms = traceLineOfSight(state, fromRoom, direction, maxRange);
    if (!rooms.length) continue;

    const entries = [];
    for (const { room, distance } of rooms) {
      const npcs    = [...room.npcs];
      const players = [...room.players];
      if (npcs.length || players.length) {
        entries.push({ room, distance, npcs, players });
      }
    }

    if (entries.length) {
      results[direction] = entries;
    }
  }

  return results;
}

/**
 * Find a specific target by name in a direction up to maxRange.
 * Returns { target, room, distance } or null if not found.
 *
 * @param {GameState} state
 * @param {Room} fromRoom
 * @param {string} direction
 * @param {string} targetName
 * @param {number} maxRange
 * @return {{ target: Character, room: Room, distance: number }|null}
 */
function findTarget(state, fromRoom, direction, targetName, maxRange) {
  const rooms = traceLineOfSight(state, fromRoom, direction, maxRange);

  for (const { room, distance } of rooms) {
    // Search NPCs
    for (const npc of room.npcs) {
      if (
        npc.name.toLowerCase().includes(targetName.toLowerCase()) ||
        (npc.keywords && npc.keywords.some(k => k.toLowerCase().includes(targetName.toLowerCase())))
      ) {
        return { target: npc, room, distance };
      }
    }

    // Search players
    for (const player of room.players) {
      if (player.name.toLowerCase().includes(targetName.toLowerCase())) {
        return { target: player, room, distance };
      }
    }
  }

  return null;
}

/**
 * Check if a specific target is still within line of sight.
 * Used to validate an acquired target before shooting.
 *
 * @param {GameState} state
 * @param {Room} fromRoom
 * @param {Character} target
 * @param {number} maxRange
 * @return {{ room: Room, distance: number, direction: string }|null}
 */
function checkTarget(state, fromRoom, target, maxRange) {
  for (const direction of DIRECTIONS) {
    const rooms = traceLineOfSight(state, fromRoom, direction, maxRange);
    for (const { room, distance } of rooms) {
      if (room === target.room) {
        return { room, distance, direction };
      }
    }
  }
  return null;
}

module.exports = { traceLineOfSight, scanAllDirections, findTarget, checkTarget, DIRECTIONS, OPPOSITES };