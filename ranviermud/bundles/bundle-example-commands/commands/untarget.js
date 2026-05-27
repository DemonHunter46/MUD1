'use strict';

const { Broadcast: B } = require('ranvier');

module.exports = {
  usage: 'untarget',
  command: state => (args, player) => {
    if (!player._rangedTarget) {
      return B.sayAt(player, 'You have no ranged target acquired.');
    }

    const name = player._rangedTarget.name;
    player._rangedTarget    = null;
    player._rangedTargetDir = null;

    B.sayAt(player, `You release your target on ${name}.`);
  }
};