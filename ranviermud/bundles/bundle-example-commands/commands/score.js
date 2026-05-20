'use strict';

const { Broadcast: B } = require('ranvier');

module.exports = {
  aliases: ['sheet', 'stats'],
  command: state => (args, player) => {
    const say = message => B.sayAt(player, message);

    const race    = player.getMeta('race')    || 'Unknown';
    const subrace = player.getMeta('subrace') || null;
    const raceDisplay = subrace
      ? `${capitalize(subrace)} ${capitalize(race)}`
      : capitalize(race);

    const health = player.getAttribute('health')       || 0;
    const maxHp  = player.getMaxAttribute('health')    || 0;
    const mana   = player.getAttribute('mana')         || 0;
    const maxMana = player.getMaxAttribute('mana')     || 0;
    const invSize = player.inventory ? player.inventory.size : 0;
    const invMax  = player.inventory ? player.inventory.getMax() : 10 + (player.getAttribute('strength') || 10);




    say('');
    say('<b><green>============================================</green></b>');
    say(B.center(44, `${player.name} — ${raceDisplay}`, 'green'));
    say('<b><green>============================================</green></b>');
    say(` <b>Health</b> : ${health}/${maxHp}`);
    say(` <b>Mana</b>   : ${mana}/${maxMana}`);
    say(` <b>Carry</b>  : ${invSize}/${invMax} items`);
    say('<b><green>--------------------------------------------</green></b>');
    say(` <b>Strength</b>     : ${player.getAttribute('strength')     || 0}`);
    say(` <b>Dexterity</b>    : ${player.getAttribute('dexterity')    || 0}`);
    say(` <b>Constitution</b> : ${player.getAttribute('constitution') || 0}`);
    say(` <b>Intelligence</b> : ${player.getAttribute('intelligence') || 0}`);
    say(` <b>Wisdom</b>       : ${player.getAttribute('wisdom')       || 0}`);
    say(` <b>Charisma</b>     : ${player.getAttribute('charisma')     || 0}`);
    say('<b><green>============================================</green></b>');
    say('');
  }
};

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}