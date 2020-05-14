/**
 * Copyright 2020 the orbs authors
 * This file is part of the Orbs project.
 *
 * This source code is licensed under the MIT license found in the LICENSE file in the root directory of this source tree.
 * The above notice should be included in all copies or substantial portions of the software.
 */

'use strict';

const expect = require("expect.js");
const {describe, it, beforeEach, afterEach, after} = require('mocha');
const fetch = require("node-fetch");
const mongodb = require('mongo-mock');
mongodb.max_delay = 1;//you can choose to NOT pretend to be async (default is 400ms)

const MessageOrbsDriver = require('../src/orbs/messageDriver');
const gateway = require('../src/gateway/server');
const collector = require('../src/collector/server');
const MessageDB = require('../src/messagedb/message.db');

const orbsEndpoint = process.env.ORBS_NODE_ADDRESS || "http://localhost:8080";
const vChainId = Number(process.env.ORBS_VCHAIN) || 42;
const orbsContractNameBase = process.env.ORBS_CONTRACT_NAME || "message";
const orbsContractMethodName = "message";
const orbsContractEventName = "message";
const messageDbUrl = 'mongodb://localhost:27017/myproject';

async function sendMessageToGateway(port, msg) {
    const body = await fetch(`http://localhost:${port}/sendMessage`, {
        method: "post",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg),
    });
    const result = await body.json();
    expect(result.length).to.equal(1);
    expect(result[0].response.code).to.equal(MessageOrbsDriver.ResultSuccess);
    return result[0].response.blockHeight;
}

// general
function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms)
    })
}

describe.skip("e2e", () => { // todo make it work
    const gatewayPort = 3001;
    const collectorPort = 3002;

    let gatewayServer;
    let collectorServer;
    beforeEach(async () => {
        const contractNameRand = orbsContractNameBase + new Date().getTime();
        const messageOrbsConnection = new MessageOrbsDriver(orbsEndpoint, vChainId, contractNameRand, orbsContractMethodName, orbsContractEventName);
        let deployBlock = await messageOrbsConnection.deploy();
        gatewayServer = gateway.serve(gatewayPort, [messageOrbsConnection]);
        collectorServer = collector.serve(collectorPort, messageOrbsConnection, deployBlock, f);
    });
    afterEach(
        () => {
            stop = true;
            gatewayServer && collectorServer &&
            new Promise((res, rej) => gatewayServer.close((err) => (err ? rej(err) : res()))) &&
            new Promise((res, rej) => collectorServer.close((err) => (err ? rej(err) : res())))
        }
    );

    it("send-read message", async () => {
        const msg = { hello: "world" };
        let blockHeight = await sendMessageToGateway(gatewayPort, msg);
        console.log(blockHeight);
        expect(blockHeight).to.not.equal(0);
        // const reader = new Reader(endpoint, chain);
    });
});

describe("gateway - two orbs connections", () => {
    const gatewayPort = 3001;

    let gatewayServer;
    let deploy1Block = 0, deploy2Block = 0;
    beforeEach(async () => {
        const contractNameRand = orbsContractNameBase + new Date().getTime();
        const messageOrbsConnection = new MessageOrbsDriver(orbsEndpoint, vChainId, contractNameRand, orbsContractMethodName, orbsContractEventName);
        deploy1Block = await messageOrbsConnection.deploy();
        expect(deploy1Block).to.not.equal(0);
        const contractNameRand2 = orbsContractNameBase + new Date().getTime();
        const messageOrbsConnection2 = new MessageOrbsDriver(orbsEndpoint, vChainId, contractNameRand2, orbsContractMethodName, orbsContractEventName);
        deploy2Block = await messageOrbsConnection2.deploy();
        expect(deploy2Block).to.not.equal(0);
        expect(deploy1Block).to.not.equal(deploy2Block);
        gatewayServer = gateway.serve(gatewayPort, [messageOrbsConnection, messageOrbsConnection2]);
    });
    afterEach(() => {
        gatewayServer && new Promise((res, rej) => gatewayServer.close((err) => (err ? rej(err) : res())));
    });

    it("sends message and gets success from block chains", async () => {
        const msg = { hello: "world" };
        // todo if more than one test, maybe extract
        const body = await fetch(`http://localhost:${gatewayPort}/sendMessage`, {
            method: "post",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(msg),
        });
        const result = await body.json();
        expect(result.length).to.equal(2);
        expect(result[0].response.code).to.equal(MessageOrbsDriver.ResultSuccess);
        expect(result[0].response.blockHeight).to.not.equal(0);
        expect(result[0].response.blockHeight).to.be.greaterThan(deploy1Block);
        expect(result[1].response.code).to.equal(MessageOrbsDriver.ResultSuccess);
        expect(result[1].response.blockHeight).to.not.equal(0);
        expect(result[1].response.blockHeight).to.be.greaterThan(deploy2Block);
        console.log(`connection 1: ${result[0].response.blockHeight}, connection 2: ${result[1].response.blockHeight}`);
    });
});

describe("collector", () => {
    const collectorPort = 3001;

    let MongoClient = mongodb.MongoClient;
    let collectorServer;
    let orbsConnection;
    let messageDB;
    let blockDeploy;
    beforeEach(async () => {
        const contractNameRand = orbsContractNameBase + new Date().getTime();
        orbsConnection = new MessageOrbsDriver(orbsEndpoint, vChainId, contractNameRand, orbsContractMethodName, orbsContractEventName);
        blockDeploy = await orbsConnection.deploy();
        messageDB = new MessageDB(messageDbUrl, blockDeploy);
        await messageDB.clearAll();
        messageDB.MongoClient = null;
        messageDB.MongoClient = MongoClient; // force using mock
        await messageDB.connect();
        collectorServer = collector.serve(collectorPort, orbsConnection, messageDB);
        collectorServer.start();
    });
    afterEach(async () => {
        collectorServer && await collectorServer.close();
        await messageDB.clearAll();
        await messageDB.destroy();
        console.log('hhh')
    });
    after(() => {
        collectorServer = null;
        orbsConnection = null;
        messageDB = null;
        MongoClient = null;
        console.log('hh4h')
    });

    it("reads from block chain", async () => {
        await orbsConnection.message({ hello: "world" });
        await orbsConnection.message({ hello: "world1" });
        await orbsConnection.message({ hello: "world2" });
        await orbsConnection.message({ hello: "world3" });

        await sleep(200);
        let blockHeight = await messageDB.getCurrentBlockHeight();
        expect(blockHeight).to.equal(blockDeploy+4);
        let res = await messageDB.getAllMessages();
        expect(res.length).to.equal(4);
    });
});

