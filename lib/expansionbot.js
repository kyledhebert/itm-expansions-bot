'use strict';

var util = require('util');
var path = require('path');
var fs = require('fs');
var SQLite = require('sqlite3').verbose();
var Bot = require('slackbots');

var ExpansionBot = function Constructor(settings) {
    this.settings = settings;
    this.settings.name = this.settings.name || 'expansionbot';
    this.dbPath = settings.dbPath || path.resolve(__dirname, '..', 'data', 'expansions.db');

    this.user = null;
    this.db = null;
};

util.inherits(ExpansionBot, Bot);

ExpansionBot.prototype.run = function () {
    ExpansionBot.super_.call(this, this.settings);

    this.on('start', this._onStart);
    this.on('message', this._onMessage);
};

ExpansionBot.prototype._onStart = function () {
    this._loadBotUser();
    this._connectDb();
    this._firstRunCheck();
};

ExpansionBot.prototype._loadBotUser = function () {
    var self = this;
    this.user = this.users.filter(function (user) {
        return user.name === self.name;
    })[0];
};

ExpansionBot.prototype._connectDb = function () {
    if (!fs.existsSync(this.dbPath)) {
        console.error('Database path ' +  this.dbPath + ' does not exist or is not readable.');
        process.exit(1);
    }

    this.db = new SQLite.Database(this.dbPath);
};

ExpansionBot.prototype._firstRunCheck = function () {
    var self = this;
    self.db.get('SELECT value FROM info WHERE name = "lastrun" LIMIT 1', function (err, record) {
        if (err) {
            return console.error('DATABASE ERROR:', err);
        }

        var currentTime = (new Date()).toJSON();

        // if this is the first time the bot has run
        if (!record) {
            self._welcomeMessage();
            return self.db.run('INSERT INTO info(name, value) VALUES("lastrun", ?)', currentTime);
        }

        // update with new last run time
        self.db.run('UPDATE info set value = ? WHERE name = "lastrun"', currentTime);
        });
};

ExpansionBot.prototype._welcomeMessage = function () {
    this.postMessageToChannel(this.channels[0].name, 'Hi, I\'m Expansion Bot!' +
        '\n I can help you remember what ITM stands for. Just say `Expand ITM` or `' + this.name + '` to invoke me!',
        {as_user: true});
};

ExpansionBot.prototype._onMessage = function (message) {
    if (this._isChatMessage(message) &&
        this._isChannelConversation(message) &&
        !this._isFromExpansionBot(message) &&
        this._isMentioningExpandITM(message)
    ) {
        this._replyWithRandomExpansion(message);
    }
};

// is the message of type message and does it contain text
ExpansionBot.prototype._isChatMessage = function (message) {
    return message.type === 'message' && Boolean(message.text);
};

ExpansionBot.prototype._isChannelConversation = function (message) {
    return typeof message.channel === 'string' &&
        // chat channel IDs start with C
        message.channel[0] === 'C';
};

// prevent the bot from replying to itself
ExpansionBot.prototype._isFromExpansionBot = function (message) {
    return message.user === this.user.id;
};

// does the message mention expand itm or the expansion bot
ExpansionBot.prototype._isMentioningExpandITM = function (message) {
    return message.text.toLowerCase().indexOf('expand itm') > -1 ||
    message.text.toLowerCase().indexOf(this.name) > -1;
}

ExpansionBot.prototype._replyWithRandomExpansion = function (originalMessage) {
    var self = this;
    self.db.get('SELECT id, expansion FROM expansions ORDER BY used ASC, RANDOM() LIMIT 1', function (err, record) {
        if (err) {
            return console.error('DATABASE ERROR:', err);
        }

        var channel = self._getChannelById(originalMessage.channel);
        self.postMessageToChannel(channel.name, record.expansion, {as_user: true});
        self.db.run('UPDATE expansions SET used = used + 1 WHERE id = ?', record.id);
    });
};

ExpansionBot.prototype._getChannelById = function (channelId) {
    return this.channels.filter(function (item) {
        return item.id === channelId;
    })[0];
};



module.exports = ExpansionBot;