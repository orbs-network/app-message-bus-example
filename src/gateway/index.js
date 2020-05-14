/**
 * Copyright 2020 the orbs authors
 * This file is part of the Orbs project.
 *
 * This source code is licensed under the MIT license found in the LICENSE file in the root directory of this source tree.
 * The above notice should be included in all copies or substantial portions of the software.
 */
const MessageOrbsDriver = require('../orbs/messageDriver');
const gateway = require('./server');

// check env only on production (=docker)
if (process.env.NODE_ENV === 'production'){ require('dotenv-safe').config(); }

// orbs connection
const orbsUrl = process.env.ORBS_URL;
const orbsVChain = process.env.ORBS_VCHAIN;
const orbsContractName = process.env.ORBS_CONTRACT_NAME;
const orbsContractMethodName = "message";
const orbsContractEventName = "message";

const port = process.env.PORT || 3000;

process.on('uncaughtException', function (e) {
    console.error('uncaughtException', e.message, e.stack);
    process.exit(64);
});

try {
    const orbsConnections = [new MessageOrbsDriver(orbsUrl, orbsVChain, orbsContractName, orbsContractMethodName, orbsContractEventName)];
    if (process.env.ORBS_URL2) {
        orbsConnections.push(new MessageOrbsDriver(process.env.ORBS_URL2, process.env.ORBS_VCHAIN2, process.env.ORBS_CONTRACT_NAME2, orbsContractMethodName, orbsContractEventName));
    }
    const server = gateway.serve(port, orbsConnections);

    process.on('SIGINT', function () {
        console.log('\n\ngraceful shutdown');
        server.close(function (err) {
            if (err) {
                console.log(err.stack || err);
            }
            process.exit(0);
        });
    });
} catch (err) {
    console.error(err.message);
    process.exit(128);
}
