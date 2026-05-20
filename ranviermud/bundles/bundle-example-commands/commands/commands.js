'use strict';

const sprintf = require('sprintf-js').sprintf;
const { Broadcast } = require('ranvier');

function sayAtColumns (source, strings, numCols) {
  //Build a 2D map of strings by col/row
  let col = 0;
  const perCol = Math.ceil(strings.length / numCols);
  let rowCount = 0;
  const colWidth = Math.floor((3 * 20) / numCols);
  const columnedStrings = strings.reduce((map, string, index) => {
    if (rowCount >= perCol) {
      rowCount = 0;
      col++;
    }
    map[col] = map[col] || [];

    if (!map[col]) {
      map.push([]);
    }

    map[col].push(string);
    rowCount++;
    return map;
  }, [])

  col = 0;
  let row = 0;
  let i = 0;
  const said = [];
  while(said.length < strings.length) {
    if (columnedStrings[col] && columnedStrings[col][row]) {
      const string = columnedStrings[col][row];
      said.push(string);
      Broadcast.at(source, sprintf("%-" + colWidth + "s", string));
    }
    i++;


    col++;
    if (col == numCols) {
      Broadcast.sayAt(source);
      col = 0;
      row++;
    }
  }

  // append another line if need be
  if ((col) % numCols !== 0) {
    Broadcast.sayAt(source);
  }
}

module.exports = {
  aliases: [ 'stats', 'attributes' ],
  command: state => (args, player) => {
    player.say(`=======================================`);
    player.say(`  Character: ${player.name}            `);
    player.say(`=======================================`);
    player.say(`  Strength:     ${player.getAttribute('strength')}`);
    player.say(`  Dexterity:    ${player.getAttribute('dexterity')}`);
    player.say(`  Constitution: ${player.getAttribute('constitution')}`);
    player.say(`  Intelligence: ${player.getAttribute('intelligence')}`);
    player.say(`  Wisdom:       ${player.getAttribute('wisdom')}`);
    player.say(`  Charisma:     ${player.getAttribute('charisma')}`);
    player.say(`=======================================`);
  }
};