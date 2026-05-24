'use strict';

const sprintf = require('sprintf-js').sprintf;
const LevelUtil = require('../bundle-example-lib/lib/LevelUtil');
const { Broadcast: B, Config, Inventory, Logger } = require('ranvier');

const DECAY_INTERVAL_MS = 5 * 60 * 1000;
const DECAY_AMOUNT      = 1;

module.exports = {
  listeners: {
    login: state => function () {
      const strength = this.getAttribute('strength') || 10;

      if (!this.inventory) {
        this.inventory = new Inventory();
      }

      const max = 10 + strength;
      this.inventory.setMax(max);
      this.setMeta('inventoryMax', max);

      this._lastHungerDecay = Date.now();
      this._lastThirstDecay = Date.now();
    },

    move: state => function (movementCommand) {
      const { roomExit } = movementCommand;

      if (!roomExit) {
        return B.sayAt(this, "You can't go that way!");
      }

      if (this.isInCombat()) {
        return B.sayAt(this, 'You are in the middle of a fight!');
      }

      const nextRoom = state.RoomManager.getRoom(roomExit.roomId);
      const oldRoom  = this.room;

      const door = oldRoom.getDoor(nextRoom) || nextRoom.getDoor(oldRoom);

      if (door) {
        if (door.locked) {
          return B.sayAt(this, "The door is locked.");
        }
        if (door.closed) {
          return B.sayAt(this, "The door is closed.");
        }
      }

      const hunger = this.getAttribute('hunger') || 0;
      const thirst = this.getAttribute('thirst') || 0;

      if (hunger <= 0 || thirst <= 0) {
        this.lowerAttribute('health', 1);

        if (hunger <= 0 && thirst <= 0) {
          B.sayAt(this, '<red>You are starving and dehydrated. You feel faint as you move.</red>');
        } else if (hunger <= 0) {
          B.sayAt(this, '<red>You are starving. The exertion of moving weakens you.</red>');
        } else {
          B.sayAt(this, '<red>You are dehydrated. Moving takes its toll on your body.</red>');
        }
      }

      this.moveTo(nextRoom, _ => {
        state.CommandManager.get('look').execute('', this);
      });

      B.sayAt(oldRoom, `${this.name} leaves.`);
      B.sayAtExcept(nextRoom, `${this.name} enters.`, this);

      for (const follower of this.followers) {
        if (follower.room !== oldRoom) {
          continue;
        }

        if (follower.isNpc) {
          follower.moveTo(nextRoom);
        } else {
          B.sayAt(follower, `\r\nYou follow ${this.name} to ${nextRoom.title}.`);
          follower.emit('move', movementCommand);
        }
      }
    },

    save: state => async function (callback) {
      await state.PlayerManager.save(this);
      if (typeof callback === 'function') {
        callback();
      }
    },

    commandQueued: state => function (commandIndex) {
      const command = this.commandQueue.queue[commandIndex];
      const ttr = sprintf('%.1f', this.commandQueue.getTimeTilRun(commandIndex));
      B.sayAt(this, `<bold><yellow>Executing</yellow> '<white>${command.label}</white>' <yellow>in</yellow> <white>${ttr}</white> <yellow>seconds.</yellow>`);
    },

    updateTick: state => function () {
      if (this.commandQueue.hasPending && this.commandQueue.lagRemaining <= 0) {
        B.sayAt(this);
        this.commandQueue.execute();
        B.prompt(this);
      }

      const lastCommandTime      = this._lastCommandTime || Infinity;
      const timeSinceLastCommand = Date.now() - lastCommandTime;
      const maxIdleTime          = (Math.abs(Config.get('maxIdleTime')) * 60000) || Infinity;

      if (timeSinceLastCommand > maxIdleTime && !this.isInCombat()) {
        this.save(() => {
          B.sayAt(this, `You were kicked for being idle for more than ${maxIdleTime / 60000} minutes!`);
          B.sayAtExcept(this.room, `${this.name} disappears.`, this);
          Logger.log(`Kicked ${this.name} for being idle.`);
          state.PlayerManager.removePlayer(this, true);
        });
      }

      const now = Date.now();

      if (!this._lastHungerDecay) this._lastHungerDecay = now;
      if (now - this._lastHungerDecay >= DECAY_INTERVAL_MS) {
        this._lastHungerDecay = now;
        const currentHunger = this.getAttribute('hunger') || 0;
        if (currentHunger > 0) {
          this.lowerAttribute('hunger', DECAY_AMOUNT);
          const newHunger = this.getAttribute('hunger') || 0;

          if (newHunger <= 0) {
            B.sayAt(this, '<red>You are now starving! Eat something before you weaken!</red>');
          } else if (newHunger <= 20) {
            B.sayAt(this, '<yellow>Your stomach growls. You are very hungry.</yellow>');
          } else if (newHunger <= 50) {
            B.sayAt(this, '<yellow>You are feeling hungry.</yellow>');
          }
        }
      }

      if (!this._lastThirstDecay) this._lastThirstDecay = now;
      if (now - this._lastThirstDecay >= DECAY_INTERVAL_MS) {
        this._lastThirstDecay = now;
        const currentThirst = this.getAttribute('thirst') || 0;
        if (currentThirst > 0) {
          this.lowerAttribute('thirst', DECAY_AMOUNT);
          const newThirst = this.getAttribute('thirst') || 0;

          if (newThirst <= 0) {
            B.sayAt(this, '<red>You are now dehydrated! Find water before you weaken!</red>');
          } else if (newThirst <= 20) {
            B.sayAt(this, '<yellow>Your mouth is parched. You are very thirsty.</yellow>');
          } else if (newThirst <= 50) {
            B.sayAt(this, '<yellow>You are feeling thirsty.</yellow>');
          }
        }
      }
    },

    experience: state => function (amount) {
      B.sayAt(this, `<blue>You gained <bold>${amount}</bold> experience!</blue>`);

      const totalTnl = LevelUtil.expToLevel(this.level + 1);

      if (this.experience + amount > totalTnl) {
        B.sayAt(this, '                                   <bold><blue>!Level Up!</blue></bold>');
        B.sayAt(this, B.progress(80, 100, "blue"));

        let nextTnl = totalTnl;
        while (this.experience + amount > nextTnl) {
          amount = (this.experience + amount) - nextTnl;
          this.level++;
          this.experience = 0;
          nextTnl = LevelUtil.expToLevel(this.level + 1);
          B.sayAt(this, `<blue>You are now level <bold>${this.level}</bold>!</blue>`);
          this.emit('level');
        }
      }

      this.experience += amount;
      this.save();
    },

    level: state => function () {
      const current = this.getMeta('statPoints') || 0;
      this.setMeta('statPoints', current + 1);
      B.sayAt(this, `<bold><yellow>You have ${current + 1} unspent stat point(s)! Use <white>spendstat</white> to allocate.</yellow></bold>`);
    },
  }
};