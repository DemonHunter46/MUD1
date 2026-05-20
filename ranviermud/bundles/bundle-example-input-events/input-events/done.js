'use strict';

const { Broadcast, Logger } = require('ranvier');

/**
 * Login is done, allow the player to actually execute commands
 */
module.exports = {
  event: state => (socket, args) => {
    let player = args.player;
    
    // 1. Hydrate loads the baseline player shell mechanics from the save data blueprints
    player.hydrate(state);

    // 2. Retrieve your saved stats dictionary from the metadata tree configuration
    const savedStats = player.getMeta('stats') || {
      strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10
    };

    // 3. HARDENING STEP: Explicitly verify and force initialize Ranvier's internal attributes map
    if (!player.attributes) {
      player.attributes = new Map();
    }

    // List of your 6 core stats to register on the player's live memory collection
    const coreStats = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'health', 'mana'];

    // Dynamically inject the attribute definition slots into the Map if Ranvier didn't load them
    for (const stat of coreStats) {
      if (!player.attributes.has(stat)) {
        // We pull the Attribute factory class from state to initialize a proper operational Map entry
        try {
          const attributeDefinition = state.AttributeFactory.create(stat, 10);
          player.attributes.set(stat, attributeDefinition);
        } catch (e) {
          // Fallback if the Factory is unseeded: structure a plain object shape Ranvier accepts
          player.attributes.set(stat, {
            name: stat,
            base: 10,
            delta: 0
          });
        }
      }
    }

    // 4. Safely apply your custom chosen character scores into the active tracking slots
    for (const [stat, value] of Object.entries(savedStats)) {
      player.setAttributeBase(stat, value);
    }

    // 5. ENFORCE CLASSLESS STAT MULTIPLIER FORMULAS
    // Mana calculation loop = Intelligence * 2
    const currentInt = player.getAttribute('intelligence') || 10;
    player.setAttributeBase('mana', currentInt * 2);

    // Health calculation loop = Constitution * 2
    const currentCon = player.getAttribute('constitution') || 10;
    player.setAttributeBase('health', currentCon * 2);

    // 6. RACIAL TRAIT PASSIVE EFFECT REGISTRATION
    try {
      const raceMeta = player.getMeta('race');
      if (raceMeta && !player.effects.has('race-traits')) {
        const traitEffect = state.EffectFactory.create('race-traits', player);
        player.addEffect(traitEffect);
      }
    } catch (err) {
      // Catch silently if 'race-traits' effect bundle is not built yet
    }

    // 7. Finalize data, display the starting description, and enable command input streams
    player.save();

    player._lastCommandTime = Date.now();

    state.CommandManager.get('look').execute(null, player);

    Broadcast.prompt(player);

    player.socket.emit('commands', player);

    player.emit('login');
  }
};