'use strict';

const { Config, Logger, Player } = require('ranvier');

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

      // Apply base attributes
      const baseAttributes = {
        health: 10, mana: 10,
        strength: 5, dexterity: 5, constitution: 5,
        intelligence: 5, wisdom: 5, charisma: 5,
      };

      for (const [attr, value] of Object.entries(baseAttributes)) {
        player.addAttribute(state.AttributeFactory.create(attr, value));
      }

      // Apply racial stat bonuses from creation choices
      const bonusStats = args.chosenBonusStats || {};
      for (const [stat, bonus] of Object.entries(bonusStats)) {
        if (bonus && player.hasAttribute(stat)) {
          const current = player.getAttribute(stat);
          player.setAttributeBase(stat, current + bonus);
        }
      }

      // Store race metadata
      player.setMeta('race', args.race);
      if (args.subrace) {
        player.setMeta('subrace', args.subrace);
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