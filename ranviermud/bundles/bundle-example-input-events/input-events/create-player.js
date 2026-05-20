'use strict';

const { EventUtil, Player } = require('ranvier');

// ============================================================================
// 1. GAME DATA BLUEPRINT
// ============================================================================
const RACES = {
  human: {
    name: "Human",
    description: "Versatile, ambitious, and highly adaptable. Humans possess no innate structural weaknesses, choosing instead to specialize their talents.",
    stats: {},
    customStats: true
  },
  aarakocra: {
    name: "Aarakocra",
    description: "A winged people who originated on the Elemental Plane of Air, aarakocra soar through the sky wherever they wander. The first aarakocra served the Wind Dukes of Aaqa—mighty beings of air—and were imbued with a measure of their masters’ power over winds. Their descendants still command echoes of that power.",
    stats: { dexterity: 2, wisdom: 1 }
  },
  genasi: {
    name: "Genasi",
    description: "Tracing their ancestry to the genies of the Elemental Planes, each genasi can tap into the power of one of the elements. Air, earth, fire, and water—these are the four pillars of the Material Plane and the four types of genasi. Some genasi are direct descendants of a genie, while others were born to non-genasi parents who lived near a place suffused by a genie’s magic.",
    subraces: {
      air: {
        name: "Air Genasi",
        description: "Air genasi are descended from djinn, the genies of the Elemental Plane of Air. Embodying many of the airy traits of their otherworldly ancestors, air genasi can draw upon their connection to the winds.",
        stats: {},
        customStats: true
      },
      earth: {
        name: "Earth Genasi",
        description: "Tracing their ancestry to dao, the genies of the Elemental Plane of Earth, earth genasi inherit dao’s steadfast strength and control over earth. An earth genasi’s skin can be the colors of stone and earth or a human skin tone with glittering sparkles like gem dust. Some earth genasi have lines marking their skin like cracks, either showing glimmering gemlike veins or a dim, yellowish glow. Earth genasi hair can appear carved of stone or crystal or resemble strands of spun metal.",
        stats: {},
        customStats: true
      },
      fire: {
        name: "Fire Genasi",
        description: "Descended from efreet, the genies of the Elemental Plane of Fire, fire genasi channel the flamboyant and often destructive nature of flame. They show their heritage in their skin tones, which can range from deep charcoal to shades of red and orange. Some bear skin tones common to humanity but with fiery marks, such as slowly swirling lights under their skin that resemble embers or glowing red lines tracing over their bodies like cracks. Fire genasi hair can resemble threads of fire or sooty smoke.",
        stats: {},
        customStats: true
      },
      water: {
        name: "Water Genasi",
        description: "Water genasi descend from marids, aquatic genies from the Elemental Plane of Water. Water genasi are perfectly suited to life underwater and carry the power of the waves inside themselves. Their skin is often shades of blue or green, sometimes a blend of the two. If they have a human skin tone, there is a glistening texture that catches the light, like water droplets or nearly invisible fish scales. Their hair can resemble seaweed, waving as if in a current, or it can even be like water itself.",
        stats: {},
        customStats: true
      }
    },
  },
  elf: {
    name: "Elf",
    description: "Elves are a magical people of otherworldly grace, living in the world but not entirely part of it. They live in places of ethereal beauty, in the midst of ancient forests or in silvery spires glittering with faerie light, where soft music drifts through the air and gentle fragrances waft on the breeze. Elves love nature and magic, art and artistry, music and poetry, and the good things of the world.",
    stats: { dexterity: 2 },
    subraces: {
      high: {
        name: "High Elf",
        description: "All Elves are fair to behold and of them, all the High Elves are the most handsome. High Elves are pale-skinned with refined, aesthetically beautiful features and hair as clean and fine as flax. High Elves are tall and proud in their bearing, indeed it is not uncommon for an Elf to stand a whole head taller than a man. They have a slim build, which has led to the common misconception that Elves are weak or fragile. In fact, the opposite is true, for Elves are surprisingly strong, and though they are not as robust as the races of Orcs or Dwarfs, they more than compensate for that with their dexterity and amazing agility. ",
        stats: { intelligence: 1 }
      },
      sea: {
        name: "Sea Elf",
        description: "Sea elves fell in love with the wild beauty of the ocean in the earliest days of the multiverse. While other elves traveled from realm to realm, sea elves navigated the currents and explored the waters of many worlds. Today these elves can be found wherever oceans exist, as well as in the Elemental Plane of Water.",
        stats: { constitution: 1 },
      },
      wood: {
        name: "Wood Elf",
        description: "Wood elves are reclusive and fierce, preferring to live in the deep, untamed wilderness away from civilization.",
        stats: { wisdom: 1 }
      },
      dark: {
        name: "Drow (Dark Elf)",
        description: "As a drow, you are infused with the magic of the Underdark, an underground realm of wonders and horrors rarely seen on the surface above. You are at home in shadows and, thanks to your innate magic, learn to conjure forth both light and darkness. Your kin tend to have stark white hair and grayish skin of many hues.",
        stats: { charisma: 1 }
      }
    }
  },
  gnome: {
    name: "Gnome",
    description: "A constant hum of busy activity pervades the warrens and neighborhoods where gnomes form their close-knit communities. Louder sounds punctuate the hum: a crunch of grinding gears here, a minor explosion there, a yelp of surprise or triumph, and especially bursts of laughter. Gnomes⁠ take delight in life, enjoying every moment of invention, exploration, investigation, creation⁠, and play.",
    stats: { intelligence: 2 },
    subraces: {
      deep: {
        name: "Deep Gnome",
        description: "Deep gnomes, or svirfneblin, are natives of the Underdark and are suffused with that subterranean realm’s magic. They can supernaturally camouflage themselves, and their svirfneblin magic renders them difficult to locate. These abilities have enabled them to survive for generations among the perils of the Underdark.",
        stats: { dexterity: 1 },
      },
      rock: {
        name: "Rock Gnome",
        description: "Famous for their prodigious noses and love of invention, they are natural tinkerers who possess greater hardiness than their forest cousins. They combine keen intellect with boundless, child-like enthusiasm for life",
        stats: { constitution: 1 }
      },
      forest: {
        name: "Forest Gnome",
        description: "Forest gnomes tend to be friendly with other good-spirited woodland folk, and they regard elves and good fey as their most important allies. These gnomes also befriend small forest animals and rely on them for information about threats that might prowl their lands.",
        stats: { dexterity: 1 }
      }
    }
  },
  dwarf: {
    name: "Dwarf",
    description: "Kingdoms rich in ancient grandeur, halls carved into the roots of mountains, the echoing of picks and hammers in deep mines and blazing forges, a commitment to clan and tradition, and a burning hatred of goblins and orcs – these common threads unite all dwarves.",
    stats: { constitution: 2 },
    subraces: {
      hill: {
        name: "Hill Dwarf",
        description: "Hill Dwarves (often referred to as Gold Dwarves) are known for their remarkable resilience, keen senses, and shrewd, outgoing nature. They are shorter, more stout, and culturally integrate much better with surface societies and trading hubs than their isolationist, mountain-dwelling cousins.",
        stats: { wisdom: 1 }
      },
      mountain: {
        name: "Mountain Dwarf",
        description: "Mountain Dwarves are a strong, hardy subrace known for living in rugged terrain. Taller and more physically imposing than other dwarves, they possess remarkable strength, train extensively in heavy armor, and trace their proud lineages back to ancient, stoic mountain clans.",
        stats: { strength: 2 }
      },
      kaladesh: {
        name: "Kaladesh Dwarf",
        description: "They are bold, industrious, and place a heavy emphasis on craftsmanship. Unlike their traditional underground counterparts, Kaladesh dwarves are deeply tied to the bright, creative, and aether-fueled society of the plane.",
        stats: { wisdom: 1 }
      }
    }
  },
  halfling: {
    name: "Halfling",
    description: "The comforts of home are the goals of most halflings' lives: a place to settle in peace and quiet, far from marauding monsters and clashing armies. Others form nomadic bands that travel constantly, lured by the open road and the wide horizon to discover the wonders of new lands and peoples. Halflings work readily with others, and they are loyal to their friends, whether halfling or otherwise. They can display remarkable ferocity when their friends, families, or communities are threatened.",
    stats: { dexterity: 2 },
    subraces: {
      lightfoot: {
        name: "Lightfoot Halfling",
        description: "As a lightfoot halfling, you can easily hide from notice, even using other people as cover. You're inclined to be affable and get along well with others. In the Forgotten Realms, lightfoot halflings have spread the farthest and thus are the most common variety.",
        stats: { charisma: 1 }
      },
      stout: {
        name: "Stout Halfling",
        description: "As a stout halfling, you're hardier than average and have some resistance to poison. Some say that stouts have dwarven blood. In the Forgotten Realms, these halflings are called stronghearts, and they're most common in the south.",
        stats: { constitution: 1 }
      },
      ghostwise: {
        name: "Ghost-Wise Halfling",
        description: "Ghostwise halflings trace their ancestry back to a war among halfling tribes that sent their ancestors into flight from Luiren. Ghostwise halflings are the rarest of the hin, found only in the Chondalwood and a few other isolated forests, clustered in tight-knit clans. Many ghostwise clans select a natural landmark as the center of their territory, and members carry a piece of that landmark with them at all times. Clan warriors known as nightgliders bond with and ride giant owls as mounts.",
        stats: { wisdom: 1 }
      }
    }
  },
  tiefling: {
    name: "Tiefling",
    description: "To be greeted with stares and whispers, to suffer violence and insult on the street, to see mistrust and fear in every eye: this is the lot of the tiefling. And to twist the knife, tieflings know that this is because a pact struck generations ago infused the essence of Asmodeus, overlord of the Nine Hells (and many of the other powerful devils serving under him) into their bloodline. Their appearance and their nature are not their fault but the result of an ancient sin, for which they and their children and their children's children will always be held accountable.",
    stats: { charisma: 2 },
  },
  orc: {
    name: "Orc",
    description: "Savage and fearless, orc tribes are ever in search of elves, dwarves, and humans to destroy. Motivated by their hatred of the civilized races of the world and their need to satisfy the demands of their deities, the orcs know that if they fight well and bring glory to their tribe, Gruumsh will call them home.",
    stats: { strength: 2, constitution: 1 }
  },
  gruung: {
    name: "Gruung",
    description: "Grungs are aggressive froglike humanoids found in rain forests and tropical jungles. They are fiercely territorial and see themselves as superior to most other creatures. Grung society is a caste system. Each caste lays eggs in a separate hatching pool, and juvenile grungs join their caste upon emergence from the hatchery. All grungs are a dull greenish gray when they are born, but each individual takes on the color of its caste as it grows to adulthood. From lowest to highest caste, grungs can be green, blue, purple, red, orange, or gold.",
    stats: { dexterity: 2, constitution: 1 }
  },
  tortle: {
    name: "Tortle",
    description: "Tortles have a saying: “We wear our homes on our backs.” These turtle folk live on many worlds, most often journeying up and down coasts, along waterways, and across the sea. Tortles don’t have a unified story of how they were created, but they all have a sense of being mystically connected to the natural world. Carrying their shelter on their backs gives tortles a special feeling of security wherever they go, for even if they visit a far, unknown country, they have a place to lay their heads.",
    stats: { strength: 2, wisdom: 1 }
  }
};

