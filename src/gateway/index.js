/**
 * Copyright 2020 the orbs authors
 * This file is part of the Orbs project.
 *
 * This source code is licensed under the MIT license found in the LICENSE file in the root directory of this source tree.
 * The above notice should be included in all copies or substantial portions of the software.
 */
const MessageOrbsDriver = require('../orbs/messageDriver');
const gateway = require('./server');

const { isEmpty } = require("lodash");

// check env only on production (=docker with internal docker directory structure)
if (process.env.NODE_ENV === 'production'){ require('dotenv-safe').config({example: './gateway/.env.example'}); }

// orbs connection
const orbsUrl = process.env.ORBS_URL;
const orbsVChain = process.env.ORBS_VCHAIN;
const orbsContractName = process.env.ORBS_CONTRACT_NAME;
const orbsContractMethodName = "message";
const orbsContractEventName = "message";
const apiKeys = isEmpty(process.env.API_KEYS) ? [] : process.env.API_KEYS.split(",").map(s => s.trim());
const anonymousFields = isEmpty(process.env.ANONYMOUS_FIELDS) ? [] : process.env.ANONYMOUS_FIELDS.split(",").map(s => s.trim());
const identityDbURL = process.env.IDENTITY_DB_URL;

const port = process.env.PORT || 3000;

process.on('uncaughtException', function (e) {
    console.error('uncaughtException', e.message, e.stack);
    process.exit(64);
});

process.on('SIGINT', function () {
    console.log('\ngraceful shutdown');
    server && server.close(function (err) {
        if (err) {
            console.log(err.stack || err);
        }
        console.log('\nclosed server');
        console.log('\ndone');
        process.exit(0);
    });
});

let server = null;
try {
    const orbsConnections = [new MessageOrbsDriver(orbsUrl, orbsVChain, orbsContractName, orbsContractMethodName, orbsContractEventName)];
    if (process.env.ORBS_URL2) {
        orbsConnections.push(new MessageOrbsDriver(process.env.ORBS_URL2, process.env.ORBS_VCHAIN2, process.env.ORBS_CONTRACT_NAME2, orbsContractMethodName, orbsContractEventName));
    }
    server = await gateway.serve(port, orbsConnections, apiKeys, { fields: anonymousFields, connectionUrl: identityDbURL });

} catch (err) {
    console.error(err.message);
    process.exit(128);
}
