'use strict';

const { Broadcast, Logger } = require('ranvier');

module.exports = {
  event: state => (socket, args) => {
    let player = args.player;

    // 1. Hydrate loads the baseline player shell mechanics from the save data
    player.hydrate(state);

    // 2. Retrieve saved stats from metadata
    const savedStats = player.getMeta('stats') || {
      strength: 10, dexterity: 10, constitution: 10,
      intelligence: 10, wisdom: 10, charisma: 10
    };

    // 3. Ensure attributes map exists
    if (!player.attributes) {
      player.attributes = new Map();
    }

    const coreStats = [
      'strength', 'dexterity', 'constitution',
      'intelligence', 'wisdom', 'charisma',
      'health', 'mana', 'hunger', 'thirst'
    ];

    for (const stat of coreStats) {
      if (!player.attributes.has(stat)) {
        try {
          const attributeDefinition = state.AttributeFactory.create(stat, 10);
          player.attributes.set(stat, attributeDefinition);
        } catch (e) {
          // Attribute not registered in ranvier.json — skip it
          Logger.error(`done.js: failed to create attribute '${stat}': ${e.message}`);
        }
      }
    }

    // 4. Apply saved core stats
    for (const [stat, value] of Object.entries(savedStats)) {
      player.setAttributeBase(stat, value);
    }

    // 5. Derive health and mana from constitution and intelligence
    const currentCon = player.getAttribute('constitution') || 10;
    player.setAttributeBase('health', currentCon * 2);

    const currentInt = player.getAttribute('intelligence') || 10;
    player.setAttributeBase('mana', currentInt * 2);

    // 6. Apply racial trait effects
    try {
      const raceMeta = player.getMeta('race');
      if (raceMeta && !player.effects.has('race-traits')) {
        const traitEffect = state.EffectFactory.create('race-traits', player);
        player.addEffect(traitEffect);
      }
    } catch (err) {
      // Silently catch if race-traits effect is not yet built
    }

    // 7. Mark player as fully logged in before emitting login
    player.setMeta('loggedIn', true);

    player.save();

    player._lastCommandTime = Date.now();

    state.CommandManager.get('look').execute(null, player);

    Broadcast.prompt(player);

    player.socket.emit('commands', player);

    player.emit('login');
  }
};