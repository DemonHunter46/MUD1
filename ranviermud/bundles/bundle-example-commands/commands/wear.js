'use strict';

const Ranvier = require('ranvier');
const { Broadcast, Logger } = Ranvier;
const { EquipSlotTakenError } = Ranvier.EquipErrors;
const say = Broadcast.sayAt;
const ItemUtil = require('../../bundle-example-lib/lib/ItemUtil');
const ArgParser = require('../../bundle-example-lib/lib/ArgParser');

module.exports = {
  aliases: [ 'wield' ],
  usage: 'wear <item>',
  command : (state) => (arg, player) => {
    arg = arg.trim();

    if (!arg.length) {
      return say(player, 'Wear what?');
    }

    const item = ArgParser.parseDot(arg, player.inventory);

    if (!item) {
      return say(player, "You aren't carrying anything like that.");
    }

    if (!item.metadata.slot) {
      return say(player, `You can't wear ${ItemUtil.display(item)}.`);
    }

    // Check stat requirements
    const requires = item.metadata.requires || {};
    for (const [stat, minimum] of Object.entries(requires)) {
      if ((player.getAttribute(stat) || 0) < minimum) {
        const statName = stat.charAt(0).toUpperCase() + stat.slice(1);
        return say(player, `You need at least ${minimum} ${statName} to equip that.`);
      }
    }

    // Check if equipping a two-handed weapon while offhand is occupied
    if (item.metadata.twoHanded && item.metadata.slot === 'wield') {
      const offhand = player.equipment.get('offhand');
      if (offhand) {
        return say(player, `You need a free offhand to wield ${ItemUtil.display(item)} with both hands. Remove ${ItemUtil.display(offhand)} first.`);
      }
    }

    // Check if equipping an offhand while a two-handed weapon is wielded
    if (item.metadata.slot === 'offhand') {
      const wield = player.equipment.get('wield');
      if (wield && wield.metadata.twoHanded) {
        return say(player, `You can't use an offhand while wielding ${ItemUtil.display(wield)} with both hands.`);
      }
    }

    try {
      player.equip(item, item.metadata.slot);
    } catch (err) {
      if (err instanceof EquipSlotTakenError) {
        const conflict = player.equipment.get(item.metadata.slot);
        return say(player, `You will have to remove ${ItemUtil.display(conflict)} first.`);
      }

      return Logger.error(err);
    }

    say(player, `<green>You equip:</green> ${ItemUtil.display(item)}<green>.</green>`);
  }
};