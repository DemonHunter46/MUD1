'use strict';

const { Item } = require('ranvier');
const {
  WEAPON_TIERS,
  WEAPON_TYPES,
  QUALITY_REQUIREMENTS,
  QUALITY_MULTIPLIERS,
  MATERIAL_COSTS,
  TIER_MATERIALS,
  getWeaponStats,
  qualityColor,
} = require('../../bundle-example-lib/lib/SkillManager');

const dataPath = __dirname + '/../data/';
const _loadedResources = require(dataPath + 'resources.json');
const _loadedRecipes   = require(dataPath + 'recipes.json');

const TIERS    = ['copper', 'bronze', 'iron', 'steel', 'mithril', 'adamant', 'orichalcum'];
const QUALITIES = ['crude', 'common', 'uncommon', 'rare', 'epic', 'legendary'];

class Crafting {
  static getResource(resourceKey) {
    return _loadedResources[resourceKey];
  }

  static getResourceItem(resourceKey) {
    const resourceDef = this.getResource(resourceKey);
    if (!resourceDef) return null;
    return new Item(null, {
      name: resourceDef.title,
      metadata: { quality: resourceDef.quality },
      keywords: resourceKey,
      id: 1,
    });
  }

  static getRecipes() {
    return _loadedRecipes;
  }

  /**
   * Get all craftable weapon recipes for a given blacksmithing skill level.
   * Returns recipes grouped by weapon type and tier.
   * @param {number} skill
   * @return {Array}
   */
  static getWeaponRecipes(skill) {
    const recipes = [];

    for (const [weaponType, tiers] of Object.entries(WEAPON_TIERS)) {
      for (const tier of TIERS) {
        if (!tiers[tier]) continue;

        // Determine max quality for this skill level
        let maxQuality = 'crude';
        for (const quality of QUALITIES) {
          if (skill >= QUALITY_REQUIREMENTS[quality]) {
            maxQuality = quality;
          }
        }

        const weaponProps  = WEAPON_TYPES[weaponType];
        const tierMats     = TIER_MATERIALS[tier];
        const stats        = getWeaponStats(weaponType, tier, maxQuality);
        const matCosts     = MATERIAL_COSTS[maxQuality];

        recipes.push({
          id:         `${tier}_${weaponType}`,
          name:       `${capitalize(maxQuality)} ${capitalize(tier)} ${capitalize(weaponType)}`,
          weaponType,
          tier,
          quality:    maxQuality,
          stats,
          speed:      weaponProps.speed,
          twoHanded:  weaponProps.twoHanded,
          strRequire: weaponProps.strRequire,
          recipe: {
            [tierMats.primary]:   matCosts[0],
            [tierMats.secondary]: matCosts[1],
          },
          color: qualityColor(maxQuality),
        });
      }
    }

    return recipes;
  }

  /**
   * Build the item metadata for a crafted weapon.
   * @param {string} weaponType
   * @param {string} tier
   * @param {string} quality
   * @return {Object}
   */
  static buildWeaponMetadata(weaponType, tier, quality) {
    const stats      = getWeaponStats(weaponType, tier, quality);
    const weaponProps = WEAPON_TYPES[weaponType];

    return {
      slot:       'wield',
      minDamage:  stats.min,
      maxDamage:  stats.max,
      speed:      weaponProps.speed,
      twoHanded:  weaponProps.twoHanded || false,
      quality,
      tier,
      ac:         0,
      requires: {
        strength: weaponProps.strRequire,
      },
      sellable: {
        value:    this.getWeaponValue(tier, quality),
        currency: 'gold',
      },
    };
  }

  /**
   * Calculate sell value based on tier and quality.
   * @param {string} tier
   * @param {string} quality
   * @return {number}
   */
  static getWeaponValue(tier, quality) {
    const tierValues = {
      copper: 10, bronze: 25, iron: 50,
      steel: 100, mithril: 300, adamant: 750, orichalcum: 2000,
    };
    const qualityMultipliers = {
      crude: 1, common: 1.5, uncommon: 2.5,
      rare: 5, epic: 10, legendary: 25,
    };
    return Math.round((tierValues[tier] || 10) * (qualityMultipliers[quality] || 1));
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = Crafting;