'use strict';

const { Random } = require('rando-js');
const { Damage, Logger } = require('ranvier');
const Parser = require('../../bundle-example-lib/lib/ArgParser');
const CombatErrors = require('./CombatErrors');

const ROUND_LENGTH = 3000; // 3 seconds per round — same as Aardwolf

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

    Combat.makeAttack(state, attacker, target);
    return true;
  }

  /**
   * Find a target for a given attacker.
   * Simple first-attacker aggro — always attack the first combatant in the set.
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
   * Get the next living combatant after a kill — enables Aardwolf-style hit rollover.
   * @param {Character} attacker
   * @param {Character} deadTarget
   * @return {Character|null}
   */
  static getNextCombatant(attacker, deadTarget) {
    for (const combatant of attacker.combatants) {
      if (
        combatant !== deadTarget &&
        !combatant.combatData.killed &&
        combatant.getAttribute('health') > 0
      ) {
        return combatant;
      }
    }
    return null;
  }

  /**
   * Calculate total hits for this round.
   *
   * Formula:
   *   baseHits  = weapon speed determines base swing rate (faster = more swings)
   *   dexBonus  = DEX above 10 adds hits (+1 per 4 DEX) — nimbler = more openings
   *   strBonus  = STR above 10 adds hits (+1 per 6 STR) — stronger = forces more swings
   *   levelBonus = players gain +1 hit per 5 levels (NPCs use stats only)
   *
   * @param {Character} attacker
   * @return {number}
   */
  static calculateHits(attacker) {
    const weapon    = attacker.equipment.get('wield');
    const speed     = weapon && weapon.metadata.speed ? weapon.metadata.speed : 2.0;
    const strength  = attacker.hasAttribute('strength')  ? attacker.getAttribute('strength')  : 10;
    const dexterity = attacker.hasAttribute('dexterity') ? attacker.getAttribute('dexterity') : 10;

    // Base hits from weapon speed — faster weapons swing more often
    const baseHits = Math.max(1, Math.round(3 / speed));

    // DEX contributes more to hit count than STR
    // DEX represents speed and technique — finding more openings
    const dexBonus = Math.floor(Math.max(0, dexterity - 10) / 4);

    // STR contributes less to hit count — raw power forces occasional extra swings
    const strBonus = Math.floor(Math.max(0, strength - 10) / 6);

    // Level bonus for players only — veteran fighters attack more efficiently
    // NPCs derive all their combat power from stats alone
    const levelBonus = attacker.isNpc ? 0 : Math.floor(attacker.level / 5);

    return Math.max(1, baseHits + dexBonus + strBonus + levelBonus);
  }

  /**
   * Execute a full combat round — multiple hits with Aardwolf-style rollover.
   * Fixed 3 second round lag.
   *
   * @param {GameState} state
   * @param {Character} attacker
   * @param {Character} target
   */
  static makeAttack(state, attacker, target) {
    const totalHits   = this.calculateHits(attacker);
    let currentTarget = target;

    for (let i = 0; i < totalHits; i++) {
      // Roll over to next target if current target died mid-round
      if (
        !currentTarget ||
        currentTarget.combatData.killed ||
        currentTarget.getAttribute('health') <= 0
      ) {
        currentTarget = this.getNextCombatant(attacker, currentTarget);
        if (!currentTarget) break;
      }

      let amount   = this.calculateWeaponDamage(state, attacker);
      let critical = false;

      if (attacker.hasAttribute('critical')) {
        const critChance = Math.max(attacker.getMaxAttribute('critical') || 0, 0);
        critical = Random.probability(critChance);
        if (critical) {
          amount = Math.ceil(amount * 1.5);
        }
      }

      // AC reduction — sum all equipped armor for both players and NPCs
      let ac = 0;
      for (const [slot, item] of currentTarget.equipment) {
        if (item.metadata && item.metadata.ac) {
          ac += item.metadata.ac;
        }
      }

      const reductionPercent = Math.min(60, ac);
      if (reductionPercent > 0) {
        amount = Math.round(amount * (1 - reductionPercent / 100));
      }

      amount = Math.max(1, amount);

      const weapon = attacker.equipment.get('wield');
      const damage = new Damage('health', amount, attacker, weapon || attacker, { critical, type: 'physical' });
      damage.commit(currentTarget);
    }

    // Fixed 3 second round — same as Aardwolf
    attacker.combatData.lag = ROUND_LENGTH;
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
   * @param {GameState} state
   * @param {Character} attacker
   * @param {boolean} average
   * @return {number}
   */
  static calculateWeaponDamage(state, attacker, average = false) {
    let weaponDamage = this.getWeaponDamage(state, attacker);
    let amount = 0;
    if (average) {
      amount = (weaponDamage.min + weaponDamage.max) / 2;
    } else {
      amount = Random.inRange(weaponDamage.min, weaponDamage.max);
    }

    return this.normalizeWeaponDamage(state, attacker, amount);
  }

  /**
   * Get the damage range of the weapon the character is wielding.
   * Priority:
   *   1. Equipped weapon metadata
   *   2. Unarmed fallback scaled to strength
   * @param {GameState} state
   * @param {Character} attacker
   * @return {{max: number, min: number}}
   */
  static getWeaponDamage(state, attacker) {
    const weapon = attacker.equipment.get('wield');
    if (weapon) {
      return {
        min: weapon.metadata.minDamage,
        max: weapon.metadata.maxDamage,
      };
    }

    // Unarmed — scaled to strength
    const strength = attacker.hasAttribute('strength') ? attacker.getAttribute('strength') : 1;
    return {
      min: Math.max(1, Math.floor(strength / 5)),
      max: Math.max(2, Math.floor(strength / 3)),
    };
  }

  /**
   * Normalise weapon damage.
   * Speed no longer multiplies damage — it only affects hit count via calculateHits.
   * Strength adds a flat bonus to every hit.
   * Dividing by 3.5 keeps the bonus reasonable at all stat levels.
   *
   * STR 10 → +2 per hit
   * STR 14 → +4 per hit
   * STR 18 → +5 per hit
   * STR 30 → +8 per hit
   *
   * @param {GameState} state
   * @param {Character} attacker
   * @param {number} amount
   * @return {number}
   */
  static normalizeWeaponDamage(state, attacker, amount) {
    const strength = attacker.hasAttribute('strength') ? attacker.getAttribute('strength') : attacker.level;
    return Math.round(amount + (strength / 3.5));
  }

  /**
   * Get weapon speed — used only by calculateHits, not damage.
   * @param {GameState} state
   * @param {Character} attacker
   * @return {number}
   */
  static getWeaponSpeed(state, attacker) {
    const weapon = attacker.equipment.get('wield');
    if (weapon && weapon.metadata.speed) {
      return weapon.metadata.speed;
    }
    return 2.0;
  }
}

module.exports = Combat;