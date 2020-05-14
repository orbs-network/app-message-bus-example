/**
 * Copyright 2020 the orbs authors
 * This file is part of the Orbs project.
 *
 * This source code is licensed under the MIT license found in the LICENSE file in the root directory of this source tree.
 * The above notice should be included in all copies or substantial portions of the software.
 */
const MessageOrbsDriver = require('../orbs/messageDriver');
const MessageDB = require('../messagedb/message.db');
const collector = require('./server');

// check env only on production (=docker)
if (process.env.NODE_ENV === 'production'){ require('dotenv-safe').config(); }

// orbs connection
const orbsUrl = process.env.ORBS_URL;
const orbsVChain = process.env.ORBS_VCHAIN;
const orbsContractName = process.env.ORBS_CONTRACT_NAME;
const orbsContractMethodName = "message";
const orbsContractEventName = "message";
const orbsStartBlockHeight = process.env.ORBS_START_BLOCK_HEIGHT;
// first ever deploy 1018546

// message db
const messageDbUrl = process.env.MESSAGE_DB_URL;
const mongoDBName = process.env.MESSAGE_DB_NAME;

const port = process.env.PORT || 3000;

process.on('uncaughtException', function (e) {
    console.error('uncaughtException', e.message, e.stack);
    process.exit(64);
});

process.on('SIGINT', async function () {
    console.log('\n\nstarting graceful shutdown');
    server || await server.close();
    console.log('\nclosed server');
    messageDB || await messageDB.destroy();
    console.log('\nclosed db connection');
    console.log('\ndone');
    process.exit(0);

});

let server = null;
let messageDB = null;
async function main() {
    const orbsConnection = new MessageOrbsDriver(orbsUrl, orbsVChain, orbsContractName, orbsContractMethodName, orbsContractEventName);
    messageDB = new MessageDB(messageDbUrl, mongoDBName, orbsStartBlockHeight);
    await messageDB.connect();
    server = collector.serve(port, orbsConnection, messageDB);
    server.start();
}

main()
    .then(() => {
    }).catch(e => {
    console.error(e.message);
    process.exit(128);
});

