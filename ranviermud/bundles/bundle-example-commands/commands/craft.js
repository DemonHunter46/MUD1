'use strict';

const { Broadcast: B, ItemType } = require('ranvier');
const Crafting = require('../lib/Crafting');
const {
  getSkill,
  tryGainSkill,
  QUALITY_REQUIREMENTS,
  TIER_GATHER_REQUIREMENTS,
  qualityColor,
  getMaxQuality,
} = require('../../bundle-example-lib/lib/SkillManager');

const TIERS    = ['copper', 'bronze', 'iron', 'steel', 'mithril', 'adamant', 'orichalcum'];
const QUALITIES = ['crude', 'common', 'uncommon', 'rare', 'epic', 'legendary'];

module.exports = {
  usage: 'craft <list|create|resources> [args]',
  command: state => (args, player) => {
    args = args.trim();

    if (!args.length) {
      return B.sayAt(player, "Usage: craft list | craft list weapons | craft create <tier> <type> | craft resources");
    }

    const parts   = args.split(' ');
    const command = parts[0].toLowerCase();
    const subArgs = parts.slice(1).join(' ');

    switch (command) {
      case 'list':     return craftList(player, subArgs);
      case 'create':   return craftCreate(state, player, subArgs);
      case 'resources': return craftResources(player);
      default:
        B.sayAt(player, "Unknown craft command. Use: craft list | craft create | craft resources");
    }
  }
};

function craftList(player, args) {
  const skill    = getSkill(player, 'blacksmithing');
  const maxQual  = getMaxQuality(skill);
  const recipes  = Crafting.getWeaponRecipes(skill);

  if (!args.length) {
    B.sayAt(player, '');
    B.sayAt(player, '<b><cyan>====== Crafting — Weapons ======</cyan></b>');
    B.sayAt(player, ` Blacksmithing: <white>${skill}/100</white>  Max Quality: <${qualityColor(maxQual)}>${capitalize(maxQual)}</${qualityColor(maxQual)}>`);
    B.sayAt(player, '<b><cyan>--------------------------------</cyan></b>');
    B.sayAt(player, ' Usage: <b>craft list weapons <tier></b> to see recipes');
    B.sayAt(player, '');
    B.sayAt(player, ' Available tiers:');

    for (const tier of TIERS) {
      const req = TIER_GATHER_REQUIREMENTS[tier] || 0;
      const canGather = getSkill(player, 'mining') >= req;
      const tierColor = canGather ? 'green' : 'red';
      B.sayAt(player, `   <${tierColor}>${capitalize(tier)}</${tierColor}> (Mining ${req}+)`);
    }

    B.sayAt(player, '<b><cyan>================================</cyan></b>');
    B.sayAt(player, '');
    return;
  }

  const tier = args.toLowerCase();
  if (!TIERS.includes(tier)) {
    return B.sayAt(player, `Unknown tier '${tier}'. Valid tiers: ${TIERS.join(', ')}`);
  }

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
      const have    = player.getMeta(`resources.${mat}`) || 0;
      const hasColor = have >= amount ? 'green' : 'red';
      B.sayAt(player, `      <${hasColor}>${amount}x ${mat.replace(/_/g, ' ')} (have ${have})</${hasColor}>`);
    }
    B.sayAt(player, `    craft create ${tier} ${recipe.weaponType}`);
    B.sayAt(player, '');
  }
}

function craftCreate(state, player, args) {
  if (!args.length) {
    return B.sayAt(player, 'Usage: craft create <tier> <weapon type>  e.g. craft create iron sword');
  }

  const parts      = args.split(' ');
  const tier       = parts[0].toLowerCase();
  const weaponType = parts[1] ? parts[1].toLowerCase() : null;

  if (!weaponType) {
    return B.sayAt(player, 'Usage: craft create <tier> <weapon type>  e.g. craft create iron sword');
  }

  if (!TIERS.includes(tier)) {
    return B.sayAt(player, `Unknown tier '${tier}'. Valid tiers: ${TIERS.join(', ')}`);
  }

  const validTypes = ['dagger', 'sword', 'greatsword', 'axe', 'greataxe', 'mace'];
  if (!validTypes.includes(weaponType)) {
    return B.sayAt(player, `Unknown weapon type '${weaponType}'. Valid types: ${validTypes.join(', ')}`);
  }

  // Check blacksmithing skill
  const skill   = getSkill(player, 'blacksmithing');
  const quality = getMaxQuality(skill);

  // Check mining skill for tier
  const miningRequired = TIER_GATHER_REQUIREMENTS[tier] || 0;
  if (getSkill(player, 'mining') < miningRequired) {
    return B.sayAt(player, `You need <b>${miningRequired}</b> Mining skill to work with ${capitalize(tier)}. You have <b>${getSkill(player, 'mining')}</b>.`);
  }

  // Check materials
  const { MATERIAL_COSTS, TIER_MATERIALS } = require('../../bundle-example-lib/lib/SkillManager');
  const matCosts  = MATERIAL_COSTS[quality];
  const tierMats  = TIER_MATERIALS[tier];
  const recipe    = {
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

  // Build the weapon item
  const metadata = Crafting.buildWeaponMetadata(weaponType, tier, quality);
  const color    = qualityColor(quality);
  const itemName = `${capitalize(quality)} ${capitalize(tier)} ${capitalize(weaponType)}`;

  const newItem = state.ItemFactory.create(
    state.AreaManager.getAreaByReference('shared:copper-dagger'),
    'shared:crafted-weapon'
  );

  if (!newItem) {
    // Fallback — create item manually
    const { Item } = require('ranvier');
    const craftedItem = new Item(null, {
      id:          `crafted_${tier}_${weaponType}`,
      name:        itemName,
      type:        'WEAPON',
      roomDesc:    `A ${itemName.toLowerCase()} lies here.`,
      keywords:    [tier, weaponType, quality, 'weapon'],
      description: `A ${quality} quality ${tier} ${weaponType}.`,
      metadata,
    });

    state.ItemManager.add(craftedItem);
    player.addItem(craftedItem);
  } else {
    newItem.name     = itemName;
    newItem.metadata = metadata;
    state.ItemManager.add(newItem);
    player.addItem(newItem);
  }

  B.sayAt(player, `<b><${color}>You craft: ${itemName}!</${color}></b>`);
  B.sayAt(player, `  Damage: <white>${metadata.minDamage}-${metadata.maxDamage}</white>  Speed: <white>${metadata.speed}</white>`);

  // Try to gain blacksmithing skill
  const gained = tryGainSkill(player, 'blacksmithing');
  if (gained) {
    const newLevel = (player.getMeta('skills') || {}).blacksmithing || 0;
    B.sayAt(player, `<yellow>Your Blacksmithing skill increased to <white>${newLevel}</white>!</yellow>`);

    // Check if quality unlocked
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

  const allResources = require('../data/resources.json');
  let hasAny = false;

  for (const [key, def] of Object.entries(allResources)) {
    const amount = player.getMeta(`resources.${key}`) || 0;
    if (amount > 0) {
      hasAny = true;
      const color = def.quality === 'rare' ? 'blue' :
                    def.quality === 'uncommon' ? 'cyan' : 'white';
      B.sayAt(player, `  <${color}>${def.title}</${color}>: <white>${amount}</white>`);
    }
  }

  if (!hasAny) {
    B.sayAt(player, '  You have no crafting resources.');
    B.sayAt(player, '  Use mine, chop, forage or fish to gather materials.');
  }

  B.sayAt(player, '<b><cyan>===========================</cyan></b>');
  B.sayAt(player, '');
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}