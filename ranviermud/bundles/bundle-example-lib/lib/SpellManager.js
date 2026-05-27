'use strict';

/**
 * Global spell definitions.
 *
 * castLag   — how long casting this spell delays your next action (ms)
 *             typically ROUND_LENGTH (3000ms) for standard spells
 *             longer for powerful spells like Greater Healing
 *
 * cooldown  — seconds before this specific spell can be cast again
 *             prevents spamming the same spell every round
 *
 * Both systems work together:
 *   castLag  = costs your combat round
 *   cooldown = forces spell variety
 */

const ROUND_LENGTH = 3000;

const SPELLS = {
  // ─── Tier 1 — Low INT requirement ───────────────────────────────────────

  rayoffrost: {
    name:           'Ray of Frost',
    description:    'Fires a beam of freezing energy at your target.',
    manaCost:       1,
    cooldown:       3,          // 1 round cooldown — can cast every other round
    castLag:        ROUND_LENGTH,
    range:          2,
    requiresTarget: true,
    combatOnly:     true,
    minIntelligence: 10,
    effect:         'spell-ray-of-frost',
  },

  magicmissile: {
    name:           'Magic Missile',
    description:    'Launches three unerring bolts of magical force.',
    manaCost:       2,
    cooldown:       5,          // slightly longer — more powerful than ray of frost
    castLag:        ROUND_LENGTH,
    range:          3,
    requiresTarget: true,
    combatOnly:     true,
    minIntelligence: 10,
    effect:         'spell-magic-missile',
  },

  heal: {
    name:           'Heal',
    description:    'Restores a small amount of health.',
    manaCost:       2,
    cooldown:       8,
    castLag:        ROUND_LENGTH,
    range:          0,
    requiresTarget: false,
    combatOnly:     false,
    minIntelligence: 10,
    effect:         'spell-heal',
  },

  // ─── Tier 2 — Medium INT requirement ────────────────────────────────────

  frostbolt: {
    name:           'Frostbolt',
    description:    'Launches a bolt of ice at your target.',
    manaCost:       3,
    cooldown:       6,
    castLag:        ROUND_LENGTH,
    range:          1,
    requiresTarget: true,
    combatOnly:     true,
    minIntelligence: 12,
    effect:         'spell-frostbolt',
  },

  shield: {
    name:           'Shield',
    description:    'Conjures a magical barrier reducing incoming damage.',
    manaCost:       3,
    cooldown:       15,
    castLag:        ROUND_LENGTH,
    range:          0,
    requiresTarget: false,
    combatOnly:     false,
    minIntelligence: 12,
    effect:         'spell-shield',
  },

  // ─── Tier 3 — High INT requirement ──────────────────────────────────────

  fireball: {
    name:           'Fireball',
    description:    'Hurls a ball of fire that explodes on impact.',
    manaCost:       5,
    cooldown:       12,
    castLag:        ROUND_LENGTH,
    range:          2,
    requiresTarget: true,
    combatOnly:     true,
    minIntelligence: 14,
    effect:         'spell-fireball',
  },

  shockinggrasp: {
    name:           'Shocking Grasp',
    description:    'Channels lightning through your touch.',
    manaCost:       2,
    cooldown:       4,
    castLag:        ROUND_LENGTH,
    range:          0,
    requiresTarget: true,
    combatOnly:     true,
    minIntelligence: 14,
    effect:         'spell-shocking-grasp',
  },

  // ─── Tier 4 — Very High INT requirement ─────────────────────────────────

  greaterhealing: {
    name:           'Greater Healing',
    description:    'Restores a large amount of health.',
    manaCost:       8,
    cooldown:       30,
    castLag:        ROUND_LENGTH * 2,   // costs 2 rounds — powerful spell
    range:          0,
    requiresTarget: false,
    combatOnly:     false,
    minIntelligence: 16,
    effect:         'spell-greater-healing',
  },
};

module.exports = SPELLS;