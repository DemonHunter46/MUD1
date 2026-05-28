'use strict';

const { Broadcast: B } = require('ranvier');
const { tryGainSkill, getSkill } = require('../../bundle-example-lib/lib/SkillManager');

module.exports = {
  usage: 'forage [node]',
  command: state => (args, player) => {
    args = args.trim();

    // Find a forageable node — if no arg given take first available
    const nodes = [...player.room.items].filter(item =>
      item.metadata &&
      item.metadata.gatherable &&
      item.metadata.gatherType === 'foraging'
    );

    if (!nodes.length) {
      return B.sayAt(player, 'There is nothing to forage here.');
    }

    let node = nodes[0];
    if (args.length) {
      node = nodes.find(item =>
        item.name.toLowerCase().includes(args.toLowerCase()) ||
        (item.keywords && item.keywords.some(k => k.toLowerCase().includes(args.toLowerCase())))
      );
      if (!node) {
        return B.sayAt(player, `You don't see anything to forage called '${args}' here.`);
      }
    }

    const skill    = getSkill(player, 'foraging');
    const required = node.metadata.skillRequired || 0;

    if (skill < required) {
      return B.sayAt(player, `You need <b>${required}</b> Foraging skill to gather ${node.name}. You have <b>${skill}</b>.`);
    }

    const materials = node.metadata.materials || {};

    for (const [material, range] of Object.entries(materials)) {
      const amount  = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
      const current = player.getMeta(`resources.${material}`) || 0;
      player.setMeta(`resources.${material}`, current + amount);
      B.sayAt(player, `<green>You gather <white>${amount}x ${material.replace(/_/g, ' ')}</white>.</green>`);
    }

    const gained = tryGainSkill(player, 'foraging');
    if (gained) {
      const newLevel = (player.getMeta('skills') || {}).foraging || 0;
      B.sayAt(player, `<yellow>Your Foraging skill increased to <white>${newLevel}</white>!</yellow>`);
    }

    if (node.metadata.depletedMessage) {
      B.sayAt(player, `<yellow>${node.name} ${node.metadata.depletedMessage}</yellow>`);
    }

    player.save();
  }
};