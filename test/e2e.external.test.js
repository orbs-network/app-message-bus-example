const expect = require("expect.js");
const {describe, it, beforeEach, afterEach} = require("mocha");
const fetch = require("node-fetch");

const MessageOrbsDriver = require("../src/orbs/messageDriver");
const MessageDB = require('../src/messagedb/message.postgres.db');

const orbsEndpoint = process.env.ORBS_NODE_ADDRESS || "http://localhost:8090";
const vChainId = Number(process.env.ORBS_VCHAIN) || 42;
const orbsContractNameBase = process.env.ORBS_CONTRACT_NAME || "message";
const orbsContractMethodName = "message";
const orbsContractEventName = "message";
const messageDbUrl = "postgres://root:example@localhost:5432/message";
const messageDbName = "message";
const SKIP_DEPLOY = process.env.SKIP_DEPLOY == "true";

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
        if (SKIP_DEPLOY) {
            deployBlock = 1;
        } else {
            let deployBlock = await messageOrbsConnection.deploy();
        }
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
        expect(messages[0]).to.be.eql(msg);
    });
});
