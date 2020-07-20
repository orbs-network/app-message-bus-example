/**
 * Copyright 2020 the orbs authors
 * This file is part of the Orbs project.
 *
 * This source code is licensed under the MIT license found in the LICENSE file in the root directory of this source tree.
 * The above notice should be included in all copies or substantial portions of the software.
 */

'use strict';

const expect = require("expect.js");
const {describe, it, beforeEach, afterEach} = require('mocha');
const fetch = require("node-fetch");
const { merge } = require("lodash");

const MessageOrbsDriver = require('../src/orbs/messageDriver');
const gateway = require('../src/gateway/server');
const collector = require('../src/collector/server');
const MessageDB = require('../src/messagedb/message.postgres.db');

const orbsEndpoint = process.env.ORBS_NODE_ADDRESS || "http://localhost:8080";
const vChainId = Number(process.env.ORBS_VCHAIN) || 42;
const orbsContractNameBase = process.env.ORBS_CONTRACT_NAME || "message";
const orbsContractMethodName = "message";
const orbsContractEventName = "message";
const messageDbUrl = 'postgres://root:example@localhost:5432/message';

async function sendMessageToGateway(port, msg, headers) {
    const body = await fetch(`http://localhost:${port}/sendMessage`, {
        method: "post",
        headers: merge({ 'Content-Type': 'application/json' }, headers),
        body: JSON.stringify(msg),
    });
    const result = await body.json();
    return result;
}

function expectSuccessAndReturnBlockHeight(result) {
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

describe("e2e", () => {
    const gatewayPort = 3001;
    const collectorPort = 3002;

    let messageDB;
    let gatewayServer;
    let collectorServer;
    beforeEach(async () => {
        const contractNameRand = orbsContractNameBase + new Date().getTime();
        const messageOrbsConnection = new MessageOrbsDriver(orbsEndpoint, vChainId, contractNameRand, orbsContractMethodName, orbsContractEventName);
        let deployBlock = await messageOrbsConnection.deploy();
        messageDB = new MessageDB(messageDbUrl, deployBlock);
        await messageDB.connect();

        gatewayServer = await gateway.serve(gatewayPort, [messageOrbsConnection], [], {});
        collectorServer = collector.serve(collectorPort, messageOrbsConnection, messageDB);
        collectorServer.start();
    });
    afterEach(async () => {
        gatewayServer && await gatewayServer.close();
        collectorServer && await collectorServer.close();
        await messageDB.clearAll();
    });

    it("send-read message", async () => {
        const msg = { hello: "world" };
        let blockHeight = expectSuccessAndReturnBlockHeight(await sendMessageToGateway(gatewayPort, msg));
        expect(blockHeight).to.not.equal(0);
        await sleep(200);

        const res = await messageDB.getAllMessages();
        expect(res[0]).to.be.eql(msg);
    });
});

describe("e2e with API key", () => {
    const gatewayPort = 3001;
    const collectorPort = 3002;

    let messageDB;
    let gatewayServer;
    let collectorServer;
    beforeEach(async () => {
        const contractNameRand = orbsContractNameBase + new Date().getTime();
        const messageOrbsConnection = new MessageOrbsDriver(orbsEndpoint, vChainId, contractNameRand, orbsContractMethodName, orbsContractEventName);
        let deployBlock = await messageOrbsConnection.deploy();
        messageDB = new MessageDB(messageDbUrl, deployBlock);
        await messageDB.connect();
        gatewayServer = await gateway.serve(gatewayPort, [messageOrbsConnection], ["some-api-key"], {});
        collectorServer = collector.serve(collectorPort, messageOrbsConnection, messageDB);
        collectorServer.start();
    });
    afterEach(async () => {
        gatewayServer && await gatewayServer.close();
        collectorServer && await collectorServer.close();
        await messageDB.clearAll();
    });

    it("send-read message", async () => {
        const msg = { hello: "world" };
        let blockHeight = expectSuccessAndReturnBlockHeight(await sendMessageToGateway(gatewayPort, msg, {"X-Auth": "some-api-key"}));
        expect(blockHeight).to.not.equal(0);
        await sleep(200);
        const res = await messageDB.getAllMessages();
        expect(res[0]).to.be.eql(msg);
        expect(res.length).to.be.eql(1);

        // fails without API key
        const result = await sendMessageToGateway(gatewayPort, msg);
        expect(result.error).to.be.eql("Wrong API key");
        const resAfterWrongCall = await messageDB.getAllMessages();
        expect(resAfterWrongCall.length).to.be.eql(1);
    });
});

describe("e2e with anonymized keys", () => {
    const gatewayPort = 3001;

    let messageDB;
    let gatewayServer;
    beforeEach(async () => {
        const contractNameRand = orbsContractNameBase + new Date().getTime();
        const messageOrbsConnection = new MessageOrbsDriver(orbsEndpoint, vChainId, contractNameRand, orbsContractMethodName, orbsContractEventName);
        let deployBlock = await messageOrbsConnection.deploy();
        messageDB = new MessageDB(messageDbUrl, deployBlock);
        await messageDB.connect();
        gatewayServer = await gateway.serve(gatewayPort, [messageOrbsConnection], [], { fields: ["operator"], connectionUrl: messageDbUrl });
    });
    afterEach(async () => {
        gatewayServer && await gatewayServer.close();
        await messageDB.clearAll();
    });

    it("send-read message", async () => {
        const msg = { operator: "random guy", hello: "world" };
        let blockHeight = expectSuccessAndReturnBlockHeight(await sendMessageToGateway(gatewayPort, msg));
        expect(blockHeight).to.not.equal(0);
        await sleep(200);
        let res = await messageDB.getAllIdentities();
        expect(res[0].uuid.length).to.be.eql(36);
        expect(res[0].value).to.be.eql("random guy");
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
        gatewayServer = await gateway.serve(gatewayPort, [messageOrbsConnection, messageOrbsConnection2], [], {});
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

    let dataPayloads = [];
    let dataBlock = 0;

    let collectorServer;
    let orbsConnection;
    let messageDB;
    let blockDeploy;
    beforeEach(async () => {
        const contractNameRand = orbsContractNameBase + new Date().getTime();
        orbsConnection = new MessageOrbsDriver(orbsEndpoint, vChainId, contractNameRand, orbsContractMethodName, orbsContractEventName);
        blockDeploy = await orbsConnection.deploy();
        messageDB = new MessageDB(messageDbUrl, blockDeploy);
        await messageDB.connect();

        collectorServer = collector.serve(collectorPort, orbsConnection, messageDB);
        collectorServer.start();
    });
    afterEach(async () => {
        collectorServer && await collectorServer.close();
        messageDB.clearAll();
    });

    it("reads from block chain, where each block has once tx", async () => {
        await orbsConnection.message({ hello: "world" });
        await orbsConnection.message({ hello: "world1" });
        await orbsConnection.message({ hello: "world2" });
        await orbsConnection.message({ hello: "world3" });

        await sleep(200);

        const res = await messageDB.getAllMessages();
        expect(res.length).to.be.eql(4);

        const blockHeight = await messageDB.getCurrentBlockHeight();
        expect(blockHeight).to.equal(blockDeploy+4);
    });

    it.skip("reads from block chain one block many tx", async () => {
        await orbsConnection.message({ hello: "world" }); // todo how to force same block ?

        await sleep(200);
        sinon.assert.callCount(messageDB.postMessages, 4);
        expect(dataBlock).to.equal(blockDeploy+1);
        expect(dataPayloads.length).to.equal(1);
    });
});

