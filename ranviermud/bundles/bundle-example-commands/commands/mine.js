'use strict';

const { Broadcast: B } = require('ranvier');
const { tryGainSkill, getSkill, TIER_GATHER_REQUIREMENTS } = require('../../bundle-example-lib/lib/SkillManager');

module.exports = {
  usage: 'mine <node>',
  command: state => (args, player) => {
    args = args.trim();

    if (!args.length) {
      return B.sayAt(player, 'Mine what? Look for ore nodes in the room.');
    }

    // Find a minable node in the room
    const node = [...player.room.items].find(item =>
      item.metadata &&
      item.metadata.gatherable &&
      item.metadata.gatherType === 'mining' &&
      (
        item.name.toLowerCase().includes(args.toLowerCase()) ||
        (item.keywords && item.keywords.some(k => k.toLowerCase().includes(args.toLowerCase())))
      )
    );

    if (!node) {
      return B.sayAt(player, `You don't see any minable node called '${args}' here.`);
    }

    const miningSkill = getSkill(player, 'mining');
    const required    = TIER_GATHER_REQUIREMENTS[node.metadata.tier] || 0;

    if (miningSkill < required) {
      return B.sayAt(player, `You need <b>${required}</b> Mining skill to mine ${node.name}. You have <b>${miningSkill}</b>.`);
    }

    // Gather materials
    const materials = node.metadata.materials || {};
    const skills    = player.getMeta('skills') || {};

    for (const [material, range] of Object.entries(materials)) {
      const amount = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
      const current = player.getMeta(`resources.${material}`) || 0;
      player.setMeta(`resources.${material}`, current + amount);
      B.sayAt(player, `<green>You mine <white>${amount}x ${material.replace(/_/g, ' ')}</white> from ${node.name}.</green>`);
    }

    // Try to gain mining skill
    const gained = tryGainSkill(player, 'mining');
    if (gained) {
      const newLevel = (player.getMeta('skills') || {}).mining || 0;
      B.sayAt(player, `<yellow>Your Mining skill increased to <white>${newLevel}</white>!</yellow>`);
    }

    // Handle node depletion
    if (node.metadata.depletedMessage) {
      B.sayAt(player, `<yellow>${node.name} ${node.metadata.depletedMessage}</yellow>`);
    }

    player.save();
  }
};