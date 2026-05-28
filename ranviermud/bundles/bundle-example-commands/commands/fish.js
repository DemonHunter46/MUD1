'use strict';

const { Broadcast: B } = require('ranvier');
const { tryGainSkill, getSkill } = require('../../bundle-example-lib/lib/SkillManager');

module.exports = {
  usage: 'fish',
  command: state => (args, player) => {
    // Room must be flagged as fishable
    if (!player.room.metadata || !player.room.metadata.fishable) {
      return B.sayAt(player, 'There is nowhere to fish here. Find a body of water.');
    }

    const skill = getSkill(player, 'fishing');

    // Higher fishing skill = better catch chance and rarer fish
    const catchChance = Math.min(90, 30 + skill * 0.6);
    const roll        = Math.floor(Math.random() * 100);

    if (roll > catchChance) {
      B.sayAt(player, '<white>You cast your line but catch nothing this time.</white>');
      tryGainSkill(player, 'fishing');
      return;
    }

    // Determine what fish is caught based on skill
    const fishTable = player.room.metadata.fish || [];
    if (!fishTable.length) {
      return B.sayAt(player, 'You catch nothing. The water seems empty.');
    }

    // Filter fish by skill requirement
    const available = fishTable.filter(f => (f.skillRequired || 0) <= skill);
    if (!available.length) {
      return B.sayAt(player, 'You catch nothing. You may need more fishing skill for this area.');
    }

    const caught  = available[Math.floor(Math.random() * available.length)];
    const current = player.getMeta(`resources.${caught.material}`) || 0;
    player.setMeta(`resources.${caught.material}`, current + 1);

    B.sayAt(player, `<green>You catch a <white>${caught.material.replace(/_/g, ' ')}</white>!</green>`);

    const gained = tryGainSkill(player, 'fishing');
    if (gained) {
      const newLevel = (player.getMeta('skills') || {}).fishing || 0;
      B.sayAt(player, `<yellow>Your Fishing skill increased to <white>${newLevel}</white>!</yellow>`);
    }

    player.save();
  }
};