const VALID_STATS = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
const formatStatName = (stat) => stat.charAt(0).toUpperCase() + stat.slice(1);

function initCreationTracking(args) {
  args.chosenBonusStats = args.chosenBonusStats || {
    strength: 0, dexterity: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0
  };
}
  
// ============================================================================
// 2. CREATION LOGIC NODES (The State Machine)
// ============================================================================

function chooseRaceElement(state, socket, args) {
  initCreationTracking(args); // <-- ADD THIS LINE
  const say = message => socket.write(message + "\r\n");

  say("\r\n--------------------------------------------");
  say("             CHOOSE YOUR RACE               ");
  say("--------------------------------------------");
  
  for (const raceKey in RACES) {
    say(` * [${RACES[raceKey].name}]`);
  }
  say("--------------------------------------------");
  socket.write("Type a race name to view details: ");

  socket.once('data', data => {
    const choice = data.toString().replace(/[\r\n]/g, '').trim().toLowerCase();

    if (!RACES[choice]) {
      say("\r\n[Invalid selection. Please choose a race from the list.]");
      return chooseRaceElement(state, socket, args);
    }

    return confirmRaceElement(state, socket, args, choice);
  });
}

function confirmRaceElement(state, socket, args, chosenRace) {
  const say = message => socket.write(message + "\r\n");
  const raceData = RACES[chosenRace];

  say("\r\n--------------------------------------------");
  say(` RACE: ${raceData.name.toUpperCase()} `);
  say("--------------------------------------------");
  say(raceData.description || "No description provided.");
  say("--------------------------------------------");
  
  socket.write(`Do you want to choose ${raceData.name}? (yes/no): `);

  socket.once('data', data => {
    const answer = data.toString().replace(/[\r\n]/g, '').trim().toLowerCase();

    if (answer === 'yes' || answer === 'y') {
      args.race = chosenRace;
      shieldPlayerInstance(state, args);

      const hasSubraces = raceData.subraces && Object.keys(raceData.subraces).length > 0;

      if (hasSubraces) {
        return chooseSubraceElement(state, socket, args, chosenRace);
      }

      // --- NO-SUBRACE PATH ---
      if (raceData.stats) {
        for (const [stat, value] of Object.entries(raceData.stats)) {
          args.chosenBonusStats[stat] += value;
        }
      }

      say(`\r\nYou are officially an ${raceData.name}!`);

      if (raceData.customStats) {
        return chooseCustomBonusType(state, socket, args);
      }

      return nextCreationStep(state, socket, args);

    } else if (answer === 'no' || answer === 'n') {
      say("\r\nSelection canceled.");
      return chooseRaceElement(state, socket, args);
    } else {
      say("\r\n[Please type 'yes' or 'no'.]");
      return confirmRaceElement(state, socket, args, chosenRace);
    }
  });
}

