'use strict';

const { Broadcast: B } = require('ranvier');
const { tryGainSkill, getSkill, TIER_GATHER_REQUIREMENTS } = require('../../bundle-example-lib/lib/SkillManager');

module.exports = {
  usage: 'chop <tree>',
  command: state => (args, player) => {
    args = args.trim();

    if (!args.length) {
      return B.sayAt(player, 'Chop what? Look for trees in the room.');
    }

    const node = [...player.room.items].find(item =>
      item.metadata &&
      item.metadata.gatherable &&
      item.metadata.gatherType === 'woodcutting' &&
      (
        item.name.toLowerCase().includes(args.toLowerCase()) ||
        (item.keywords && item.keywords.some(k => k.toLowerCase().includes(args.toLowerCase())))
      )
    );

    if (!node) {
      return B.sayAt(player, `You don't see any tree called '${args}' here.`);
    }

    const skill    = getSkill(player, 'woodcutting');
    const required = TIER_GATHER_REQUIREMENTS[node.metadata.tier] || 0;

    if (skill < required) {
      return B.sayAt(player, `You need <b>${required}</b> Woodcutting skill to chop ${node.name}. You have <b>${skill}</b>.`);
    }

    const materials = node.metadata.materials || {};

    for (const [material, range] of Object.entries(materials)) {
      const amount  = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
      const current = player.getMeta(`resources.${material}`) || 0;
      player.setMeta(`resources.${material}`, current + amount);
      B.sayAt(player, `<green>You chop <white>${amount}x ${material.replace(/_/g, ' ')}</white> from ${node.name}.</green>`);
    }

    const gained = tryGainSkill(player, 'woodcutting');
    if (gained) {
      const newLevel = (player.getMeta('skills') || {}).woodcutting || 0;
      B.sayAt(player, `<yellow>Your Woodcutting skill increased to <white>${newLevel}</white>!</yellow>`);
    }

    if (node.metadata.depletedMessage) {
      B.sayAt(player, `<yellow>${node.name} ${node.metadata.depletedMessage}</yellow>`);
    }

    player.save();
  }
};