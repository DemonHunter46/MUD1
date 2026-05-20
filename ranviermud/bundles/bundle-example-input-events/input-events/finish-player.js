'use strict';

const { Config, Logger, Player } = require('ranvier');

const CORE_STATS = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];

module.exports = {
  event: state => {
    const startingRoomRef = Config.get('startingRoom');
    if (!startingRoomRef) {
      Logger.error('No startingRoom defined in ranvier.json');
    }

    return async (socket, args) => {
      let player = new Player({
        name: args.name,
        account: args.account,
      });

      const bonusStats = args.chosenBonusStats || {};

      // Build final core stats with racial bonuses applied
      const finalStats = {};
      for (const stat of CORE_STATS) {
        finalStats[stat] = 5 + (bonusStats[stat] || 0);
      }

      // Save core stats into metadata so done.js can read them on every login
      player.setMeta('stats', finalStats);

      // Store race metadata
      player.setMeta('race', args.race);
      if (args.subrace) {
        player.setMeta('subrace', args.subrace);
      }

      // Register all attributes on the player (health/mana done.js will derive)
      const allAttributes = {
        ...finalStats,
        health: 10,
        mana: 10,
      };
      for (const [attr, value] of Object.entries(allAttributes)) {
        player.addAttribute(state.AttributeFactory.create(attr, value));
      }

      const room = state.RoomManager.getRoom(startingRoomRef);
      player.room = room;

      args.account.addCharacter(args.name);
      args.account.save();

      await state.PlayerManager.save(player);

      // Reload from manager so all event listeners are properly attached
      player = await state.PlayerManager.loadPlayer(state, player.account, player.name);
      player.socket = socket;

      socket.emit('done', socket, { player });
    };
  }
};