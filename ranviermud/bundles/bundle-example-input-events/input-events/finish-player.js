'use strict';

const { Config, Logger, Player } = require('ranvier');

const CORE_STATS = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];

const STAT_MIN = 1;
const STAT_MAX = 30;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);


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
        const bonus = bonusStats[stat] || 0;
        finalStats[stat] = clamp(10 + bonus, STAT_MIN, STAT_MAX);
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