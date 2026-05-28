'use strict';

const { Broadcast: B } = require('ranvier');
const { SKILL_CATEGORIES, getMaxQuality } = require('../../bundle-example-lib/lib/SkillManager');

module.exports = {
  usage: 'skills',
  command: state => (args, player) => {
    const playerSkills = player.getMeta('skills') || {};

    B.sayAt(player, '');
    B.sayAt(player, '<b><green>============================================</green></b>');
    B.sayAt(player, B.center(44, 'Skills', 'green'));
    B.sayAt(player, '<b><green>============================================</green></b>');

    for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
      B.sayAt(player, `<b><yellow> ${category}</yellow></b>`);
      B.sayAt(player, '<b><green> ------------------------------------</green></b>');

      for (const skill of skills) {
        const level     = playerSkills[skill] || 0;
        const bar       = buildBar(level);
        const skillName = skill.charAt(0).toUpperCase() + skill.slice(1);
        const padded    = skillName.padEnd(16);

        // Show relevant unlock info per skill
        let note = '';
        if (skill === 'blacksmithing') {
          note = ` <white>[Max quality: ${getMaxQuality(level)}]</white>`;
        }

        B.sayAt(player, ` <white>${padded}</white> ${bar} <white>${level}/100</white>${note}`);
      }

      B.sayAt(player, '');
    }

    B.sayAt(player, '<b><green>============================================</green></b>');
    B.sayAt(player, '');
  }
};

function buildBar(level) {
  const filled = Math.floor(level / 10);
  const empty  = 10 - filled;
  const color  = level >= 75 ? 'yellow' : level >= 50 ? 'cyan' : level >= 25 ? 'green' : 'white';
  return `<${color}>[` + '█'.repeat(filled) + '░'.repeat(empty) + `]</${color}>`;
}