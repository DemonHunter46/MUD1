'use strict';

const { Broadcast: B } = require('ranvier');
const Crafting = require('../../simple-crafting/lib/Crafting');
const {
  getSkill,
  tryGainSkill,
  QUALITY_REQUIREMENTS,
  TIER_GATHER_REQUIREMENTS,
  MATERIAL_COSTS,
  TIER_MATERIALS,
  STATION_REQUIREMENTS,
  qualityColor,
  getMaxQuality,
} = require('../../bundle-example-lib/lib/SkillManager');

const TIERS     = ['copper', 'bronze', 'iron', 'steel', 'mithril', 'adamant', 'orichalcum'];
const QUALITIES = ['crude', 'common', 'uncommon', 'rare', 'epic', 'legendary'];

module.exports = {
  usage: 'craft <list|create|resources> [args]',
  command: state => (args, player) => {
    args = args.trim();

    if (!args.length) {
      return B.sayAt(player, 'Usage: craft list | craft list weapons <tier> | craft create <tier> <type> | craft resources');
    }

    const parts   = args.split(' ');
    const command = parts[0].toLowerCase();
    const subArgs = parts.slice(1).join(' ');

    switch (command) {
      case 'list':      return craftList(player, subArgs);
      case 'create':    return craftCreate(state, player, subArgs);
      case 'resources': return craftResources(player);
      default:
        B.sayAt(player, 'Unknown craft command. Use: craft list | craft create | craft resources');
    }
  }
};

/**
 * Check if the player's current room has the required crafting station.
 * @param {Player} player
 * @param {string} craftingSkill
 * @return {boolean}
 */
function hasStation(player, craftingSkill) {
  const required = STATION_REQUIREMENTS[craftingSkill];
  if (!required) return true;
  const stations = (player.room.metadata && player.room.metadata.stations) || [];
  return stations.includes(required);
}

/**
 * Get a friendly station name for display.
 * @param {string} craftingSkill
 * @return {string}
 */
function stationName(craftingSkill) {
  const station = STATION_REQUIREMENTS[craftingSkill];
  if (!station) return 'crafting station';
  return station.replace(/_/g, ' ');
}

function craftList(player, args) {
  const skill   = getSkill(player, 'blacksmithing');
  const maxQual = getMaxQuality(skill);

  if (!args.length) {
    B.sayAt(player, '');
    B.sayAt(player, '<b><cyan>====== Crafting ======</cyan></b>');
    B.sayAt(player, ` Blacksmithing: <white>${skill}/100</white>  Max Quality: <${qualityColor(maxQual)}>${capitalize(maxQual)}</${qualityColor(maxQual)}>`);

    // Show station availability in current room
    const stations = (player.room.metadata && player.room.metadata.stations) || [];
    if (stations.length) {
      B.sayAt(player, ` Stations here: <green>${stations.map(s => s.replace(/_/g, ' ')).join(', ')}</green>`);
    } else {
      B.sayAt(player, ` <red>No crafting stations in this room.</red>`);
    }

    B.sayAt(player, '<b><cyan>--------------------</cyan></b>');
    B.sayAt(player, ' Usage: <b>craft list weapons <tier></b>');
    B.sayAt(player, '');
    B.sayAt(player, ' Available tiers:');

    for (const tier of TIERS) {
      const req       = TIER_GATHER_REQUIREMENTS[tier] || 0;
      const canGather = getSkill(player, 'mining') >= req;
      const tierColor = canGather ? 'green' : 'red';
      B.sayAt(player, `   <${tierColor}>${capitalize(tier)}</${tierColor}> (Mining ${req}+)`);
    }

    B.sayAt(player, '<b><cyan>=====================</cyan></b>');
    B.sayAt(player, '');
    return;
  }

  // craft list weapons <tier>
  const parts = args.split(' ');
  if (parts[0].toLowerCase() === 'weapons') {
    const tier = parts[1] ? parts[1].toLowerCase() : null;

    if (!tier) {
      return B.sayAt(player, 'Usage: craft list weapons <tier>  e.g. craft list weapons iron');
    }

    if (!TIERS.includes(tier)) {
      return B.sayAt(player, `Unknown tier '${tier}'. Valid tiers: ${TIERS.join(', ')}`);
    }

    // Warn if no forge present
    if (!hasStation(player, 'blacksmithing')) {
      B.sayAt(player, `<yellow>Note: You need a <white>${stationName('blacksmithing')}</white> to craft weapons.</yellow>`);
    }

    const recipes     = Crafting.getWeaponRecipes(skill);
    const tierRecipes = recipes.filter(r => r.tier === tier);

    B.sayAt(player, '');
    B.sayAt(player, `<b><cyan>====== ${capitalize(tier)} Weapons ======</cyan></b>`);

    for (const recipe of tierRecipes) {
      const color = recipe.color;
      B.sayAt(player, `  <${color}>${recipe.name}</${color}>`);
      B.sayAt(player, `    Damage: <white>${recipe.stats.min}-${recipe.stats.max}</white>  Speed: <white>${recipe.speed}</white>  ${recipe.twoHanded ? '<yellow>[Two-Handed]</yellow>' : ''}`);
      B.sayAt(player, `    STR Required: <white>${recipe.strRequire}</white>`);
      B.sayAt(player, `    Materials:`);
      for (const [mat, amount] of Object.entries(recipe.recipe)) {
        const have     = player.getMeta(`resources.${mat}`) || 0;
        const hasColor = have >= amount ? 'green' : 'red';
        B.sayAt(player, `      <${hasColor}>${amount}x ${mat.replace(/_/g, ' ')} (have ${have})</${hasColor}>`);
      }
      B.sayAt(player, `    craft create ${tier} ${recipe.weaponType}`);
      B.sayAt(player, '');
    }
  }
}

