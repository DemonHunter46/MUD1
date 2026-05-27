'use strict';

const { Broadcast: B, Logger } = require('ranvier');

/**
 * Aggro behavior — updated for Aardwolf-style combat.
 *
 * When a player enters the room the NPC waits for the configured delay
 * then initiates combat. The mob always attacks the first player it targeted
 * (first-attacker aggro). If multiple players are in the room the mob
 * picks the first one it sees and stays on that target.
 *
 * Options:
 *   delay: number, seconds before attacking. Default: 3
 *   warnMessage: string, warning sent at half delay. Supports %name% token.
 *   attackMessage: string, message sent on attack. Supports %name% token.
 *   towards:
 *     players: boolean, aggressive towards players. Default: true
 *     npcs: Array<EntityReference>|boolean, aggressive towards specific NPCs. Default: false
 */
module.exports = {
  listeners: {
    updateTick: state => function (config) {
      if (!this.room) return;

      if (typeof config !== 'object') {
        config = {};
      }

      config = Object.assign({
        delay: 3,
        warnMessage: '%name% growls, warning you away.',
        attackMessage: '%name% attacks you!',
        towards: {
          players: true,
          npcs: false,
        }
      }, config);

      // Already in combat — do nothing, Combat.updateRound handles the fighting
      if (this.isInCombat()) {
        return;
      }

      // Have an aggro target queued
      if (this._aggroTarget) {
        // Target left the room — clear aggro
        if (this._aggroTarget.room !== this.room) {
          this._aggroTarget = null;
          this._aggroWarned = false;
          return;
        }

        const elapsed     = Date.now() - this._aggroTimer;
        const delayMs     = config.delay * 1000;

        // Attack
        if (elapsed >= delayMs) {
          if (!this._aggroTarget.isNpc) {
            B.sayAt(this._aggroTarget, config.attackMessage.replace(/%name%/, this.name));
          } else {
            Logger.verbose(`NPC [${this.uuid}/${this.entityReference}] attacks NPC [${this._aggroTarget.uuid}/${this._aggroTarget.entityReference}] in room ${this.room.entityReference}.`);
          }
          this.initiateCombat(this._aggroTarget);
          this._aggroTarget = null;
          this._aggroWarned = false;
          return;
        }

        // Warn at half delay
        if (elapsed >= delayMs / 2 && !this._aggroTarget.isNpc && !this._aggroWarned) {
          B.sayAt(this._aggroTarget, config.warnMessage.replace(/%name%/, this.name));
          this._aggroWarned = true;
        }

        return;
      }

      // Find a target — players first
      if (config.towards.players && this.room.players.size) {
        this._aggroTarget = [...this.room.players][0];
        this._aggroTimer  = Date.now();
        return;
      }

      // Find a target — specific NPCs
      if (config.towards.npcs && this.room.npcs.size) {
        for (const npc of this.room.npcs) {
          if (npc === this) continue;

          if (
            config.towards.npcs === true ||
            (Array.isArray(config.towards.npcs) && config.towards.npcs.includes(npc.entityReference))
          ) {
            this._aggroTarget = npc;
            this._aggroTimer  = Date.now();
            return;
          }
        }
      }
    },

    /**
     * Player enters room — immediately start aggro timer
     */
    playerEnter: state => function (config, player) {
      if (this.isInCombat()) return;
      if (!config || config.towards === false) return;

      if (typeof config !== 'object') config = {};
      config = Object.assign({ towards: { players: true } }, config);

      if (config.towards.players && !this._aggroTarget) {
        this._aggroTarget = player;
        this._aggroTimer  = Date.now();
      }
    },
  }
};