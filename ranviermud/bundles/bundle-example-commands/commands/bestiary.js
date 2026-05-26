'use strict';

const { Broadcast: B } = require('ranvier');

module.exports = {
  usage: 'bestiary',
  command: state => (args, player) => {
    const bestiary = player.getMeta('bestiary') || {};

    const entries = Object.values(bestiary);

    if (player.socket && player.socket.command) {
      player.socket.command('sendData', 'bestiary', entries);
      player.socket.command('sendData', 'bestiaryToggle', { open: true });
    }

    if (entries.length === 0) {
      B.sayAt(player, '<yellow>Your bestiary is empty. Encounter creatures to fill it.</yellow>');
    } else {
      B.sayAt(player, `<green>You open your bestiary. ${entries.length} creature(s) recorded.</green>`);
    }
  }
};