'use strict';

const { Broadcast: B } = require('ranvier');
const ArgParser = require('../../bundle-example-lib/lib/ArgParser');
const ItemUtil  = require('../../bundle-example-lib/lib/ItemUtil');

module.exports = {
  usage: 'ready <item> | ready remove',
  command: state => (args, player) => {
    args = args.trim();

    if (!args.length) {
      // Show currently readied item
      const readied = player.equipment.get('ready');
      if (!readied) {
        return B.sayAt(player, 'You have nothing readied. Usage: ready <item>');
      }
      return B.sayAt(player, `You have ${ItemUtil.display(readied)} readied.`);
    }

    if (args === 'remove') {
      const readied = player.equipment.get('ready');
      if (!readied) {
        return B.sayAt(player, 'You have nothing readied.');
      }
      player.unequip('ready');
      B.sayAt(player, `You unready ${ItemUtil.display(readied)}.`);
      return;
    }

    const item = ArgParser.parseDot(args, player.inventory);

    if (!item) {
      return B.sayAt(player, "You aren't carrying anything like that.");
    }

    // Must be a ranged weapon
    if (!item.metadata || !item.metadata.range) {
      return B.sayAt(player, `${ItemUtil.display(item)} is not a ranged weapon.`);
    }

    // Remove existing readied item if any
    const existing = player.equipment.get('ready');
    if (existing) {
      player.unequip('ready');
    }

    player.equip(item, 'ready');
    B.sayAt(player, `<green>You ready</green> ${ItemUtil.display(item)}<green>.</green>`);
  }
};