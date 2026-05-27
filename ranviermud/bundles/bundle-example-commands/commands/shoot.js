'use strict';

const { Broadcast: B } = require('ranvier');
const { Random } = require('rando-js');
const { Damage } = require('ranvier');
const LineOfSight = require('../../bundle-example-lib/lib/LineOfSight');
const ArgParser   = require('../../bundle-example-lib/lib/ArgParser');

const MAX_RANGE = 3;

module.exports = {
  usage: 'shoot [target]',
  command: state => (args, player) => {
    args = args.trim();

    // Get readied ranged weapon
    const weapon = player.equipment.get('ready');
    if (!weapon) {
      return B.sayAt(player, 'You have no ranged weapon readied. Use <b>ready <item></b> first.');
    }

    // Check ammo
    const ammoType = weapon.metadata.ammo;
    let ammo = null;
    if (ammoType) {
      if (player.inventory) {
        for (const [uuid, item] of player.inventory) {
          if (item.metadata && item.metadata.ammoType === ammoType) {
            ammo = item;
            break;
          }
        }
      }
      if (!ammo) {
        return B.sayAt(player, `You have no ${ammoType} to fire.`);
      }
    }

    // Resolve target
    let target = null;
    let targetRoom = null;
    let targetDistance = 0;

    if (args.length) {
      // Target specified inline — search all directions
      for (const direction of LineOfSight.DIRECTIONS) {
        const result = LineOfSight.findTarget(state, player.room, direction, args, MAX_RANGE);
        if (result) {
          target         = result.target;
          targetRoom     = result.room;
          targetDistance = result.distance;
          player._rangedTarget    = target;
          player._rangedTargetDir = direction;
          break;
        }
      }
      if (!target) {
        return B.sayAt(player, `You can't see '${args}' anywhere in range.`);
      }
    } else if (player._rangedTarget) {
      // Use acquired target
      const check = LineOfSight.checkTarget(state, player.room, player._rangedTarget, MAX_RANGE);
      if (!check) {
        player._rangedTarget    = null;
        player._rangedTargetDir = null;
        return B.sayAt(player, 'Your target is no longer in range.');
      }
      target         = player._rangedTarget;
      targetRoom     = check.room;
      targetDistance = check.distance;
    } else {
      return B.sayAt(player, 'No target acquired. Use <b>target <direction> <name></b> first, or <b>shoot <name></b>.');
    }

    // Cannot shoot someone in the same room
    if (targetRoom === player.room) {
      return B.sayAt(player, `${target.name} is right here — fight them in melee!`);
    }

    // Calculate ranged damage
    // Base damage from weapon, modified by dexterity and range penalty
    const dex          = player.getAttribute('dexterity') || 10;
    const dexBonus     = Math.max(0, (dex - 10) * 0.02);
    const rangePenalty = 1 - ((targetDistance - 1) * 0.1); // 10% damage reduction per room
    const minDamage    = weapon.metadata.minDamage || 1;
    const maxDamage    = weapon.metadata.maxDamage || 5;
    let amount         = Random.inRange(minDamage, maxDamage);
    amount             = Math.round(amount * (1 + dexBonus) * rangePenalty);
    amount             = Math.max(1, amount);

    // Apply damage
    const damage = new Damage('health', amount, player, weapon, { type: 'physical', ranged: true });
    damage.commit(target);

    // Consume ammo
    if (ammo) {
      player.removeItem(ammo);
      state.ItemManager.remove(ammo);
    }

    // Messages
    B.sayAt(player, `<b><yellow>You fire ${weapon.name} at ${target.name} for <white>${amount}</white> damage!</yellow></b>`);
    B.sayAtExcept(player.room, `<yellow>${player.name} fires ${weapon.name} towards the ${player._rangedTargetDir}!</yellow>`, player);
    B.sayAt(targetRoom, `<red>A projectile strikes ${target.name} from the ${LineOfSight.OPPOSITES[player._rangedTargetDir]}!</red>`);

    // Initiate combat if not already in it
    if (!target.isInCombat()) {
      target.emit('combatStart');
      target.addCombatant(player);
      player.addCombatant(target);

      // NPC tracks player down after being shot
      if (target.isNpc) {
        setTimeout(() => {
          if (target.combatData && !target.combatData.killed && target.room !== player.room) {
            B.sayAt(targetRoom, `<red>${target.name} charges towards the ${LineOfSight.OPPOSITES[player._rangedTargetDir]}!</red>`);
            B.sayAt(player.room, `<red>${target.name} bursts into the room!</red>`);
            target.moveTo(player.room);
          }
        }, 3000);
      }
    }
  }
};