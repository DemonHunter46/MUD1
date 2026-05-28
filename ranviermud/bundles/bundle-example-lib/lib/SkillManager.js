'use strict';

const SKILLS = [
  // Gathering
  'mining', 'woodcutting', 'foraging', 'fishing',
  // Crafting
  'blacksmithing', 'leatherworking', 'alchemy', 'cooking', 'carpentry',
  // Social
  'bartering', 'persuasion', 'intimidation',
];

const SKILL_CATEGORIES = {
  Gathering: ['mining', 'woodcutting', 'foraging', 'fishing'],
  Crafting:  ['blacksmithing', 'leatherworking', 'alchemy', 'cooking', 'carpentry'],
  Social:    ['bartering', 'persuasion', 'intimidation'],
};

// Crafting skill required to produce each quality
const QUALITY_REQUIREMENTS = {
  crude:     0,
  common:    10,
  uncommon:  25,
  rare:      50,
  epic:      75,
  legendary: 100,
};

// Quality multipliers applied to base tier damage
const QUALITY_MULTIPLIERS = {
  crude:     1.00,
  common:    1.10,
  uncommon:  1.20,
  rare:      1.35,
  epic:      1.50,
  legendary: 1.75,
};

// Gathering skill required to gather each tier material
const TIER_GATHER_REQUIREMENTS = {
  copper:     0,
  bronze:     25,
  iron:       50,
  steel:      75,
  mithril:    90,
  adamant:    95,
  orichalcum: 100,
};

// Base damage ranges per weapon type per tier
// Quality multiplier applied on top
const WEAPON_TIERS = {
  dagger: {
    copper:     { min: 2,  max: 4  },
    bronze:     { min: 3,  max: 6  },
    iron:       { min: 4,  max: 8  },
    steel:      { min: 6,  max: 11 },
    mithril:    { min: 8,  max: 15 },
    adamant:    { min: 11, max: 20 },
    orichalcum: { min: 15, max: 27 },
  },
  sword: {
    copper:     { min: 4,  max: 8  },
    bronze:     { min: 6,  max: 12 },
    iron:       { min: 8,  max: 16 },
    steel:      { min: 11, max: 22 },
    mithril:    { min: 15, max: 30 },
    adamant:    { min: 20, max: 40 },
    orichalcum: { min: 27, max: 54 },
  },
  greatsword: {
    copper:     { min: 7,  max: 14 },
    bronze:     { min: 10, max: 20 },
    iron:       { min: 14, max: 28 },
    steel:      { min: 19, max: 38 },
    mithril:    { min: 25, max: 50 },
    adamant:    { min: 33, max: 66 },
    orichalcum: { min: 44, max: 88 },
  },
  axe: {
    copper:     { min: 3,  max: 7  },
    bronze:     { min: 5,  max: 10 },
    iron:       { min: 7,  max: 14 },
    steel:      { min: 10, max: 19 },
    mithril:    { min: 13, max: 26 },
    adamant:    { min: 18, max: 35 },
    orichalcum: { min: 24, max: 47 },
  },
  greataxe: {
    copper:     { min: 8,  max: 16 },
    bronze:     { min: 12, max: 23 },
    iron:       { min: 16, max: 32 },
    steel:      { min: 22, max: 43 },
    mithril:    { min: 29, max: 57 },
    adamant:    { min: 38, max: 75 },
    orichalcum: { min: 50, max: 100 },
  },
  mace: {
    copper:     { min: 3,  max: 6  },
    bronze:     { min: 5,  max: 9  },
    iron:       { min: 7,  max: 13 },
    steel:      { min: 9,  max: 18 },
    mithril:    { min: 12, max: 24 },
    adamant:    { min: 16, max: 32 },
    orichalcum: { min: 21, max: 43 },
  },
};

// Weapon type properties
const WEAPON_TYPES = {
  dagger:    { speed: 1.0, twoHanded: false, strRequire: 8  },
  sword:     { speed: 2.0, twoHanded: false, strRequire: 10 },
  greatsword:{ speed: 3.0, twoHanded: true,  strRequire: 14 },
  axe:       { speed: 2.0, twoHanded: false, strRequire: 10 },
  greataxe:  { speed: 3.5, twoHanded: true,  strRequire: 16 },
  mace:      { speed: 2.5, twoHanded: false, strRequire: 12 },
};

