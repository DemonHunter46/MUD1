'use strict';

const { Random } = require('rando-js');
const { Damage, Logger } = require('ranvier');
const Parser = require('../../bundle-example-lib/lib/ArgParser');
const CombatErrors = require('./CombatErrors');

/**
 * This class is an example implementation of a Diku-style real time combat system. Combatants
 * attack and then have some amount of lag applied to them based on their weapon speed and repeat.
 */
class Combat {
  /**
   * Handle a single combat round for a given attacker
   * @param {GameState} state
   * @param {Character} attacker
   * @return {boolean} true if combat actions were performed this round
   */
  static updateRound(state, attacker) {
    if (attacker.combatData.killed) {
      return false;
    }

    if (!attacker.isInCombat()) {
      if (!attacker.isNpc) {
        attacker.removePrompt('combat');
      }
      return false;
    }

    let lastRoundStarted = attacker.combatData.roundStarted;
    attacker.combatData.roundStarted = Date.now();

    if (attacker.combatData.lag > 0) {
      const elapsed = Date.now() - lastRoundStarted;
      attacker.combatData.lag -= elapsed;
      return false;
    }

    let target = null;
    try {
      target = Combat.chooseCombatant(attacker);
    } catch (e) {
      attacker.removeFromCombat();
      attacker.combatData = {};
      throw e;
    }

    if (!target) {
      attacker.removeFromCombat();
      attacker.combatData = {};
      return false;
    }

    if (target.combatData.killed) {
      return false;
    }

    Combat.makeAttack(attacker, target);
    return true;
  }

  /**
   * Find a target for a given attacker
   * @param {Character} attacker
   * @return {Character|null}
   */
  static chooseCombatant(attacker) {
    if (!attacker.combatants.size) {
      return null;
    }

    for (const target of attacker.combatants) {
      if (!target.hasAttribute('health')) {
        throw new CombatErrors.CombatInvalidTargetError();
      }
      if (target.getAttribute('health') > 0) {
        return target;
      }
    }

    return null;
  }

  /**
   * Actually apply some damage from an attacker to a target
   * @param {Character} attacker
   * @param {Character} target
   */
  static makeAttack(attacker, target) {
    let amount = this.calculateWeaponDamage(attacker);
    let critical = false;

    if (attacker.hasAttribute('critical')) {
      const critChance = Math.max(attacker.getMaxAttribute('critical') || 0, 0);
      critical = Random.probability(critChance);
      if (critical) {
        amount = Math.ceil(amount * 1.5);
      }
    }

    // Apply AC damage reduction from target's metadata
    // AC value directly equals damage reduction percentage, capped at 60%
    const ac = (target.metadata && target.metadata.ac) || 0;
    const reductionPercent = Math.min(60, ac);
    if (reductionPercent > 0) {
      amount = Math.round(amount * (1 - reductionPercent / 100));
    }

    const weapon = attacker.equipment.get('wield');
    const damage = new Damage('health', amount, attacker, weapon || attacker, { critical, type: 'physical' });
    damage.commit(target);

    attacker.combatData.lag = this.getWeaponSpeed(attacker) * 1000;
  }

  /**
   * Any cleanup that has to be done if the character is killed
   * @param {Character} deadEntity
   * @param {?Character} killer
   */
  static handleDeath(state, deadEntity, killer) {
    if (deadEntity.combatData.killed) {
      return;
    }

    deadEntity.combatData.killed = true;
    deadEntity.removeFromCombat();

    Logger.log(`${killer ? killer.name : 'Something'} killed ${deadEntity.name}.`);

    if (killer) {
      deadEntity.combatData.killedBy = killer;
      killer.emit('deathblow', deadEntity);
    }
    deadEntity.emit('killed', killer);

    if (deadEntity.isNpc) {
      state.MobManager.removeMob(deadEntity);
    }
  }

  static startRegeneration(state, entity) {
    if (entity.hasEffectType('regen')) {
      return;
    }

    let regenEffect = state.EffectFactory.create('regen', { hidden: true }, { magnitude: 15 });
    if (entity.addEffect(regenEffect)) {
      regenEffect.activate();
    }
  }

  /**
   * @param {string} args
   * @param {Player} player
   * @return {Entity|null}
   */
  static findCombatant(attacker, search) {
    if (!search.length) {
      return null;
    }

    let possibleTargets = [...attacker.room.npcs];
    if (attacker.getMeta('pvp')) {
      possibleTargets = [...possibleTargets, ...attacker.room.players];
    }

    const target = Parser.parseDot(search, possibleTargets);

    if (!target) {
      return null;
    }

    if (target === attacker) {
      throw new CombatErrors.CombatSelfError("You smack yourself in the face. Ouch!");
    }

    if (!target.hasBehavior('combat')) {
      throw new CombatErrors.CombatPacifistError(`${target.name} is a pacifist and will not fight you.`, target);
    }

    if (!target.hasAttribute('health')) {
      throw new CombatErrors.CombatInvalidTargetError("You can't attack that target");
    }

    if (!target.isNpc && !target.getMeta('pvp')) {
      throw new CombatErrors.CombatNonPvpError(`${target.name} has not opted into PvP.`, target);
    }

    return target;
  }

  /**
   * Generate an amount of weapon damage
   * @param {Character} attacker
   * @param {boolean} average
   * @return {number}
   */
  static calculateWeaponDamage(attacker, average = false) {
    let weaponDamage = this.getWeaponDamage(attacker);
    let amount = 0;
    if (average) {
      amount = (weaponDamage.min + weaponDamage.max) / 2;
    } else {
      amount = Random.inRange(weaponDamage.min, weaponDamage.max);
    }

    return this.normalizeWeaponDamage(attacker, amount);
  }

  /**
   * Get the damage of the weapon the character is wielding
   * @param {Character} attacker
   * @return {{max: number, min: number}}
   */
  static getWeaponDamage(attacker) {
    const weapon = attacker.equipment.get('wield');
    if (weapon) {
      return {
        min: weapon.metadata.minDamage,
        max: weapon.metadata.maxDamage,
      };
    }

    // Unarmed damage scaled to strength
    const strength = attacker.hasAttribute('strength') ? attacker.getAttribute('strength') : 1;
    return {
      min: Math.max(1, Math.floor(strength / 5)),
      max: Math.max(2, Math.floor(strength / 3)),
    };
  }

  /**
   * Get the speed of the currently equipped weapon
   * @param {Character} attacker
   * @return {number}
   */
  static getWeaponSpeed(attacker) {
    let speed = 2.0;
    const weapon = attacker.equipment.get('wield');
    if (!attacker.isNpc && weapon) {
      speed = weapon.metadata.speed;
    }

    return speed;
  }

  /**
   * Get a damage amount adjusted by attack power/weapon speed
   * @param {Character} attacker
   * @param {number} amount
   * @return {number}
   */
  static normalizeWeaponDamage(attacker, amount) {
    let speed = this.getWeaponSpeed(attacker);
    amount += attacker.hasAttribute('strength') ? attacker.getAttribute('strength') : attacker.level;
    return Math.round(amount / 3.5 * speed);
  }
}

module.exports = Combat;