function chooseSubraceElement(state, socket, args, parentRaceKey) {
  const say = message => socket.write(message + "\r\n");
  const parentRace = RACES[parentRaceKey];

  say("\r\n--------------------------------------------");
  say(`         CHOOSE YOUR ${parentRace.name.toUpperCase()} SUBRACE `);
  say("--------------------------------------------");
  
  for (const subKey in parentRace.subraces) {
    say(` * [${parentRace.subraces[subKey].name}]`);
  }
  say("--------------------------------------------");
  socket.write("Type a subrace name to view details: ");

  socket.once('data', data => {
    const choice = data.toString().replace(/[\r\n]/g, '').trim().toLowerCase();

    if (!parentRace.subraces[choice]) {
      say("\r\n[Invalid selection. Please choose from the list.]");
      return chooseSubraceElement(state, socket, args, parentRaceKey);
    }

    return confirmSubraceElement(state, socket, args, parentRaceKey, choice);
  });
}

function confirmSubraceElement(state, socket, args, parentRaceKey, chosenSubraceKey) {
  const say = message => socket.write(message + "\r\n");
  const parentData = RACES[parentRaceKey];
  const subraceData = parentData.subraces[chosenSubraceKey];

  say("\r\n--------------------------------------------");
  say(` SUBRACE: ${subraceData.name.toUpperCase()} `);
  say("--------------------------------------------");
  say(subraceData.description || "No description provided.");
  say("--------------------------------------------");
  say(" Fixed Stat Modifications:");

  const combinedStats = {};
  for (const stat of VALID_STATS) {
    const parentVal = parentData.stats ? (parentData.stats[stat] || 0) : 0;
    const subVal = subraceData.stats ? (subraceData.stats[stat] || 0) : 0;
    combinedStats[stat] = parentVal + subVal;
  }

  let hasModifications = false;
  for (const [stat, value] of Object.entries(combinedStats)) {
    if (value !== 0) {
      hasModifications = true;
      const sign = value > 0 ? "+" : "";
      say(`   ${formatStatName(stat)}: ${sign}${value}`);
    }
  }

  if (!hasModifications && (parentData.customStats || subraceData.customStats)) {
    say("   (None - You will fully allocate your custom bonuses next)");
  }
  say("--------------------------------------------");
  socket.write(`Confirm selection as a ${subraceData.name}? (yes/no): `);

  socket.once('data', data => {
    const answer = data.toString().replace(/[\r\n]/g, '').trim().toLowerCase();

    if (answer === 'yes' || answer === 'y') {
      args.subrace = chosenSubraceKey;
      shieldPlayerInstance(state, args);

      for (const [stat, value] of Object.entries(combinedStats)) {
        args.chosenBonusStats[stat] += value;
      }

      say(`\r\nYou are officially an ${subraceData.name}!`);

      const needsCustomAllocation = parentData.customStats || subraceData.customStats;

      if (needsCustomAllocation) {
        return chooseCustomBonusType(state, socket, args);
      }

      return nextCreationStep(state, socket, args);

    } else if (answer === 'no' || answer === 'n') {
      say("\r\nSelection canceled.");
      return chooseSubraceElement(state, socket, args, parentRaceKey);
    } else {
      say("\r\n[Please type 'yes' or 'no'.]");
      return confirmSubraceElement(state, socket, args, parentRaceKey, chosenSubraceKey);
    }
  });
}

