'use strict';

const Combat = require('../../lib/Combat');

/**
 * NPC combat behavior — updated for Aardwolf-style 3 second round system.
 * NPCs participate in the same round system as players.
 * First attacker gets aggro — mob always attacks the first player in its combatants set.
 */
module.exports = () => {
  return {
    listeners: {
      /**
       * Fire every 100ms — Combat.updateRound handles the 3 second lag internally
       */
      updateTick: state => function (config) {
        Combat.updateRound(state, this);
      },

      /**
       * NPC took damage — check for death
       */
      damaged: state => function (config, damage) {
        if (this.getAttribute('health') <= 0) {
          Combat.handleDeath(state, this, damage.attacker);
        }
      },

      /**
       * NPC killed a target — start regeneration if no longer in combat
       */
      deathblow: state => function (config, target) {
        if (!this.isInCombat()) {
          Combat.startRegeneration(state, this);
        }
      },

      /**
       * NPC left combat — start regeneration
       */
      combatEnd: state => function (config) {
        Combat.startRegeneration(state, this);
      },
    }
  };
};