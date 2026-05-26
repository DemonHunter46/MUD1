'use strict';

const { Broadcast: B } = require('ranvier');

module.exports = {
  usage: 'journal',
  command: state => (args, player) => {
    const journal = player.getMeta('journal') || {
      quests: { completed: [], active: null },
      locations: [],
      trades: [],
    };

    // Send journal data to Neuro via websocket
    if (player.socket && player.socket.command) {
      player.socket.command('sendData', 'journal', journal);
      player.socket.command('sendData', 'journalToggle', { open: true });
    }

    B.sayAt(player, '<green>You open your journal.</green>');
  }
};