function chooseCustomBonusType(state, socket, args) {
  const say = message => socket.write(message + "\r\n");

  say("\r\n--------------------------------------------");
  say("         ATTRIBUTE BONUS ALLOCATION         ");
  say("--------------------------------------------");
  say(" Select your preferred training distribution:");
  say("  1) Specialized Training (Add +2 to a single core stat).");
  say("  2) Balanced Training    (Add +1 to two different core stats).");
  say("--------------------------------------------");
  socket.write("Select distribution profile (1 or 2): ");

  socket.once('data', data => {
    const choice = data.toString().replace(/[\r\n]/g, '').trim();

    if (choice === '1') {
      return allocatePlusTwo(state, socket, args);
    } else if (choice === '2') {
      return allocatePlusOne(state, socket, args, []);
    } else {
      say("\r\n[Invalid selection. Please choose option 1 or 2.]");
      return chooseCustomBonusType(state, socket, args);
    }
  });
}

function allocatePlusTwo(state, socket, args) {
  const say = message => socket.write(message + "\r\n");

  say("\r\n Core Stats: Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma");
  socket.write("Which attribute would you like to assign your +2 bonus?: ");

  socket.once('data', data => {
    const stat = data.toString().replace(/[\r\n]/g, '').trim().toLowerCase();

    if (!VALID_STATS.includes(stat)) {
      say(`\r\n[ '${stat}' is not a valid attribute name. ]`);
      return allocatePlusTwo(state, socket, args);
    }
    args.chosenBonusStats[stat] += 2;

    say(`\r\nSuccessfully applied +2 to ${formatStatName(stat)}!`);
    return nextCreationStep(state, socket, args);
  });
}

