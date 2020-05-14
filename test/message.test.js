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
const mongodb = require('mongo-mock');
mongodb.max_delay = 1;//you can choose to NOT pretend to be async (default is 400ms)
let MongoClient = mongodb.MongoClient;
const MessageDB = require('../src/messagedb/message.db');

const DummyUrl = 'mongodb://localhost:27017/messagedbtest';
const DefaultHeight = 100;

describe.skip("message db", () => {
    let db = new MessageDB(DummyUrl, DefaultHeight);
    beforeEach(async () => {
        db.MongoClient = MongoClient; // force using mock
        await db.connect();
    });
    afterEach(async () => {
        await db.clearAll();
        await db.destroy();
    });
    after(()=> {
        MongoClient = null;
    });

    it("empty db has default block height", async () => {
        let blockHeight = await db.getCurrentBlockHeight();
        expect(blockHeight).to.equal(DefaultHeight);
    });

    it("empty db post one message", async () => {
        let newBlock = 50001;
        await db.postMessages([message1], newBlock);
        let blockHeight = await db.getCurrentBlockHeight();
        expect(blockHeight).to.equal(newBlock);
        let res = await db.getAllMessages();
        expect(res.length).to.equal(1);
        expect(messageEqual(res[0], message1)).to.equal(true);
    });

    it("empty db post two message same time", async () => {
        let newBlock = 50001;
        await db.postMessages([message2, message3], newBlock);
        let blockHeight = await db.getCurrentBlockHeight();
        expect(blockHeight).to.equal(newBlock);
        let res = await db.getAllMessages();
        expect(res.length).to.equal(2);
        expect(messageEqual(res[1], message3)).to.equal(true);
    });

    it("empty db post two message one after another", async () => {
        let newBlock1 = 50001;
        let newBlock2 = 50003;
        await db.postMessages([message3], newBlock1);
        await db.postMessages([message2], newBlock2);
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
