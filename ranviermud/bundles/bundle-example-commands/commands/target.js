'use strict';

const { Broadcast: B } = require('ranvier');
const LineOfSight = require('../../bundle-example-lib/lib/LineOfSight');

const MAX_RANGE = 3;

module.exports = {
  usage: 'target <direction> <name>',
  command: state => (args, player) => {
    args = args.trim();

    if (!args.length) {
      // Show current target
      if (!player._rangedTarget) {
        return B.sayAt(player, 'You have no ranged target acquired. Usage: target <direction> <name>');
      }

      const check = LineOfSight.checkTarget(state, player.room, player._rangedTarget, MAX_RANGE);
      if (!check) {
        player._rangedTarget = null;
        player._rangedTargetDir = null;
        return B.sayAt(player, 'Your target is no longer in range.');
      }

      return B.sayAt(player, `Current target: <b><red>${player._rangedTarget.name}</red></b> (${check.distance} room(s) ${check.direction})`);
    }

    const parts     = args.split(' ');
    const direction = parts[0].toLowerCase();
    const targetArg = parts.slice(1).join(' ');

    if (!targetArg.length) {
      return B.sayAt(player, 'Usage: target <direction> <name>');
    }

    // Validate direction
    if (!LineOfSight.DIRECTIONS.includes(direction)) {
      return B.sayAt(player, `Invalid direction. Valid directions: ${LineOfSight.DIRECTIONS.join(', ')}.`);
    }

    // Cannot target in same room
    if (!targetArg.length) {
      return B.sayAt(player, 'Specify a target name.');
    }

    // Find target along line of sight
    const result = LineOfSight.findTarget(state, player.room, direction, targetArg, MAX_RANGE);

    if (!result) {
      return B.sayAt(player, `You can't see '${targetArg}' to the ${direction}.`);
    }

    // Cannot target someone in the same room — must use melee
    if (result.room === player.room) {
      return B.sayAt(player, `${result.target.name} is right here. Fight them in melee!`);
    }

    player._rangedTarget    = result.target;
    player._rangedTargetDir = direction;

    B.sayAt(player, `<b><red>Target acquired:</red></b> ${result.target.name} (${result.distance} room(s) to the ${direction}).`);
    B.sayAt(player, `Type <b>shoot</b> to attack or <b>untarget</b> to clear.`);
  }
};