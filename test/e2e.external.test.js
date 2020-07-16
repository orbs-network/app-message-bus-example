const expect = require("expect.js");
const {describe, it, beforeEach, afterEach} = require("mocha");
const fetch = require("node-fetch");

const MessageOrbsDriver = require("../src/orbs/messageDriver");
const MessageDB = require('../src/messagedb/message.db');

const orbsEndpoint = process.env.ORBS_NODE_ADDRESS || "http://localhost:8090";
const vChainId = Number(process.env.ORBS_VCHAIN) || 42;
const orbsContractNameBase = process.env.ORBS_CONTRACT_NAME || "message";
const orbsContractMethodName = "message";
const orbsContractEventName = "message";
const messageDbUrl = "mongodb://root:example@localhost:27017/message?authSource=admin";
const messageDbName = "message";

function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms)
    })
}

async function sendMessageToGateway(msg) {
    const body = await fetch(`http://localhost:80/sendMessage`, {
        method: "post",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg),
    });
    const result = await body.json();
    expect(result.length).to.equal(1);
    expect(result[0].response.code).to.equal(MessageOrbsDriver.ResultSuccess);
    return result[0].response.blockHeight;
}

describe("external e2e", () => {
    let messageDB;
    beforeEach(async () => {
        const contractNameRand = orbsContractNameBase;
        const messageOrbsConnection = new MessageOrbsDriver(orbsEndpoint, vChainId, contractNameRand, orbsContractMethodName, orbsContractEventName);
        let deployBlock = await messageOrbsConnection.deploy();
        messageDB = new MessageDB(messageDbUrl, messageDbName, deployBlock);
        await messageDB.connect();
    });

    it("send-read message", async () => {
        const msg = { hello: "world" };
        let blockHeight = await sendMessageToGateway(msg);
        expect(blockHeight).to.not.equal(0);
        await sleep(200);
        const messages = await messageDB.getAllMessages();
        expect(messages).to.not.be.empty();
        expect(messages[0].txMessage).to.be.eql(msg);
    });
});
