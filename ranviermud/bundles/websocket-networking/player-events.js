'use strict';

const LevelUtil = require('../bundle-example-lib/lib/LevelUtil');

module.exports = {
  listeners: {
    attributeUpdate: state => function () {
      updateAttributes.call(this);
    },

    login: state => function () {
      this.socket.command('sendData', 'quests', this.questTracker.serialize().active);

      const effects = this.effects.entries()
        .filter(effect => !effect.config.hidden)
        .map(effect => effect.serialize());
      this.socket.command('sendData', 'effects', effects);

      updateAttributes.call(this);
      updateCharacter.call(this);
      updateStats.call(this);
      updateMap.call(this);
    },

    move: state => function () {
      updateMap.call(this);
    },

    combatantAdded: state => function () {
      updateTargets.call(this);
    },

    combatantRemoved: state => function () {
      updateTargets.call(this);
    },

    updateTick: state => function () {
      const effects = this.effects.entries()
        .filter(effect => !effect.config.hidden)
        .map(effect => ({
          name: effect.name,
          elapsed: effect.elapsed,
          remaining: effect.remaining,
          config: { duration: effect.config.duration }
        }));

      if (effects.length) {
        this.socket.command('sendData', 'effects', effects);
      }

      if (!this.isInCombat()) {
        return;
      }

      updateTargets.call(this);
    },

    effectRemoved: state => function () {
      if (!this.effects.size) {
        this.socket.command('sendData', 'effects', []);
      }
    },

    questProgress: state => function () {
      this.socket.command('sendData', 'quests', this.questTracker.serialize().active);
    },

    level: state => function () {
      updateCharacter.call(this);
    },

    experience: state => function () {
      updateCharacter.call(this);
    },
  }
};

function updateAttributes() {
  let attributes = {};
  for (const [name, attribute] of this.attributes) {
    attributes[name] = {
      current: this.getAttribute(name),
      max: this.getMaxAttribute(name),
    };
  }
  this.socket.command('sendData', 'attributes', attributes);
}

function updateCharacter() {
  const level      = this.level || 1;
  const experience = this.experience || 0;
  const tnl        = LevelUtil.expToLevel(level + 1);
  const race       = this.getMeta('race')    || 'unknown';
  const subrace    = this.getMeta('subrace') || null;

  this.socket.command('sendData', 'character', {
    name:       this.name,
    level:      level,
    experience: experience,
    tnl:        tnl,
    race:       subrace ? `${subrace} ${race}` : race,
    statPoints: this.getMeta('statPoints') || 0,
  });
}

function updateStats() {
  this.socket.command('sendData', 'stats', {
    strength:     this.getAttribute('strength')     || 0,
    dexterity:    this.getAttribute('dexterity')    || 0,
    constitution: this.getAttribute('constitution') || 0,
    intelligence: this.getAttribute('intelligence') || 0,
    wisdom:       this.getAttribute('wisdom')       || 0,
    charisma:     this.getAttribute('charisma')     || 0,
  });
}

function updateMap() {
  if (!this.room || !this.room.area) return;

  const area  = this.room.area;
  const floor = this.room.coordinates ? this.room.coordinates.z : 0;
  const areaFloor = area.map.get(floor);

  if (!areaFloor) return;

  const rooms = [];
  for (let x = areaFloor.lowX; x <= areaFloor.highX; x++) {
    for (let y = areaFloor.lowY; y <= areaFloor.highY; y++) {
      const room = areaFloor.getRoom(x, y);
      if (!room) continue;
      rooms.push({
        id:   room.entityReference,
        x:    x,
        y:    y,
        type: (room.metadata && room.metadata.mapType) || 'default',
      });
    }
  }

  this.socket.command('sendData', 'map', {
    areaName:    area.title || area.name,
    currentRoom: this.room.entityReference,
    floor:       floor,
    rooms:       rooms,
  });
}

function updateTargets() {
  this.socket.command('sendData', 'targets', [...this.combatants].map(target => ({
    name: target.name,
    health: {
      current: target.getAttribute('health'),
      max: target.getMaxAttribute('health'),
    },
  })));
}