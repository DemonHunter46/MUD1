'use strict';

const { Broadcast: B } = require('ranvier');

const VALID_STATS = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
const STAT_MAX = 99;

module.exports = {
  usage: 'spendstat <stat>',
  command: state => (args, player) => {
    const say = msg => B.sayAt(player, msg);

    const points = player.getMeta('statPoints') || 0;
    if (!points) {
      return say('You have no unspent stat points.');
    }

    if (!args || !args.length) {
      say(`You have <bold>${points}</bold> unspent stat point(s).`);
      say('Usage: spendstat <stat>');
      say('Valid stats: ' + VALID_STATS.join(', '));
      return;
    }

    const stat = args.trim().toLowerCase();

    if (!VALID_STATS.includes(stat)) {
      return say(`'${stat}' is not a valid stat. Valid stats: ${VALID_STATS.join(', ')}`);
    }

    const current = player.getAttribute(stat);
    if (current >= STAT_MAX) {
      return say(`${capitalize(stat)} is already at the maximum of ${STAT_MAX}.`);
    }

    player.setAttributeBase(stat, current + 1);
    player.setMeta('statPoints', points - 1);

    // Recalculate inventory if strength was raised
    if (stat === 'strength') {
      player.inventory.setMax(10 + player.getAttribute('strength'));
    }

    say(`<bold><green>${capitalize(stat)} increased to ${current + 1}!</green></bold>`);

    if (points - 1 > 0) {
      say(`You have <bold>${points - 1}</bold> unspent stat point(s) remaining.`);
    }

    player.save();
  }
};

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}