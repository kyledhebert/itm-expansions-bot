'use strict';

var ExpansionBot = require('../lib/expansionbot');

var token = process.env.EX_BOT_API_KEY;
var dbPath = process.env.EX_BOT_DB_PATH;
var name = process.env.EX_BOT_NAME;

var expansionbot = new ExpansionBot({
    token: token,
    dbPath: dbPath,
    name: name
});

expansionbot.run();