function craftCreate(state, player, args) {
  if (!args.length) {
    return B.sayAt(player, 'Usage: craft create <tier> <weapon type>  e.g. craft create iron sword');
  }

  const parts      = args.split(' ');
  const tier       = parts[0] ? parts[0].toLowerCase() : null;
  const weaponType = parts[1] ? parts[1].toLowerCase() : null;

  if (!tier || !weaponType) {
    return B.sayAt(player, 'Usage: craft create <tier> <weapon type>  e.g. craft create iron sword');
  }

  if (!TIERS.includes(tier)) {
    return B.sayAt(player, `Unknown tier '${tier}'. Valid tiers: ${TIERS.join(', ')}`);
  }

  const validTypes = ['dagger', 'sword', 'greatsword', 'axe', 'greataxe', 'mace'];
  if (!validTypes.includes(weaponType)) {
    return B.sayAt(player, `Unknown weapon type '${weaponType}'. Valid types: ${validTypes.join(', ')}`);
  }

  // Check station — must be at a forge to craft weapons
  if (!hasStation(player, 'blacksmithing')) {
    return B.sayAt(player, `You need a <b>${stationName('blacksmithing')}</b> to craft weapons. Find a forge.`);
  }

  // Check blacksmithing skill
  const skill   = getSkill(player, 'blacksmithing');
  const quality = getMaxQuality(skill);

  // Check mining skill for this tier
  const miningRequired = TIER_GATHER_REQUIREMENTS[tier] || 0;
  if (getSkill(player, 'mining') < miningRequired) {
    return B.sayAt(player, `You need <b>${miningRequired}</b> Mining skill to work with ${capitalize(tier)}. You have <b>${getSkill(player, 'mining')}</b>.`);
  }

  // Check materials
  const matCosts = MATERIAL_COSTS[quality];
  const tierMats = TIER_MATERIALS[tier];
  const recipe   = {
    [tierMats.primary]:   matCosts[0],
    [tierMats.secondary]: matCosts[1],
  };

  for (const [material, amount] of Object.entries(recipe)) {
    const have = player.getMeta(`resources.${material}`) || 0;
    if (have < amount) {
      return B.sayAt(player, `Not enough materials. Need <b>${amount}x ${material.replace(/_/g, ' ')}</b>, you have <b>${have}</b>.`);
    }
  }

  // Check inventory space
  if (player.isInventoryFull()) {
    return B.sayAt(player, "You can't hold any more items.");
  }

  // Deduct materials
  for (const [material, amount] of Object.entries(recipe)) {
    const current = player.getMeta(`resources.${material}`) || 0;
    player.setMeta(`resources.${material}`, current - amount);
    B.sayAt(player, `<green>You use <white>${amount}x ${material.replace(/_/g, ' ')}</white>.</green>`);
  }

  // Build the weapon
  const metadata = Crafting.buildWeaponMetadata(weaponType, tier, quality);
  const color    = qualityColor(quality);
  const itemName = `${capitalize(quality)} ${capitalize(tier)} ${capitalize(weaponType)}`;

  const { Item } = require('ranvier');
  const craftedItem = new Item(null, {
    id:          `crafted_${tier}_${weaponType}_${quality}`,
    name:        itemName,
    type:        'WEAPON',
    roomDesc:    `A ${itemName.toLowerCase()} lies here.`,
    keywords:    [tier, weaponType, quality, 'weapon', 'crafted'],
    description: `A ${quality} quality ${tier} ${weaponType}, crafted with skill.`,
    metadata,
  });

  state.ItemManager.add(craftedItem);
  player.addItem(craftedItem);

  B.sayAt(player, `<b><${color}>You craft: ${itemName}!</${color}></b>`);
  B.sayAt(player, `  Damage: <white>${metadata.minDamage}-${metadata.maxDamage}</white>  Speed: <white>${metadata.speed}</white>  STR: <white>${metadata.requires.strength}</white>`);
  B.sayAt(player, `<yellow>The forge hisses as you quench the blade.</yellow>`);

  // Try to gain blacksmithing skill
  const gained = tryGainSkill(player, 'blacksmithing');
  if (gained) {
    const newLevel = (player.getMeta('skills') || {}).blacksmithing || 0;
    B.sayAt(player, `<yellow>Your Blacksmithing skill increased to <white>${newLevel}</white>!</yellow>`);

    for (const [q, req] of Object.entries(QUALITY_REQUIREMENTS)) {
      if (newLevel === req && req > 0) {
        B.sayAt(player, `<b><yellow>You can now craft <${qualityColor(q)}>${capitalize(q)}</${qualityColor(q)}> quality items!</yellow></b>`);
      }
    }
  }

  player.save();
}

function craftResources(player) {
  B.sayAt(player, '');
  B.sayAt(player, '<b><cyan>====== Your Resources ======</cyan></b>');

  const allResources = require('../../simple-crafting/data/resources.json');
  let hasAny = false;

  for (const [key, def] of Object.entries(allResources)) {
    const amount = player.getMeta(`resources.${key}`) || 0;
    if (amount > 0) {
      hasAny = true;
      const color = def.quality === 'epic'    ? 'magenta' :
                    def.quality === 'rare'     ? 'blue'    :
                    def.quality === 'uncommon' ? 'cyan'    : 'white';
      B.sayAt(player, `  <${color}>${def.title}</${color}>: <white>${amount}</white>`);
    }
  }

  if (!hasAny) {
    B.sayAt(player, '  You have no crafting resources.');
    B.sayAt(player, '  Use <b>mine</b>, <b>chop</b>, <b>forage</b> or <b>fish</b> to gather materials.');
  }

  B.sayAt(player, '<b><cyan>===========================</cyan></b>');
  B.sayAt(player, '');
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}