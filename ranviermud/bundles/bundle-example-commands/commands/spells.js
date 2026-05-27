'use strict';

const { Broadcast: B } = require('ranvier');
const SPELLS = require('../../bundle-example-lib/lib/SpellManager');

module.exports = {
  usage: 'spells',
  command: state => (args, player) => {
    const knownSpells = player.getMeta('knownSpells') || [];

    if (!knownSpells.length) {
      return B.sayAt(player, 'You don\'t know any spells. Seek a trainer or find a spellbook.');
    }

    const currentMana = player.getAttribute('mana')    || 0;
    const maxMana     = player.getMaxAttribute('mana')  || 0;

    B.sayAt(player, '');
    B.sayAt(player, '<b><cyan>============================================</cyan></b>');
    B.sayAt(player, B.center(44, 'Known Spells', 'cyan'));
    B.sayAt(player, '<b><cyan>============================================</cyan></b>');
    B.sayAt(player, ` <b>Mana</b>: ${currentMana}/${maxMana}`);
    B.sayAt(player, '<b><cyan>--------------------------------------------</cyan></b>');

    player._spellCooldowns = player._spellCooldowns || {};

    for (const spellId of knownSpells) {
      const spell = SPELLS[spellId];
      if (!spell) continue;

      const cooldownExpiry = player._spellCooldowns[spellId] || 0;
      const remainingMs    = cooldownExpiry - Date.now();
      const onCooldown     = remainingMs > 0;
      const remaining      = onCooldown ? Math.ceil(remainingMs / 1000) : 0;

      const canAfford   = currentMana >= spell.manaCost;
      const costColor   = canAfford ? 'green' : 'red';
      const statusColor = onCooldown ? 'yellow' : 'green';
      const status      = onCooldown ? `${remaining}s cooldown` : 'Ready';

      B.sayAt(player, ` <b><white>${spell.name}</white></b>`);
      B.sayAt(player, `   ${spell.description}`);
      B.sayAt(player, `   Mana: <${costColor}>${spell.manaCost}</${costColor}>  Cooldown: ${spell.cooldown}s  Status: <${statusColor}>${status}</${statusColor}>`);
      B.sayAt(player, `   Required INT: ${spell.minIntelligence}  ${spell.combatOnly ? '<red>[Combat Only]</red>' : '<green>[Any]</green>'}`);
      B.sayAt(player, '');
    }

    B.sayAt(player, '<b><cyan>============================================</cyan></b>');
    B.sayAt(player, ' Usage: <b>cast <spell> [target]</b>');
    B.sayAt(player, '<b><cyan>============================================</cyan></b>');
    B.sayAt(player, '');
  }
};