function allocatePlusOne(state, socket, args, allocatedStats = []) {
  const say = message => socket.write(message + "\r\n");
  const selectionCount = allocatedStats.length + 1;

  say("\r\n Core Stats: Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma");
  if (allocatedStats.length > 0) {
    say(` Already increased: ${allocatedStats.map(formatStatName).join(', ')}`);
  }
  socket.write(`Choose attribute #${selectionCount} to increase by +1: `);

  socket.once('data', data => {
    const stat = data.toString().replace(/[\r\n]/g, '').trim().toLowerCase();

    if (!VALID_STATS.includes(stat)) {
      say(`\r\n[ '${stat}' is not a valid attribute name. ]`);
      return allocatePlusOne(state, socket, args, allocatedStats);
    }

    if (allocatedStats.includes(stat)) {
      say("\r\n[ Conflict: You must choose a completely separate second attribute! ]");
      return allocatePlusOne(state, socket, args, allocatedStats);
    }

    allocatedStats.push(stat);
    args.chosenBonusStats[stat] += 1;
    say(` Added +1 to ${formatStatName(stat)}.`);

    if (allocatedStats.length === 2) {
      say("\r\nCustom attribute values successfully updated!");
      return nextCreationStep(state, socket, args);
    }

    return allocatePlusOne(state, socket, args, allocatedStats);
  });
}

// ============================================================================
// 3. HANDOFF MANAGEMENT & ENGINE EXPORTS
// ============================================================================

function nextCreationStep(state, socket, args) {
  socket.write("\r\nCharacter creation complete! Entering the realm...\r\n");
  socket.emit('finish-player', socket, args);
}

module.exports = {
  event: (state) => (socket, args) => {
    chooseRaceElement(state, socket, args);
  }
};