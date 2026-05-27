'use strict';

const { Broadcast: B } = require('ranvier');
const SPELLS = require('../../bundle-example-lib/lib/SpellManager');

module.exports = {
  usage: 'train <spell>',
  command: state => (args, player) => {
    args = args.trim().toLowerCase();

    if (!args.length) {
      return B.sayAt(player, 'Train what spell?');
    }

    // Check spell exists
    const spell = SPELLS[args];
    if (!spell) {
      return B.sayAt(player, `No spell named '<b>${args}</b>' exists.`);
    }

    // Check player already knows the spell
    const knownSpells = player.getMeta('knownSpells') || [];
    if (knownSpells.includes(args)) {
      return B.sayAt(player, `You already know <b>${spell.name}</b>.`);
    }

    // Check intelligence requirement
    const intelligence = player.getAttribute('intelligence') || 0;
    if (intelligence < spell.minIntelligence) {
      return B.sayAt(player, `You need at least <b>${spell.minIntelligence}</b> Intelligence to learn <b>${spell.name}</b>. You have <b>${intelligence}</b>.`);
    }

    // Check for a trainer NPC in the room that teaches this spell
    let canLearn = false;
    let source   = null;

    for (const npc of player.room.npcs) {
      if (
        npc.metadata &&
        npc.metadata.teaches &&
        npc.metadata.teaches.includes(args)
      ) {
        canLearn = true;
        source   = `${npc.name}`;
        break;
      }
    }

    // Check for a spellbook in player inventory if no trainer found
    if (!canLearn && player.inventory) {
      for (const [uuid, item] of player.inventory) {
        if (
          item.metadata &&
          item.metadata.teaches === args
        ) {
          canLearn = true;
          source   = `your ${item.name}`;

          // Consume the spellbook on use
          player.removeItem(item);
          state.ItemManager.remove(item);
          B.sayAt(player, `<yellow>The ${item.name} crumbles to dust as its knowledge transfers to you.</yellow>`);
          break;
        }
      }
    }

    if (!canLearn) {
      return B.sayAt(player, `There is no trainer here who can teach you <b>${spell.name}</b>, and you don't have a spellbook for it.`);
    }

    // Learn the spell
    knownSpells.push(args);
    player.setMeta('knownSpells', knownSpells);
    player.save();

    B.sayAt(player, `<b><green>You learn <white>${spell.name}</white> from ${source}!</green></b>`);
    B.sayAt(player, `<green>${spell.description}</green>`);
    B.sayAt(player, `<green>Mana cost: <white>${spell.manaCost}</white>  Cooldown: <white>${spell.cooldown}s</white></green>`);
  }
};