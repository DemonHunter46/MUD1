'use strict';

const { Broadcast: B } = require('ranvier');

module.exports = {
  config: {
    name: 'Magical Shield',
    type: 'spell-shield',
    duration: 30000,          // 30 seconds
  },
  state: {
    player: null,
    reduction: 0,
  },
  modifiers: {
    incomingDamage: function (damage, currentAmount) {
      // Reduce all incoming damage by 15%
      return Math.round(currentAmount * 0.85);
    },
  },
  listeners: {
    effectActivated: function () {
      const player = this.state.player;
      this.state.reduction = 15;
      B.sayAt(player, '<b><blue>A shimmering magical shield forms around you, reducing incoming damage!</blue></b>');
      B.sayAtExcept(player.room, `<blue>${player.name} is surrounded by a magical shield!</blue>`, player);
    },
    effectDeactivated: function () {
      const player = this.state.player;
      if (player) {
        B.sayAt(player, '<blue>Your magical shield fades.</blue>');
      }
    },
  },
};