// Materials required per tier per quality
// [primaryAmount, secondaryAmount]
const MATERIAL_COSTS = {
  crude:     [1, 1],
  common:    [2, 1],
  uncommon:  [3, 2],
  rare:      [4, 3],
  epic:      [6, 4],
  legendary: [8, 6],
};

// Primary and secondary materials per tier
const TIER_MATERIALS = {
  copper:     { primary: 'copper_ore',     secondary: 'leather_strips'  },
  bronze:     { primary: 'copper_ore',     secondary: 'tin_ore'         },
  iron:       { primary: 'iron_ore',       secondary: 'coal'            },
  steel:      { primary: 'iron_ore',       secondary: 'carbon_shard'    },
  mithril:    { primary: 'mithril_ore',    secondary: 'moonstone'       },
  adamant:    { primary: 'adamant_ore',    secondary: 'dragon_scale'    },
  orichalcum: { primary: 'orichalcum_ore', secondary: 'void_crystal'    },
};

// Station required for each crafting skill
const STATION_REQUIREMENTS = {
  blacksmithing:  'forge',
  leatherworking: 'tanning_rack',
  alchemy:        'alchemy_table',
  cooking:        'cooking_fire',
  carpentry:      'workbench',
};

/**
 * Calculate chance to gain a skill point on use.
 * Early gains are fast, later gains are rare.
 * @param {number} currentSkill
 * @return {number} percentage chance 0-100
 */
function gainChance(currentSkill) {
  if (currentSkill >= 100) return 0;
  if (currentSkill >= 81)  return 3;
  if (currentSkill >= 61)  return 10;
  if (currentSkill >= 41)  return 25;
  if (currentSkill >= 21)  return 50;
  return 80;
}

/**
 * Try to gain a skill point. Returns true if gained.
 * @param {Player} player
 * @param {string} skillName
 * @return {boolean}
 */
function tryGainSkill(player, skillName) {
  const skills  = player.getMeta('skills') || {};
  const current = skills[skillName] || 0;
  const chance  = gainChance(current);

  if (chance === 0) return false;

  const roll = Math.floor(Math.random() * 100);
  if (roll < chance) {
    skills[skillName] = Math.min(100, current + 1);
    player.setMeta('skills', skills);
    player.save();
    return true;
  }

  return false;
}

/**
 * Get a player's skill level.
 * @param {Player} player
 * @param {string} skillName
 * @return {number}
 */
function getSkill(player, skillName) {
  const skills = player.getMeta('skills') || {};
  return skills[skillName] || 0;
}

/**
 * Get the quality label for a given blacksmithing skill level.
 * Returns the highest quality the player can craft.
 * @param {number} skill
 * @return {string}
 */
function getMaxQuality(skill) {
  if (skill >= 100) return 'legendary';
  if (skill >= 75)  return 'epic';
  if (skill >= 50)  return 'rare';
  if (skill >= 25)  return 'uncommon';
  if (skill >= 10)  return 'common';
  return 'crude';
}

/**
 * Calculate final weapon stats for a tier/quality combination.
 * @param {string} weaponType
 * @param {string} tier
 * @param {string} quality
 * @return {{ min: number, max: number }}
 */
function getWeaponStats(weaponType, tier, quality) {
  const base       = WEAPON_TIERS[weaponType][tier];
  const multiplier = QUALITY_MULTIPLIERS[quality];
  return {
    min: Math.round(base.min * multiplier),
    max: Math.round(base.max * multiplier),
  };
}

/**
 * Get the display colour for a quality tier.
 * @param {string} quality
 * @return {string}
 */
function qualityColor(quality) {
  const colors = {
    crude:     'white',
    common:    'green',
    uncommon:  'cyan',
    rare:      'blue',
    epic:      'magenta',
    legendary: 'yellow',
  };
  return colors[quality] || 'white';
}

module.exports = {
  SKILLS,
  SKILL_CATEGORIES,
  QUALITY_REQUIREMENTS,
  QUALITY_MULTIPLIERS,
  TIER_GATHER_REQUIREMENTS,
  WEAPON_TIERS,
  WEAPON_TYPES,
  MATERIAL_COSTS,
  TIER_MATERIALS,
  STATION_REQUIREMENTS,
  gainChance,
  tryGainSkill,
  getSkill,
  getMaxQuality,
  getWeaponStats,
  qualityColor,
};