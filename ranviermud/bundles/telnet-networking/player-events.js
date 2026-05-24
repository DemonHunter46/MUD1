'use strict';

const LevelUtil = require('../bundle-example-lib/lib/LevelUtil');

module.exports = {
  listeners: {
    login: state => function () {
      if (this.socket && this.socket.sendGMCP) {
        this.socket.sendGMCP('Core.Hello', {
          client: 'RanvierMUD',
          version: '3.0.0'
        });

        this.socket.sendGMCP('Core.Supports.Set', [
          'Char 1',
          'Char.Vitals 1',
          'Char.Stats 1',
          'Char.Info 1'
        ]);
      }

      setImmediate(() => {
        sendVitals.call(this);
        sendStats.call(this);
        sendCharacter.call(this);
      });
    },

    level: state => function () {
      sendCharacter.call(this);
      sendVitals.call(this);
      sendStats.call(this);
    },

    experience: state => function () {
      sendCharacter.call(this);
    },
  }
};

function sendVitals() {
  if (!this.socket || !this.socket.sendGMCP) {
    return;
  }

  this.socket.sendGMCP('Char.Vitals', {
    hp:    this.getAttribute('health')    || 0,
    maxhp: this.getMaxAttribute('health') || 0,
    mp:    this.getAttribute('mana')      || 0,
    maxmp: this.getMaxAttribute('mana')   || 0,
  });
}

function sendStats() {
  if (!this.socket || !this.socket.sendGMCP) {
    return;
  }

  this.socket.sendGMCP('Char.Stats', {
    strength:     this.getAttribute('strength')     || 0,
    dexterity:    this.getAttribute('dexterity')    || 0,
    constitution: this.getAttribute('constitution') || 0,
    intelligence: this.getAttribute('intelligence') || 0,
    wisdom:       this.getAttribute('wisdom')       || 0,
    charisma:     this.getAttribute('charisma')     || 0,
  });
}

function sendCharacter() {
  if (!this.socket || !this.socket.sendGMCP) {
    return;
  }

  const level      = this.level || 1;
  const experience = this.experience || 0;
  const tnl        = LevelUtil.expToLevel(level + 1);
  const race       = this.getMeta('race')    || 'unknown';
  const subrace    = this.getMeta('subrace') || null;

  this.socket.sendGMCP('Char.Info', {
    name:       this.name,
    level:      level,
    experience: experience,
    tnl:        tnl,
    race:       subrace ? `${subrace} ${race}` : race,
    statPoints: this.getMeta('statPoints') || 0,
  });
}