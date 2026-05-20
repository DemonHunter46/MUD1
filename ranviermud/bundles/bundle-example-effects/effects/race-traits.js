'use strict';

module.exports = {
  config: {
    name: 'Racial Traits',
    description: 'Tracks passive abilities, spells, and custom bonuses inherent to your biological species.',
    unique: true,
    persists: true
  },
  listeners: {
    /**
     * Combat event handler hook. Fires whenever the host swings or lands an attack.
     */
    hitOut: function (state) {
      return function (damage, target) {
        const player = this.target;
        const race = player.metadata ? player.metadata.race : player.getMeta('race');
        const subrace = player.metadata ? player.metadata.subrace : player.getMeta('subrace');

        // --- AARAKOCRA TRAIT: TALONS ---
        if (race === 'aarakocra') {
          const talonBonus = Math.floor(Math.random() * 6) + 1; // Roll 1d6
          damage.amount += talonBonus;

          const { Broadcast } = require('ranvier');
          Broadcast.sayAt(player, `<yellow>Your sharp talons slash out at ${target.name}, dealing an extra +${talonBonus} damage!</yellow>`);
        }

        // --- FIRE GENASI TRAIT: ELEMENTAL EMBERS ---
        if (race === 'genasi' && subrace === 'fire') {
          const flameBonus = Math.floor(Math.random() * 4) + 1; // Roll 1d4
          damage.amount += flameBonus;

          const { Broadcast } = require('ranvier');
          Broadcast.sayAt(player, `<red>Your fists burst with volatile elemental sparks, scorching ${target.name} for +${flameBonus} fire damage!</red>`);
        }
      };
    }
  }
};