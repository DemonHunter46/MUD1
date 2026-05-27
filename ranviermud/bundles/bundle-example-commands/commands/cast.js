'use strict';

const { Broadcast: B } = require('ranvier');
const ArgParser   = require('../../bundle-example-lib/lib/ArgParser');
const SPELLS      = require('../../bundle-example-lib/lib/SpellManager');
const LineOfSight = require('../../bundle-example-lib/lib/LineOfSight');

module.exports = {
  usage: 'cast <spell> [target]',
  command: state => (args, player) => {
    args = args.trim();

    if (!args.length) {
      return B.sayAt(player, 'Cast what spell? Type <b>spells</b> to see your known spells.');
    }

    // Parse spell name and optional target
    const parts     = args.split(' ');
    const spellId   = parts[0].toLowerCase();
    const targetArg = parts.slice(1).join(' ');

    // Check spell exists
    const spell = SPELLS[spellId];
    if (!spell) {
      return B.sayAt(player, `No spell named '<b>${spellId}</b>' exists. Type <b>spells</b> to see your known spells.`);
    }

    // Check player knows the spell
    const knownSpells = player.getMeta('knownSpells') || [];
    if (!knownSpells.includes(spellId)) {
      return B.sayAt(player, `You don't know how to cast <b>${spell.name}</b>. Seek a trainer or spellbook.`);
    }

    // Check intelligence requirement
    const intelligence = player.getAttribute('intelligence') || 0;
    if (intelligence < spell.minIntelligence) {
      return B.sayAt(player, `You need at least <b>${spell.minIntelligence}</b> Intelligence to cast <b>${spell.name}</b>. You have <b>${intelligence}</b>.`);
    }

    // Check combat requirement
    if (spell.combatOnly && !player.isInCombat()) {
      return B.sayAt(player, `<b>${spell.name}</b> can only be cast in combat.`);
    }

    // Check cast lag — are we still recovering from a previous cast or attack?
    if (player.combatData && player.combatData.lag > 0) {
      const remaining = Math.ceil(player.combatData.lag / 1000);
      return B.sayAt(player, `You must wait <b>${remaining}</b> more second(s) before acting again.`);
    }

    // Check spell cooldown
    player._spellCooldowns = player._spellCooldowns || {};
    const cooldownExpiry   = player._spellCooldowns[spellId] || 0;
    const remainingMs      = cooldownExpiry - Date.now();
    if (remainingMs > 0) {
      const remaining = Math.ceil(remainingMs / 1000);
      return B.sayAt(player, `<b>${spell.name}</b> is on cooldown for <b>${remaining}</b> more second(s).`);
    }

    // Check mana
    const currentMana = player.getAttribute('mana') || 0;
    if (currentMana < spell.manaCost) {
      return B.sayAt(player, `Not enough mana. <b>${spell.name}</b> costs <b>${spell.manaCost}</b> mana. You have <b>${currentMana}</b>.`);
    }

    // Resolve target
    let target = null;

    if (spell.requiresTarget) {
      if (spell.range === 0) {
        // Touch range — target must be in the same room
        if (!targetArg.length) {
          if (player.isInCombat()) {
            target = [...player.combatants][0];
          } else {
            return B.sayAt(player, `<b>${spell.name}</b> requires a target. Usage: cast ${spellId} <target>`);
          }
        } else {
          target = ArgParser.parseDot(targetArg, [...player.room.npcs, ...player.room.players]);
          if (!target) {
            return B.sayAt(player, `You don't see '<b>${targetArg}</b>' here.`);
          }
          if (target === player) {
            return B.sayAt(player, `You can't target yourself with <b>${spell.name}</b>.`);
          }
        }
      } else {
        // Ranged spell — use line of sight
        if (!targetArg.length) {
          if (player._rangedTarget) {
            // Use acquired ranged target
            const check = LineOfSight.checkTarget(state, player.room, player._rangedTarget, spell.range);
            if (!check) {
              player._rangedTarget    = null;
              player._rangedTargetDir = null;
              return B.sayAt(player, `Your target is no longer within range of <b>${spell.name}</b>.`);
            }
            target = player._rangedTarget;
          } else if (player.isInCombat()) {
            // Fall back to first melee combatant
            const combatant = [...player.combatants][0];
            if (combatant && combatant.room === player.room) {
              return B.sayAt(player, `${combatant.name} is right here — use a touch range spell or melee!`);
            }
            return B.sayAt(player, `<b>${spell.name}</b> requires a target. Usage: cast ${spellId} <target>`);
          } else {
            return B.sayAt(player, `<b>${spell.name}</b> requires a target. Usage: cast ${spellId} <target>`);
          }
        } else {
          // Check same room first
          const sameRoomTarget = ArgParser.parseDot(targetArg, [...player.room.npcs, ...player.room.players]);
          if (sameRoomTarget && sameRoomTarget !== player) {
            return B.sayAt(player, `${sameRoomTarget.name} is right here — use a touch range spell or melee!`);
          }

          // Search along line of sight in all directions
          let found = null;
          for (const direction of LineOfSight.DIRECTIONS) {
            const result = LineOfSight.findTarget(state, player.room, direction, targetArg, spell.range);
            if (result) {
              found = result;
              break;
            }
          }

          if (!found) {
            return B.sayAt(player, `You can't see '<b>${targetArg}</b>' within range of <b>${spell.name}</b> (range: ${spell.range} room(s)).`);
          }

          target = found.target;
        }
      }
    }

    // All checks passed — execute the spell

    // Deduct mana
    player.lowerAttribute('mana', spell.manaCost);

    // Set spell cooldown
    player._spellCooldowns[spellId] = Date.now() + (spell.cooldown * 1000);

    // Apply cast lag — consumes the combat round
    // castLag defaults to one round if not specified
    if (!player.combatData) player.combatData = {};
    player.combatData.lag = spell.castLag || 3000;

    // Apply spell effect
    try {
      const effect = state.EffectFactory.create(
        spell.effect,
        { name: spell.name },
        { target, player }
      );
      player.addEffect(effect);
      effect.activate();
    } catch (err) {
      // Refund mana and lag if effect fails
      player.raiseAttribute('mana', spell.manaCost);
      player.combatData.lag = 0;
      B.sayAt(player, `Something went wrong casting <b>${spell.name}</b>.`);
      return;
    }

    // Broadcast messages
    if (target && target.room !== player.room) {
      B.sayAt(player, `<b><cyan>You cast <white>${spell.name}</white> across the distance!</cyan></b>`);
      B.sayAtExcept(player.room, `<cyan>${player.name} casts <b>${spell.name}</b> into the distance!</cyan>`, player);
      B.sayAt(target.room, `<cyan>A magical force erupts from a distance!</cyan>`);
    } else {
      B.sayAt(player, `<b><cyan>You cast <white>${spell.name}</white>!</cyan></b>`);
      B.sayAtExcept(player.room, `<cyan>${player.name} casts <b>${spell.name}</b>!</cyan>`, player);
    }

    // Show remaining mana
    const remainingMana = player.getAttribute('mana') || 0;
    const maxMana       = player.getMaxAttribute('mana') || 0;
    B.sayAt(player, `<blue>Mana: <white>${remainingMana}</white>/<white>${maxMana}</white></blue>`);
  }
};