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
const MessageDB = require('../src/messagedb/message.postgres.db');
const { uuid } = require("uuidv4");

const DummyUrl = 'postgres://root:example@localhost:5432/message';
const DefaultHeight = 1;

describe("message db - postgres", () => {
    let db = new MessageDB(DummyUrl, DefaultHeight);
    beforeEach(async () => {
        await db.connect();
    });
    afterEach(async () => {
        await db.clearAll();
        await db.destroy();
    });
    after(()=> {

    });

    it("empty db has default block height", async () => {
        let blockHeight = await db.getCurrentBlockHeight();
        expect(blockHeight).to.equal(DefaultHeight);
    });

    it("empty db post one message", async () => {
        let newBlock = 50001;
        await db.postMessages([asEvent(message1)], newBlock);
        let blockHeight = await db.getCurrentBlockHeight();
        expect(blockHeight).to.equal(newBlock);
        let res = await db.getAllMessages();
        expect(res.length).to.equal(1);
        console.log(res[0]);
        expect(messageEqual(res[0], message1)).to.equal(true);
    });

    it("empty db post two messages same time", async () => {
        let newBlock = 50001;
        await db.postMessages([asEvent(message2), asEvent(message3)], newBlock);
        let blockHeight = await db.getCurrentBlockHeight();
        expect(blockHeight).to.equal(newBlock);
        let res = await db.getAllMessages();
        expect(res.length).to.equal(2);
        expect(messageEqual(res[1], message3)).to.equal(true);
    });

    it("empty db post two messages one after another", async () => {
        let newBlock1 = 50001;
        let newBlock2 = 50003;
        await db.postMessages([asEvent(message3)], newBlock1);
        await db.postMessages([asEvent(message2)], newBlock2);
        let blockHeight = await db.getCurrentBlockHeight();
        expect(blockHeight).to.equal(newBlock2);
        let res = await db.getAllMessages();
        expect(res.length).to.equal(2);
    });
});

function messageEqual(a, b) {
    return a.TagID === b.TagID &&
        a.Latitude === b.Latitude &&
        a.EventType === b.EventType &&
        a.GatewayID === b.GatewayID &&
        a.Longitude === b.Longitude &&
        a.EventValue === b.EventValue;
}

function asEvent(message) {
    return {
        "txIndex": 0,
        "txTime" : new Date(),
        "txId" : "some-tx-id",
        "txMessage" : message,
    }
}
const message1 = {
    "TagID": "ex-c0c010500004",
    "Latitude": 42.34489822387695,
    "EventType": "HRTB_S",
    "GatewayID": "GW98F4AB141D14",
    "Longitude": -71.05448913574219,
    "Timestamp": 1588881072973,
    "EventValue": "1.0",
    "TimestampOffset": 0
};
const message2 = {
    "TagID": "ex-c0c010500026",
    "Latitude": 42.34478759765625,
    "EventType": "HRTB_S",
    "GatewayID": "GW98F4AB141D0C",
    "Longitude": -71.05469512939453,
    "Timestamp": 1588881151813,
    "EventValue": "1.0",
    "TimestampOffset": 0
};
const message3= {
    "TagID": "ex-c0c010500004",
    "Latitude": 42.34489822387695,
    "EventType": "HRTB_S",
    "GatewayID": "GW98F4AB141D14",
    "Longitude": -71.05448913574219,
    "Timestamp": 1588881375848,
    "EventValue": "1.0",
    "TimestampOffset": 0
};
