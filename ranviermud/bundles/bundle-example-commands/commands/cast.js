'use strict';

const { Broadcast: B, Damage } = require('ranvier');
const ArgParser = require('../../bundle-example-lib/lib/ArgParser');
const SPELLS = require('../../bundle-example-lib/lib/SpellManager');

module.exports = {
  usage: 'cast <spell> [target]',
  command: state => (args, player) => {
    args = args.trim();

    if (!args.length) {
      return B.sayAt(player, 'Cast what spell? Type <b>spells</b> to see your known spells.');
    }

    // Parse spell name and optional target
    const parts  = args.split(' ');
    const spellId = parts[0].toLowerCase();
    const targetArg = parts.slice(1).join(' ');

    // Check spell exists
    const spell = SPELLS[spellId];
    if (!spell) {
      return B.sayAt(player, `No spell named '<b>${spellId}</b>' exists.`);
    }

    // Check player knows the spell
    const knownSpells = player.getMeta('knownSpells') || [];
    if (!knownSpells.includes(spellId)) {
      return B.sayAt(player, `You don't know how to cast <b>${spell.name}</b>. Seek a trainer or spellbook.`);
    }

    // Check intelligence requirement
    const intelligence = player.getAttribute('intelligence') || 0;
    if (intelligence < spell.minIntelligence) {
      return B.sayAt(player, `You need at least <b>${spell.minIntelligence}</b> Intelligence to cast <b>${spell.name}</b>.`);
    }

    // Check combat requirement
    if (spell.combatOnly && !player.isInCombat()) {
      return B.sayAt(player, `<b>${spell.name}</b> can only be cast in combat.`);
    }

    // Check cooldown
    player._spellCooldowns = player._spellCooldowns || {};
    const cooldownExpiry = player._spellCooldowns[spellId] || 0;
    const remainingMs    = cooldownExpiry - Date.now();
    if (remainingMs > 0) {
      const remaining = Math.ceil(remainingMs / 1000);
      return B.sayAt(player, `<b>${spell.name}</b> is on cooldown for <b>${remaining}</b> more second(s).`);
    }

    // Check mana
    const currentMana = player.getAttribute('mana') || 0;
    if (currentMana < spell.manaCost) {
      return B.sayAt(player, `You don't have enough mana. <b>${spell.name}</b> costs <b>${spell.manaCost}</b> mana. You have <b>${currentMana}</b>.`);
    }

    // Resolve target if spell requires one
    let target = null;
    if (spell.requiresTarget) {
      if (!targetArg.length) {
        // Default to first combatant if in combat
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
    }

    // Deduct mana
    player.lowerAttribute('mana', spell.manaCost);

    // Set cooldown
    player._spellCooldowns[spellId] = Date.now() + (spell.cooldown * 1000);

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
      B.sayAt(player, `Something went wrong casting <b>${spell.name}</b>.`);
      return;
    }

    B.sayAt(player, `<b><cyan>You cast <white>${spell.name}</white>!</cyan></b>`);
    B.sayAtExcept(player.room, `<cyan>${player.name} casts <b>${spell.name}</b>!</cyan>`, player);
  }
};